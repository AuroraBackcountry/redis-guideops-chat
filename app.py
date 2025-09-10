from chat.app import app, run_app  # noqa
import eventlet

# Initialize for both direct run and gunicorn
eventlet.monkey_patch()

# Make app importable for gunicorn (Railway requirement)
# gunicorn will import this as app:app
if __name__ != "__main__":
    # Running under gunicorn - initialize Redis
    from chat import utils
    utils.init_redis()

if __name__ == "__main__":
    # Direct execution
    run_app()
