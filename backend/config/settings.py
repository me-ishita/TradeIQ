import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


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

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )


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
