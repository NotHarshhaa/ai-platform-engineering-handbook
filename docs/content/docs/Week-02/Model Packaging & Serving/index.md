---
title: "Model Packaging & Serving"
description: "AI Platform Engineering Handbook - Week 2 - MLOps Engineering"
weight: 20
toc: true
---

---

## 1. Model Serialization Techniques

You've trained a model. The training process ran for hours, consumed gigabytes of GPU memory, and produced a set of learned parameters — numbers representing the patterns the model discovered in your data. When training finishes, those parameters exist only in your process's memory. The moment that process ends, they're gone forever unless you save them to disk. Serialization is the process of converting those in-memory parameters and model structure into a format that can be stored persistently and loaded back later.

But serialization is more than just saving and loading. The format you choose determines portability across frameworks, compatibility across versions, deployment flexibility, and inference performance. Choosing wrong creates problems that surface months later when you try to deploy to a different runtime or upgrade a library.

**Pickle and Joblib** are Python's general-purpose serialization tools. Scikit-learn models are almost universally serialized with pickle or joblib. Joblib is preferred over pickle for large numpy arrays because it handles them more efficiently.

```python
import joblib
from sklearn.ensemble import RandomForestClassifier

# Save
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)
joblib.dump(model, 'model.joblib')

# Load
loaded_model = joblib.load('model.joblib')
predictions = loaded_model.predict(X_test)
```

The serious problem with pickle is security — loading a pickle file executes arbitrary Python code. A malicious pickle file from an untrusted source can run any code on your machine. Never load pickle files from untrusted sources. The second problem is version compatibility — pickle files are tightly coupled to the Python and library versions used to create them. A model pickled with scikit-learn 1.1 may not load with scikit-learn 1.3. For short-lived workflows this is manageable. For production models that need to be loadable years later, it's a serious risk.

**PyTorch serialization** offers two approaches with very different tradeoffs.

`torch.save` with the state dictionary saves only the learned parameters, not the model architecture:

```python
import torch

# Save only parameters
torch.save(model.state_dict(), 'model_weights.pth')

# Load requires having the model class definition available
model = MyModelClass(config)  # Must define architecture first
model.load_state_dict(torch.load('model_weights.pth'))
model.eval()
```

This is the recommended PyTorch approach. The saved file is small (just numbers, no Python code), and loading it requires you to have the model class definition — which is good, because it means the architecture is explicitly defined in your codebase rather than hidden in a binary blob. The downside is that deployment requires your model class code, which creates a dependency on your training codebase.

`torch.save(entire_model)` saves the model class alongside weights using pickle. Convenient but inherits all of pickle's problems — version dependencies, security concerns, and tight coupling to the training environment.

**TensorFlow SavedModel** is TensorFlow's recommended serialization format. It saves the entire model as a directory containing the computation graph and weights. The computation graph is saved in a framework-agnostic format, enabling deployment without a Python runtime using TensorFlow Serving or TensorFlow Lite.

```python
import tensorflow as tf

# Save as SavedModel
model.save('saved_model/my_model')  # Saves directory

# Load
loaded_model = tf.keras.models.load_model('saved_model/my_model')
```

SavedModel is portable across languages (Python, Java, C++, Go) and deployable on many platforms including mobile and edge devices.

**ONNX (Open Neural Network Exchange)** is the format for true cross-framework portability. Models trained in PyTorch or TensorFlow can be exported to ONNX and then run with the ONNX Runtime, which is a highly optimized inference engine that doesn't require the original training framework to be installed. This is the key to decoupling your training stack (might use PyTorch with complex custom code) from your serving stack (ONNX Runtime, lean and fast).

```python
import torch.onnx

# Export PyTorch model to ONNX
dummy_input = torch.randn(1, input_size)  # Example input for tracing
torch.onnx.export(
    model,
    dummy_input,
    'model.onnx',
    export_params=True,
    opset_version=17,
    input_names=['features'],
    output_names=['predictions'],
    dynamic_axes={
        'features': {0: 'batch_size'},    # First dimension is variable
        'predictions': {0: 'batch_size'}
    }
)

# Load and run with ONNX Runtime
import onnxruntime as ort
session = ort.InferenceSession('model.onnx')
result = session.run(
    output_names=['predictions'],
    input_feed={'features': X_test_numpy}
)
```

ONNX Runtime applies hardware-specific optimizations automatically — fusing operations, selecting optimal memory layouts, leveraging SIMD instructions on CPU and tensor cores on GPU. The same ONNX model can run on CPU, CUDA GPU, Apple Metal, ARM processors, and specialized accelerators through provider plugins.

**MLflow Model format** wraps any model in a standardized envelope that includes the model flavor (scikit-learn, pytorch, tensorflow, onnx), input/output schema, example inputs, and environment specification. This enables MLflow to serve any model type through a consistent API without custom serving code.

**Choosing the right format** comes down to your deployment context. If you're staying in Python and the scikit-learn ecosystem: joblib. If you're deploying PyTorch for production and want speed: ONNX. If you need mobile or edge deployment: TensorFlow Lite or ONNX. If you're using MLflow as your registry and want the simplest path: MLflow's native format. If you need maximum cross-language portability: ONNX or TensorFlow SavedModel.

---

## 2. Model Packaging Strategies

Serializing a model file is only part of making a model deployable. The model file alone is rarely sufficient — it needs preprocessing logic, feature engineering code, postprocessing, configuration, dependencies, and serving infrastructure. Model packaging is the process of assembling all these pieces into a self-contained, deployable unit.

The principle driving good packaging is: everything needed to go from raw input to a prediction should be in the package. When you hand a model package to someone or deploy it to a server, it should work without undocumented requirements or manual setup steps.

**What a complete model package contains:**

The serialized model artifact — the weights file in whatever format you chose.

The preprocessing pipeline — the fitted transformers that must be applied to raw inputs before the model sees them. This is where most packaging failures happen. Teams serialize the model but forget to include the fitted StandardScaler, the fitted LabelEncoder, the feature selection mask, or the tokenizer. At serving time, inputs are processed differently than at training time, and the model produces garbage outputs.

Feature definitions — what features does the model expect? In what order? What types? What valid ranges? Codifying this as a schema (JSON Schema, pydantic models, or a framework-specific schema) enables input validation before inference.

Dependency specification — what Python packages at what versions are required? A requirements.txt or conda environment.yml that pins exact versions ensures the serving environment matches the training environment.

Serving code — the code that receives a request, applies preprocessing, runs inference, and formats the response. This might be a FastAPI application, a Flask application, or a framework-specific serving wrapper.

Configuration — model name, version, serving parameters (batch size, timeout, device), environment-specific settings.

```
model_package/
├── model/
│   ├── weights.onnx           # Serialized model
│   ├── preprocessor.joblib    # Fitted preprocessing pipeline
│   ├── feature_schema.json    # Input feature definitions
│   └── model_config.json      # Model metadata
├── src/
│   ├── predictor.py           # Inference logic
│   ├── preprocessing.py       # Feature transformation code
│   └── postprocessing.py      # Output formatting
├── requirements.txt           # Pinned dependencies
└── Dockerfile                 # Container build specification
```

**MLflow's pyfunc flavor** is a standardized approach to packaging arbitrary Python models with custom logic. You define a class that inherits from `mlflow.pyfunc.PythonModel` and implement a `predict` method. MLflow handles the wrapping, environment, and serving.

```python
import mlflow.pyfunc
import pandas as pd

class FraudDetectionModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        import joblib
        import onnxruntime as ort
        
        # Load artifacts from the MLflow artifact store
        self.preprocessor = joblib.load(
            context.artifacts["preprocessor"]
        )
        self.session = ort.InferenceSession(
            context.artifacts["onnx_model"]
        )
        
    def predict(self, context, model_input):
        # Apply preprocessing
        features = self.preprocessor.transform(model_input)
        
        # Run inference
        result = self.session.run(
            output_names=["probability"],
            input_feed={"features": features.astype("float32")}
        )
        
        return pd.DataFrame({
            "fraud_probability": result[0].flatten(),
            "is_fraud": result[0].flatten() > 0.7
        })

# Log the complete packaged model
with mlflow.start_run():
    mlflow.pyfunc.log_model(
        artifact_path="fraud_model",
        python_model=FraudDetectionModel(),
        artifacts={
            "preprocessor": "artifacts/preprocessor.joblib",
            "onnx_model": "artifacts/model.onnx"
        },
        pip_requirements=["onnxruntime", "scikit-learn", "pandas"],
        input_example=sample_input,
        signature=mlflow.models.infer_signature(sample_input, sample_output)
    )
```

**BentoML packaging** provides a similar abstraction with additional production features. A BentoML Service defines how requests are handled, and a Bento is the complete packaged artifact including the service definition, models, dependencies, and Dockerfile:

```python
import bentoml
from bentoml.io import JSON, NumpyNdarray

runner = bentoml.onnx.get("fraud_model:latest").to_runner()

svc = bentoml.Service("fraud_detection", runners=[runner])

@svc.api(input=JSON(), output=JSON())
def predict(input_data: dict) -> dict:
    features = preprocess(input_data)
    result = runner.run(features)
    return {"fraud_probability": float(result[0])}
```

**Self-contained Docker images** are the gold standard for production packaging. The Dockerfile captures the complete environment — OS, system libraries, Python version, all packages — and the serving code. Anyone with Docker can run the model without any other setup.

The tradeoff in packaging is between completeness (everything included) and flexibility (ability to update components independently). A fully baked Docker image is extremely reproducible but requires rebuilding the entire image to update any component. A model package that pulls configuration from an external config service is more flexible but adds runtime dependencies. For production ML serving, lean toward completeness — reproducibility is more valuable than flexibility at serving time.

---

## 3. REST API for ML Inference

A REST API is the standard interface for making machine learning models accessible. Rather than calling model code directly (which requires the same language, the same library versions, and the same environment), a REST API exposes the model over HTTP — any system that can make an HTTP request can get predictions, regardless of language, platform, or location.

REST (Representational State Transfer) is an architectural style for APIs based on HTTP. For ML inference, the pattern is simple: the client sends an HTTP POST request with input data in the request body, the server runs the model on that data, and returns predictions in the response body. JSON is the universal data format for this exchange.

**API design for ML inference** requires decisions that affect usability, performance, and maintainability.

**Request schema design** — how do you structure the input? The options range from single-item requests (one example per request) to batched requests (multiple examples per request). Batching at the API level enables more efficient GPU utilization on the server side, but increases client complexity. A practical approach: support both, with the single-item API calling through to a batch-of-one internally.

```json
// Single-item request
POST /v1/predict
{
  "features": {
    "transaction_amount": 245.50,
    "merchant_category": "electronics",
    "user_account_age_days": 847,
    "hour_of_day": 14
  }
}

// Batched request
POST /v1/predict/batch
{
  "instances": [
    {"transaction_amount": 245.50, "merchant_category": "electronics", ...},
    {"transaction_amount": 89.99, "merchant_category": "grocery", ...}
  ]
}
```

**Response schema design** — what does the response contain? At minimum: the prediction value(s). Better: prediction with confidence or probability. Best: prediction, confidence, a request ID for tracing, processing latency, and the model version that produced the prediction.

```json
// Response
{
  "request_id": "req-9f7c3e2a",
  "model_version": "v2.1.0",
  "predictions": [
    {
      "fraud_probability": 0.87,
      "is_fraud": true,
      "confidence": "high"
    }
  ],
  "processing_time_ms": 23,
  "timestamp": "2024-01-15T14:23:41.123Z"
}
```

**API versioning** — your model and its API will change over time. Changes to the input schema, output schema, or behavior are breaking changes for clients. URL versioning (`/v1/predict`, `/v2/predict`) allows both versions to coexist simultaneously, giving clients time to migrate before you retire the old version.

**Input validation** is essential at the API layer, before the model ever sees the data. Validate that required fields are present, values are within expected ranges, types are correct, and the request doesn't violate business constraints. Return clear error messages (HTTP 422 Unprocessable Entity) for invalid inputs rather than letting invalid data cause cryptic model errors or silent garbage predictions.

**HTTP semantics** — POST is correct for inference, not GET. Inference requests have a body (the input data) and often have side effects (logging, billing, rate limiting). GET requests should be idempotent and safe — sending inference input data in a GET URL parameter is wrong. Use POST.

**Error handling** — your API needs a consistent error response format for different failure modes. Input validation errors (HTTP 422) with field-level details. Model inference errors (HTTP 500) with a request ID for tracing. Timeout errors (HTTP 504) when inference takes too long. Authentication errors (HTTP 401) for unauthenticated requests. Rate limit errors (HTTP 429) for clients exceeding quotas.

**OpenAPI specification** documents your API's contract — all endpoints, request/response schemas, authentication requirements, error codes. Tools like FastAPI auto-generate OpenAPI specifications from your code. Providing this specification enables clients to auto-generate client libraries, validates request/response formats in integration tests, and communicates the API contract to consumers.

---

## 4. Batch vs Real-Time Inference

We covered this conceptually in earlier sections but here we go deep on the specific technical considerations for each pattern when building the serving infrastructure.

**Real-time inference** (also called online inference) means a prediction is requested and returned synchronously, within milliseconds or seconds. The model is always running, ready to respond. The key metrics are latency (how fast is each prediction?) and throughput (how many predictions per second can be handled?).

Real-time serving is appropriate when decisions must be made immediately — fraud detection during a payment, content ranking as a user opens an app, autocomplete suggestions as someone types. The user or system is waiting for the prediction before proceeding.

The technical requirements for real-time serving are demanding. Models must be loaded into memory at all times, meaning memory consumption is continuous even during idle periods. GPU resources must be reserved and ready — you can't spin up a GPU instance on demand to serve a real-time request. Cold start latency (the time to load a model before it can serve) must be eliminated by keeping models warm. P99 and P99.9 latency must stay within SLOs even under peak load — one slow prediction is a user-visible failure.

**Batch inference** runs predictions on many examples at a scheduled time or when sufficient examples have accumulated. Nobody waits for individual predictions — results are computed and stored, then consumed later. The key metric is throughput (how many predictions can be computed per hour?) and cost (cost per prediction).

Batch inference is appropriate when predictions are needed for a population, not in real time — generating personalized email content for all users, pre-computing product recommendations for overnight storage, running risk scoring on all loan applications submitted today. The system computes predictions asynchronously, stores them, and serves them from the store when needed.

The technical requirements for batch inference are very different. Models can be loaded just for the batch run and unloaded after, saving memory and GPU costs during non-batch periods. GPU instances can be spot instances that are much cheaper than on-demand. Input validation failures for specific examples don't fail the entire batch — they're logged and skipped. Throughput is the primary optimization target, not latency.

**Hybrid patterns** — many real production systems use both. Pre-compute expensive features or predictions in batch (running nightly or hourly), then serve in real-time using the pre-computed results. User "taste profiles" for recommendation might be computed in batch from the last 30 days of behavior. At real-time, the serving system retrieves the pre-computed profile from a feature store and uses it alongside fresh real-time signals to rank content. This combines the richness of batch computation with the responsiveness of real-time serving.

**Mini-batch inference** is a middle ground. Instead of processing requests one at a time, the serving system collects a small batch (perhaps 16-32 requests) over a short time window (10-50ms) and processes them together on GPU. This improves GPU utilization significantly without requiring asynchronous processing from the client's perspective. The client sends a request and waits synchronously, but the server may be batching multiple simultaneous requests. This is how TensorFlow Serving and NVIDIA Triton work internally.

---

## 5. Synchronous vs Asynchronous Serving

Synchronous and asynchronous serving are about whether the client waits for the prediction or receives it later through a different channel. This distinction is independent of whether inference is real-time or batch — you can serve real-time predictions synchronously (client waits) or asynchronously (client gets a job ID and retrieves the result later).

**Synchronous serving** is the familiar request-response pattern. Client sends a request, blocks and waits, receives a response. Simple to implement, simple to use. Every programming language and HTTP client supports this natively.

The limitation is latency tolerance. If your model takes 500ms to process a request, the client waits 500ms. For user-facing applications, 500ms is often unacceptable. For batch-style requests with slow processing, holding open an HTTP connection for 30 seconds or 5 minutes is impractical — connections time out, load balancers close idle connections, clients give up.

Synchronous serving works well when inference completes within 100-500ms, when clients can tolerate the wait time, when the prediction is needed before the client can continue, and when request volume is manageable within a single server's capacity.

**Asynchronous serving** decouples the request from the response. The client sends input data and immediately receives an acknowledgment (job ID). Processing happens in the background. The client retrieves the result later — either by polling the result endpoint or by receiving a callback (webhook) when the result is ready.

```python
# Asynchronous inference API design

# Step 1: Submit inference job
POST /v1/predict/async
{
  "document_text": "This is a long document that takes 10 seconds to process..."
}

# Response immediately
{
  "job_id": "job-a8f3b291",
  "status": "queued",
  "estimated_completion_ms": 12000
}

# Step 2: Poll for result
GET /v1/predict/async/job-a8f3b291

# While processing
{
  "job_id": "job-a8f3b291",
  "status": "processing",
  "progress": 0.6
}

# When complete
{
  "job_id": "job-a8f3b291",
  "status": "complete",
  "result": {...},
  "processing_time_ms": 10847
}
```

Asynchronous serving works well for long-running inference (document analysis, video processing, complex multi-step pipelines), when the client doesn't need the result immediately, when requests arrive in bursts that would overwhelm synchronous capacity, and when you want to decouple client request rate from processing capacity through a queue.

**Message queue-based async serving** is the production pattern for high-volume asynchronous inference. Clients publish inference requests to a message queue (Kafka, SQS, RabbitMQ). Worker processes consume from the queue, run inference, and publish results to a result queue or store results in a database keyed by job ID. Workers can scale independently from the API layer — add more workers to handle peak load.

**Server-Sent Events (SSE) and WebSockets** enable streaming responses for models that generate output progressively — language models generating text token by token, transcription models processing audio in real time. Rather than waiting for the entire output, the client receives partial results as they're generated, enabling streaming UIs that feel responsive even for long-running inference.

**When to choose which** — for latency-sensitive applications where predictions must be synchronous (autocomplete, fraud detection, real-time ranking), use synchronous serving with aggressive optimization to keep latency within bounds. For anything that users don't immediately need (document analysis, batch enrichment, background recommendations), asynchronous serving is simpler, more robust, and cheaper.

---

## 6. FastAPI for Model Serving

FastAPI is the most widely used Python framework for building ML inference APIs. It's chosen over Flask, Django, and other alternatives for ML use cases for several reasons: it's built on modern Python async/await, it's extremely fast (competitive with Node.js and Go for IO-bound workloads), it automatically generates OpenAPI documentation, and its request/response validation with Pydantic integrates perfectly with ML serving patterns.

Let's build a complete, production-quality model serving API with FastAPI:

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import numpy as np
import onnxruntime as ort
import joblib
import time
import uuid
import logging
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import Response

# Define input/output schemas with validation
class TransactionFeatures(BaseModel):
    transaction_amount: float = Field(..., gt=0, lt=1_000_000)
    merchant_category: str = Field(..., min_length=1, max_length=50)
    user_account_age_days: int = Field(..., ge=0, le=36500)
    hour_of_day: int = Field(..., ge=0, le=23)
    
    @validator('merchant_category')
    def validate_category(cls, v):
        valid = {'electronics', 'grocery', 'restaurant', 'travel', 'other'}
        if v not in valid:
            raise ValueError(f"Category must be one of {valid}")
        return v

class PredictionRequest(BaseModel):
    instances: List[TransactionFeatures]
    model_version: Optional[str] = None

class PredictionResult(BaseModel):
    fraud_probability: float
    is_fraud: bool
    confidence: str

class PredictionResponse(BaseModel):
    request_id: str
    model_version: str
    predictions: List[PredictionResult]
    processing_time_ms: float

# Prometheus metrics
INFERENCE_REQUESTS = Counter(
    'inference_requests_total', 
    'Total inference requests',
    ['model_version', 'status']
)
INFERENCE_LATENCY = Histogram(
    'inference_duration_seconds',
    'Inference latency distribution',
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

# Application lifecycle
app = FastAPI(
    title="Fraud Detection API",
    version="2.1.0",
    description="Real-time fraud detection for payment transactions"
)

# Model loaded at startup, not per-request
class ModelServer:
    def __init__(self):
        self.session = None
        self.preprocessor = None
        self.model_version = None
        self.is_ready = False
    
    def load(self):
        try:
            self.preprocessor = joblib.load("artifacts/preprocessor.joblib")
            self.session = ort.InferenceSession(
                "artifacts/model.onnx",
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
            )
            self.model_version = "v2.1.0"
            self.is_ready = True
            logging.info(f"Model {self.model_version} loaded successfully")
        except Exception as e:
            logging.error(f"Model loading failed: {e}")
            raise

model_server = ModelServer()

@app.on_event("startup")
async def startup_event():
    model_server.load()

# Health and readiness endpoints (covered fully in section 10)
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/ready")
def readiness_check():
    if not model_server.is_ready:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ready", "model_version": model_server.model_version}

# Main inference endpoint
@app.post("/v1/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        # Convert to feature matrix
        features_list = []
        for instance in request.instances:
            features_list.append([
                instance.transaction_amount,
                instance.user_account_age_days,
                instance.hour_of_day,
                hash(instance.merchant_category) % 5  # Simplified encoding
            ])
        
        features_array = np.array(features_list, dtype=np.float32)
        
        # Preprocess
        features_scaled = model_server.preprocessor.transform(features_array)
        
        # Inference
        result = model_server.session.run(
            output_names=["fraud_probability"],
            input_feed={"features": features_scaled.astype(np.float32)}
        )
        
        probabilities = result[0].flatten()
        
        # Format response
        predictions = []
        for prob in probabilities:
            predictions.append(PredictionResult(
                fraud_probability=float(prob),
                is_fraud=bool(prob > 0.7),
                confidence="high" if prob > 0.9 or prob < 0.1 else "medium"
            ))
        
        processing_time = (time.time() - start_time) * 1000
        
        INFERENCE_REQUESTS.labels(
            model_version=model_server.model_version, 
            status="success"
        ).inc()
        INFERENCE_LATENCY.observe(processing_time / 1000)
        
        return PredictionResponse(
            request_id=request_id,
            model_version=model_server.model_version,
            predictions=predictions,
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        INFERENCE_REQUESTS.labels(
            model_version=model_server.model_version,
            status="error"
        ).inc()
        logging.error(f"Inference error for request {request_id}: {e}")
        raise HTTPException(status_code=500, detail="Inference failed")

# Metrics endpoint for Prometheus scraping
@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

**Async endpoints** with `async def` enable FastAPI to handle many concurrent requests without blocking. For CPU-bound inference (the model forward pass), you should run it in a thread pool executor to avoid blocking the event loop:

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

@app.post("/v1/predict")
async def predict_async(request: PredictionRequest):
    # Run CPU/GPU-bound inference in thread pool
    # This prevents blocking the async event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, run_inference, request)
    return result
```

**Middleware for cross-cutting concerns** — add middleware for request logging, authentication, and CORS without cluttering endpoint code:

```python
from fastapi.middleware.cors import CORSMiddleware
import time

@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logging.info(f"{request.method} {request.url.path} "
                f"status={response.status_code} "
                f"duration={duration:.3f}s")
    return response
```

---

## 7. BentoML Fundamentals

BentoML is a framework specifically designed for packaging and serving ML models in production. Where FastAPI is a general-purpose web framework that you use for ML serving, BentoML is purpose-built for ML serving — it understands model artifacts, runners, adaptive batching, and the full deployment lifecycle.

The core abstractions in BentoML:

**Runners** are the compute units that execute model inference. A runner wraps a model and executes it, potentially on GPU, with internal request batching and async processing. The runner abstraction lets BentoML optimize execution independently of your service logic — it can batch requests from multiple API calls together, schedule execution across CPU and GPU, and handle concurrency.

**Services** define the API interface — what endpoints exist, what they accept, what they return, and how they call runners. A service can have multiple runners (one for feature extraction, one for the main model, one for a post-processing model) and can define arbitrary business logic between runner calls.

**Bentos** are the complete packaged artifact — like a Docker image but specifically for ML services. A Bento includes the service definition, all models, all dependencies, the Python environment specification, and a generated Dockerfile. Building a Bento captures everything needed to run the service.

```python
import bentoml
import numpy as np
from bentoml.io import JSON, NumpyNdarray
from pydantic import BaseModel
from typing import List

# Save a model to BentoML's model store
bentoml.onnx.save_model(
    "fraud_detection",
    onnx_model,
    signatures={
        "run": {
            "batchable": True,          # Enable adaptive batching
            "batch_dim": 0,             # Batch along first dimension
        }
    },
    metadata={
        "description": "Fraud detection model v2.1",
        "training_data": "transactions_2024_q1",
        "auc_roc": 0.943
    }
)

# Create a runner for the saved model
fraud_runner = bentoml.onnx.get("fraud_detection:latest").to_runner()

# Define the service
svc = bentoml.Service("fraud_detection_service", runners=[fraud_runner])

class TransactionInput(BaseModel):
    transaction_amount: float
    merchant_category: str
    account_age_days: int

class FraudPrediction(BaseModel):
    fraud_probability: float
    is_fraud: bool

@svc.api(
    input=JSON(pydantic_model=TransactionInput),
    output=JSON(pydantic_model=FraudPrediction),
    route="/v1/predict"
)
async def predict(input_data: TransactionInput) -> FraudPrediction:
    # Preprocessing
    features = np.array([[
        input_data.transaction_amount,
        input_data.account_age_days,
        hash(input_data.merchant_category) % 5
    ]], dtype=np.float32)
    
    # Runner handles batching and GPU scheduling
    result = await fraud_runner.async_run(features)
    probability = float(result[0][0])
    
    return FraudPrediction(
        fraud_probability=probability,
        is_fraud=probability > 0.7
    )
```

**Adaptive batching** is one of BentoML's most valuable features. When multiple requests arrive within a short time window, BentoML automatically batches them together for a single runner call. This dramatically improves GPU utilization because GPUs process batches far more efficiently than individual examples.

```python
# Configure adaptive batching on the runner
fraud_runner = bentoml.onnx.get("fraud_detection:latest").to_runner(
    max_batch_size=64,          # Maximum batch size
    max_latency_ms=100,         # Maximum wait time to form a batch
)
```

Without adaptive batching, 100 simultaneous requests become 100 separate GPU calls. With adaptive batching, they're combined into one or a few GPU calls, with throughput improvements of 10-50x on GPU workloads.

**Building and deploying a Bento:**

```bash
# Build the Bento (packages everything)
bentoml build

# The Bento is now in the local Bento store
bentoml list

# Containerize the Bento
bentoml containerize fraud_detection_service:latest

# Run the containerized service
docker run -p 3000:3000 fraud_detection_service:latest

# Or deploy to BentoCloud, AWS, GCP
bentoml deployment create fraud_detection_service
```

**BentoML vs FastAPI** — these are complementary, not competing. BentoML handles the ML-specific concerns (runner management, adaptive batching, model versioning, packaging). FastAPI is a better choice when you need fine-grained control over the HTTP layer, complex routing, or tight integration with existing FastAPI-based infrastructure. For greenfield ML serving where simplicity and ML-specific optimization matter, BentoML is excellent. Many teams also use both — BentoML for the model runner, wrapped in a FastAPI application for the API layer.

---

## 8. Model Registry Concepts

We've touched on model registries in earlier sections, but here we go deep on the specific concepts relevant to model serving — how the registry integrates with the serving infrastructure, how versioning works in production serving context, and what patterns make registry integration reliable and safe.

A model registry is the authoritative source of truth for which models exist, what their metadata is, and which version should be serving traffic in each environment. Without a registry, the question "what model is currently in production?" requires checking server configurations, asking people, or inspecting running containers. With a registry, it's a query.

**Registry as a deployment target** — one pattern is using the registry itself as the deployment mechanism. Your serving infrastructure watches the registry for changes to the "Production" stage and automatically deploys the newly promoted model. This creates an elegant workflow: data scientist trains and registers model, ML engineer validates and promotes to Production in the registry, serving infrastructure detects the promotion and updates running services. The registry becomes a GitOps-like declarative system for what should be deployed.

**Multi-environment registry** — registries typically have concept of stages or environments. A model moves from None → Staging → Production → Archived. The serving infrastructure in each environment loads the model from its corresponding stage:

```python
import mlflow.pyfunc

class ModelLoader:
    def __init__(self, model_name: str, stage: str = "Production"):
        self.model_name = model_name
        self.stage = stage
        self.model = None
        self.current_version = None
    
    def load(self):
        model_uri = f"models:/{self.model_name}/{self.stage}"
        client = mlflow.tracking.MlflowClient()
        
        # Find the version in this stage
        versions = client.get_latest_versions(self.model_name, stages=[self.stage])
        if not versions:
            raise ValueError(f"No model in {self.stage} stage")
        
        version = versions[0]
        self.model = mlflow.pyfunc.load_model(model_uri)
        self.current_version = version.version
        
        print(f"Loaded {self.model_name} v{self.current_version} from {self.stage}")
        return self
    
    def predict(self, features):
        return self.model.predict(features)
```

**Hot reload without downtime** — when a new model version is promoted, the serving service should be able to load the new version without restarting and without dropping requests. This requires careful design:

```python
import threading
import mlflow.pyfunc

class HotReloadableModelServer:
    def __init__(self, model_name, stage="Production"):
        self.model_name = model_name
        self.stage = stage
        self._model = None
        self._version = None
        self._lock = threading.RLock()
    
    def load(self):
        new_model = mlflow.pyfunc.load_model(
            f"models:/{self.model_name}/{self.stage}"
        )
        # Atomic swap - requests using old model finish first
        with self._lock:
            self._model = new_model
            self._version = self._get_current_version()
    
    def predict(self, features):
        with self._lock:
            model = self._model  # Get reference while holding lock
        return model.predict(features)  # Use after releasing lock
    
    def _get_current_version(self):
        client = mlflow.tracking.MlflowClient()
        versions = client.get_latest_versions(
            self.model_name, stages=[self.stage]
        )
        return versions[0].version if versions else None
```

**Registry webhooks** — MLflow and other registries support webhooks that fire when models are registered or stage transitions occur. A serving service can listen for these webhooks and trigger a hot reload when a new model is promoted to its stage. This creates a push-based deployment system — the registry pushes notifications rather than the serving service polling.

**Model metadata for serving** — the registry should store serving-relevant metadata alongside model artifacts. What is the model's expected inference latency? What resource requirements does it have? What's the minimum confidence threshold below which predictions should be flagged for review? What input schema does it expect? This metadata helps serving infrastructure configure itself appropriately for each model version.

---

## 9. Containerizing ML Models

Containerizing ML models means packaging the model, its dependencies, and the serving code into a Docker image that runs identically anywhere. We covered Docker fundamentals in the container security section — here we focus specifically on the ML-specific challenges and patterns.

ML containers have unique characteristics that make naive containerization produce poor results: they're large (PyTorch and CUDA alone can be several gigabytes), they have complex GPU driver dependencies, they often need large model weight files, and they benefit from specific optimization configurations.

**GPU-capable base images** — ML serving with CUDA requires carefully matching the CUDA version in the container image with the GPU driver version on the host. The CUDA library in the container doesn't need to match the driver exactly, but must be compatible. NVIDIA provides official base images:

```dockerfile
# For GPU serving
FROM nvcr.io/nvidia/pytorch:23.10-py3  # NVIDIA's optimized PyTorch image
# OR
FROM nvidia/cuda:12.2.0-cudnn8-runtime-ubuntu22.04  # Minimal CUDA runtime

# For CPU-only serving, much smaller
FROM python:3.11-slim
```

NVIDIA's container images include CUDA, cuDNN, and optimized libraries, but they're large (several GB). For production, consider starting from `cudnn-runtime` (not `devel`) to save size — you don't need compilation tools at serving time.

**Multi-stage builds for ML** are especially important because ML build environments are enormous but runtime environments can be much smaller:

```dockerfile
# Stage 1: Build/install dependencies
FROM python:3.11 AS builder
WORKDIR /build

# Install build dependencies for packages with native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --target=/build/packages --no-cache-dir -r requirements.txt

# Stage 2: Runtime image
FROM nvidia/cuda:12.2.0-cudnn8-runtime-ubuntu22.04 AS runtime
WORKDIR /app

# Install Python runtime only
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /build/packages /usr/lib/python3.11/

# Copy model artifacts and serving code
COPY artifacts/ /app/artifacts/
COPY src/ /app/src/

# Non-root user
RUN useradd --uid 1001 --create-home modelserver
USER 1001

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["python3", "-m", "src.server", "--port", "8080"]
```

**Model weights as a separate layer** — model weight files are large and change with every new model version, but the runtime dependencies (CUDA, PyTorch, serving framework) are large and change infrequently. If you put weights in a late layer of your Dockerfile, only the weights layer needs to be rebuilt when the model version changes, and the runtime layers are cached:

```dockerfile
# Dependencies (rarely change - cached after first build)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Serving code (changes sometimes)
COPY src/ /app/src/

# Model weights (changes with every model version - always rebuilt)
COPY artifacts/model.onnx /app/artifacts/model.onnx
COPY artifacts/preprocessor.joblib /app/artifacts/preprocessor.joblib
```

**External weight loading** — an alternative to baking weights into the image is loading them from object storage at startup. The Docker image contains only the serving code and dependencies. At startup, the container downloads the appropriate model version from S3 or GCS based on an environment variable. This enables model updates without rebuilding the Docker image and decouples the deployment of serving infrastructure from the deployment of model versions.

```python
import boto3
import os

def download_model_artifacts():
    s3 = boto3.client('s3')
    model_version = os.environ['MODEL_VERSION']
    bucket = os.environ['MODEL_BUCKET']
    
    s3.download_file(bucket, f"{model_version}/model.onnx", "/app/artifacts/model.onnx")
    s3.download_file(bucket, f"{model_version}/preprocessor.joblib", 
                     "/app/artifacts/preprocessor.joblib")
```

The tradeoff is startup time — downloading large model files from S3 at startup adds tens of seconds to cold start time. Baking weights into the image eliminates this but requires a new image build for every model version.

**Kubernetes resource requests for GPU containers:**

```yaml
resources:
  requests:
    memory: "8Gi"
    cpu: "2"
    nvidia.com/gpu: "1"
  limits:
    memory: "16Gi"
    cpu: "4"
    nvidia.com/gpu: "1"
```

GPU resources must be requested as limits — Kubernetes doesn't support fractional GPU requests in the standard scheduler (though NVIDIA's MIG — Multi-Instance GPU — enables sharing). One pod gets exclusive access to the requested number of GPUs.

---

## 10. Health & Readiness Endpoints for Models

We covered health and readiness probes in the Kubernetes section and Docker section. Here we focus specifically on what these endpoints should verify for ML serving containers, because the bar is different and higher than for regular web services.

For a regular web service, a health check might just verify the HTTP server is responding. For an ML serving container, the service might be responding to HTTP but unable to serve predictions — model not loaded, GPU unavailable, preprocessing pipeline missing, feature store unreachable. A health check that doesn't verify these conditions provides false confidence.

**The distinction matters enormously in production.** If Kubernetes considers a pod healthy and ready when it's actually unable to serve predictions, it routes real traffic to a pod that returns errors. If it correctly identifies the pod as not ready, it removes it from load balancing until the issue resolves.

**What an ML health endpoint should check:**

Is the HTTP server running? (Basic — Kubernetes can check this itself)
Is the model loaded into memory?
Can the model actually run a simple inference?
Is the GPU accessible and functional?
Is the preprocessing pipeline loaded?
Does the feature schema match expectations?

```python
from fastapi import FastAPI, HTTPException
import onnxruntime as ort
import numpy as np
import time

app = FastAPI()

class ModelState:
    model_session: ort.InferenceSession = None
    preprocessor = None
    model_version: str = None
    load_time: float = None
    
state = ModelState()

@app.get("/health")
def health():
    """
    Liveness probe - is the service alive?
    Returns 200 if the process is running and HTTP server is functional.
    Only returns 500 if the service is in an unrecoverable state.
    """
    return {
        "status": "healthy",
        "timestamp": time.time()
    }

@app.get("/ready")
def readiness():
    """
    Readiness probe - is the service ready to serve traffic?
    Returns 503 if not ready to receive requests.
    """
    if state.model_session is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded yet"
        )
    
    if state.preprocessor is None:
        raise HTTPException(
            status_code=503,
            detail="Preprocessor not loaded"
        )
    
    # Verify the model can actually run inference
    # Use a cached warm-up result to avoid per-request overhead
    try:
        test_input = np.zeros((1, state.input_dim), dtype=np.float32)
        result = state.model_session.run(None, {"features": test_input})
        if result is None or len(result) == 0:
            raise ValueError("Model produced no output")
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model inference check failed: {str(e)}"
        )
    
    return {
        "status": "ready",
        "model_version": state.model_version,
        "uptime_seconds": time.time() - state.load_time,
        "model_loaded": True,
        "gpu_available": "CUDAExecutionProvider" in state.model_session.get_providers()
    }

@app.get("/startup")
def startup_check():
    """
    Startup probe - is initialization complete?
    Used during slow startup (loading large models) to prevent premature
    liveness probe failures.
    """
    if state.model_session is None:
        raise HTTPException(
            status_code=503,
            detail="Still loading model"
        )
    return {"status": "started"}
```

**Kubernetes probe configuration for ML containers:**

```yaml
startupProbe:
  httpGet:
    path: /startup
    port: 8080
  failureThreshold: 60      # Allow up to 10 minutes for large model loading
  periodSeconds: 10          # Check every 10 seconds

livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 0    # Start immediately after startup probe succeeds
  periodSeconds: 30
  failureThreshold: 3
  timeoutSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
  successThreshold: 1
  timeoutSeconds: 10
```

The startup probe with `failureThreshold: 60` and `periodSeconds: 10` gives the container up to 600 seconds (10 minutes) to load large models before Kubernetes gives up. This is critical for large language models or vision models with billions of parameters.

**The readiness test inference** — running actual inference in the readiness check has an important tradeoff. It validates functional correctness but adds overhead (running inference every 10 seconds). For expensive models, cache the result with a short TTL instead of running inference on every readiness probe:

```python
import asyncio

class ReadinessCache:
    def __init__(self, ttl_seconds=30):
        self.is_ready = False
        self.last_check = 0
        self.ttl = ttl_seconds
    
    async def check(self, model_session) -> bool:
        now = time.time()
        if now - self.last_check < self.ttl:
            return self.is_ready
        
        try:
            test_input = np.zeros((1, 10), dtype=np.float32)
            model_session.run(None, {"features": test_input})
            self.is_ready = True
        except:
            self.is_ready = False
        
        self.last_check = now
        return self.is_ready
```

---

## 11. Versioned Model Deployment

In production, multiple model versions typically need to coexist. The current production model, a new version under canary testing, a shadow model capturing predictions for comparison, and sometimes legacy versions supporting specific client integrations. Managing this requires deliberate versioning in both the serving infrastructure and the API contract.

**URL-based API versioning** is the standard approach for API-level versioning. Major API changes (input schema changes, output schema changes) get new URL versions: `/v1/predict` and `/v2/predict` can coexist indefinitely. Clients choose which version they call. This is independent of the model version — `/v1/predict` might be served by model v3 or model v5 behind the scenes.

**Model version routing** — within a single API version, you might want to route requests to different model versions for A/B testing or canary deployment:

```python
from fastapi import FastAPI, Header
from typing import Optional
import random

app = FastAPI()

# Multiple model versions loaded simultaneously
models = {
    "v2.0": load_model("models:/fraud-model/2"),
    "v2.1": load_model("models:/fraud-model/3"),
}

# Traffic routing configuration
routing_config = {
    "default": "v2.0",         # 95% of traffic
    "canary": "v2.1",          # 5% of traffic
    "canary_percentage": 0.05
}

@app.post("/v1/predict")
async def predict(
    request: PredictionRequest,
    x_model_version: Optional[str] = Header(None)
):
    # Explicit version request (for testing)
    if x_model_version and x_model_version in models:
        model_key = x_model_version
    # Canary routing
    elif random.random() < routing_config["canary_percentage"]:
        model_key = "canary"
    else:
        model_key = "default"
    
    active_version = routing_config[model_key]
    model = models[active_version]
    
    result = model.predict(prepare_features(request))
    
    return PredictionResponse(
        predictions=format_predictions(result),
        model_version=active_version,
        routing_bucket=model_key
    )
```

**Kubernetes-based version routing** — at the infrastructure level, different model versions are separate Kubernetes Deployments with separate service selectors. Traffic splitting happens at the load balancer or service mesh layer:

```yaml
# Blue deployment (current production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-server-v2
  labels:
    app: model-server
    version: v2
spec:
  replicas: 9   # 90% of pods
  selector:
    matchLabels:
      app: model-server
      version: v2
---
# Green deployment (canary)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-server-v3
  labels:
    app: model-server
    version: v3
spec:
  replicas: 1   # 10% of pods
  selector:
    matchLabels:
      app: model-server
      version: v3
```

With Istio or Argo Rollouts, traffic splitting is explicit and weight-based rather than replica-count-based, giving more precise control.

**Model version metadata in responses** — always include the model version in prediction responses. This enables: offline analysis correlating predictions to model versions, debugging by filtering logs by model version, A/B test analysis comparing outcomes by version. If a user calls support about a suspicious prediction, you can look up the exact model version that made the prediction and reproduce it.

**Graceful version retirement** — when retiring an old model version, don't abruptly remove it. Implement a deprecation period: first, log warnings when the deprecated version is used. Then, stop routing new traffic to it but allow existing connections to complete. Then remove it. This prevents breaking clients that haven't migrated and gives you time to identify if anything critical depends on the deprecated version.

---

## 12. API Performance Optimization

An ML serving API that's slow is not just a bad user experience — it directly affects throughput, costs, and whether the system can meet its SLOs. Performance optimization for ML APIs requires understanding where time is actually being spent: in network, in preprocessing, in model inference, or in response serialization.

**Profile before optimizing** — the golden rule. Run a load test, capture traces, identify the actual bottleneck. Optimizing preprocessing when inference is the bottleneck wastes time. Use tools like py-spy (for profiling running Python processes), cProfile, or distributed tracing to find where time is spent.

**Request batching** dramatically improves throughput for GPU inference. A GPU executing one example at a time wastes most of its parallel compute capacity. Batching 32 examples together uses the GPU's parallelism effectively:

```python
import asyncio
from collections import deque
import time

class BatchProcessor:
    def __init__(self, model_session, max_batch_size=32, max_wait_ms=50):
        self.session = model_session
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self.pending = deque()
        self.lock = asyncio.Lock()
        asyncio.create_task(self._process_loop())
    
    async def predict(self, features):
        future = asyncio.Future()
        async with self.lock:
            self.pending.append((features, future))
        return await future
    
    async def _process_loop(self):
        while True:
            await asyncio.sleep(self.max_wait_ms / 1000)
            async with self.lock:
                if not self.pending:
                    continue
                
                batch = []
                futures = []
                while self.pending and len(batch) < self.max_batch_size:
                    features, future = self.pending.popleft()
                    batch.append(features)
                    futures.append(future)
            
            if not batch:
                continue
            
            # Single GPU call for entire batch
            import numpy as np
            batch_array = np.stack(batch, axis=0)
            results = self.session.run(None, {"features": batch_array})[0]
            
            # Distribute results to waiting requests
            for future, result in zip(futures, results):
                future.set_result(result)
```

**Model warmup** — the first inference request to a newly loaded model is always slow. The model weights must be paged into GPU memory, CUDA graphs must be compiled, memory allocations must be made. Warmup runs a batch of fake requests through the model immediately after loading, so the first real request hits a warm, pre-allocated model:

```python
def warmup_model(session, input_shape, n_warmup_runs=10):
    dummy_input = np.zeros(input_shape, dtype=np.float32)
    for i in range(n_warmup_runs):
        session.run(None, {"features": dummy_input})
    print(f"Model warmup complete ({n_warmup_runs} runs)")
```

**Preprocessing optimization** — preprocessing is often overlooked as a performance bottleneck. For batch serving, vectorize all operations using NumPy rather than looping in Python. For feature stores, batch feature retrieval rather than one feature at a time. Cache preprocessing results for repeated inputs.

```python
# Slow: Python loop
features = [preprocess_single(x) for x in inputs]

# Fast: vectorized NumPy
features = preprocess_batch(np.array(inputs))  # Single vectorized operation
```

**Response caching** — many ML serving scenarios have repeated identical inputs. If 100 users ask the same question, you compute the answer once and cache it:

```python
import hashlib
import json
import redis

cache = redis.Redis(host='redis-service', port=6379)

def get_cached_prediction(features: dict, ttl_seconds=300):
    cache_key = hashlib.md5(
        json.dumps(features, sort_keys=True).encode()
    ).hexdigest()
    
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached), True  # (result, cache_hit)
    
    return None, False

def cache_prediction(features: dict, result: dict, ttl_seconds=300):
    cache_key = hashlib.md5(
        json.dumps(features, sort_keys=True).encode()
    ).hexdigest()
    cache.setex(cache_key, ttl_seconds, json.dumps(result))
```

**Connection pooling** — if your serving layer calls downstream services (feature store, database), use connection pools rather than opening new connections per request. Connection establishment is expensive. Reuse connections aggressively.

**Model quantization** for faster inference — converting a 32-bit float model to 16-bit or 8-bit reduces memory bandwidth requirements and can double or quadruple inference throughput on compatible hardware:

```python
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

# Quantize model to 8-bit integers (CPU inference)
quantize_dynamic(
    "model.onnx",
    "model_quantized.onnx",
    weight_type=QuantType.QInt8
)

# Quantized model is 4x smaller and typically 2-4x faster on CPU
session = ort.InferenceSession("model_quantized.onnx")
```

**ONNX Runtime execution providers** — ONNX Runtime selects the best execution provider automatically, but you can specify order of preference:

```python
session = ort.InferenceSession(
    "model.onnx",
    providers=[
        'TensorrtExecutionProvider',  # Best for NVIDIA GPU (requires TensorRT)
        'CUDAExecutionProvider',      # Good for NVIDIA GPU
        'CPUExecutionProvider'        # Fallback to CPU
    ]
)
```

TensorRT typically provides 2-5x speedup over standard CUDA execution through kernel fusion and precision optimization. The TensorRT engine is compiled on first run and cached for subsequent runs.

---

## 13. GPU vs CPU Serving Considerations

The decision of whether to serve ML models on GPU or CPU is more nuanced than it first appears. GPUs are not always the right choice, and the wrong choice wastes significant money. Understanding the tradeoffs requires understanding what makes GPU inference fast and when that speed advantage applies.

**When GPU serving makes sense:**

Large models with many parameters — transformer-based language models, large vision models, models with billions of parameters. The computation graph is so large that even with batching, CPU execution is prohibitively slow.

High-throughput requirements — when you need to process thousands of requests per second, GPU's parallel compute enables a throughput impossible on CPU. A single A100 GPU can process more inference requests per second than dozens of CPU cores for large neural networks.

Real-time latency requirements for large models — for a 175-billion-parameter model, even CPU parallelism across 128 cores produces latency of minutes per request. GPU is the only viable option.

**When CPU serving makes sense:**

Small to medium models — gradient boosting models (XGBoost, LightGBM), small neural networks with fewer than 10 million parameters, logistic regression models. For these models, CPU inference is fast enough and much cheaper than GPU.

Low or bursty traffic — GPUs cost money whether they're processing requests or idle. For a service handling 10 requests per minute, a GPU instance is almost entirely idle. CPU instances are cheaper and can scale to zero with serverless infrastructure.

Latency-sensitive small models — for models where inference completes in 1-5ms on CPU, GPU doesn't help and adds overhead from GPU memory transfers. The GPU's advantage is batch parallelism, which only manifests with large batches.

Cost sensitivity — a high-end GPU instance (A100) costs 10-30x more per hour than a comparable CPU instance. If CPU inference meets your latency SLO, CPU serving is far more cost-efficient.

**Mixed serving strategies:**

Batching makes GPU economical — GPU serving only makes economic sense when requests arrive frequently enough to form meaningful batches. At 1 request per second, GPU utilization is <1%. At 100 requests per second, batch processing keeps GPU utilization high and the economics improve dramatically.

CPU for preprocessing, GPU for inference — a common architecture runs preprocessing (feature extraction, tokenization, scaling) on CPU while the model forward pass runs on GPU. The GPU is specialized for the compute-intensive matrix operations of neural network inference, while CPU handles the sequential logic of preprocessing.

Model cascades — start with a cheap, fast CPU model for most requests. If the CPU model is uncertain (confidence below a threshold), escalate to a more accurate but expensive GPU model. This dramatically reduces GPU inference volume while maintaining quality where it matters.

**Practical GPU serving configuration with ONNX Runtime:**

```python
import onnxruntime as ort

# GPU session with CUDA optimization
session_options = ort.SessionOptions()
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL

gpu_session = ort.InferenceSession(
    "model.onnx",
    sess_options=session_options,
    providers=[('CUDAExecutionProvider', {
        'device_id': 0,
        'arena_extend_strategy': 'kNextPowerOfTwo',
        'gpu_mem_limit': 8 * 1024 * 1024 * 1024,  # 8GB
        'cudnn_conv_algo_search': 'EXHAUSTIVE',
        'do_copy_in_default_stream': True,
    })]
)

# CPU session with parallelism
cpu_session = ort.InferenceSession(
    "model.onnx",
    sess_options=session_options,
    providers=['CPUExecutionProvider']
)
session_options.intra_op_num_threads = 8  # Use 8 CPU threads
```

**Monitoring GPU utilization** to validate serving efficiency:

```promql
# GPU utilization should be high during serving hours
DCGM_FI_DEV_GPU_UTIL

# GPU memory utilization - if too close to limit, risk OOMKill
DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_TOTAL

# Inference throughput per GPU dollar
rate(inference_requests_total[5m]) / count(DCGM_FI_DEV_GPU_UTIL)
```

---

## 14. Scaling ML Inference Services

Scaling ML inference is fundamentally different from scaling regular web services. A stateless web service is trivially horizontally scalable — add more servers. An ML inference service has additional complexity: GPU resources are scarce and expensive, models are large and slow to load, and the relationship between load and resource requirements is non-linear.

**Horizontal scaling** — adding more replica pods of the model server. For stateless serving (each pod loads its own copy of the model and doesn't share state with other pods), horizontal scaling is the primary scaling mechanism. Kubernetes HPA scales replicas based on CPU, memory, or custom metrics.

For GPU serving, horizontal scaling means adding more GPU nodes to your cluster, which is expensive. This makes right-sizing each pod important — you want each GPU pod to be as well-utilized as possible before adding more.

**Autoscaling metrics for ML inference:**

CPU utilization is a poor autoscaling signal for GPU-based serving — inference work happens on GPU, not CPU, so CPU may be low even when the serving service is saturated.

Request rate (requests per second) is a better signal but needs calibration — what request rate per pod is the target?

Request queue depth — if you have a message queue in front of your serving fleet, the queue depth directly indicates backlog. Scale until the queue is consistently drained.

GPU utilization — scale up when GPU utilization is consistently above 80%, scale down when below 20%. This requires custom metrics from dcgm-exporter through the Prometheus Adapter.

Inference latency — the most user-relevant metric. Scale up when p99 latency exceeds your SLO threshold. This is the ultimate signal — it directly measures user experience.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: model-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: model-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: inference_p99_latency_seconds
        selector:
          matchLabels:
            deployment: model-server
      target:
        type: Value
        value: "0.5"  # Scale up when P99 exceeds 500ms
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
```

**KEDA (Kubernetes Event-Driven Autoscaling)** extends HPA with more scaling sources — Kafka queue depth, SQS queue length, Prometheus metrics, and more. For async ML serving where requests come through a message queue, KEDA scales workers based on queue depth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: model-worker-scaler
spec:
  scaleTargetRef:
    name: model-inference-worker
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: kafka_consumer_lag
      query: |
        sum(kafka_consumer_group_lag{topic="inference-requests"})
      threshold: "100"  # Scale up per 100 messages in queue
```

**Model server frameworks with built-in scaling:**

NVIDIA Triton Inference Server is designed for high-throughput, multi-model serving. It manages multiple models simultaneously, does internal dynamic batching, supports concurrent model execution, and provides detailed metrics for capacity planning. Triton is the choice when you need to serve many different models from the same infrastructure or need maximum GPU utilization.

```python
# Triton client example
import tritonclient.http as httpclient
import numpy as np

client = httpclient.InferenceServerClient("triton:8000")

inputs = [
    httpclient.InferInput("features", [1, 10], "FP32")
]
inputs[0].set_data_from_numpy(np.zeros((1, 10), dtype=np.float32))

outputs = [httpclient.InferRequestedOutput("predictions")]

response = client.infer("fraud_model", inputs, outputs=outputs)
predictions = response.as_numpy("predictions")
```

**Vertical scaling considerations** — for GPU serving, vertical scaling means using a larger GPU or a GPU with more memory. This is sometimes more cost-effective than running multiple smaller GPUs because large models might not fit in a smaller GPU's memory at all. A model requiring 20GB of GPU memory must run on an A100 (40GB or 80GB) — two T4s (16GB each) wouldn't work because the model can't be split without model parallelism.

**Model parallelism** is when a single model is too large to fit on a single GPU's memory and must be split across multiple GPUs. This adds significant serving complexity — latency increases because computation must be coordinated across GPUs — but enables serving models that literally don't fit on any single available GPU. Frameworks like DeepSpeed and Megatron-LM provide model parallelism for large language models.

**Serving cost optimization** combines all these dimensions: right-size the model (quantize, distill), right-size the hardware (CPU when sufficient, minimum GPU otherwise), right-size replicas (autoscale based on real demand), optimize batch size (maximize GPU utilization per dollar), and use spot instances for asynchronous workloads (70-90% cost reduction with acceptable interruption risk).

---

The thread connecting all of them is this: training a model is the beginning, not the end. Getting a model from a Jupyter notebook to reliably serving predictions to real users at scale is an engineering discipline as demanding as the ML development itself. Serialization is about preserving the model reliably. Packaging is about making it deployable. The API is the interface to the world. Health checks are the mechanism by which the infrastructure knows you're reliable. Versioning is how you evolve without breaking. Performance optimization is how you make the whole thing economically viable. And scaling is how you handle the success of your system growing beyond what any single machine can serve.