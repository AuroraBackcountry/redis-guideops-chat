from functools import wraps

from flask import jsonify, session


def auth_middleware(f):
    """This decorator will filter out unauthorized connections."""

    @wraps(f)
    def __auth_middleware(*args, **kwargs):
        user = session.get("user", None)
        if not user:
            return jsonify({"error": "Authentication required"}), 403
        return f(*args, **kwargs)

    return __auth_middleware
