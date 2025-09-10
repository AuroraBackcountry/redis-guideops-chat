import os

import redis
from werkzeug.utils import import_string


class Config(object):
    # Railway Redis URL support + fallback to individual env vars
    redis_url = os.environ.get("REDIS_URL")
    
    if redis_url:
        # Railway provides REDIS_URL (redis://user:pass@host:port)
        from urllib.parse import urlparse
        url = urlparse(redis_url)
        REDIS_HOST = url.hostname
        REDIS_PORT = url.port
        REDIS_PASSWORD = url.password
    else:
        # Fallback to individual environment variables
        redis_endpoint_url = os.environ.get("REDIS_ENDPOINT_URL", "127.0.0.1:6379")
        REDIS_HOST, REDIS_PORT = tuple(redis_endpoint_url.split(":"))
        REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)
    
    SECRET_KEY = os.environ.get("SECRET_KEY", "Optional default value")
    SESSION_TYPE = "redis"
    redis_client = redis.Redis(
        host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD
    )
    SESSION_REDIS = redis_client
    # TODO: Auth...


class ConfigDev(Config):
    # DEBUG = True
    pass


class ConfigProd(Config):
    pass


def get_config() -> Config:
    return import_string(os.environ.get("CHAT_CONFIG", "chat.config.ConfigDev"))
