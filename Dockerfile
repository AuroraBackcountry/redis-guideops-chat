# Use Python 3.9 for better compatibility
FROM python:3.9

# Copy requirements.txt to the docker image and install packages
COPY requirements.txt /
RUN pip install -r requirements.txt

# Set the WORKDIR to be the folder
COPY . /app
WORKDIR /app

# Copy React build files for frontend
COPY client/build ./client/build

# Production Flask app execution
CMD ["python", "app.py"]
