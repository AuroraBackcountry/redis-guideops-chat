# Use Python for Flask app with existing React build
FROM python:3.9

# Copy requirements.txt and install Python packages
COPY requirements.txt /
RUN pip install -r requirements.txt

# Copy Flask app and existing React build
COPY . /app
WORKDIR /app

# Production Flask app execution
CMD ["python", "app.py"]