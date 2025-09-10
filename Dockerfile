# Use Python 3.9 for better compatibility
FROM python:3.9

# Copy requirements.txt to the docker image and install packages
COPY requirements.txt /
RUN pip install -r requirements.txt

# Set the WORKDIR to be the folder
COPY . /app
WORKDIR /app

# Let Railway use gunicorn but with proper configuration
# gunicorn will import app:app and our app.py is now compatible
