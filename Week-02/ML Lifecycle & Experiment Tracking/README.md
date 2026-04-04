# ML Lifecycle & Experiment Tracking

---

## 1. Machine Learning Lifecycle Overview

The ML lifecycle is an **iterative, end-to-end process** from business problem to production model — rarely linear, always cyclical.

```
┌─────────────────────────────────────────────────────────────┐
│                   ML Lifecycle Loop                         │
│                                                             │
│   Business      Data         Feature      Model            │
│   Problem  ───► Collection ► Engineering ► Training        │
│      ▲               │            │            │           │
│      │               ▼            ▼            ▼           │
│   Feedback      Versioning   Pipelines    Evaluation       │
│      ▲               │            │            │           │
│      │               └────────────┴────────────┘           │
│      │                            │                        │
│   Monitor  ◄──── Deploy  ◄──── Register                    │
│   (drift)       (serve)       (artifact)                   │
└─────────────────────────────────────────────────────────────┘
```

**ML Lifecycle phases:**

| Phase | Key Questions | Outputs |
|---|---|---|
| **Problem Framing** | What are we solving? Why? | Success metrics, constraints |
| **Data** | What data? Is it enough? | Labeled datasets, pipelines |
| **Feature Eng.** | What signals predict the target? | Feature store, transforms |
| **Training** | Which algorithm? Hyperparams? | Trained model artifact |
| **Evaluation** | Is it good enough? | Metrics, confusion matrix |
| **Registry** | Which version goes to prod? | Versioned model artifact |
| **Deployment** | How does it serve predictions? | API endpoint, batch job |
| **Monitoring** | Is it still working in prod? | Drift alerts, retraining triggers |

**Why lifecycle management matters:**

```
Without it:                    With it:
─────────────────              ─────────────────────────────
"It worked on my laptop"       Reproducible anywhere
Mystery model in prod          Full lineage: data → model
Can't rollback model           One-click rollback
Data scientists re-run weeks   Experiment history tracked
No one knows what changed      Every experiment logged
```

---

## 2. Problem Framing & Business Understanding

The most important step — **wrong problem framing = perfect solution to the wrong problem**.

**ML problem taxonomy:**

```
Supervised Learning
├── Classification
│   ├── Binary        → spam/not spam, churn/no churn
│   ├── Multi-class   → product category (1 of N)
│   └── Multi-label   → image tags (multiple of N)
└── Regression
    ├── Linear        → house price prediction
    └── Time-series   → demand forecasting

Unsupervised Learning
├── Clustering        → customer segmentation
├── Dimensionality    → PCA, t-SNE, UMAP
└── Anomaly Detection → fraud, network intrusion

Reinforcement Learning → game playing, robot control

Self-supervised / Foundation Models → LLMs, CLIP
```

**Problem framing checklist:**

```
Business Goal
├── What decision does this model support?
├── What is the cost of a wrong prediction?
│   ├── False Positive cost = ?
│   └── False Negative cost = ?
└── What is the baseline (no ML, rule-based)?

ML Formulation
├── What is the target variable (label)?
├── What are the inputs (features)?
├── What type of ML problem is this?
└── What metric aligns with business goal?

Feasibility
├── Do we have enough labeled data?
├── Is the signal-to-noise ratio sufficient?
├── Is real-time or batch prediction needed?
└── What is the latency budget?
```

**Metric alignment — business vs ML:**

| Business Goal | Wrong ML Metric | Right ML Metric |
|---|---|---|
| Catch all fraud | Accuracy | Recall (minimize FN) |
| Minimize false alerts | Accuracy | Precision |
| Balance both | Accuracy | F1 / AUC-PR |
| Revenue impact | MAE | Weighted RMSE |
| Ranking quality | Accuracy | NDCG, MAP |

---

## 3. Data Collection & Data Versioning

**Data is the foundation** — model quality is bounded by data quality.

**Data collection sources:**

```
Production systems   → databases, event streams (Kafka)
APIs                 → third-party data enrichment
Web scraping         → public data
Human labeling       → Label Studio, Scale AI, Labelbox
Synthetic data       → augmentation, simulation
Data warehouses      → Snowflake, BigQuery, Redshift
Feature stores       → Feast, Tecton (pre-computed features)
```

**Data quality dimensions:**

```
Completeness  → Are critical fields null? (< 5% null target)
Accuracy      → Does it reflect reality?
Consistency   → Same entity, same value across sources?
Timeliness    → Is it fresh enough for the use case?
Uniqueness    → Are there duplicates?
Validity      → Values within expected ranges/formats?
```

**Data versioning — why it matters:**

```
Experiment A: trained on data_v1 → accuracy 82%
Experiment B: trained on data_v2 → accuracy 87%

Without versioning:
  "Which data produced the better model?"
  "Can we reproduce Experiment A?"
  → No answers.

With versioning (DVC / LakeFS / Delta Lake):
  Every dataset has a content hash + metadata
  → fully reproducible, diff-able, auditable
```

**Data versioning tools:**

| Tool | Best For |
|---|---|
| **DVC** | Git-like versioning for ML datasets |
| **LakeFS** | Git-like branching for data lakes |
| **Delta Lake** | ACID transactions + time travel (Spark) |
| **Pachyderm** | Data pipelines + versioning |
| **Great Expectations** | Data validation + contracts |

---

## 4. Data Preprocessing Pipelines

Pipelines ensure preprocessing is **consistent, reproducible, and deployable**.

**Preprocessing steps by data type:**

```
Tabular Data
├── Missing values   → impute (mean/median/mode) or drop
├── Outliers         → clip, log transform, IQR filter
├── Scaling          → StandardScaler, MinMaxScaler, RobustScaler
├── Encoding         → OrdinalEncoder, OneHotEncoder, TargetEncoder
└── Skewness         → log1p, Box-Cox, Yeo-Johnson transforms

Text Data
├── Tokenization     → word, subword (BPE), character
├── Normalization    → lowercase, strip punctuation
├── Stop words       → remove (or keep for context)
├── Stemming/Lemma   → reduce to root form
└── Vectorization    → TF-IDF, embeddings (BERT, Word2Vec)

Image Data
├── Resize           → normalize to fixed dimensions
├── Normalize        → pixel values 0–1 or z-score
├── Augmentation     → flip, rotate, crop, color jitter
└── Denoising        → Gaussian blur, median filter
```

**Sklearn Pipeline (the right way):**

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import (
    StandardScaler, OneHotEncoder, OrdinalEncoder
)
from sklearn.impute import SimpleImputer

# Define column groups
numeric_features = ['age', 'income', 'tenure']
categorical_features = ['country', 'plan_type']
ordinal_features = ['satisfaction_score']

# Numeric pipeline
numeric_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
])

# Categorical pipeline
categorical_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', OneHotEncoder(handle_unknown='ignore', sparse=False)),
])

# Combine all
preprocessor = ColumnTransformer([
    ('num', numeric_pipeline, numeric_features),
    ('cat', categorical_pipeline, categorical_features),
])

# Full pipeline including model
full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', XGBClassifier(n_estimators=300, learning_rate=0.05)),
])

# Fit once → transforms + model trained together
full_pipeline.fit(X_train, y_train)

# Predict → same transforms applied automatically
preds = full_pipeline.predict(X_test)

# Save entire pipeline (preprocessing + model)
import joblib
joblib.dump(full_pipeline, 'model_pipeline.pkl')
```

> **Critical:** Always fit preprocessing on **training data only**, then transform both train and test. Fitting on all data = **data leakage**.

---

## 5. Feature Engineering Fundamentals

Features are the signals your model learns from. **Better features > better algorithms**.

**Feature engineering techniques:**

```python
import pandas as pd
import numpy as np

df = pd.DataFrame(...)   # raw data

# ── Temporal features ────────────────────────────────────
df['hour_of_day']    = df['timestamp'].dt.hour
df['day_of_week']    = df['timestamp'].dt.dayofweek
df['is_weekend']     = df['day_of_week'].isin([5, 6]).astype(int)
df['month']          = df['timestamp'].dt.month
df['days_since_reg'] = (df['timestamp'] - df['reg_date']).dt.days

# ── Interaction features ─────────────────────────────────
df['revenue_per_user']  = df['revenue'] / (df['users'] + 1)
df['clicks_per_view']   = df['clicks'] / (df['views'] + 1)
df['age_income_ratio']  = df['age'] * df['income']

# ── Aggregation features (group stats) ───────────────────
user_stats = df.groupby('user_id').agg(
    total_purchases   = ('purchase', 'sum'),
    avg_order_value   = ('order_value', 'mean'),
    days_since_last   = ('timestamp', lambda x: (now - x.max()).days),
    purchase_freq     = ('purchase', lambda x: x.sum() / x.count()),
).reset_index()

# ── Text features ─────────────────────────────────────────
df['text_length']       = df['review'].str.len()
df['word_count']        = df['review'].str.split().str.len()
df['has_negative_word'] = df['review'].str.contains(
    'bad|terrible|awful', case=False).astype(int)

# ── Polynomial features ──────────────────────────────────
from sklearn.preprocessing import PolynomialFeatures
poly = PolynomialFeatures(degree=2, interaction_only=True)
X_poly = poly.fit_transform(X[['age', 'income', 'tenure']])

# ── Target encoding (careful — use cross-val fold approach) ─
df['country_target_enc'] = df.groupby('country')['churn'].transform('mean')
```

**Feature selection methods:**

```
Filter Methods (fast, model-agnostic)
├── Correlation matrix (remove high-correlation pairs)
├── Chi-squared test (categorical vs target)
├── Mutual information
└── Variance threshold (remove near-zero variance)

Wrapper Methods (slow, model-specific)
├── Recursive Feature Elimination (RFE)
└── Forward / Backward selection

Embedded Methods (during training)
├── Lasso regularization (L1 → drives weights to 0)
├── XGBoost feature importance
└── SHAP values (model-agnostic importance)
```

---

## 6. Training & Validation Strategies

Choosing the right validation strategy is **critical to honest model evaluation**.

**Train/Validation/Test split:**

```
All Data (100%)
├── Training Set   (70%) → model learns from this
├── Validation Set (15%) → hyperparameter tuning
└── Test Set       (15%) → final unbiased evaluation
                           (touch ONCE at the end)
```

**Cross-validation strategies:**

```python
from sklearn.model_selection import (
    KFold, StratifiedKFold, TimeSeriesSplit,
    GroupKFold, cross_val_score
)

# Standard K-Fold
kf = KFold(n_splits=5, shuffle=True, random_state=42)

# Stratified K-Fold (preserves class distribution — use for classification)
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# Time Series Split (no future leakage)
tscv = TimeSeriesSplit(n_splits=5)
# Fold 1: train=[0..100],  val=[101..120]
# Fold 2: train=[0..120],  val=[121..140]
# Fold 3: train=[0..140],  val=[141..160]
# ← always train on past, validate on future

# Group K-Fold (same user/entity not in train AND val)
gkf = GroupKFold(n_splits=5)
scores = cross_val_score(model, X, y,
    cv=gkf, groups=df['user_id'])
```

**Hyperparameter tuning strategies:**

```python
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from optuna import create_study

# Grid Search — exhaustive (small search spaces)
grid = GridSearchCV(
    XGBClassifier(),
    param_grid={
        'max_depth': [3, 5, 7],
        'learning_rate': [0.01, 0.1],
        'n_estimators': [100, 300, 500],
    },
    cv=5, scoring='roc_auc', n_jobs=-1
)

# Random Search — faster (large search spaces)
random_search = RandomizedSearchCV(
    XGBClassifier(),
    param_distributions={
        'max_depth': randint(3, 10),
        'learning_rate': uniform(0.01, 0.3),
        'n_estimators': randint(100, 1000),
    },
    n_iter=50, cv=5, scoring='roc_auc'
)

# Optuna — Bayesian optimization (most efficient)
def objective(trial):
    params = {
        'max_depth':     trial.suggest_int('max_depth', 3, 10),
        'learning_rate': trial.suggest_float('lr', 0.01, 0.3, log=True),
        'n_estimators':  trial.suggest_int('n_estimators', 100, 1000),
    }
    model = XGBClassifier(**params)
    return cross_val_score(model, X_train, y_train,
                           cv=5, scoring='roc_auc').mean()

study = create_study(direction='maximize')
study.optimize(objective, n_trials=100)
```

---

## 7. Model Evaluation Metrics

**Classification metrics:**

```python
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, average_precision_score,
    confusion_matrix, classification_report
)

# Confusion matrix anatomy
#                  Predicted
#              Positive  Negative
# Actual Pos |   TP    |   FN   |  ← missed (false negative)
# Actual Neg |   FP    |   TN   |  ← false alarm

# Core metrics
Accuracy   = (TP + TN) / (TP + TN + FP + FN)  # don't use on imbalanced!
Precision  = TP / (TP + FP)   # of predicted positives, how many right?
Recall     = TP / (TP + FN)   # of actual positives, how many caught?
F1         = 2 * (P * R) / (P + R)  # harmonic mean of precision & recall
ROC-AUC    = area under ROC curve (TPR vs FPR at all thresholds)
PR-AUC     = area under Precision-Recall (better for imbalanced)

# When to use what
Precision → when FP is costly   (spam filter: don't block real email)
Recall    → when FN is costly   (cancer detection: don't miss cases)
F1        → balanced trade-off
ROC-AUC   → overall discriminative ability
PR-AUC    → imbalanced datasets (rare events)
```

**Regression metrics:**

```python
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error,
    r2_score, mean_absolute_percentage_error
)

MAE   = mean_absolute_error(y_true, y_pred)
# → average absolute error, same unit as target, robust to outliers

RMSE  = mean_squared_error(y_true, y_pred, squared=False)
# → penalizes large errors more, sensitive to outliers

MAPE  = mean_absolute_percentage_error(y_true, y_pred)
# → percentage error, scale-independent, bad if y_true near 0

R²    = r2_score(y_true, y_pred)
# → proportion of variance explained (1.0 = perfect, 0 = baseline mean)
```

**Ranking metrics (recommendation systems):**

```
Precision@K   → top K results, how many relevant?
Recall@K      → of all relevant, how many in top K?
NDCG@K        → normalized discounted cumulative gain (order matters)
MAP           → mean average precision across queries
MRR           → mean reciprocal rank (first relevant result)
```

---

## 8. Overfitting & Underfitting Concepts

```
         Underfitting      Just Right      Overfitting
         (High Bias)       (Balanced)      (High Variance)
              │                │                │
Train Acc:   Low             High             High
Val Acc:     Low             High             Low
Gap:         Small           Small            Large
              │                │                │
              ▼                ▼                ▼
          Model too       Goldilocks!      Model memorized
          simple                           training data
```

**Bias-Variance tradeoff:**

```
Total Error = Bias² + Variance + Irreducible Noise

High Bias    → model assumptions too rigid
               fix: more complex model, more features

High Variance → model too sensitive to training data
               fix: more data, regularization, simpler model
```

**Detecting overfitting:**

```python
import matplotlib.pyplot as plt

train_scores = []
val_scores = []
epochs = range(1, 101)

for epoch in epochs:
    model.fit(X_train, y_train, epochs=1)
    train_scores.append(model.evaluate(X_train, y_train))
    val_scores.append(model.evaluate(X_val, y_val))

# Overfitting pattern:
# train_loss: 0.8 → 0.3 → 0.1 → 0.05 (keeps falling)
# val_loss:   0.8 → 0.4 → 0.5 → 0.6  (starts rising = overfit)
```

**Regularization techniques:**

```
L1 (Lasso)        → adds |weights| penalty → drives some to 0
                   → automatic feature selection
L2 (Ridge)        → adds weights² penalty → shrinks all weights
                   → keeps all features, just smaller
Elastic Net       → L1 + L2 combined

Dropout           → randomly zero out neurons during training
                   → forces redundant representations
Batch Norm        → normalizes layer inputs → stabilizes training
Early Stopping    → stop when val loss stops improving
Data Augmentation → artificially expand training set
Cross-Validation  → honest estimate of generalization
```

---

## 9. Experiment Tracking Concepts

Experiment tracking is the **lab notebook of ML** — every run recorded, comparable, reproducible.

**What to track per experiment:**

```
Experiment Record
├── Parameters (inputs)
│   ├── Hyperparameters    (lr=0.01, depth=5, epochs=100)
│   ├── Data version       (dataset_v3_2024-01-15)
│   ├── Feature set        (features_v7)
│   └── Model architecture (XGBoost / ResNet50 / BERT-base)
│
├── Metrics (outputs)
│   ├── Training metrics   (train_loss, train_acc per epoch)
│   ├── Validation metrics (val_auc, val_f1, val_precision)
│   └── Test metrics       (held-out final evaluation)
│
├── Artifacts (files)
│   ├── Model file         (.pkl, .pt, .h5, SavedModel)
│   ├── Preprocessing      (scaler.pkl, encoder.pkl)
│   ├── Plots              (confusion matrix, ROC curve)
│   └── Feature importance (shap_values.csv)
│
└── Metadata (context)
    ├── Git commit hash    (abc1234)
    ├── Run timestamp      (2024-01-15 14:32:11)
    ├── Duration           (47 minutes)
    ├── Hardware           (GPU: A100, RAM: 32GB)
    └── Environment        (Python 3.11, sklearn 1.4.0)
```

**Experiment tracking tools comparison:**

| Tool | Hosting | Strengths |
|---|---|---|
| **MLflow** | Self-hosted / Managed | Most popular, open source |
| **Weights & Biases** | Cloud SaaS | Best UI, rich media logging |
| **Neptune.ai** | Cloud SaaS | Great for teams |
| **Comet ML** | Cloud SaaS | Good NLP support |
| **DVC + DVCLive** | Self-hosted | Git-native, pairs with DVC |
| **Aim** | Self-hosted | Fast, open source |

---

## 10. Reproducibility in ML

**Reproducibility = same code + same data + same config → same result.**

```
Reproducibility Killers:
├── Random seeds not fixed
├── Data shuffled differently
├── Library version drift
├── Feature engineering not logged
├── Hyperparameters not recorded
├── Data preprocessing inconsistency
└── Model architecture not saved
```

**Making experiments reproducible:**

```python
import random, os
import numpy as np
import torch

def set_all_seeds(seed: int = 42):
    """Fix all random seeds for reproducibility."""
    random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    # Deterministic operations (slower but reproducible)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

set_all_seeds(42)
```

**Environment reproducibility:**

```toml
# pyproject.toml — pin exact versions
[project]
dependencies = [
    "scikit-learn==1.4.0",
    "xgboost==2.0.3",
    "pandas==2.2.0",
    "mlflow==2.10.0",
    "numpy==1.26.3",
]
```

```dockerfile
# Dockerfile for reproducible training
FROM python:3.11.7-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
ENTRYPOINT ["python", "train.py"]
```

**Reproducibility checklist:**

```
Code      ✅ Git commit SHA logged per run
Data      ✅ Dataset version / hash logged
Config    ✅ All hyperparameters logged
Env       ✅ requirements.txt / conda env / Docker image
Seeds     ✅ All random seeds fixed and logged
Pipeline  ✅ Preprocessing steps saved with model
```

---

## 11. Model Artifact Management

A model artifact is everything needed to **reproduce and serve predictions**.

**Complete model artifact bundle:**

```
model_artifact_v2.4.1/
├── model/
│   ├── model.pkl              # trained model weights
│   └── model_config.json      # architecture config
├── preprocessing/
│   ├── scaler.pkl             # fitted StandardScaler
│   ├── encoder.pkl            # fitted OneHotEncoder
│   └── feature_list.json      # expected input features
├── metadata/
│   ├── training_metrics.json  # val_auc: 0.94, f1: 0.87
│   ├── data_version.txt       # dataset_v3_sha256_abc123
│   ├── git_commit.txt         # abc1234def5678
│   └── environment.txt        # Python 3.11, sklearn 1.4.0
├── evaluation/
│   ├── confusion_matrix.png
│   ├── roc_curve.png
│   └── shap_summary.png
└── serving/
    ├── predict.py             # inference code
    ├── schema.json            # input/output schema
    └── requirements.txt       # serving dependencies
```

**Saving and loading with MLflow:**

```python
import mlflow
import mlflow.sklearn

with mlflow.start_run():
    # Train
    model = XGBClassifier(**best_params)
    model.fit(X_train, y_train)

    # Log metrics
    mlflow.log_metrics({
        'val_auc':       roc_auc_score(y_val, model.predict_proba(X_val)[:,1]),
        'val_f1':        f1_score(y_val, model.predict(X_val)),
        'val_precision': precision_score(y_val, model.predict(X_val)),
    })

    # Log full sklearn pipeline (preprocessing + model)
    mlflow.sklearn.log_model(
        full_pipeline,
        artifact_path="model",
        registered_model_name="ChurnPredictor",
        input_example=X_val.head(5),      # documents expected input
        signature=mlflow.models.infer_signature(X_val, y_pred),
    )

    # Log custom artifacts
    mlflow.log_artifact("confusion_matrix.png")
    mlflow.log_artifact("feature_importance.html")
    mlflow.log_params(best_params)
    mlflow.set_tags({
        'dataset_version': 'v3',
        'feature_set':     'v7',
        'git_commit':      git_hash,
        'team':            'data-science',
    })
```

---

## 12. ML Metadata Management

Metadata is the **provenance record** of your ML system — answers "where did this model come from?"

**ML metadata taxonomy:**

```
Data Metadata
├── Source          (s3://data-lake/raw/events/2024-01/)
├── Schema          (columns, types, constraints)
├── Statistics      (row count, null %, distributions)
├── Version/Hash    (sha256: abc123...)
└── Lineage         (raw → cleaned → features → split)

Experiment Metadata
├── Run ID          (mlflow run_id: 8f3a2b1c)
├── Parameters      (all hyperparameters)
├── Metrics         (all evaluation metrics)
├── Duration        (47 min 22 sec)
└── Hardware        (4x A100, 128GB RAM)

Model Metadata
├── Algorithm       (XGBoost 2.0.3)
├── Training data   (dataset_v3, 2.4M rows)
├── Feature list    (23 features, names + types)
├── Performance     (val_auc: 0.943)
├── Threshold       (0.47 → maximize F1)
└── Parent run      (HPO run that produced this)

Deployment Metadata
├── Served since    (2024-01-20 09:00 UTC)
├── Endpoint        (https://api/v1/predict/churn)
├── Traffic         (2400 req/min avg)
└── Monitoring      (drift alert threshold: 0.05)
```

**ML Metadata Store (MLMD):**

```python
from ml_metadata import metadata_store
from ml_metadata.proto import metadata_store_pb2

# TFX / Kubeflow Pipelines use MLMD for lineage
# Example: querying artifact lineage
store = metadata_store.MetadataStore(connection_config)

# Get all artifacts produced by a pipeline run
artifacts = store.get_artifacts_by_type('Model')
for artifact in artifacts:
    lineage = store.get_lineage_subgraph(
        query_nodes=[artifact.id],
        direction='BACKWARD',
        max_num_hops=5
    )
    # → shows: raw data → cleaning → features → training → model
```

---

## 13. MLflow Tracking & Registry

MLflow is the most widely used open-source ML platform.

```
MLflow Components
├── Tracking    → log experiments (params, metrics, artifacts)
├── Projects    → reproducible runs (MLproject file)
├── Models      → model packaging format (mlflow.pyfunc)
└── Registry    → model versioning + lifecycle management
```

**MLflow Tracking — complete example:**

```python
import mlflow
from mlflow.tracking import MlflowClient

# Connect to tracking server
mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("churn-prediction-v2")

with mlflow.start_run(run_name="xgboost-optuna-trial-47") as run:

    # Log all hyperparameters
    mlflow.log_params({
        'model_type':    'XGBoost',
        'max_depth':     6,
        'learning_rate': 0.05,
        'n_estimators':  500,
        'subsample':     0.8,
        'colsample':     0.8,
    })

    # Train model
    model.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              callbacks=[mlflow_callback])  # logs metrics per epoch

    # Log final metrics
    mlflow.log_metrics({
        'train_auc': 0.971,
        'val_auc':   0.943,
        'val_f1':    0.871,
        'val_recall': 0.884,
        'threshold': 0.47,
    })

    # Log model
    mlflow.xgboost.log_model(model, "xgboost_model")

    # Log plots as artifacts
    fig = plot_confusion_matrix(y_val, preds)
    mlflow.log_figure(fig, "confusion_matrix.png")

    print(f"Run ID: {run.info.run_id}")
```

**MLflow Model Registry — lifecycle management:**

```python
client = MlflowClient()

# Register model from run
model_version = mlflow.register_model(
    model_uri=f"runs:/{run_id}/model",
    name="ChurnPredictor"
)

# Transition through stages
client.transition_model_version_stage(
    name="ChurnPredictor",
    version=model_version.version,
    stage="Staging",
    archive_existing_versions=False
)

# After validation, promote to Production
client.transition_model_version_stage(
    name="ChurnPredictor",
    version=model_version.version,
    stage="Production",
    archive_existing_versions=True     # archive previous prod version
)

# Add description
client.update_model_version(
    name="ChurnPredictor",
    version=model_version.version,
    description="XGBoost + Optuna HPO. val_AUC=0.943. Trained on dataset_v3."
)

# Load production model anywhere
model = mlflow.pyfunc.load_model("models:/ChurnPredictor/Production")
predictions = model.predict(X_new)
```

**MLflow UI — what you see:**

```
Experiments
└── churn-prediction-v2
    ├── Run: xgboost-optuna-trial-47
    │   ├── Parameters: max_depth=6, lr=0.05, n_estimators=500
    │   ├── Metrics:    val_auc=0.943, val_f1=0.871
    │   ├── Artifacts:  model/, confusion_matrix.png
    │   └── Tags:       dataset=v3, git_commit=abc1234
    ├── Run: lightgbm-baseline
    │   └── val_auc=0.921
    └── Run: logistic-regression-baseline
        └── val_auc=0.813

Model Registry
└── ChurnPredictor
    ├── Version 3 → Production  ← current prod
    ├── Version 4 → Staging     ← being tested
    └── Version 2 → Archived
```

---

## 14. DVC for Data Version Control

DVC (Data Version Control) brings **Git-like versioning to datasets and models**.

**How DVC works:**

```
Git tracks:      .dvc files (pointers) + dvc.yaml (pipelines)
DVC tracks:      Actual data files → stored in remote (S3/GCS/Azure)

dataset.csv      → dataset.csv.dvc  (tiny pointer file in Git)
                   + actual file in S3://ml-data/cache/abc123
```

**DVC setup and basic usage:**

```bash
# Initialize DVC in a git repo
git init
dvc init
git commit -m "Initialize DVC"

# Configure remote storage (S3)
dvc remote add -d myremote s3://my-ml-bucket/dvc-store
dvc remote modify myremote region us-east-1
git commit .dvc/config -m "Configure DVC remote"

# Track a dataset
dvc add data/raw/customers.csv
# → creates data/raw/customers.csv.dvc (commit this to Git)
# → adds data/raw/customers.csv to .gitignore

git add data/raw/customers.csv.dvc .gitignore
git commit -m "Add customer dataset v1"

# Push data to remote
dvc push

# Pull data anywhere
git pull
dvc pull     # downloads actual data files from S3
```

**DVC Pipelines — reproducible ML workflows:**

```yaml
# dvc.yaml — define your ML pipeline as a DAG
stages:
  preprocess:
    cmd: python src/preprocess.py
    deps:
    - src/preprocess.py
    - data/raw/customers.csv       # input data
    params:
    - params.yaml:
        - preprocess.test_size
        - preprocess.random_seed
    outs:
    - data/processed/train.csv
    - data/processed/test.csv

  train:
    cmd: python src/train.py
    deps:
    - src/train.py
    - data/processed/train.csv     # depends on previous stage
    params:
    - params.yaml:
        - train.learning_rate
        - train.n_estimators
        - train.max_depth
    outs:
    - models/model.pkl
    metrics:
    - metrics/scores.json:
        cache: false               # track in git (small file)

  evaluate:
    cmd: python src/evaluate.py
    deps:
    - src/evaluate.py
    - models/model.pkl
    - data/processed/test.csv
    metrics:
    - metrics/eval.json:
        cache: false
    plots:
    - metrics/confusion_matrix.csv
    - metrics/roc_curve.csv
```

```yaml
# params.yaml — all experiment parameters
preprocess:
  test_size: 0.2
  random_seed: 42

train:
  learning_rate: 0.05
  n_estimators: 500
  max_depth: 6
```

```bash
# Run the full pipeline (only re-runs changed stages)
dvc repro

# Compare experiments
dvc params diff HEAD~1      # parameter changes vs last commit
dvc metrics diff HEAD~1     # metric changes vs last commit
dvc plots diff              # visual comparison of plots
```

**DVC Experiments — lightweight experiment management:**

```bash
# Run experiment with different params
dvc exp run --set-param train.learning_rate=0.01 \
            --set-param train.n_estimators=300

# Run multiple variants
dvc exp run --set-param train.max_depth=3  --name exp-depth-3
dvc exp run --set-param train.max_depth=6  --name exp-depth-6
dvc exp run --set-param train.max_depth=10 --name exp-depth-10

# Compare all experiments
dvc exp show

# ┌──────────────────┬────────────┬──────────┬─────────┐
# │ Experiment       │ val_auc    │ lr       │ depth   │
# ├──────────────────┼────────────┼──────────┼─────────┤
# │ workspace        │ 0.943      │ 0.05     │ 6       │
# │ exp-depth-3      │ 0.921      │ 0.05     │ 3       │
# │ exp-depth-6      │ 0.943      │ 0.05     │ 6       │
# │ exp-depth-10     │ 0.937      │ 0.05     │ 10      │
# └──────────────────┴────────────┴──────────┴─────────┘

# Promote best experiment to a branch
dvc exp branch exp-depth-6 feature/optimized-depth
```

---

## 15. Model Versioning Strategies

**Versioning models is as critical as versioning code.**

**Semantic versioning for models:**

```
Model Version: MAJOR.MINOR.PATCH

MAJOR → breaking change in input schema / prediction behavior
        (new features required, output format changed)
        v1.x.x → v2.0.0

MINOR → backward-compatible improvement
        (retrained on new data, better accuracy, same interface)
        v2.3.x → v2.4.0

PATCH → bug fix or minor recalibration
        v2.4.0 → v2.4.1
```

**Model lineage tracking:**

```
Dataset v3 (2.4M rows, Jan 2024)
    │
    ├──► Feature Pipeline v7
    │         │
    │         ├──► Experiment Run #47 (XGBoost, lr=0.05, depth=6)
    │         │         │
    │         │         └──► Model v2.4.1 ──► Registered ──► Production
    │         │
    │         └──► Experiment Run #52 (LightGBM, lr=0.03)
    │                   │
    │                   └──► Model v2.5.0-candidate ──► Staging
    │
    └──► Feature Pipeline v8 (new features)
              │
              └──► Experiment Run #61 ──► Model v3.0.0-dev
```

**Complete model versioning strategy:**

```python
# Model card — document every production model version
model_card = {
    "model_name":    "ChurnPredictor",
    "version":       "2.4.1",
    "stage":         "Production",

    "training": {
        "dataset":       "customer_events_v3",
        "dataset_hash":  "sha256:abc123...",
        "train_rows":    1_920_000,
        "train_period":  "2023-01-01 to 2023-12-31",
        "algorithm":     "XGBoost 2.0.3",
        "hyperparams":   {"lr": 0.05, "depth": 6, "n_est": 500},
        "git_commit":    "abc1234def5678",
        "mlflow_run_id": "8f3a2b1c4d5e6f7a",
    },

    "performance": {
        "val_auc":       0.943,
        "val_f1":        0.871,
        "val_precision": 0.881,
        "val_recall":    0.862,
        "threshold":     0.47,
    },

    "deployment": {
        "deployed_at":   "2024-01-20T09:00:00Z",
        "endpoint":      "https://api/v1/predict/churn",
        "p50_latency_ms": 12,
        "p99_latency_ms": 45,
    },

    "limitations": [
        "Trained on US customers only",
        "May underperform on accounts < 30 days old",
        "Does not account for macro-economic changes",
    ],

    "retraining_triggers": [
        "val_auc drops below 0.91",
        "Data drift score > 0.15 (PSI)",
        "Monthly scheduled retraining",
    ]
}
```

---

## Summary: Complete ML Lifecycle Architecture

```
Business Problem
      │
      ▼
Data Collection ──► DVC version ──► S3 data lake
      │
      ▼
Preprocessing Pipeline (sklearn Pipeline, saved as artifact)
      │
      ▼
Feature Engineering ──► Feature Store (Feast/Tecton)
      │
      ▼
Experiment Tracking (MLflow)
├── Log: params + metrics + artifacts + git hash
├── Compare: runs side by side
└── Select: best experiment
      │
      ▼
Model Registry (MLflow Registry)
├── Staging: integration tests, bias checks, performance gates
└── Production: canary → rollout → monitor
      │
      ▼
Serving (REST API / batch) ──► Predictions
      │
      ▼
Monitoring
├── Data drift (PSI, KS test)
├── Prediction drift (output distribution)
├── Business metrics (revenue, churn rate actual)
└── Retraining trigger ──────────────────────────► back to top
```

ML lifecycle mastery = **reproducibility + experiment tracking + data versioning + model registry + continuous monitoring**. These 15 concepts form the complete production ML engineering foundation.
