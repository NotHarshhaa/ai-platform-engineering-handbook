# Model Packaging & Serving

---

## 1. Model Serialization Techniques

Serialization converts a trained model into a **storable, transferable format** that can be loaded and used later for inference.

```
Training                    Serialization              Inference
─────────────               ─────────────              ─────────
model.fit(X, y)  ────────►  model.pkl / .pt  ────────► model.predict(X)
                            model.onnx                 (different machine,
                            SavedModel/                 different time,
                            TorchScript                 different language)
```

**Serialization formats by framework:**

```
Scikit-learn / XGBoost / LightGBM
├── joblib           → best for sklearn (handles numpy arrays well)
├── pickle           → Python-native (not cross-language safe)
└── ONNX             → framework-agnostic, production-grade

PyTorch
├── torch.save()     → saves full model or state_dict
├── TorchScript      → optimized, serialized computation graph
└── ONNX export      → interoperable with other runtimes

TensorFlow / Keras
├── SavedModel       → TF native, includes computation graph
├── HDF5 (.h5)       → Keras legacy format
└── TFLite           → edge/mobile deployment
└── ONNX             → cross-framework export

XGBoost / LightGBM native
├── model.save_model('model.ubj')   → binary, fastest load
└── model.save_model('model.json')  → human-readable
```

**Serialization examples:**

```python
# ── joblib (sklearn) ─────────────────────────────────────
import joblib
from sklearn.pipeline import Pipeline

# Save
pipeline = Pipeline([('scaler', scaler), ('model', clf)])
joblib.dump(pipeline, 'pipeline_v2.pkl', compress=3)

# Load
pipeline = joblib.load('pipeline_v2.pkl')
preds = pipeline.predict(X_new)

# ── TorchScript (PyTorch — production preferred) ─────────
import torch

# Method 1: trace (static graph, no control flow)
example_input = torch.rand(1, 3, 224, 224)
traced = torch.jit.trace(model, example_input)
traced.save('model_traced.pt')

# Method 2: script (handles if/else, loops)
scripted = torch.jit.script(model)
scripted.save('model_scripted.pt')

# Load & infer (no model class needed)
loaded = torch.jit.load('model_scripted.pt')
output = loaded(input_tensor)

# ── ONNX (cross-framework, recommended for production) ───
import torch.onnx

torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    export_params=True,
    opset_version=17,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={
        'input':  {0: 'batch_size'},    # variable batch size
        'output': {0: 'batch_size'},
    }
)

# Run ONNX with onnxruntime (fast CPU/GPU inference)
import onnxruntime as ort

session = ort.InferenceSession(
    "model.onnx",
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
)
outputs = session.run(None, {'input': X_numpy})

# ── TensorFlow SavedModel ─────────────────────────────────
# Save
model.save('saved_model/my_model')          # directory format
model.save('my_model.h5')                   # legacy H5

# Load
loaded = tf.saved_model.load('saved_model/my_model')
predictions = loaded(tf.constant(X_new))
```

**Serialization comparison:**

| Format | Size | Speed | Portability | Best For |
|---|---|---|---|---|
| **joblib** | Medium | Fast | Python only | Sklearn prod |
| **pickle** | Medium | Fast | Python only | Development |
| **ONNX** | Medium | Very Fast | Cross-language | Production APIs |
| **TorchScript** | Medium | Fast | C++ deployable | PyTorch prod |
| **SavedModel** | Large | Fast | TF ecosystem | TF Serving |
| **TFLite** | Small | Very Fast | Mobile/edge | Edge devices |

---

## 2. Model Packaging Strategies

Packaging bundles **model + preprocessing + inference code + dependencies** into a deployable unit.

**What a complete package contains:**

```
model_package/
├── model/
│   ├── model.onnx              # serialized model weights
│   └── model_config.json       # architecture / thresholds
├── preprocessing/
│   ├── scaler.pkl              # fitted transformers
│   ├── encoder.pkl
│   └── feature_schema.json     # expected input columns + types
├── postprocessing/
│   └── label_map.json          # {0: "no churn", 1: "churn"}
├── serving/
│   ├── predict.py              # inference logic
│   ├── schema.py               # pydantic input/output models
│   └── requirements.txt
└── metadata/
    ├── model_card.json         # performance, limitations, version
    ├── metrics.json            # val_auc, f1, etc.
    └── data_version.txt        # which dataset trained this
```

**Model packaging strategies:**

```
Strategy 1: Python Package (pip installable)
────────────────────────────────────────────
my-churn-model/
├── setup.py / pyproject.toml
├── churn_model/
│   ├── __init__.py
│   ├── model.py       (ChurnPredictor class)
│   └── assets/        (model.pkl, scaler.pkl)
└── tests/

pip install my-churn-model==2.4.1
from churn_model import ChurnPredictor

Strategy 2: Docker Container (most common)
──────────────────────────────────────────
FROM python:3.11-slim
COPY model_package/ /app/
RUN pip install -r /app/requirements.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]

Strategy 3: MLflow Model (framework-agnostic)
─────────────────────────────────────────────
mlflow.pyfunc.log_model(...)
→ models:/ChurnPredictor/Production
→ loadable anywhere with mlflow.pyfunc.load_model()

Strategy 4: BentoML Service
────────────────────────────
@bentoml.service
class ChurnService:
    model = bentoml.models.get("churn_model:latest")
    → builds Docker image, Kubernetes manifest automatically
```

---

## 3. REST API for ML Inference

REST APIs are the **standard interface** for exposing model predictions to consumers.

**API design principles for ML:**

```
Endpoint Design
├── POST /predict          → single prediction
├── POST /predict/batch    → batch predictions
├── GET  /health           → liveness check
├── GET  /ready            → readiness check
├── GET  /metrics          → prometheus metrics
└── GET  /info             → model metadata

Request/Response Design
├── Clear input schema      (Pydantic validation)
├── Confidence scores       (not just class labels)
├── Model version           (in response header)
├── Request ID              (for tracing)
└── Latency budget          (p99 < 100ms for real-time)
```

**Complete REST API design:**

```python
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid, time

app = FastAPI(
    title="Churn Prediction API",
    version="2.4.1",
    description="Predicts 30-day churn probability per customer"
)

# ── Input schema ─────────────────────────────────────────
class CustomerFeatures(BaseModel):
    customer_id:    str
    tenure_days:    int   = Field(..., ge=0, le=36500)
    monthly_spend:  float = Field(..., ge=0)
    plan_type:      str   = Field(..., pattern="^(basic|pro|enterprise)$")
    support_tickets:int   = Field(..., ge=0)
    last_login_days:int   = Field(..., ge=0)

    @validator('monthly_spend')
    def spend_not_nan(cls, v):
        if v != v:   # NaN check
            raise ValueError('monthly_spend cannot be NaN')
        return v

# ── Output schema ─────────────────────────────────────────
class PredictionResponse(BaseModel):
    customer_id:       str
    churn_probability: float = Field(..., ge=0.0, le=1.0)
    churn_prediction:  bool
    risk_segment:      str   # low / medium / high
    model_version:     str
    request_id:        str
    inference_time_ms: float

# ── Prediction endpoint ───────────────────────────────────
@app.post("/predict", response_model=PredictionResponse)
async def predict(customer: CustomerFeatures, request: Request):
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:
        features = preprocess(customer)
        prob = model.predict_proba(features)[0][1]
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"Inference failed: {str(e)}")

    latency_ms = (time.perf_counter() - start_time) * 1000

    return PredictionResponse(
        customer_id=       customer.customer_id,
        churn_probability= round(float(prob), 4),
        churn_prediction=  prob >= 0.47,
        risk_segment=      "high" if prob > 0.7 else
                           "medium" if prob > 0.4 else "low",
        model_version=     "2.4.1",
        request_id=        request_id,
        inference_time_ms= round(latency_ms, 2),
    )
```

---

## 4. Batch vs Real-Time Inference

```
Two fundamental serving paradigms — each has a distinct role:

Real-Time (Online) Inference          Batch Inference
───────────────────────────           ───────────────
Request → Model → Response            Trigger → Model → Output File
     < 100ms latency                       Minutes to hours OK
     One or few records                    Millions of records
     Always-on service                     Scheduled job
     Synchronous / async                   Asynchronous always
     REST API / gRPC                       Spark / Ray / Airflow
```

**When to use each:**

| Use Case | Paradigm | Why |
|---|---|---|
| Fraud detection at payment | Real-time | Decision needed in < 100ms |
| Product recommendations on page load | Real-time | User is waiting |
| Daily churn scores for CRM | Batch | Scores needed before day starts |
| Monthly risk scoring for 10M accounts | Batch | Volume too large for real-time |
| Email personalization | Batch | Pre-compute overnight |
| Autonomous vehicle decisions | Real-time | Life-critical, sub-ms |

**Batch inference pipeline:**

```python
# PySpark batch inference — millions of records
from pyspark.sql import SparkSession
from pyspark.sql.functions import pandas_udf
import pandas as pd
import mlflow

spark = SparkSession.builder.appName("ChurnBatchScoring").getOrCreate()

# Load model once (broadcast to all workers)
model = mlflow.sklearn.load_model("models:/ChurnPredictor/Production")
model_broadcast = spark.sparkContext.broadcast(model)

@pandas_udf("double")
def predict_udf(
    tenure: pd.Series,
    spend: pd.Series,
    plan: pd.Series
) -> pd.Series:
    """Vectorized UDF — runs on each partition in parallel."""
    X = pd.DataFrame({'tenure': tenure, 'spend': spend, 'plan': plan})
    return pd.Series(
        model_broadcast.value.predict_proba(X)[:, 1]
    )

# Score all 10M customers
df = spark.read.parquet("s3://data/customers/2024-01-20/")
scored = df.withColumn(
    "churn_probability",
    predict_udf(df.tenure_days, df.monthly_spend, df.plan_type)
)

# Write results
scored.write.mode("overwrite") \
      .partitionBy("segment") \
      .parquet("s3://predictions/churn/2024-01-20/")
```

---

## 5. Synchronous vs Asynchronous Serving

```
Synchronous Serving:
Client ──request──► API ──► Model ──► Response ──► Client
                     ← client BLOCKS and waits →
       |←────────── end-to-end latency ──────────►|

Asynchronous Serving:
Client ──request──► API ──► Queue ──► Workers ──► Results Store
          ↓                                            ↑
       Job ID                                     Client polls
       returned                                   or webhook fires
       immediately
```

**Async serving architecture:**

```python
# ── Async request submission ──────────────────────────────
@app.post("/predict/async", status_code=202)
async def submit_prediction(request: PredictionRequest):
    job_id = str(uuid.uuid4())

    # Push to Redis queue (Celery / RQ)
    task = predict_task.delay(
        job_id=job_id,
        features=request.dict()
    )

    return {
        "job_id": job_id,
        "status": "queued",
        "poll_url": f"/predict/status/{job_id}"
    }

# ── Status polling endpoint ───────────────────────────────
@app.get("/predict/status/{job_id}")
async def get_prediction_status(job_id: str):
    result = redis_client.get(f"prediction:{job_id}")

    if result is None:
        return {"job_id": job_id, "status": "processing"}

    return {
        "job_id":     job_id,
        "status":     "completed",
        "prediction": json.loads(result)
    }

# ── Celery worker (runs inference) ───────────────────────
from celery import Celery

celery_app = Celery('ml_worker', broker='redis://redis:6379/0')

@celery_app.task
def predict_task(job_id: str, features: dict):
    result = model.predict(features)
    redis_client.setex(
        f"prediction:{job_id}",
        3600,            # TTL: 1 hour
        json.dumps(result)
    )
```

**When to use which:**

| Pattern | Latency | Use When |
|---|---|---|
| **Synchronous** | Low (< 500ms) | Real-time UI, fraud checks, autocomplete |
| **Async polling** | Medium (seconds) | Heavy models, GPU warming, report generation |
| **Async webhook** | Medium-high | Batch jobs, third-party callbacks |
| **Streaming** | Continuous | LLM token streaming, real-time scoring |

---

## 6. FastAPI for Model Serving

FastAPI is the **de facto standard** for Python ML APIs — async, fast, auto-documented.

```python
# ── Complete production FastAPI ML server ─────────────────

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, make_asgi_app
from typing import List
import mlflow, joblib, numpy as np
import time, logging, asyncio

logger = logging.getLogger(__name__)

# ── Global model state ────────────────────────────────────
class ModelState:
    model = None
    preprocessor = None
    model_version = None
    is_ready = False

model_state = ModelState()

# ── Lifespan (startup / shutdown) ────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load model once
    logger.info("Loading model...")
    model_state.model = mlflow.sklearn.load_model(
        "models:/ChurnPredictor/Production"
    )
    model_state.preprocessor = joblib.load("preprocessor.pkl")
    model_state.model_version = "2.4.1"
    model_state.is_ready = True
    logger.info("Model loaded ✅")

    yield   # app runs here

    # Shutdown: cleanup
    model_state.is_ready = False
    logger.info("Server shutting down")

app = FastAPI(
    title="Churn Prediction Service",
    version="2.4.1",
    lifespan=lifespan
)

# ── Middleware ────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.company.com"],
    allow_methods=["POST", "GET"],
)

# ── Prometheus metrics ────────────────────────────────────
REQUEST_COUNT   = Counter('predictions_total', 'Total predictions',
                          ['model_version', 'risk_segment'])
REQUEST_LATENCY = Histogram('prediction_latency_seconds',
                             'Prediction latency',
                             buckets=[.005, .01, .025, .05, .1, .25])

app.mount("/metrics", make_asgi_app())

# ── Schemas ───────────────────────────────────────────────
class CustomerInput(BaseModel):
    customer_id:     str
    tenure_days:     int   = Field(..., ge=0)
    monthly_spend:   float = Field(..., ge=0)
    plan_type:       str
    support_tickets: int   = Field(default=0, ge=0)

class BatchInput(BaseModel):
    customers: List[CustomerInput] = Field(..., max_items=1000)

class PredictionOut(BaseModel):
    customer_id:       str
    churn_probability: float
    risk_segment:      str
    model_version:     str

# ── Health endpoints ──────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "alive"}

@app.get("/ready")
async def ready():
    if not model_state.is_ready:
        raise HTTPException(503, "Model not loaded yet")
    return {"status": "ready", "model_version": model_state.model_version}

# ── Prediction endpoint ───────────────────────────────────
@app.post("/predict", response_model=PredictionOut)
async def predict(customer: CustomerInput):
    if not model_state.is_ready:
        raise HTTPException(503, "Model not ready")

    with REQUEST_LATENCY.time():
        # Run inference in thread pool (non-blocking)
        loop = asyncio.get_event_loop()
        prob = await loop.run_in_executor(
            None, _run_inference, customer
        )

    segment = "high" if prob > 0.7 else "medium" if prob > 0.4 else "low"
    REQUEST_COUNT.labels(
        model_version=model_state.model_version,
        risk_segment=segment
    ).inc()

    return PredictionOut(
        customer_id=       customer.customer_id,
        churn_probability= round(float(prob), 4),
        risk_segment=      segment,
        model_version=     model_state.model_version,
    )

# ── Batch prediction endpoint ─────────────────────────────
@app.post("/predict/batch", response_model=List[PredictionOut])
async def predict_batch(batch: BatchInput):
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(
        None, _run_batch_inference, batch.customers
    )
    return results

def _run_inference(customer: CustomerInput) -> float:
    X = model_state.preprocessor.transform(
        [[customer.tenure_days, customer.monthly_spend,
          customer.plan_type, customer.support_tickets]]
    )
    return model_state.model.predict_proba(X)[0][1]

def _run_batch_inference(customers: List[CustomerInput]):
    rows = [[c.tenure_days, c.monthly_spend,
             c.plan_type, c.support_tickets] for c in customers]
    X = model_state.preprocessor.transform(rows)
    probs = model_state.model.predict_proba(X)[:, 1]
    return [
        PredictionOut(
            customer_id=c.customer_id,
            churn_probability=round(float(p), 4),
            risk_segment="high" if p > 0.7 else "medium" if p > 0.4 else "low",
            model_version=model_state.model_version,
        )
        for c, p in zip(customers, probs)
    ]
```

---

## 7. BentoML Fundamentals

BentoML is an **ML serving framework** that standardizes packaging and deployment — from development to production.

```
BentoML Architecture:
──────────────────────────────────────────────────────
   Train model → Save to BentoML Store → Build Bento
                                              │
                         ┌────────────────────┼──────────────────┐
                         ▼                    ▼                  ▼
                   Docker Image         Kubernetes         Serverless
                   (self-hosted)        (via helm)         (BentoCloud)
```

**BentoML service definition:**

```python
# service.py
import bentoml
import numpy as np
from pydantic import BaseModel
from typing import List

# ── Save model to BentoML store ───────────────────────────
# (run once after training)
bentoml.sklearn.save_model(
    "churn_predictor",
    pipeline,
    signatures={"predict_proba": {"batchable": True, "batch_dim": 0}},
    metadata={
        "val_auc": 0.943,
        "dataset": "customer_events_v3",
    },
    labels={"team": "ml-platform", "task": "classification"},
)

# ── Define BentoML Service ────────────────────────────────
@bentoml.service(
    resources={"cpu": "2", "memory": "1Gi"},
    traffic={"timeout": 30, "max_concurrency": 32},
)
class ChurnPredictor:

    # Load model as class variable (loaded once on startup)
    model_ref = bentoml.models.get("churn_predictor:latest")
    model = bentoml.depends(model_ref)

    class Input(BaseModel):
        tenure_days:    int
        monthly_spend:  float
        plan_type:      str
        support_tickets: int

    class Output(BaseModel):
        churn_probability: float
        risk_segment:      str

    @bentoml.api(batchable=True, batch_dim=0, max_batch_size=64)
    async def predict(self, input_data: Input) -> Output:
        features = self._preprocess(input_data)
        prob = self.model.predict_proba(features)[0][1]
        return self.Output(
            churn_probability=round(float(prob), 4),
            risk_segment="high" if prob > 0.7 else
                         "medium" if prob > 0.4 else "low",
        )

    def _preprocess(self, data: Input):
        return [[
            data.tenure_days,
            data.monthly_spend,
            {"basic": 0, "pro": 1, "enterprise": 2}[data.plan_type],
            data.support_tickets,
        ]]
```

**BentoML build & deployment:**

```bash
# Run locally (development)
bentoml serve service:ChurnPredictor --reload --port 3000

# Build Bento (packaged artifact)
bentoml build

# Containerize
bentoml containerize churn_predictor:latest \
  --image-tag myregistry/churn-service:v2.4.1

# List saved models
bentoml models list

# List bentos
bentoml list
```

---

## 8. Model Registry Concepts

The model registry is the **central catalog** for all production-ready models.

```
Model Registry serves as:
├── Version store      → every model version stored and retrievable
├── Lifecycle manager  → None → Staging → Production → Archived
├── Metadata store     → metrics, lineage, who approved, when
├── Collaboration hub  → data scientists share, ops teams deploy
└── Audit log          → full history of promotions and changes
```

**Registry lifecycle states:**

```
                    ┌──────────┐
 Experiment ───────►│   None   │ (logged but not registered)
                    └────┬─────┘
                         │ register
                    ┌────▼─────┐
                    │ Staging  │ ← integration tests, A/B eval
                    └────┬─────┘
                         │ promote (after approval)
                    ┌────▼──────────┐
                    │  Production   │ ← serving live traffic
                    └────┬──────────┘
                         │ new version replaces it
                    ┌────▼─────┐
                    │ Archived │ ← kept for rollback
                    └──────────┘
```

**Registry operations pattern:**

```python
from mlflow.tracking import MlflowClient

client = MlflowClient(tracking_uri="http://mlflow:5000")

# Search registry for best model by metric
runs = client.search_runs(
    experiment_ids=["1"],
    filter_string="metrics.val_auc > 0.93 AND tags.status = 'validated'",
    order_by=["metrics.val_auc DESC"],
    max_results=1
)
best_run = runs[0]

# Register best run's model
version = client.create_model_version(
    name="ChurnPredictor",
    source=f"{best_run.info.artifact_uri}/model",
    run_id=best_run.info.run_id,
    description=f"val_auc={best_run.data.metrics['val_auc']:.3f}",
    tags={
        "dataset_version": best_run.data.tags["dataset_version"],
        "approved_by":     "ml-review-board",
    }
)

# Promote to production (archive current)
current_prod = client.get_latest_versions(
    "ChurnPredictor", stages=["Production"]
)
if current_prod:
    client.transition_model_version_stage(
        name="ChurnPredictor",
        version=current_prod[0].version,
        stage="Archived"
    )

client.transition_model_version_stage(
    name="ChurnPredictor",
    version=version.version,
    stage="Production"
)
```

---

## 9. Containerizing ML Models

Containers are the **standard unit of deployment** for ML models in production.

```dockerfile
# ── Dockerfile for ML serving (multi-stage) ──────────────

# Stage 1: dependency builder
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: runtime (minimal)
FROM python:3.11-slim AS runtime

# Security: non-root user
RUN groupadd -r mluser && useradd -r -g mluser -u 1001 mluser

WORKDIR /app

# Copy only installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy model artifacts and serving code
COPY --chown=mluser:mluser model_artifacts/ ./model_artifacts/
COPY --chown=mluser:mluser src/                ./src/

# Runtime environment
ENV PATH=/root/.local/bin:$PATH
ENV MODEL_PATH=/app/model_artifacts/model.onnx
ENV PREPROCESSOR_PATH=/app/model_artifacts/preprocessor.pkl
ENV PORT=8080
ENV WORKERS=4

USER mluser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "src.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "--workers", "4", \
     "--log-level", "info"]
```

**Kubernetes deployment for ML model:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: churn-predictor
  namespace: ml-serving
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: churn-predictor
        image: myregistry/churn-service:v2.4.1
        ports:
        - containerPort: 8080
        env:
        - name: MODEL_VERSION
          value: "2.4.1"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 45    # wait for model load
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
```

---

## 10. Health & Readiness Endpoints for Models

ML services have **unique health requirements** — the model must be loaded before the service is ready.

```python
# ── Complete health endpoint implementation ───────────────
import time, psutil, platform
from fastapi import FastAPI, HTTPException, status
from typing import Dict, Any

class HealthStatus:
    def __init__(self):
        self.start_time = time.time()
        self.model_loaded = False
        self.model_load_time_ms = None
        self.last_inference_time = None
        self.total_predictions = 0
        self.failed_predictions = 0

health_status = HealthStatus()

# ── /health — liveness (is the process alive?) ───────────
@app.get("/health", status_code=200)
async def health() -> Dict[str, Any]:
    """
    Liveness probe — returns 200 if process is running.
    Kubernetes restarts container if this fails.
    """
    return {
        "status":   "alive",
        "uptime_s": round(time.time() - health_status.start_time, 1),
    }

# ── /ready — readiness (can it serve traffic?) ───────────
@app.get("/ready", status_code=200)
async def ready() -> Dict[str, Any]:
    """
    Readiness probe — returns 200 only when model is loaded.
    Kubernetes removes pod from Service until this passes.
    503 = not ready yet (still loading model).
    """
    if not health_status.model_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet"
        )

    return {
        "status":              "ready",
        "model_version":       MODEL_VERSION,
        "model_load_time_ms":  health_status.model_load_time_ms,
    }

# ── /healthz/deep — deep health (dependency checks) ───────
@app.get("/healthz/deep")
async def deep_health() -> Dict[str, Any]:
    """
    Comprehensive health: checks model + dependencies.
    Used by monitoring systems, not K8s probes.
    """
    checks = {}

    # Check model loaded and responsive
    try:
        dummy = [[365, 50.0, 0, 0]]   # dummy inference
        _ = model.predict_proba(dummy)
        checks["model"] = {"status": "ok"}
    except Exception as e:
        checks["model"] = {"status": "error", "detail": str(e)}

    # Check memory
    mem = psutil.virtual_memory()
    checks["memory"] = {
        "status":         "ok" if mem.percent < 90 else "warning",
        "used_percent":   mem.percent,
        "available_mb":   mem.available // (1024**2),
    }

    # Check feature store / downstream dependency
    try:
        redis_client.ping()
        checks["cache"] = {"status": "ok"}
    except Exception:
        checks["cache"] = {"status": "unavailable"}

    # Overall status
    is_healthy = all(c["status"] in ("ok", "warning")
                     for c in checks.values())

    return {
        "status":             "healthy" if is_healthy else "degraded",
        "model_version":      MODEL_VERSION,
        "total_predictions":  health_status.total_predictions,
        "error_rate_pct":     round(
            health_status.failed_predictions /
            max(health_status.total_predictions, 1) * 100, 2
        ),
        "checks":             checks,
    }
```

---

## 11. Versioned Model Deployment

Running **multiple model versions simultaneously** for canary, A/B testing, and zero-downtime updates.

**Version routing strategies:**

```
Strategy 1: Header-based routing
  Request Header: X-Model-Version: v2
  → routes to v2 service

Strategy 2: Traffic split (canary)
  90% traffic → model v2.4.1 (stable)
  10% traffic → model v2.5.0 (canary)

Strategy 3: User-based routing
  user_id hash % 100 < 10 → v2.5.0
  else → v2.4.1

Strategy 4: Explicit endpoint versioning
  POST /v1/predict → model v1.x
  POST /v2/predict → model v2.x
```

**Kubernetes Istio canary deployment:**

```yaml
# VirtualService — traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: churn-predictor
spec:
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: churn-predictor
        subset: v250             # 100% canary if header set

  - route:                       # default traffic split
    - destination:
        host: churn-predictor
        subset: v241
      weight: 90                 # 90% → stable
    - destination:
        host: churn-predictor
        subset: v250
      weight: 10                 # 10% → canary

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: churn-predictor
spec:
  subsets:
  - name: v241
    labels:
      model-version: "2.4.1"
  - name: v250
    labels:
      model-version: "2.5.0"
```

**FastAPI multi-version routing:**

```python
# Mount multiple model versions on same server
from fastapi import FastAPI

app = FastAPI()

# Load both versions at startup
models = {
    "v1": load_model("models:/ChurnPredictor/1"),
    "v2": load_model("models:/ChurnPredictor/2"),
}

@app.post("/v1/predict")
async def predict_v1(customer: CustomerInput):
    return run_inference(models["v1"], customer)

@app.post("/v2/predict")
async def predict_v2(customer: CustomerInput):
    return run_inference(models["v2"], customer)

@app.post("/predict")          # routes to current prod version
async def predict_current(customer: CustomerInput):
    return run_inference(models[CURRENT_VERSION], customer)
```

---

## 12. API Performance Optimization

```
ML API Latency Budget:
  Total budget:        100ms (p99)
  ├── Network:         5ms
  ├── API overhead:    5ms
  ├── Preprocessing:   10ms
  ├── Model inference: 70ms  ← usually the bottleneck
  └── Postprocessing:  10ms
```

**Optimization techniques:**

```python
# ── 1. Model caching — load once, reuse forever ───────────
from functools import lru_cache

@lru_cache(maxsize=1)
def get_model():
    return mlflow.sklearn.load_model("models:/ChurnPredictor/Production")

# ── 2. Input batching — group requests for GPU efficiency ─
from asyncio import Queue, sleep
import asyncio

class BatchProcessor:
    def __init__(self, model, max_batch=32, max_wait_ms=10):
        self.model = model
        self.max_batch = max_batch
        self.max_wait_ms = max_wait_ms
        self.queue = Queue()

    async def predict(self, features):
        future = asyncio.get_event_loop().create_future()
        await self.queue.put((features, future))
        return await future

    async def process_loop(self):
        while True:
            batch, futures = [], []
            deadline = time.time() + self.max_wait_ms / 1000

            # Collect batch until full or deadline
            while len(batch) < self.max_batch:
                try:
                    timeout = max(0, deadline - time.time())
                    features, future = await asyncio.wait_for(
                        self.queue.get(), timeout=timeout
                    )
                    batch.append(features)
                    futures.append(future)
                except asyncio.TimeoutError:
                    break

            if batch:
                results = self.model.predict_proba(np.array(batch))
                for future, result in zip(futures, results):
                    future.set_result(result[1])

# ── 3. ONNX Runtime — 2-5x faster inference ──────────────
import onnxruntime as ort

session = ort.InferenceSession(
    "model.onnx",
    sess_options=_get_session_options(),
    providers=['CPUExecutionProvider']
)

def _get_session_options():
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4       # CPU parallelism
    opts.inter_op_num_threads = 1
    opts.graph_optimization_level = (
        ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    )
    opts.enable_mem_pattern = True
    return opts

# ── 4. Response caching (for repeated inputs) ─────────────
import hashlib, json
from redis import Redis

redis = Redis(host='redis', port=6379, db=0)

def get_cached_or_predict(features: dict) -> float:
    cache_key = "pred:" + hashlib.md5(
        json.dumps(features, sort_keys=True).encode()
    ).hexdigest()

    cached = redis.get(cache_key)
    if cached:
        return float(cached)

    prob = model.predict_proba([list(features.values())])[0][1]
    redis.setex(cache_key, 300, str(prob))   # TTL: 5 min
    return prob

# ── 5. uvicorn workers + gunicorn ────────────────────────
# gunicorn.conf.py
workers = 4                    # CPU cores
worker_class = "uvicorn.workers.UvicornWorker"
bind = "0.0.0.0:8080"
timeout = 30
keepalive = 5
```

---

## 13. GPU vs CPU Serving Considerations

```
GPU Serving                      CPU Serving
───────────────────────          ───────────────────────
High throughput (batching)       Low-medium throughput
Low latency WITH batching        Consistent low latency
Deep learning models             Traditional ML models
Images, NLP, embeddings          Tabular, tree models
Expensive ($0.50-3/hr per GPU)   Cheap ($0.01-0.10/hr)
Complex scaling                  Simple horizontal scaling
Warm-up latency (CUDA init)      Ready immediately
```

**When to use GPU:**

```
Use GPU for:                     Use CPU for:
├── Neural networks              ├── XGBoost / LightGBM
├── Transformers (BERT, GPT)     ├── Scikit-learn models
├── CNNs (image models)          ├── Rule-based postprocessing
├── Embeddings generation        ├── Simple regression
├── Large batch inference        └── Low-traffic services
└── Real-time NLP features
```

**GPU serving optimizations:**

```python
# ── TensorRT — NVIDIA's inference optimizer ───────────────
# Optimizes PyTorch/ONNX models for specific GPU
import torch_tensorrt

optimized_model = torch_tensorrt.compile(
    model,
    inputs=[torch_tensorrt.Input(
        min_shape=[1, 3, 224, 224],
        opt_shape=[32, 3, 224, 224],    # optimal batch size
        max_shape=[64, 3, 224, 224],
        dtype=torch.half                # FP16 for 2x speed
    )],
    enabled_precisions={torch.half}     # FP16 precision
)

# ── Triton Inference Server (NVIDIA) ─────────────────────
# repository layout:
# model_repository/
# └── churn_model/
#     ├── config.pbtxt
#     └── 1/
#         └── model.onnx

# config.pbtxt
"""
name: "churn_model"
platform: "onnxruntime_onnx"
max_batch_size: 64
dynamic_batching {
  preferred_batch_size: [8, 16, 32]
  max_queue_delay_microseconds: 10000
}
instance_group [{ count: 2, kind: KIND_GPU }]
"""

# ── GPU memory management ─────────────────────────────────
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Pin model to GPU, use half precision
model = model.to(device).half()

# Inference with no grad (saves GPU memory)
with torch.no_grad():
    with torch.cuda.amp.autocast():     # automatic mixed precision
        output = model(input_tensor.to(device))

# Monitor GPU utilization
# nvidia-smi dmon -s u -d 1    (every 1 second)
```

**GPU serving cost optimization:**

```
Time-sharing strategies:
├── Multi-model on one GPU      → Triton model ensemble
├── MIG (Multi-Instance GPU)    → partition A100 into 7 slices
├── Spot/preemptible instances  → 60-90% cheaper, use for batch
└── CPU for low-traffic hours   → route to CPU during off-peak
```

---

## 14. Scaling ML Inference Services

**Scaling dimensions:**

```
Vertical Scaling   → bigger machine (more RAM, GPU, CPU cores)
Horizontal Scaling → more replicas (HPA, KEDA)
Request Batching   → group requests for throughput
Caching            → avoid redundant inference
Model Optimization → faster model (quantization, distillation)
Async Processing   → queue-based for throughput over latency
```

**Kubernetes HPA for ML services:**

```yaml
# Scale on CPU + custom metric (requests per second)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: churn-predictor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: churn-predictor
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60     # scale up at 60% CPU

  - type: Pods
    pods:
      metric:
        name: prediction_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"        # 100 req/s per pod

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30    # fast scale-up
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # slow scale-down (5 min)
```

**KEDA — event-driven autoscaling (queue depth):**

```yaml
# Scale based on Celery/Redis queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ml-worker-scaler
spec:
  scaleTargetRef:
    name: ml-inference-worker
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: redis
    metadata:
      address: redis:6379
      listName: prediction_queue
      listLength: "10"          # 1 worker per 10 queued jobs
```

**Complete scaling architecture:**

```
                    Load Balancer
                         │
              ┌──────────┴───────────┐
              ▼                      ▼
         API Gateway            API Gateway
         (rate limit)           (rate limit)
              │                      │
    ┌─────────┼──────────────────────┤
    ▼         ▼                      ▼
 Pod (v2.4)  Pod (v2.4)          Pod (v2.4)
              │                      │
         HPA watches CPU/RPS → adds pods automatically
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
 Redis    Feature     Model
 Cache    Store       Registry
(cache    (pre-       (version
 hits)   computed)    store)
```

---

## Summary: Production ML Serving Stack

```
Model Training Complete
        │
        ▼
Serialize → ONNX / TorchScript / joblib
        │
        ▼
Package → Docker image (model + preprocessing + API)
        │
        ▼
Register → MLflow Registry (Staging → Production)
        │
        ▼
Deploy → Kubernetes Deployment
        ├── FastAPI / BentoML serving
        ├── /health + /ready probes
        ├── Prometheus metrics scraping
        └── HPA auto-scaling (CPU / RPS / queue)
        │
        ▼
Traffic → Versioned routing (canary → full rollout)
        │
        ▼
Monitor
├── Latency p50/p95/p99
├── Throughput (req/sec)
├── Error rate
├── Model drift (input distribution)
└── Business metrics (predictions vs outcomes)
```

Model serving mastery = **serialization + packaging + FastAPI + containers + versioned deployment + GPU optimization + auto-scaling**. These 14 concepts cover everything needed to take a model from a `.pkl` file to a production-grade, scalable, monitored inference service.
