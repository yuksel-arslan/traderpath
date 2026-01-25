"""
Google Cloud Vertex AI Training Integration
API'den tetiklenen otomatik TFT model eğitimi
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, List
from google.cloud import aiplatform
from google.cloud import storage
from loguru import logger


class VertexAITrainer:
    """
    Vertex AI üzerinde TFT model eğitimi.

    Kullanım:
        trainer = VertexAITrainer(project_id="traderpath", region="europe-west4")
        job = await trainer.start_training(trade_type="swing", symbols=["BTC", "ETH"])
    """

    def __init__(
        self,
        project_id: str = None,
        region: str = "europe-west4",
        bucket_name: str = None,
    ):
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.region = region
        self.bucket_name = bucket_name or f"{self.project_id}-tft-models"

        # Initialize Vertex AI
        aiplatform.init(project=self.project_id, location=self.region)

    def start_training(
        self,
        trade_type: str = "swing",
        symbols: List[str] = None,
        epochs: int = 100,
        batch_size: int = 64,
        machine_type: str = "n1-standard-8",
        accelerator_type: str = "NVIDIA_TESLA_T4",
        accelerator_count: int = 1,
    ) -> Dict:
        """
        Vertex AI'da training job başlat.

        Args:
            trade_type: scalp, swing, position
            symbols: Eğitilecek semboller
            epochs: Max epoch sayısı
            batch_size: Batch size
            machine_type: GCP machine type
            accelerator_type: GPU tipi
            accelerator_count: GPU sayısı

        Returns:
            Job bilgileri (job_id, status, etc.)
        """
        symbols = symbols or ["BTC", "ETH"]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        job_name = f"tft-{trade_type}-{timestamp}"

        logger.info(f"Starting Vertex AI training job: {job_name}")
        logger.info(f"Trade type: {trade_type}, Symbols: {symbols}")

        # Training script arguments
        args = [
            f"--trade-type={trade_type}",
            f"--symbols={','.join(symbols)}",
            f"--epochs={epochs}",
            f"--batch-size={batch_size}",
            f"--output-bucket={self.bucket_name}",
        ]

        # Create custom training job
        job = aiplatform.CustomJob(
            display_name=job_name,
            worker_pool_specs=[
                {
                    "machine_spec": {
                        "machine_type": machine_type,
                        "accelerator_type": accelerator_type,
                        "accelerator_count": accelerator_count,
                    },
                    "replica_count": 1,
                    "container_spec": {
                        "image_uri": f"gcr.io/{self.project_id}/tft-trainer:latest",
                        "args": args,
                    },
                }
            ],
            staging_bucket=f"gs://{self.bucket_name}",
        )

        # Start training (non-blocking)
        job.submit()

        return {
            "job_id": job.resource_name,
            "job_name": job_name,
            "status": "RUNNING",
            "trade_type": trade_type,
            "symbols": symbols,
            "created_at": timestamp,
            "config": {
                "epochs": epochs,
                "batch_size": batch_size,
                "machine_type": machine_type,
                "accelerator_type": accelerator_type,
            }
        }

    def get_job_status(self, job_id: str) -> Dict:
        """Training job durumunu kontrol et"""
        job = aiplatform.CustomJob.get(job_id)

        return {
            "job_id": job_id,
            "status": job.state.name,
            "error": job.error.message if job.error else None,
            "create_time": str(job.create_time),
            "update_time": str(job.update_time),
            "end_time": str(job.end_time) if job.end_time else None,
        }

    def list_jobs(self, limit: int = 10) -> List[Dict]:
        """Son training job'ları listele"""
        jobs = aiplatform.CustomJob.list(
            filter=f'display_name:"tft-"',
            order_by="create_time desc",
        )

        return [
            {
                "job_id": job.resource_name,
                "display_name": job.display_name,
                "status": job.state.name,
                "create_time": str(job.create_time),
            }
            for job in jobs[:limit]
        ]

    def download_model(self, job_name: str, local_path: str) -> str:
        """Eğitilmiş modeli Cloud Storage'dan indir"""
        storage_client = storage.Client(project=self.project_id)
        bucket = storage_client.bucket(self.bucket_name)

        # Model dosyasını bul
        blobs = bucket.list_blobs(prefix=f"models/{job_name}")

        for blob in blobs:
            if blob.name.endswith(".pt"):
                local_file = f"{local_path}/{os.path.basename(blob.name)}"
                blob.download_to_filename(local_file)
                logger.info(f"Model downloaded: {local_file}")
                return local_file

        raise FileNotFoundError(f"Model not found for job: {job_name}")


# Alternatif: Cloud Run Jobs (daha ucuz, GPU yok)
class CloudRunJobTrainer:
    """
    Cloud Run Jobs ile CPU-only training.
    Daha küçük modeller için uygun.
    """

    def __init__(self, project_id: str = None, region: str = "europe-west4"):
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.region = region

    def start_training(
        self,
        trade_type: str = "swing",
        symbols: List[str] = None,
        epochs: int = 50,
    ) -> Dict:
        """Cloud Run Job başlat"""
        from google.cloud import run_v2

        symbols = symbols or ["BTC", "ETH"]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        job_name = f"tft-{trade_type}-{timestamp}"

        client = run_v2.JobsClient()

        job = run_v2.Job(
            template=run_v2.ExecutionTemplate(
                template=run_v2.TaskTemplate(
                    containers=[
                        run_v2.Container(
                            image=f"gcr.io/{self.project_id}/tft-trainer:latest",
                            env=[
                                run_v2.EnvVar(name="TRADE_TYPE", value=trade_type),
                                run_v2.EnvVar(name="SYMBOLS", value=",".join(symbols)),
                                run_v2.EnvVar(name="EPOCHS", value=str(epochs)),
                            ],
                            resources=run_v2.ResourceRequirements(
                                limits={"cpu": "8", "memory": "32Gi"}
                            ),
                        )
                    ],
                    timeout="7200s",  # 2 saat timeout
                )
            )
        )

        operation = client.create_job(
            parent=f"projects/{self.project_id}/locations/{self.region}",
            job=job,
            job_id=job_name,
        )

        # Job'u çalıştır
        client.run_job(name=f"projects/{self.project_id}/locations/{self.region}/jobs/{job_name}")

        return {
            "job_id": job_name,
            "status": "RUNNING",
            "trade_type": trade_type,
            "symbols": symbols,
        }
