# TFT Predictor Service

Temporal Fusion Transformer (TFT) based cryptocurrency price prediction service for TraderPath.

## Overview

This service provides AI-powered price predictions using a TFT model that incorporates:
- Historical OHLCV data (up to 1000 candles)
- Order book imbalance
- Whale activity detection
- Technical indicators
- Time-based features (hour, day, market sessions)

## API Endpoints

### Health Check
```
GET /health
```

### Single Prediction
```
GET /predict/{symbol}
POST /predict
{
  "symbol": "BTC",
  "include_order_book": true,
  "include_whale_activity": true
}
```

### Batch Prediction
```
POST /predict/batch
{
  "symbols": ["BTC", "ETH", "SOL"]
}
```

## Response Format

```json
{
  "symbol": "BTC",
  "price_24h": 95000.0,
  "price_7d": 98000.0,
  "confidence": 75.5,
  "scenarios": [
    {"name": "bull", "price": 105000.0, "probability": 30.0},
    {"name": "base", "price": 98000.0, "probability": 45.0},
    {"name": "bear", "price": 88000.0, "probability": 25.0}
  ],
  "model_type": "tft",
  "data_points": 1000
}
```

## Setup

### Prerequisites
- Python 3.11+
- pip

### Installation

```bash
cd services/tft-predictor
pip install -r requirements.txt
```

### Running the Service

```bash
# Development
python -m uvicorn src.api:app --reload --port 8000

# Production
python -m uvicorn src.api:app --host 0.0.0.0 --port 8000
```

### Docker

```bash
docker build -t tft-predictor .
docker run -p 8000:8000 tft-predictor
```

## Training

To train the TFT model on crypto data:

```bash
python scripts/train.py --symbols BTC,ETH,SOL,BNB,XRP --epochs 50 --output models/tft_crypto.pt
```

### Training Options

| Option | Default | Description |
|--------|---------|-------------|
| --symbols | BTC,ETH,SOL,BNB,XRP | Comma-separated list of symbols |
| --days | 365 | Days of historical data |
| --epochs | 50 | Maximum training epochs |
| --batch-size | 64 | Training batch size |
| --output | models/tft_crypto.pt | Output model path |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| TFT_MODEL_PATH | models/tft_crypto.pt | Path to trained model |
| ALLOWED_ORIGINS | * | CORS allowed origins |

## Integration with Node.js Backend

The main TraderPath API calls this service via HTTP:

```typescript
// In analysis.engine.ts
const tftClient = getTFTClient();
const forecast = await tftClient.predict('BTC');
```

Environment variables for the Node.js backend:

```env
TFT_SERVICE_URL=http://localhost:8000
TFT_ENABLED=true
TFT_TIMEOUT=10000
```

## Model Architecture

The TFT model uses:
- **Encoder**: LSTM for sequence processing
- **Attention**: Multi-head attention for long-range dependencies
- **Variable Selection**: Identifies important features
- **Quantile Output**: Provides uncertainty estimates (10%, 50%, 90%)

### Features Used

| Category | Features |
|----------|----------|
| Time-varying known | hour_of_day, day_of_week, is_weekend, is_market_open |
| Time-varying unknown | OHLCV, returns, volatility, RSI, MACD, order_book_imbalance, whale_activity |
| Static | symbol, category (L1, DeFi, etc.), volatility_tier |

## Fallback Behavior

If the TFT model is not available, the service falls back to a statistical predictor that uses:
- Momentum-based prediction
- Mean reversion
- Volatility-based ranges

This ensures predictions are always available even during model training or service issues.
