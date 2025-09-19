# Use a slim Python base image
FROM python:3.11-slim

# Set environment variables to prevent Python from writing pyc files and to use unbuffered I/O
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port used by the FastAPI server
EXPOSE 8080

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
