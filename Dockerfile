# Use Python 3.9 for better compatibility
FROM python:3.9

# Copy requirements.txt to the docker image and install packages
COPY requirements.txt /
RUN pip install -r requirements.txt

# Set the WORKDIR to be the folder
COPY . /app
WORKDIR /app

# Force direct execution and override Railway's gunicorn detection
CMD ["python", "-c", "import app; import eventlet; eventlet.monkey_patch(); from chat.app import run_app; run_app()"]
