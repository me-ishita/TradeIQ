from flask import Flask
import os
from sqlalchemy.engine import URL
from config.settings import get_config, _build_connect_args
from app.extensions import db, jwt, cors


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config())

    app.config["SQLALCHEMY_DATABASE_URI"] = str(URL.create(
        "mysql+pymysql",
        username=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "tradeiq"),
    ))
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "connect_args": _build_connect_args()
    }

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    from app.auth.routes      import auth_bp
    from app.market.routes    import market_bp
    from app.portfolio.routes import portfolio_bp
    from app.analytics.routes import analytics_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(market_bp)
    app.register_blueprint(portfolio_bp)
    app.register_blueprint(analytics_bp)

    @app.get("/health")
    def health():
        return {"status": "ok", "app": "TradeIQ Academy"}, 200

    return app