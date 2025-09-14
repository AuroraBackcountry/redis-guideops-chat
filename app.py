import eventlet

# Initialize eventlet monkey patching FIRST (before any other imports)
eventlet.monkey_patch()

from chat.app import app, run_app  # noqa

# Make app importable for gunicorn (Railway requirement)
# gunicorn will import this as app:app
if __name__ != "__main__":
    # Running under gunicorn - initialize Redis ONLY ONCE
    from chat import utils
    utils.init_redis()
    
    # Initialize Flask session for gunicorn
    from flask_session import Session
    sess = Session()
    sess.init_app(app)

if __name__ == "__main__":
    # Direct execution
    run_app()
