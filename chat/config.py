import os

import redis
from werkzeug.utils import import_string


class Config(object):
    # Railway Redis URL support + fallback to individual env vars
    redis_url = os.environ.get("REDIS_URL")
    
    if redis_url:
        # Railway provides REDIS_URL (redis://user:pass@host:port)
        from urllib.parse import urlparse
        print(f"[DEBUG] Redis URL: {redis_url}")  # Debug logging
        url = urlparse(redis_url)
        print(f"[DEBUG] Parsed - Host: {url.hostname}, Port: {url.port}, Password: {'***' if url.password else None}")
        REDIS_HOST = url.hostname
        REDIS_PORT = url.port or 6379  # Default Redis port if not specified
        REDIS_PASSWORD = url.password
    else:
        # Fallback to individual environment variables
        redis_endpoint_url = os.environ.get("REDIS_ENDPOINT_URL", "127.0.0.1:6379")
        REDIS_HOST, REDIS_PORT = tuple(redis_endpoint_url.split(":"))
        REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)
    
    # Generate secure SECRET_KEY - CRITICAL for session security
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        import secrets
        print("⚠️  WARNING: SECRET_KEY not set! Generating temporary key for this session.")
        print("⚠️  For production, set SECRET_KEY environment variable to a secure random string.")
        SECRET_KEY = secrets.token_hex(32)
    
    SESSION_TYPE = "redis"
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
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
