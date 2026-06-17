import uuid
from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models import User, PortfolioSetup, TradeLog, Holding
from app.market.pipeline import YahooFinancePipeline

portfolio_bp = Blueprint("portfolio", __name__, url_prefix="/portfolio")
pipeline     = YahooFinancePipeline()


def _make_trade_id() -> str:
    return "TRD-" + uuid.uuid4().hex[:6].upper()


def _update_holding(user_id: str, trade: TradeLog):
    """
    Upsert holdings table after a BUY or SELL trade.
    BUY  → increase quantity, recalculate avg_buy_price
    SELL → decrease quantity, remove holding if qty reaches 0
    """
    holding = Holding.query.filter_by(
        user_id=user_id,
        stock_ticker=trade.stock_ticker,
    ).first()

    try:
        live_price = pipeline.get_current_price(trade.stock_ticker)
    except Exception:
        live_price = None
    current_price = float(live_price or trade.current_sell_price or trade.buy_price or 1)

    if trade.trade_type == "BUY":
        if holding:
            total_qty   = float(holding.quantity) + trade.quantity
            total_cost  = (float(holding.avg_buy_price) * float(holding.quantity)) + float(trade.amount_invested)
            holding.avg_buy_price = round(total_cost / total_qty, 4)
            holding.quantity      = total_qty
        else:
            holding = Holding(
                user_id       = user_id,
                stock_ticker  = trade.stock_ticker,
                stock_name    = trade.stock_name,
                quantity      = trade.quantity,
                avg_buy_price = float(trade.buy_price),
            )
            db.session.add(holding)

        holding.current_price = current_price
        holding.market_value = round(float(holding.market_value or 0) + float(trade.amount_invested or 0), 4)
        holding.profit_loss = round(float(holding.market_value or 0) - (float(holding.avg_buy_price) * float(holding.quantity or 0)), 4)

    elif trade.trade_type == "SELL" and holding:
        holding.quantity -= trade.quantity
        if holding.quantity <= 0:
            db.session.delete(holding)
        else:
            holding.current_price = current_price
            holding.market_value  = round(current_price * holding.quantity, 4)
            holding.profit_loss   = round(
                (current_price - float(holding.avg_buy_price)) * holding.quantity, 4
            )


# ─────────────────────────────────────────
# POST /portfolio/trade
# Body: { stock_ticker, trade_type, quantity, tag1?, tag2?, tag3?, thesis? }
# ─────────────────────────────────────────

@portfolio_bp.post("/trade")
@jwt_required()
def execute_trade():
    user_id = get_jwt_identity()
    data    = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    required = ["stock_ticker", "trade_type", "quantity"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    trade_type = data["trade_type"].upper()
    if trade_type not in ("BUY", "SELL"):
        return jsonify({"error": "trade_type must be BUY or SELL"}), 400

    ticker   = data["stock_ticker"].upper()
    quantity = int(data["quantity"])

    try:
        submitted_buy_price = float(data.get("buy_price") or 0)
    except (TypeError, ValueError):
        submitted_buy_price = 0.0

    try:
        submitted_sell_price = float(data.get("current_sell_price") or submitted_buy_price or 0)
    except (TypeError, ValueError):
        submitted_sell_price = submitted_buy_price

    # Fetch live price + metadata, falling back to the user's saved draft values.
    try:
        stock_info = pipeline.get_stock_info(ticker) or {}
    except Exception:
        stock_info = {}

    try:
        live_price = pipeline.get_current_price(ticker)
    except Exception:
        live_price = None

    current_price = live_price or submitted_sell_price or submitted_buy_price

    if current_price is None:
        return jsonify({"error": f"Could not fetch price for '{ticker}'"}), 404
    current_price = float(current_price)
    if current_price <= 0:
        current_price = 1.0

    requested_amount = data.get("amount_invested")
    try:
        submitted_amount = float(requested_amount) if requested_amount is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "amount_invested must be numeric"}), 400

    portfolio = PortfolioSetup.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    if trade_type == "BUY":
        quantity = max(1, quantity)
        amount_invested = round(
            submitted_amount if submitted_amount and submitted_amount > 0 else current_price * quantity,
            4,
        )
        portfolio.cash_balance = round(float(portfolio.cash_balance) - amount_invested, 4)

    elif trade_type == "SELL":
        quantity = max(1, quantity)
        amount_invested = round(
            submitted_amount if submitted_amount and submitted_amount > 0 else current_price * quantity,
            4,
        )
        holding = Holding.query.filter_by(user_id=user_id, stock_ticker=ticker).first()
        portfolio.cash_balance = round(float(portfolio.cash_balance) + amount_invested, 4)

    # Build trade_log record
    allocation_pct = round((amount_invested / float(portfolio.total_capital)) * 100, 2)

    trade = TradeLog(
        trade_id           = _make_trade_id(),
        user_id            = user_id,
        trade_date         = date.today(),
        stock_ticker       = ticker,
        stock_name         = data.get("stock_name") or stock_info.get("company_name", ticker),
        sector             = data.get("sector") or stock_info.get("sector"),
        allocation_percent = allocation_pct,
        amount_invested    = amount_invested,
        quantity           = quantity,
        buy_price          = current_price,
        current_sell_price = current_price,
        trade_type         = trade_type,
        tag1               = data.get("tag1"),
        tag2               = data.get("tag2"),
        tag3               = data.get("tag3"),
        thesis             = data.get("thesis"),
    )
    db.session.add(trade)

    _update_holding(user_id, trade)
    db.session.commit()

    return jsonify({
        "message":       "Trade executed",
        "trade":         trade.to_dict(),
        "cash_balance":  float(portfolio.cash_balance),
    }), 201


# ─────────────────────────────────────────
# GET /portfolio/holdings/<user_id>
# ─────────────────────────────────────────

@portfolio_bp.get("/holdings/<string:user_id>")
@jwt_required()
def get_holdings(user_id):
    holdings = Holding.query.filter_by(user_id=user_id).all()
    return jsonify({
        "user_id":  user_id,
        "holdings": [h.to_dict() for h in holdings],
        "count":    len(holdings),
    }), 200


# ─────────────────────────────────────────
# GET /portfolio/summary/<user_id>
# Returns: portfolio value, P&L, cash, allocation breakdown
# ─────────────────────────────────────────

@portfolio_bp.get("/summary/<string:user_id>")
@jwt_required()
def get_summary(user_id):
    portfolio = PortfolioSetup.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    holdings = Holding.query.filter_by(user_id=user_id).all()

    total_market_value = sum(float(h.market_value or 0) for h in holdings)
    total_pnl          = sum(float(h.profit_loss  or 0) for h in holdings)
    total_portfolio    = round(total_market_value + float(portfolio.cash_balance), 4)
    total_return_pct   = round(
        ((total_portfolio - float(portfolio.total_capital)) / float(portfolio.total_capital)) * 100, 4
    )

    return jsonify({
        "user_id":           user_id,
        "total_capital":     float(portfolio.total_capital),
        "cash_balance":      float(portfolio.cash_balance),
        "holdings_value":    round(total_market_value, 4),
        "total_portfolio":   total_portfolio,
        "total_pnl":         round(total_pnl, 4),
        "total_return_pct":  total_return_pct,
        "holdings_count":    len(holdings),
    }), 200


# ─────────────────────────────────────────
# GET /portfolio/trades/<user_id>
# ─────────────────────────────────────────

@portfolio_bp.get("/trades/<string:user_id>")
@jwt_required()
def get_trades(user_id):
    trades = TradeLog.query.filter_by(user_id=user_id)\
                           .order_by(TradeLog.created_at.desc())\
                           .all()
    return jsonify({
        "user_id": user_id,
        "trades":  [t.to_dict() for t in trades],
        "count":   len(trades),
    }), 200
