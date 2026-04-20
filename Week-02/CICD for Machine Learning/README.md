# CI/CD for Machine Learning

---

## 1. ML Pipeline Architecture

An ML pipeline is an **orchestrated sequence of automated stages** that transforms raw data into a deployed, monitored model — with every stage reproducible, versioned, and auditable.

**The fundamental shift from traditional software:**

```
Traditional CI/CD                    ML CI/CD
─────────────────                    ────────────────────
Code changes trigger builds          Code + Data + Model changes trigger runs
Tests are deterministic              Tests are probabilistic (metric thresholds)
Artifact = compiled binary           Artifact = trained model + metadata
One pipeline type                    Three pipelines (data, training, serving)
Deploy = ship new code               Deploy = ship new model version
```

**Three-pipeline architecture:**

```
┌────────────────────────────────────────────────────────────────┐
│                    ML Three-Pipeline System                    │
│                                                                │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │     DATA     │    │    TRAINING      │    │   SERVING    │  │
│  │   PIPELINE   │───►│    PIPELINE      │───►│   PIPELINE   │  │
│  │              │    │                  │    │              │  │
│  │ • Ingest     │    │ • Preprocessing  │    │ • Package    │  │
│  │ • Validate   │    │ • Feature Eng.   │    │ • Deploy     │  │
│  │ • Transform  │    │ • Train          │    │ • Monitor    │  │
│  │ • Version    │    │ • Evaluate       │    │ • Rollback   │  │
│  └──────────────┘    │ • Register       │    └──────────────┘  │
│                      └──────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

**End-to-end pipeline DAG:**

```
Raw Data Sources
       │
       ▼
 Data Ingestion ──────────► Data Validation (Great Expectations)
       │                          │
       │                    Pass? │ Fail → Alert & Stop
       ▼                          │
 Feature Engineering ◄────────────┘
       │
       ▼
 Train/Val/Test Split
       │
       ▼
 Model Training ──────────► Experiment Tracking (MLflow)
       │
       ▼
 Model Evaluation ────────► Metric Gate (val_auc > 0.93?)
       │                          │
       │                    Pass? │ Fail → Alert & Stop
       ▼                          │
 Model Registration ◄─────────────┘
       │
       ▼
 Integration Tests ────────► Bias & Fairness Checks
       │
       ▼
 Staging Deployment
       │
       ▼
 Shadow Testing / Canary
       │
       ▼
 Production Deployment
       │
       ▼
 Monitoring & Drift Detection
       │
       └───────────── Trigger Retraining ──────► back to top
```

**Orchestration tools:**

| Tool | Paradigm | Best For |
|---|---|---|
| **Apache Airflow** | DAG-based scheduling | Data engineering heavy |
| **Kubeflow Pipelines** | K8s-native, container steps | Cloud-native ML |
| **Prefect** | Python-first, dynamic flows | Data science teams |
| **Metaflow** | Netflix-origin, researcher-friendly | Research to prod |
| **ZenML** | Framework-agnostic, stack-based | MLOps standardization |
| **Vertex AI Pipelines** | Managed GCP | GCP shops |
| **SageMaker Pipelines** | Managed AWS | AWS shops |

---

## 2. Training Pipeline Automation

A training pipeline is a **fully automated, reproducible workflow** that goes from versioned data to a registered model artifact without any human intervention during execution.

**Pipeline stage breakdown:**

```
Stage 1 — Data Loading
├── Pull specific data version from DVC / data lake
├── Validate data contract (schema, row count, freshness)
└── Log data lineage (source, version, hash)

Stage 2 — Preprocessing
├── Apply feature transforms (fitted on train split only)
├── Handle missing values, outliers, encoding
└── Save fitted preprocessors as artifacts

Stage 3 — Feature Engineering
├── Compute derived features (aggregations, ratios, embeddings)
├── Join with feature store if applicable
└── Log final feature schema and statistics

Stage 4 — Training
├── Split data (train / val / test — temporal if time-series)
├── Train with chosen algorithm and hyperparameters
├── Log all params, metrics, artifacts to MLflow
└── Save model artifact

Stage 5 — Evaluation
├── Evaluate on held-out test set
├── Compare against baseline and current production model
├── Run fairness, bias, and calibration checks
└── Generate evaluation report

Stage 6 — Registration
├── Register model to MLflow Registry if metrics pass gates
├── Attach full metadata (data version, git SHA, run ID)
└── Transition to Staging
```

**Pipeline parameterization — everything driven by config:**

```
pipeline_config.yaml drives everything:
├── data_version: v3.2
├── train_start_date: 2023-01-01
├── train_end_date: 2023-12-31
├── model_type: xgboost
├── hyperparameters: {lr: 0.05, depth: 6}
├── evaluation_thresholds: {val_auc: 0.93, val_f1: 0.87}
└── target_environment: staging
```

This means the same pipeline code, different config = different experiment. **No hardcoded values anywhere in the pipeline.**

**Pipeline idempotency:**

Every stage must produce the same output given the same inputs, regardless of how many times it runs. Achieved by:
- Pinning data versions (not "latest")
- Fixing random seeds
- Versioning all dependencies
- Writing outputs to versioned paths, never overwriting

---

## 3. Continuous Training (CT)

Continuous Training is the practice of **automatically retraining models on a regular cadence or when triggered by real-world signals**, ensuring the model stays aligned with current data distributions.

**CT vs CI/CD analogy:**

```
Software CI/CD:                 ML Continuous Training:
Code changes → rebuild          Data changes → retrain
Unit tests pass → deploy        Metric gates pass → promote
Version bumps are code          Version bumps are model + data
```

**CT triggering modes:**

```
┌──────────────────────────────────────────────────────┐
│              Continuous Training Triggers            │
├────────────────────┬─────────────────────────────────┤
│ Schedule-based     │ Cron: weekly / monthly          │
│                    │ Regardless of drift             │
├────────────────────┼─────────────────────────────────┤
│ Drift-based        │ Data distribution shifted       │
│                    │ PSI score > 0.2 on key features │
├────────────────────┼─────────────────────────────────┤
│ Performance-based  │ Live accuracy < threshold       │
│                    │ Business metric degraded        │
├────────────────────┼─────────────────────────────────┤
│ Data-volume based  │ N new labeled samples available │
│                    │ New cohort data arrived         │
├────────────────────┼─────────────────────────────────┤
│ Event-based        │ Major product change            │
│                    │ Market shift, new segment launch│
└────────────────────┴─────────────────────────────────┘
```

**CT pipeline architecture:**

```
                       Trigger Signal
                            │
                  ┌─────────▼──────────┐
                  │  Trigger Evaluator │ ← drift score, schedule,
                  │                    │   performance alert
                  └─────────┬──────────┘
                            │ CT run approved?
                  ┌─────────▼──────────┐
                  │  Data Preparation  │ ← pull fresh data window
                  │  (new training     │   validate quality
                  │   window)          │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Training Run      │ ← same pipeline,
                  │  (automated)       │   new data window
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │ Challenger         │ ← new model vs
                  │ vs Champion        │   current production
                  └─────────┬──────────┘
                            │ challenger wins?
                  ┌─────────▼──────────┐
                  │  Promote Challenger│ ← automated or
                  │  to Production     │   human-in-the-loop
                  └────────────────────┘
```

**CT data window strategies:**

```
Expanding Window:    all historical data + new data
  Jan ─────────────────────────────────► Dec + Jan new
  Good for: stable patterns, more data = better

Sliding Window:      fixed recent period only
  [Oct ──────────────── Jan]
  [Nov ──────────────── Feb]
  Good for: concept drift, recent data matters more

Weighted Window:     all data, recent data weighted more
  Jan(w=0.1) ── Jun(w=0.5) ── Dec(w=1.0)
  Good for: gradual drift, seasonal patterns
```

---

## 4. Continuous Integration for ML

CI for ML means **every change — to code, data, or config — automatically triggers validation** before it can merge or deploy.

**Three axes of ML CI:**

```
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   CODE CI     │   │   DATA CI     │   │  MODEL CI     │
│               │   │               │   │               │
│ Unit tests    │   │ Schema check  │   │ Training runs │
│ Lint / format │   │ Stats check   │   │ Metric gates  │
│ Type checks   │   │ Drift check   │   │ Shadow tests  │
│ Pipeline test │   │ Completeness  │   │ Regression    │
│ Dep security  │   │ Freshness     │   │ Bias checks   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                    PR cannot merge until
                    ALL three CI layers pass
```

**ML-specific CI checks:**

```
Layer 1 — Code Quality (same as software engineering)
├── Lint (flake8, ruff)
├── Type checking (mypy)
├── Unit tests for transforms, metrics, utilities
├── Security scan for secrets, vulnerable dependencies
└── Dockerfile lint (hadolint)

Layer 2 — Pipeline Integrity
├── Pipeline runs end-to-end on sample data (smoke test)
├── Preprocessing outputs match expected schema
├── Feature values within valid ranges
├── No data leakage detected (temporal check)
└── Reproducibility test (two runs → same output)

Layer 3 — Model Quality Gates
├── Training completes without error
├── Validation metrics exceed minimum thresholds
├── Model is not significantly worse than production
├── No runaway resource usage (training budget check)
└── Model size within serving limits
```

**CI for data and features (pull request on data):**

```
Data PR workflow:
  New data file committed / pipeline config changed
            │
            ▼
  Data CI checks:
  ├── Schema matches contract
  ├── No unexpected nulls in required columns
  ├── Value distributions within expected bounds
  ├── Row count within acceptable range
  ├── No duplicate primary keys
  └── Temporal ordering correct (no future leakage)
            │
  All pass? │ Any fail → block merge, alert data engineer
            ▼
  Merge approved — data version bumped
```

---

## 5. Continuous Deployment for ML Models

CD for ML is the practice of **automatically deploying validated model versions** to production environments after passing all quality gates — with appropriate safety mechanisms.

**CD safety mechanisms unique to ML:**

```
Software CD:              ML CD adds:
──────────────            ─────────────────────────────
Deploy new binary         Deploy new model + check business impact
Run smoke tests           Run prediction quality tests on live data
Route 100% traffic        Route 1% → 10% → 50% → 100% (canary)
Rollback on errors        Rollback on metric degradation (not just errors)
```

**ML CD pipeline:**

```
New model version registered (Staging)
              │
              ▼
     Integration Tests
     ├── Inference latency within SLA
     ├── Prediction on known examples matches expected output
     ├── Schema validation (input → output)
     └── Load test (throughput under expected QPS)
              │
              ▼
     Shadow Mode (1-7 days)
     ├── New model runs alongside production
     ├── Receives same requests
     ├── Predictions logged but NOT served to users
     └── Compare distributions vs production model
              │
              ▼
     Canary Release
     ├── 1% → 5% → 10% → 25% → 50% → 100%
     ├── Business metrics monitored at each step
     ├── Automated gate: proceed if metrics stable
     └── Auto-rollback if degradation detected
              │
              ▼
     Full Production
     ├── Old version archived (kept for rollback)
     ├── Monitoring continues
     └── Drift detection armed
```

**Deployment approval gates:**

```
Automated gates (no human needed):
├── Latency p99 < 100ms ✅
├── Error rate < 0.1% ✅
├── Prediction distribution similar to shadow run ✅
└── No anomalous feature values at inference ✅

Human approval gates (required for production):
├── Model card reviewed by ML team lead
├── Bias and fairness report signed off
├── Business stakeholder approves metric trade-offs
└── Security review for sensitive use cases
```

---

## 6. Model Testing Strategies

ML models require a **multi-layer testing strategy** — different from traditional software because behavior is probabilistic and data-dependent.

**The ML testing pyramid:**

```
                    ▲
                   ╱ ╲
                  ╱A/B╲   ← Production tests
                 ╱Tests╲    (live traffic split)
                ╱───────╲
               ╱ Shadow  ╲  ← Pre-production tests
              ╱  Testing  ╲   (same requests, logged)
             ╱─────────────╲
            ╱  Integration  ╲  ← Pipeline tests
           ╱    Tests        ╲   (end-to-end runs)
          ╱───────────────────╲
         ╱ Model Quality Tests ╲  ← Metric + behavior tests
        ╱ (metrics, bias, calib)╲
       ╱─────────────────────────╲
      ╱      Unit Tests           ╲ ← Code tests
     ╱(transforms, utilities, etc) ╲
    ▼───────────────────────────────▼
```

**Test types with purpose:**

```
Unit Tests (deterministic)
├── Feature transform functions produce correct output
├── Custom metric calculations are mathematically correct
├── Preprocessing handles edge cases (nulls, outliers, new categories)
├── Postprocessing (thresholding, label mapping) is correct
└── Pipeline config parsing and validation works

Model Quality Tests (threshold-based)
├── Validation AUC > 0.93 on holdout
├── Precision / Recall within acceptable bounds
├── Performance is consistent across demographic segments
├── Prediction confidence is well-calibrated
└── Model is not worse than current production by more than 2%

Behavioral / Invariance Tests
├── Input perturbation test: slight noise in features → prediction stable
├── Monotonicity test: higher risk feature → higher churn probability
├── Direction test: more support tickets → higher churn score
├── Boundary test: extreme input values → valid, bounded predictions
└── Consistency test: same input always → same output (determinism)

Integration Tests
├── Full pipeline runs from raw data to prediction in < 30 minutes
├── Model loads from registry and serves prediction within latency SLA
├── Batch pipeline processes 1M records without OOM or failure
└── Model version routing works correctly (v1 → v1, v2 → v2)

Shadow Tests (pre-production)
├── New model runs on live traffic (no user impact)
├── Output distributions compared to production model
├── Significant divergence triggers human review
└── Run for N days before canary promotion

A/B Tests (production)
├── Statistical significance on business metrics
├── Guardrail metrics not violated (churn rate, revenue)
├── Sample size calculated upfront (avoid peeking problem)
└── Hold experiment for pre-determined duration
```

---

## 7. Data Validation in Pipelines

Data validation is a **critical quality gate** that stops the pipeline before it trains on corrupt, drifted, or unexpected data — failing early is far cheaper than deploying a broken model.

**Data validation layers:**

```
Layer 1 — Schema Validation (structural)
├── All expected columns present
├── Column data types match schema
├── No extra columns unexpectedly added
└── Required columns have no nulls

Layer 2 — Statistical Validation (distributional)
├── Numerical features: mean, stddev within expected range
├── Categorical features: value set matches known vocabulary
├── Class imbalance ratio within acceptable range
└── Row count within expected bounds (±20% of last run)

Layer 3 — Business Logic Validation (semantic)
├── No future dates in timestamp columns (leakage check)
├── Revenue values are non-negative
├── Age/tenure values are within realistic bounds
└── Cross-field consistency (end_date > start_date)

Layer 4 — Drift Validation (temporal)
├── Input feature distributions vs training baseline
├── PSI (Population Stability Index) < 0.2 per feature
├── KS test p-value for continuous features
└── Chi-squared test for categorical features
```

**Validation failure handling:**

```
Validation Result → Action

Schema failure     → Hard stop: pipeline halts, PagerDuty alert
                     Cannot train on wrong-schema data

Statistical anomaly → Soft stop: human review required
                      Alert data engineer, hold pipeline

Business logic fail → Hard stop: data corruption suspected
                      Escalate to data engineering team

Drift warning       → Continue with flag:
                      Log drift report, attach to model metadata
                      Human reviews before promotion

Drift critical      → Soft stop: consider whether drift is real-world
                      change or data pipeline issue
                      May trigger retraining instead
```

**Validation as code (data contracts):**

```
Data contracts define expectations between teams:
├── Data engineering promises: schema, SLA, quality
├── ML engineering expects: those guarantees
├── Contract stored in version control (YAML / JSON)
├── Validation runs check against contract on every run
└── Breaking contract = pipeline blocked until resolved

Tools: Great Expectations, Soda Core, dbt tests, Pandera
```

---

## 8. Automated Model Evaluation

Automated evaluation answers **"is this model good enough to deploy?"** without human judgment for every run — humans review the report, the system makes the pass/fail call.

**Evaluation framework — five dimensions:**

```
┌──────────────────────────────────────────────────────────┐
│                 Automated Evaluation Suite               │
├─────────────────┬────────────────────────────────────────┤
│ 1. Performance  │ Accuracy, AUC, F1, RMSE on test set    │
├─────────────────┼────────────────────────────────────────┤
│ 2. Comparison   │ Challenger vs Champion (prod model)    │
├─────────────────┼────────────────────────────────────────┤
│ 3. Fairness     │ Metrics per protected group (age, sex) │
├─────────────────┼────────────────────────────────────────┤
│ 4. Robustness   │ Behavioral tests, perturbation tests   │
├─────────────────┼────────────────────────────────────────┤
│ 5. Operational  │ Latency, model size, memory footprint  │
└─────────────────┴────────────────────────────────────────┘
```

**Challenger vs Champion evaluation:**

```
Champion (current production):
├── val_auc: 0.931
├── val_f1:  0.862
└── p99 latency: 42ms

Challenger (new model):
├── val_auc: 0.943  → +1.3% improvement ✅
├── val_f1:  0.871  → +1.0% improvement ✅
└── p99 latency: 51ms → +9ms slower ⚠️

Evaluation Decision Matrix:
├── Must-pass gates (hard requirements):
│   ├── val_auc > 0.92             → ✅ PASS
│   ├── val_f1 > 0.85              → ✅ PASS
│   └── p99 < 100ms                → ✅ PASS
└── Nice-to-have:
    ├── Improvement vs champion > 0.5% AUC → ✅
    └── Latency not significantly worse     → ⚠️ review

Automated decision: PROMOTE TO STAGING
Reason: All hard gates passed, meaningful improvement over champion
```

**Fairness evaluation:**

```
Bias evaluation checks model performance across subgroups.
Failure example:

Overall AUC:  0.943 ✅

By age group:
├── 18-34:  AUC 0.951 ✅
├── 35-54:  AUC 0.941 ✅
└── 55+:    AUC 0.807 ❌  ← 14% worse than overall

Decision: BLOCKED
Reason: Model underperforms on 55+ age group
Action: Flag for bias review, re-examine training data balance
```

**Evaluation artifacts generated per run:**

```
evaluation_report_run_8f3a2b1c/
├── metrics_summary.json          → all numeric metrics
├── confusion_matrix.png          → visual breakdown
├── roc_curve.png                 → threshold trade-offs
├── precision_recall_curve.png    → imbalanced class view
├── feature_importance.png        → top 20 features
├── shap_summary.png              → model explainability
├── fairness_report.json          → subgroup metrics
├── calibration_plot.png          → probability calibration
├── behavioral_tests.json         → pass/fail per test case
└── champion_challenger.json      → comparison vs production
```

---

## 9. Model Promotion Strategies (Staging → Production)

Model promotion is a **controlled, verifiable process** of moving a validated model through environments with increasing real-world exposure and scrutiny.

**Promotion environments:**

```
Development
└── Data scientists iterate, no automation gates
└── MLflow experiments tracked

Staging
└── Automated pipeline runs on full data
└── Full test suite executed
└── Integration tests with serving infrastructure
└── Performance benchmarks run
└── Fairness and bias reports reviewed

Shadow
└── Model receives production traffic
└── Predictions logged, NOT served to users
└── Distribution compared to champion
└── Run for minimum N days (typically 3-14)

Canary
└── Predictions served to small % of users (1-10%)
└── Business metrics monitored closely
└── Automated promotion gate checks
└── Traffic gradually increased if metrics hold

Production
└── 100% traffic
└── Full monitoring armed
└── Champion status conferred
└── Previous version archived (not deleted)
```

**Promotion gate checklist:**

```
Staging → Shadow:
├── All automated tests pass
├── Latency within SLA on load test
├── Model card complete
└── Fairness report approved by reviewer

Shadow → Canary:
├── Shadow run completed (minimum days elapsed)
├── Prediction distribution similar to champion (KL divergence < threshold)
├── No anomalous output patterns detected
└── Manual sign-off from ML lead

Canary → Production:
├── Canary ran at target % for minimum duration
├── Business metric delta within expected range (e.g., ±2% churn rate)
├── Error rate not elevated vs baseline
├── Infrastructure stable under traffic share
└── Automated rollback trigger NOT fired during canary
```

**Gated promotion with human-in-the-loop:**

```
Automated Promotion (low-risk changes)
  └── Triggered for: scheduled retraining, same architecture
  └── Gates: all automated, no human approval
  └── Example: weekly retrain with fresh data, same model family

Human-Gated Promotion (high-risk changes)
  └── Required for: new model architecture, new feature set
  └── Gates: automated + named approver (ML lead, business owner)
  └── Approval via GitHub PR review or ML platform UI
  └── Example: switching from XGBoost to neural network
```

---

## 10. Feature Pipeline Automation

Feature pipelines transform raw events into **analysis-ready, model-ready features** — and must be automated, versioned, and monitored just like training pipelines.

**Feature pipeline architecture:**

```
Raw Data Sources (databases, event streams, APIs)
              │
              ▼
    ┌─────────────────────┐
    │   Ingestion Layer   │  → Kafka, Kinesis, batch imports
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Transformation     │  → dbt, Spark, Beam
    │  Layer              │    aggregations, joins, encoding
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   Feature Store     │  → Feast, Tecton, Hopsworks
    │                     │    point-in-time correct lookups
    │  ┌────────┐         │    offline store (training)
    │  │Offline │         │    online store (serving)
    │  │ Store  │         │
    │  └────────┘         │
    │  ┌────────┐         │
    │  │Online  │         │
    │  │ Store  │         │
    │  └────────┘         │
    └──────────┬──────────┘
               │
      ┌────────┴──────────┐
      ▼                   ▼
  Training             Serving
  (offline store)      (online store)
  batch retrieval      low-latency lookup
```

**Feature consistency problem (training-serving skew):**

```
Training time:                  Serving time:
  features computed by          features computed by
  batch Spark job               real-time Lambda function

If these are not identical → predictions are silently wrong

Solution — Feature Store:
  One definition of each feature
  Same code computes it offline AND online
  Training and serving read from same store
  → Training-serving skew eliminated
```

**Feature versioning:**

```
Feature Set v7 (used by Model v2.4.1)
├── tenure_days                (unchanged from v6)
├── monthly_spend_90d_avg      (unchanged)
├── support_tickets_30d        (NEW in v7)
├── plan_type_encoded          (unchanged)
└── days_since_last_login      (NEW in v7)

Feature Set v6 (used by Model v2.3.0)
├── tenure_days
├── monthly_spend_90d_avg
└── plan_type_encoded

Model registry links model version → feature set version
→ Serving infrastructure knows which features to fetch
→ Rollback to old model → automatically uses old feature set
```

---

## 11. Trigger-Based Retraining

Trigger-based retraining moves away from **fixed schedules** toward **intelligent, signal-driven retraining** — training when it's actually needed, not just because it's Tuesday.

**Trigger taxonomy:**

```
Statistical Triggers (automated, no human needed)
├── Data drift: PSI > 0.25 on feature X
├── Prediction drift: output distribution shifted by KL > threshold
├── Label drift: actual outcome rates changed significantly
└── Model performance: live accuracy dropped below floor

Operational Triggers (automated)
├── New labeled data: 50,000 new labels accumulated
├── Data freshness: training data is now N days stale
└── Upstream schema change: new feature available in pipeline

Business Triggers (human-initiated)
├── Product launch: new user segment being onboarded
├── Market event: pandemic, regulation, pricing change
└── Strategic decision: expand to new geography/language

Schedule Triggers (time-based fallback)
└── Weekly / monthly retrain even if no drift detected
    (ensures model stays fresh as insurance)
```

**Trigger evaluation workflow:**

```
Monitoring System detects signal
            │
    ┌───────▼────────┐
    │ Signal Router  │
    │                │
    │ Is this drift? │─── Statistical → auto-trigger retrain
    │ Is this alert? │─── Critical    → page on-call
    │ Is this info?  │─── Low risk    → log and monitor
    └────────────────┘

Auto-triggered retrain:
├── Fetch latest N days of data
├── Validate data quality
├── Run training pipeline
├── Evaluate challenger vs champion
└── Auto-promote if challenger wins
           │
           │ else → alert ML team: retrain ran, model not better
           │        may indicate data quality issue, not just drift
```

**Trigger sensitivity tuning:**

```
Too sensitive (many false positives):
├── Frequent retraining wastes compute
├── Model instability from constant updates
└── Alert fatigue in on-call team

Not sensitive enough (missed signals):
├── Degraded model serves stale predictions
├── Business metrics silently worsen
└── Drift not caught until users complain

Tuning approach:
├── Set thresholds based on historical drift patterns
├── Use statistical power analysis (how big is real vs noise?)
├── Back-test triggers on historical data
└── Start conservative, loosen over time as system matures
```

---

## 12. Model Drift Detection Concepts

Drift is the phenomenon where **the statistical properties of model inputs or outputs change over time**, causing model performance to silently degrade without any code change.

**Types of drift:**

```
┌─────────────────────────────────────────────────────────────┐
│                     Drift Taxonomy                          │
├──────────────────────┬──────────────────────────────────────┤
│ Data Drift           │ Input feature distributions change   │
│ (Covariate Shift)    │ P(X) changes, P(Y|X) stays same      │
│                      │ Example: age distribution of users   │
│                      │ shifts as product scales to elderly  │
├──────────────────────┼──────────────────────────────────────┤
│ Concept Drift        │ Relationship between features &      │
│                      │ target changes                       │
│                      │ P(Y|X) changes                       │
│                      │ Example: fraud patterns evolve as    │
│                      │ fraudsters adapt to detection        │
├──────────────────────┼──────────────────────────────────────┤
│ Label Drift          │ Target distribution shifts           │
│                      │ P(Y) changes                         │
│                      │ Example: churn rate increases        │
│                      │ due to economic downturn             │
├──────────────────────┼──────────────────────────────────────┤
│ Prediction Drift     │ Model output distribution changes    │
│                      │ Even if inputs haven't drifted much  │
│                      │ First signal before labels arrive    │
└──────────────────────┴──────────────────────────────────────┘
```

**Drift detection methods:**

```
Statistical Tests for Numerical Features:
├── PSI (Population Stability Index)
│   ├── PSI < 0.1:  no drift (stable)
│   ├── PSI 0.1-0.2: minor drift (monitor)
│   └── PSI > 0.2:  significant drift (act)
├── KS Test (Kolmogorov-Smirnov)
│   └── Compares CDFs of reference vs current distribution
└── Jensen-Shannon Divergence
    └── Symmetric version of KL divergence

Statistical Tests for Categorical Features:
├── Chi-squared test
├── Jensen-Shannon on probability distributions
└── New category detection (unseen values at inference)

Model-based Drift Detection:
└── Train a classifier to distinguish reference vs current data
    If classifier achieves high AUC → distributions are different
    This detects complex multivariate drift

Prediction-based Detection (no labels needed):
└── Monitor distribution of model output scores
    If score distribution shifts → flag for review
    Advantage: immediate signal without waiting for labels
```

**Drift detection architecture:**

```
Production Traffic
        │
        ▼
  Request Logger ──────────────────► Feature Store / Log Store
        │
        ▼
  Drift Detector (runs hourly/daily)
  ├── Pull reference window (training data stats)
  ├── Pull current window (last N days of production data)
  ├── Compute PSI / KS per feature
  ├── Compute prediction distribution shift
  └── Compare against thresholds
        │
        ├── No drift   → log result, continue
        ├── Mild drift  → alert, increase monitoring frequency
        └── Severe drift → trigger retraining pipeline
```

---

## 13. Automated Model Rollbacks

Automated rollback is the **safety net** of ML deployments — when a deployed model causes metric degradation, the system reverts to the previous known-good version without waiting for human action.

**Rollback triggers:**

```
Immediate (hard triggers — automated, no human needed):
├── API error rate spikes above 1%
├── Inference latency p99 exceeds SLA by > 50%
├── Model returns null / exception for > 0.1% of requests
└── Memory / CPU usage exceeds limit (OOM risk)

Metric-based (soft triggers — automated after confirmation window):
├── Business metric declines > N% vs baseline
│   (churn conversion, revenue per prediction)
├── Prediction distribution diverges severely from shadow run
├── Live accuracy (where labels available quickly) drops sharply
└── Guardrail metric violated during canary

Human-initiated (always available):
└── On-call engineer observes unexpected behavior
└── Business team raises concern about model decisions
└── Rollback command via CLI, GitOps PR, or ML platform UI
```

**Automated rollback architecture:**

```
Canary Phase (10% traffic)
        │
        ▼
  Metric Monitor (runs every 5 minutes)
  ├── Compare canary vs control group
  ├── Check guardrail metrics
  └── Evaluate against rollback thresholds
        │
  Degradation detected?
        │
   YES  │  NO
        │   └──► Continue canary, increase traffic
        ▼
  Rollback Decision Engine
  ├── Is degradation statistically significant?
  ├── Has minimum observation window elapsed?
  └── Is degradation above rollback threshold?
        │
   YES ─┤
        ▼
  Automated Rollback
  ├── Switch 100% traffic back to previous model version
  ├── Archive degraded model version with failure tag
  ├── Fire PagerDuty alert to on-call
  ├── Open incident ticket automatically
  ├── Post to Slack: "Model v2.5.0 auto-rolled back to v2.4.1"
  └── Log rollback reason and metrics snapshot
```

**Rollback vs retraining decision:**

```
After rollback, team investigates root cause:

Root Cause → Action

Data quality issue          → Fix data pipeline, retrain
Feature engineering bug     → Fix code, retrain
Hyperparameter regression   → Tune HPO, retrain
Concept drift (real world)  → Collect new data, retrain
Label noise in training     → Re-label, retrain
Model architecture wrong    → Architecture review, redesign
Training data leakage       → Fix leakage, retrain from scratch
Infrastructure issue        → Fix infra, redeploy same model
```

**Version management for rollback:**

```
Always maintain N previous versions in registry:
├── v2.5.0 → Archived (rolled back, failure tagged)
├── v2.4.1 → Production (reinstated champion)
├── v2.3.0 → Archived (kept for 90-day retention)
└── v2.2.0 → Archived

Rollback is instant because:
├── Container image still in registry (not deleted)
├── Model artifact still in MLflow (not deleted)
└── Feature set version pinned (no feature mismatch)
```

---

## 14. GitOps for ML Deployments

GitOps for ML means **Git is the single source of truth for both model configuration and deployment state** — every model promotion, rollback, or configuration change goes through a Git PR with full audit trail.

**GitOps principles applied to ML:**

```
Software GitOps:             ML GitOps adds:
────────────────             ───────────────────────────────
App code in Git              Model version in Git
K8s manifests in Git         Model serving config in Git
ArgoCD syncs cluster         ArgoCD syncs model deployments
PR = code change             PR = model promotion
Git history = audit          Git history = model lineage
Rollback = git revert        Rollback = git revert (model version)
```

**ML GitOps repository structure:**

```
ml-deployments-repo/
├── models/
│   ├── churn-predictor/
│   │   ├── base/
│   │   │   ├── deployment.yaml     ← serving infrastructure
│   │   │   └── model-config.yaml   ← model version pointer
│   │   └── overlays/
│   │       ├── staging/
│   │       │   └── model-config.yaml  ← model v2.5.0-candidate
│   │       └── production/
│   │           └── model-config.yaml  ← model v2.4.1
│   └── recommendation-engine/
│       └── ...
├── feature-pipelines/
│   └── churn-features/
│       └── pipeline-config.yaml
└── monitoring/
    └── churn-predictor/
        └── drift-thresholds.yaml
```

**Model promotion via PR (GitOps flow):**

```
1. Automated pipeline completes training
           │
           ▼
2. CI system opens PR automatically:
   Title: "Promote churn-predictor to production: v2.5.0"
   Changes:
     - models/churn-predictor/overlays/production/model-config.yaml
       model_version: "2.4.1" → "2.5.0"
   Body: full eval report attached (metrics, fairness, challenger comparison)
           │
           ▼
3. Required reviewers notified (ML lead, business owner)
           │
           ▼
4. Reviewers check:
   ├── Automated test results in PR checks (all green)
   ├── Evaluation report attached
   ├── Fairness report clean
   └── No performance regression
           │
           ▼
5. PR approved and merged to main
           │
           ▼
6. ArgoCD detects change in Git
           │
           ▼
7. ArgoCD syncs: pulls new model-config.yaml
   └── Model serving pod updated with v2.5.0
   └── Traffic gradually shifted (canary via Istio weights)
           │
           ▼
8. Full audit trail in Git history:
   "Who promoted this model?"     → PR author + approvers
   "When was it promoted?"        → merge timestamp
   "Why was it promoted?"         → PR description + linked eval report
   "What was the previous version?" → git diff
   "How to roll back?"             → git revert PR → ArgoCD re-syncs
```

**GitOps rollback for models:**

```
Production incident detected
        │
        ▼
On-call engineer runs:
  git revert <promotion-commit-sha>
  git push origin main
        │
        ▼
ArgoCD detects revert within 3 minutes
        │
        ▼
Model serving config reverted to v2.4.1
        │
        ▼
Traffic automatically routes to v2.4.1
(no kubectl commands, no direct cluster access needed)
        │
        ▼
Rollback complete in < 5 minutes total
Full record in Git: who, when, what was reverted
```

---

## Summary: ML CI/CD Full Architecture

```
Developer / Data Scientist
        │ code + config change
        ▼
  Git Pull Request
  └── Code CI: lint, unit tests, pipeline smoke test
  └── Data CI: schema, statistics, drift validation
  └── PR merged to main
        │
        ▼
  Training Pipeline (automated)
  ├── Data validation gate
  ├── Feature engineering
  ├── Model training (with seed, versioned data)
  ├── Evaluation gate (metrics, fairness, challenger comparison)
  └── Model registered to MLflow (Staging)
        │
        ▼
  CD Pipeline
  ├── Integration tests (latency, schema, load)
  ├── Shadow deployment (live traffic, no user impact)
  ├── Automated PR opened for production promotion
  ├── Human review + approval
  ├── Merge → ArgoCD syncs production
  └── Canary (1% → 100%) with metric gates
        │
        ▼
  Production Monitoring
  ├── Data drift detection (hourly)
  ├── Prediction drift detection (real-time)
  ├── Business metric monitoring
  ├── Automated rollback if guardrails breached
  └── Drift signal → trigger retraining → back to top
```

ML CI/CD mastery is about **treating data and models with the same engineering rigor as application code** — versioned, tested, automated, auditable, and safely deployable with rollback always available.
