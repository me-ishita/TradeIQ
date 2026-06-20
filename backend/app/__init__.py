from flask import Flask
from app.extensions import db, jwt, cors


def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = "dev-secret"
    app.config["JWT_SECRET_KEY"] = "dev-jwt-secret"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        "mysql+pymysql://YdgqymojqpaKqJk.root:fRJ2LBHIjVMxsQL8"
        "@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/tradeiq"
        "?ssl_verify_cert=false&ssl_verify_identity=false"
    )
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "connect_args": {"ssl": {"check_hostname": False}}
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