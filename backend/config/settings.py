import os
from pathlib import Path
from tempfile import gettempdir
from datetime import timedelta
from dotenv import load_dotenv
from sqlalchemy.engine import URL

load_dotenv()


def _build_connect_args():
    if os.getenv("DB_SSL", "false").lower() != "true":
        return {}

    ssl_args = {"check_hostname": os.getenv("DB_SSL_VERIFY", "true").lower() == "true"}
    ssl_ca = os.getenv("DB_SSL_CA")
    ssl_ca_pem = os.getenv("DB_SSL_CA_PEM")
    if ssl_ca_pem:
        ssl_path = Path(gettempdir()) / "tradeiq-db-ca.pem"
        ssl_path.write_text(ssl_ca_pem, encoding="utf-8")
        ssl_args["ca"] = str(ssl_path)
    elif ssl_ca:
        ssl_args["ca"] = ssl_ca

    return {"ssl": ssl_args}


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = os.getenv("DB_PORT", "3306")
    DB_NAME     = os.getenv("DB_NAME", "tradeiq")
    DB_USER     = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    SQLALCHEMY_DATABASE_URI = str(URL.create(
        "mysql+pymysql",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=int(DB_PORT),
        database=DB_NAME,
    ))

    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": _build_connect_args(),
    }


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
}


def get_config():
    env = os.getenv("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)
