# Use Python for Flask app with existing React build
FROM python:3.9

# Copy requirements.txt and install Python packages
COPY requirements.txt /
RUN pip install -r requirements.txt

# Copy Flask app and existing React build
COPY . /app
WORKDIR /app

# Production Flask app execution with gunicorn
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:$PORT", "--worker-class", "eventlet", "-w", "1"]