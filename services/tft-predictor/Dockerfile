# TFT Predictor Service
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ src/
COPY scripts/ scripts/
COPY models/ models/ 2>/dev/null || mkdir -p models

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV TFT_MODEL_PATH=/app/models/tft_crypto.pt

# Expose port
EXPOSE 8000

# Run the API server
CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
