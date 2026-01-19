# ===========================================
# TFT Predictor Service
# Optimized for Railway deployment (CPU-only)
# ===========================================
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

# Install Python dependencies with CPU-only PyTorch
# Using --extra-index-url ensures we get CPU wheels (no CUDA)
# This significantly reduces image size from ~5GB to ~1GB
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ src/
COPY scripts/ scripts/

# Create models directory (models will be downloaded/trained at runtime)
RUN mkdir -p models

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV TFT_MODEL_PATH=/app/models/tft_crypto.pt
# Force CPU-only mode for PyTorch
ENV CUDA_VISIBLE_DEVICES=""

# Expose port
EXPOSE 8000

# Run the API server
CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
