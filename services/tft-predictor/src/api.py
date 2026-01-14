"""
FastAPI Application for TFT Prediction Service
Exposes REST API endpoints for crypto price predictions
"""

import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from loguru import logger

from .predictor import get_predictor_service

# Initialize FastAPI
app = FastAPI(
    title="TraderPath TFT Predictor",
    description="Temporal Fusion Transformer for cryptocurrency price prediction",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Request/Response Models ============

class PredictionRequest(BaseModel):
    """Request model for single prediction."""
    symbol: str = Field(..., description="Crypto symbol (e.g., BTC, ETH)")
    include_order_book: bool = Field(True, description="Include order book analysis")
    include_whale_activity: bool = Field(True, description="Include whale detection")


class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions."""
    symbols: List[str] = Field(..., description="List of crypto symbols")


class Scenario(BaseModel):
    """Price scenario model."""
    name: str
    price: float
    probability: float
    change_percent: Optional[float] = None


class PredictionResponse(BaseModel):
    """Response model for prediction."""
    symbol: str
    price_24h: float = Field(..., description="Predicted price in 24 hours")
    price_7d: float = Field(..., description="Predicted price in 7 days")
    confidence: float = Field(..., description="Prediction confidence (0-100)")
    scenarios: List[Scenario] = Field(..., description="Bull/Base/Bear scenarios")
    model_type: str = Field(..., description="Model used (tft or statistical_fallback)")
    data_points: int = Field(..., description="Number of data points used")
    attention_weights: Optional[dict] = Field(None, description="Feature importance")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    model_type: str


# ============ API Endpoints ============

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint."""
    service = get_predictor_service()
    return HealthResponse(
        status="healthy",
        model_loaded=True,
        model_type="tft" if service.use_tft else "statistical_fallback"
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(request: PredictionRequest):
    """
    Generate price prediction for a single cryptocurrency.

    Returns:
    - **price_24h**: Predicted price in 24 hours
    - **price_7d**: Predicted price in 7 days
    - **confidence**: Model confidence (0-100%)
    - **scenarios**: Bull, Base, Bear scenarios with probabilities
    """
    try:
        service = get_predictor_service()
        result = await service.predict(
            symbol=request.symbol.upper(),
            include_order_book=request.include_order_book,
            include_whale_activity=request.include_whale_activity
        )
        return PredictionResponse(**result)
    except Exception as e:
        logger.error(f"Prediction failed for {request.symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", tags=["Prediction"])
async def batch_predict(request: BatchPredictionRequest):
    """
    Generate predictions for multiple cryptocurrencies.

    Returns dictionary of symbol -> prediction mappings.
    """
    try:
        service = get_predictor_service()
        symbols = [s.upper() for s in request.symbols]
        results = await service.batch_predict(symbols)
        return results
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/predict/{symbol}", response_model=PredictionResponse, tags=["Prediction"])
async def predict_get(symbol: str):
    """
    GET endpoint for prediction (convenience endpoint).

    Same as POST /predict but with symbol in path.
    """
    try:
        service = get_predictor_service()
        result = await service.predict(
            symbol=symbol.upper(),
            include_order_book=True,
            include_whale_activity=True
        )
        return PredictionResponse(**result)
    except Exception as e:
        logger.error(f"Prediction failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/symbols", tags=["Info"])
async def get_supported_symbols():
    """Get list of supported cryptocurrency symbols."""
    return {
        "symbols": [
            "BTC", "ETH", "SOL", "BNB", "XRP",
            "ADA", "DOGE", "AVAX", "DOT", "MATIC"
        ],
        "note": "Any symbol available on Binance USDT pair is supported"
    }


# ============ Main Entry Point ============

def start_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
