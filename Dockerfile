# Use Node.js for building React, then Python for running Flask
FROM node:16 AS frontend-builder

# Copy React app and build it
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client/ ./
RUN npm run build

# Use Python for the main app
FROM python:3.9

# Copy requirements.txt and install Python packages
COPY requirements.txt /
RUN pip install -r requirements.txt

# Copy Flask app
COPY . /app
WORKDIR /app

# Copy built React app from previous stage
COPY --from=frontend-builder ./build ./client/build

# Production Flask app execution
CMD ["python", "app.py"]