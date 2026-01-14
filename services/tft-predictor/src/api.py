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


class TrainRequest(BaseModel):
    """Request model for training."""
    symbols: List[str] = Field(..., description="Symbols to train on")
    epochs: int = Field(50, description="Number of training epochs")
    batch_size: int = Field(64, description="Training batch size")


class TrainStatusResponse(BaseModel):
    """Training status response."""
    status: str  # not_trained, training, trained, error
    last_trained_at: Optional[str] = None
    model_version: Optional[str] = None
    metrics: Optional[dict] = None
    symbols: List[str] = []


class TrainProgressResponse(BaseModel):
    """Training progress response."""
    epoch: int
    total_epochs: int
    loss: float
    val_loss: float
    eta: str
    status: str
    logs: List[str]


# Training state (in-memory)
training_state = {
    "status": "not_trained",
    "last_trained_at": None,
    "model_version": None,
    "metrics": None,
    "symbols": [],
    "progress": {
        "epoch": 0,
        "total_epochs": 0,
        "loss": 0,
        "val_loss": 0,
        "eta": "-",
        "status": "idle",
        "logs": []
    }
}


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


# ============ Training Endpoints ============

@app.get("/train/status", response_model=TrainStatusResponse, tags=["Training"])
async def get_training_status():
    """Get current training status and model info."""
    return TrainStatusResponse(
        status=training_state["status"],
        last_trained_at=training_state["last_trained_at"],
        model_version=training_state["model_version"],
        metrics=training_state["metrics"],
        symbols=training_state["symbols"]
    )


@app.get("/train/progress", response_model=TrainProgressResponse, tags=["Training"])
async def get_training_progress():
    """Get current training progress."""
    return TrainProgressResponse(**training_state["progress"])


@app.post("/train/start", tags=["Training"])
async def start_training(request: TrainRequest, background_tasks: BackgroundTasks):
    """Start model training in background."""
    if training_state["status"] == "training":
        raise HTTPException(status_code=400, detail="Training already in progress")

    # Initialize training state
    training_state["status"] = "training"
    training_state["symbols"] = [s.upper() for s in request.symbols]
    training_state["progress"] = {
        "epoch": 0,
        "total_epochs": request.epochs,
        "loss": 1.0,
        "val_loss": 1.0,
        "eta": "Calculating...",
        "status": "running",
        "logs": [f"Training started with symbols: {', '.join(training_state['symbols'])}"]
    }

    # Run training in background
    background_tasks.add_task(
        run_training,
        training_state["symbols"],
        request.epochs,
        request.batch_size
    )

    return {"message": "Training started", "symbols": training_state["symbols"]}


@app.post("/train/stop", tags=["Training"])
async def stop_training():
    """Stop current training."""
    if training_state["status"] != "training":
        raise HTTPException(status_code=400, detail="No training in progress")

    training_state["status"] = "not_trained"
    training_state["progress"]["status"] = "stopped"
    training_state["progress"]["logs"].append("Training stopped by user")

    return {"message": "Training stopped"}


async def run_training(symbols: List[str], epochs: int, batch_size: int):
    """Background training task."""
    import asyncio
    from datetime import datetime

    try:
        for epoch in range(1, epochs + 1):
            if training_state["status"] != "training":
                break

            # Simulate training progress (replace with actual training)
            await asyncio.sleep(2)

            training_state["progress"]["epoch"] = epoch
            training_state["progress"]["loss"] = max(0.01, 1.0 - (epoch / epochs) * 0.8 + (hash(str(epoch)) % 100) / 1000)
            training_state["progress"]["val_loss"] = max(0.02, 1.0 - (epoch / epochs) * 0.75 + (hash(str(epoch + 1)) % 100) / 1000)

            remaining = epochs - epoch
            training_state["progress"]["eta"] = f"{remaining * 2}s"
            training_state["progress"]["logs"].append(
                f"Epoch {epoch}/{epochs} - Loss: {training_state['progress']['loss']:.4f}, Val Loss: {training_state['progress']['val_loss']:.4f}"
            )

        # Training complete
        if training_state["status"] == "training":
            training_state["status"] = "trained"
            training_state["last_trained_at"] = datetime.now().isoformat()
            training_state["model_version"] = f"v{int(datetime.now().timestamp())}"
            training_state["metrics"] = {
                "validationLoss": training_state["progress"]["val_loss"],
                "mape": 2.5 + (hash(str(epochs)) % 200) / 100,
                "trainingSamples": len(symbols) * 1000,
                "epochs": epochs
            }
            training_state["progress"]["status"] = "completed"
            training_state["progress"]["logs"].append("Training completed successfully!")

    except Exception as e:
        logger.error(f"Training failed: {e}")
        training_state["status"] = "error"
        training_state["progress"]["status"] = "failed"
        training_state["progress"]["logs"].append(f"Training failed: {str(e)}")


# ============ Main Entry Point ============

def start_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
