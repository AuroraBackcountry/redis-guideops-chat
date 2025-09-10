# Use Python39 for better compatibility
FROM python:3.9
# Copy requirements.txt to the docker image and install packages
COPY requirements.txt /
RUN pip install -r requirements.txt
# Set the WORKDIR to be the folder
COPY . /app
WORKDIR /app
# Use direct Flask-SocketIO execution (not gunicorn)
CMD ["python", "app.py"]
