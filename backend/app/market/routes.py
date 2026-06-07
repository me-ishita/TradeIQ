from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.market.pipeline import YahooFinancePipeline

market_bp = Blueprint("market", __name__, url_prefix="/market")
pipeline  = YahooFinancePipeline()


# ─────────────────────────────────────────
# GET /market/stock/<ticker>
# Returns: company name, sector, industry, beta, market cap
# ─────────────────────────────────────────

@market_bp.get("/stock/<string:ticker>")
@jwt_required()
def get_stock_info(ticker):
    try:
        info = pipeline.get_stock_info(ticker.upper())
        if not info["company_name"]:
            return jsonify({"error": f"Ticker '{ticker}' not found"}), 404
        return jsonify(info), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# GET /market/history/<ticker>?start=YYYY-MM-DD&end=YYYY-MM-DD
# Returns: OHLCV + Daily_Return rows
# ─────────────────────────────────────────

@market_bp.get("/history/<string:ticker>")
@jwt_required()
def get_price_history(ticker):
    start = request.args.get("start")
    end   = request.args.get("end")

    if not start or not end:
        return jsonify({"error": "Query params 'start' and 'end' are required (YYYY-MM-DD)"}), 400

    try:
        dataset = pipeline.build_dataset(ticker.upper(), start, end)
        history = dataset["stock_history"]

        # Convert DataFrame → list of dicts (JSON-serialisable)
        records = history[["Date", "Open", "High", "Low", "Close", "Volume", "Daily_Return"]].copy()
        records["Date"] = records["Date"].astype(str)

        return jsonify({
            "ticker":   ticker.upper(),
            "start":    start,
            "end":      end,
            "rows":     len(records),
            "history":  records.to_dict(orient="records"),
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# GET /market/benchmark?start=YYYY-MM-DD&end=YYYY-MM-DD
# Returns: S&P 500 OHLCV + Daily_Return
# ─────────────────────────────────────────

@market_bp.get("/benchmark")
@jwt_required()
def get_benchmark():
    start = request.args.get("start")
    end   = request.args.get("end")

    if not start or not end:
        return jsonify({"error": "Query params 'start' and 'end' are required (YYYY-MM-DD)"}), 400

    try:
        benchmark = pipeline.get_benchmark_data(start, end)
        benchmark = pipeline.clean_data(benchmark)
        benchmark = pipeline.calculate_returns(benchmark)

        records = benchmark[["Date", "Close", "Daily_Return"]].copy()
        records["Date"] = records["Date"].astype(str)

        return jsonify({
            "ticker":    "^GSPC",
            "start":     start,
            "end":       end,
            "rows":      len(records),
            "benchmark": records.to_dict(orient="records"),
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# GET /market/price/<ticker>
# Returns: latest closing price (single value)
# ─────────────────────────────────────────

@market_bp.get("/price/<string:ticker>")
@jwt_required()
def get_current_price(ticker):
    try:
        price = pipeline.get_current_price(ticker.upper())
        if price is None:
            return jsonify({"error": f"Could not fetch price for '{ticker}'"}), 404
        return jsonify({"ticker": ticker.upper(), "price": price}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Index/ticker definitions
# ─────────────────────────────────────────

INDICES = [
    {"name": "S&P 500",       "ticker": "^GSPC"},
    {"name": "NASDAQ",        "ticker": "^IXIC"},
    {"name": "DOW",           "ticker": "^DJI"},
    {"name": "AAPL",          "ticker": "AAPL"},
    {"name": "MSFT",          "ticker": "MSFT"},
    {"name": "NVDA",          "ticker": "NVDA"},
    {"name": "AMZN",          "ticker": "AMZN"},
    {"name": "TSLA",          "ticker": "TSLA"},
    {"name": "USD/INR",       "ticker": "INR=X"},
    {"name": "GOLD",          "ticker": "GC=F"},
    {"name": "NIFTY 50",      "ticker": "^NSEI"},
    {"name": "SENSEX",        "ticker": "^BSESN"},
    {"name": "NIFTY IT",      "ticker": "^CNXIT"},
    {"name": "NIFTY PHARMA",  "ticker": "^CNXPHARMA"},
]


# ─────────────────────────────────────────
# GET /market/indices
# Returns: price + % change for all tracked indices/tickers
# ─────────────────────────────────────────

@market_bp.get("/indices")
@jwt_required()
def get_indices():
    import yfinance as yf
    results = []
    for entry in INDICES:
        try:
            hist = yf.Ticker(entry["ticker"]).history(period="5d")
            if hist.empty or len(hist) < 2:
                continue
            today_close = float(hist["Close"].iloc[-1])
            prev_close  = float(hist["Close"].iloc[-2])
            change_pct  = (today_close - prev_close) / prev_close * 100
            price_str   = f"{today_close:,.0f}" if today_close >= 1000 else f"{today_close:,.2f}"
            change_str  = f"{'+' if change_pct >= 0 else ''}{change_pct:.2f}%"
            results.append({
                "name":   entry["name"],
                "ticker": entry["ticker"],
                "price":  price_str,
                "change": change_str,
                "up":     change_pct >= 0,
            })
        except Exception:
            continue
    return jsonify({"indices": results}), 200


# ─────────────────────────────────────────
# GET /market/search?q=<query>
# Returns: list of matching equity results from Yahoo Finance
# ─────────────────────────────────────────

@market_bp.get("/search")
@jwt_required()
def search_stocks():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"results": []}), 200
    try:
        import yfinance as yf
        search = yf.Search(q, max_results=10)
        quotes = search.quotes or []
        formatted = [
            {
                "ticker":   r.get("symbol"),
                "name":     r.get("longname") or r.get("shortname"),
                "exchange": r.get("exchDisp"),
                "sector":   r.get("sectorDisp"),
                "type":     r.get("typeDisp"),
            }
            for r in quotes
            if r.get("symbol") and r.get("quoteType") == "EQUITY"
        ]
        return jsonify({"results": formatted[:8]}), 200
    except Exception as e:
        return jsonify({"results": [], "error": str(e)}), 200
