# ML Lifecycle & Experiment Tracking

---

## 1. Machine Learning Lifecycle Overview

The ML lifecycle is an **iterative, end-to-end process** from business problem to production model — rarely linear, always cyclical.

The ML lifecycle is the **complete journey from a business problem to a deployed, monitored model** — and critically, it never truly ends. Unlike traditional software where you ship a feature and move on, ML systems require continuous attention because the world keeps changing.

**Why it's a cycle, not a line:**

Most people picture ML as a straight path: get data, train model, deploy, done. In reality it looks more like a spiral. You deploy a model, discover it degrades over time as user behavior shifts, retrain it with fresh data, discover the problem framing itself needs adjusting, and the whole process begins again — hopefully faster each iteration because you've built better tooling and understanding.

**The phases and what actually happens in each:**

The lifecycle begins with **business understanding**, where the hardest work often happens invisibly. Turning a vague business goal like "reduce churn" into a precise ML problem statement — what exactly to predict, for whom, how far in advance, using what data — determines everything downstream. A poorly framed problem produces a technically excellent model that solves the wrong thing.

**Data work** follows and consistently takes far longer than anyone expects, often consuming 60-80% of total project time. This includes finding relevant data sources, understanding their quirks, cleaning inconsistencies, and making critical decisions about what time period to use for training.

**Feature engineering** transforms raw data into the signals your model can actually learn from. This is where domain expertise becomes critical — knowing that "days since last login" matters more than raw login timestamps, or that "support tickets per month" is more predictive than total support tickets.

**Training and evaluation** is where most people think ML lives, but it's actually one of the smaller phases. You select algorithms, tune hyperparameters, and evaluate on held-out data. The evaluation must honestly answer: does this model actually work well enough to justify deployment?

**Deployment and monitoring** closes the loop. Getting a model into production is a substantial engineering challenge, and keeping it performing well over time requires continuous vigilance — watching for data drift, performance degradation, and changing business conditions.

```
┌────────────────────────────────────────────────────────────┐
│                   ML Lifecycle Loop                        │
│                                                            │
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
└────────────────────────────────────────────────────────────┘
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

Problem framing is the **translation layer between business intent and mathematical specification** — and getting it wrong is the most expensive mistake in ML, because you only discover the error after months of work.

**The gap between business language and ML language:**

A business stakeholder says "predict which customers will churn." This sounds straightforward but contains dozens of hidden decisions. What counts as churn — cancellation, inactivity, downgrade? Over what time horizon — 30 days, 90 days, 12 months? Predict for which customers — all of them, only active ones, only those who've been customers for 6+ months? Using data from when — up to the moment of prediction, or only data available 24 hours before?

Each decision changes the model you build, the data you need, and ultimately whether the business can act on the predictions.

**The cost asymmetry question:**

One of the most important problem framing decisions is understanding the cost of different types of errors. In a fraud detection system, missing actual fraud (false negative) might cost thousands of dollars and destroy customer trust, while incorrectly flagging a legitimate transaction (false positive) costs a few minutes of customer service time. This asymmetry should drive every decision about model thresholds, training data balance, and evaluation metrics.

Teams that skip this conversation and optimize for accuracy end up with models that are statistically impressive but operationally wrong.

**Baseline establishment:**

Before any ML work begins, you must understand what you're competing against. The baseline might be a simple rule — "flag any transaction over $10,000" — or a previous model, or even no automated system at all. If your sophisticated ML model only marginally outperforms a simple rule that took an analyst one afternoon to write, you need to question whether the ML complexity is justified.

**Feasibility constraints:**

Not every business problem should be solved with ML. Before committing, you need honest answers to: Is there enough labeled data, or can you realistically obtain it? Is there sufficient signal in the available features — does the data actually contain information predictive of what you want to predict? Can predictions be made quickly enough (real-time fraud detection has milliseconds; monthly churn scoring has days)? Is the relationship between inputs and outputs stable enough that a model trained on historical data will work on future data?

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

Data is simultaneously the most valuable asset in ML and the most overlooked engineering challenge. The model is only as good as the data it learns from, and that data is far more complex to manage correctly than most teams initially appreciate.

**Where data actually comes from:**

Production databases are the most common source but rarely in a form suitable for ML. They're optimized for transactional workloads, not analytical queries. Customer records might be spread across a dozen tables with complex relationships that need to be carefully joined while avoiding information leakage from the future.

Event streams capture user behavior in real time — clicks, purchases, support interactions — but require careful timestamp handling to avoid using events that wouldn't have been available at prediction time. A model trained on "events up to today" will seem to work perfectly but fail completely in production when it only has access to events up to the moment of prediction.

Human-labeled data is the gold standard for many problems but is expensive and slow to produce. Every labeling decision contains human judgment — two annotators might disagree on whether a support ticket represents "billing" or "technical" — and those disagreements compound across thousands of examples to create systematic noise in your training data.

**Why data versioning is non-negotiable:**

Imagine training a model in January on the current dataset and getting 91% accuracy. You update the dataset in March and retrain — accuracy drops to 87%. Is this because the new model code is worse, the hyperparameters are different, the data distribution shifted, or a preprocessing bug was introduced? Without data versioning, you genuinely cannot answer this question.

Data versioning means treating datasets like software versions. Every training run is associated with an exact, reproducible snapshot of the data used. If you need to reproduce a result from three months ago, you can retrieve exactly the data that produced it.

**The practical challenge:**

Raw datasets are often enormous — terabytes of transaction records or user events. You can't version these the way you version code files. The solution is content-addressed storage combined with lightweight metadata files. The metadata file (which is tiny and lives in your Git repository) contains a cryptographic hash of the dataset and a pointer to where it's stored. The actual data lives in object storage. To "version" the dataset, you update the metadata file. This gives you version control semantics without storing multiple copies of enormous files.

**Data quality as a first-class concern:**

Bad data silently poisons models. A model trained on data with systematic errors will learn those errors and confidently produce wrong predictions. Critical quality dimensions include completeness (are required fields present?), accuracy (do values reflect reality?), consistency (does the same entity have consistent values across sources?), and timeliness (is the data fresh enough for the use case?). These must be measured and monitored, not assumed.

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

Raw data is almost never in the right form for model training. Preprocessing transforms messy, heterogeneous reality into the clean, consistent numerical representations that learning algorithms require. Done incorrectly, preprocessing is the single most common source of subtle, hard-to-detect bugs in ML systems.

**The fundamental preprocessing challenge:**

Every transformation applied to training data must be applied identically to data at serving time. If you standardize age by subtracting the mean and dividing by the standard deviation computed from training data, then at serving time you must use those exact same training-time statistics — not recompute them from the serving data. This sounds obvious but is violated constantly in practice, causing what's known as training-serving skew: the model performs well in evaluation but mysteriously worse in production.

**What preprocessing actually involves:**

Missing values require explicit handling strategies, not just deletion. Deleting rows with any missing value might eliminate the most valuable training examples — in medical datasets, missing lab values are often clinically significant. Imputing with the column mean is simple but ignores feature relationships. Imputing with a model trained on other features preserves more information. The choice matters and must be documented.

Scaling and normalization ensure that features with large numeric ranges don't dominate features with small ranges. A feature representing annual income in dollars (range: 20,000-500,000) would completely overwhelm a feature representing age in years (range: 18-90) in many algorithms, even if age is far more predictive. Standardization (zero mean, unit variance) or normalization (to a fixed range like 0-1) addresses this, but again — the scaling parameters fit on training data must be preserved and applied to serving data.

Categorical encoding converts text categories into numbers. The challenge is handling categories that appear at serving time but weren't in training data. A model trained before a new product category was launched will encounter that category at prediction time and must handle it gracefully — either with a special "unknown" category or by other means.

**The pipeline as a software artifact:**

The preprocessing logic should be implemented as a reusable, testable pipeline — not a notebook full of ad-hoc transformations. This pipeline is itself a deployable artifact that gets versioned, tested, and deployed alongside the model. When you deploy a new model version, you deploy its associated preprocessing pipeline, ensuring transformations remain consistent between training and serving.

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

> **Critical:** Always fit preprocessing on **training data only**, then transform both train and test. Fitting on all data = **data leakage**.

---

## 5. Feature Engineering Fundamentals

Feature engineering is **the art of transforming raw data into representations that make patterns visible to learning algorithms**. It's where domain knowledge has the highest leverage — a feature created by someone who deeply understands the business problem can make a weak algorithm perform well, while a data scientist with no domain knowledge might train a sophisticated model on uninformative representations and achieve mediocre results.

**The philosophy behind feature engineering:**

Algorithms learn correlations between inputs and outputs. Feature engineering is the process of creating inputs that have the strongest possible correlation with the output you're trying to predict. Raw data often contains the signal you need but in a form the algorithm cannot easily extract. A date field contains day-of-week information, seasonality information, recency information — but a raw timestamp integer expresses none of this in a learnable way. Feature engineering extracts and makes explicit what's implicit.

**Temporal features and why they're tricky:**

Time-based features are among the most powerful and most dangerous. Calculating "days since last purchase" is straightforward — but you must calculate it relative to the prediction date, not the current date. If you're building a churn model and training on historical data, "days since last purchase" for a training example from January must be calculated as of January, not as of today when you're running the training job. Using the wrong reference point introduces leakage and produces models that look excellent in training but fail completely in production.

**Aggregation features:**

Many of the most predictive features aren't single measurements but summaries of behavior over time. "Total orders in the last 30 days," "average order value in the last 90 days," "number of support tickets in the last 7 days" — these aggregations distill behavioral patterns that raw event logs can't directly express. The challenge is computing these aggregations correctly and efficiently, especially when you need them both for training (historical snapshots) and serving (real-time or near-real-time updates).

**Feature selection — less is often more:**

Not all features help. Including many low-quality or redundant features can degrade model performance, increase training time, slow inference, and create maintenance burden. Features that are highly correlated with each other add noise without adding signal. Features with near-zero variance carry essentially no information. Features computed from data sources that are unreliable or frequently missing in production become liabilities that cause serving failures.

The goal isn't the most features — it's the most informative features.

Features are the signals your model learns from. **Better features > better algorithms**.

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

Training and validation strategy determines **whether your evaluation of model quality is honest** — whether the performance numbers you see before deployment reflect what you'll actually see in production. Poor evaluation strategy is one of the most common reasons models fail to meet expectations after deployment.

**The fundamental evaluation principle:**

The model must never, during training or evaluation, see any information it wouldn't have access to at prediction time in production. Violating this principle — called data leakage — produces models that appear to perform extraordinarily well but are actually memorizing future information that isn't available when predictions need to be made.

**Why a single train-test split is insufficient:**

Splitting your data into training and test sets and evaluating once gives you one estimate of performance, but it's sensitive to exactly how that split happened. If your test set happened to contain mostly easy examples, your estimate will be optimistically biased. If it contained mostly hard examples, pessimistically biased. Cross-validation addresses this by creating multiple train-test splits, training and evaluating on each, and averaging the results — giving a more reliable estimate of true generalization performance.

**The time dimension in validation:**

For most real business problems, data has a temporal structure that must be respected in validation. If you randomly shuffle all your customer data and split into train/test, training examples from 2024 might be mixed with test examples from 2022. This means the model is trained on "future" data relative to some of its test examples — a form of leakage that makes your model look better than it is.

Time-series validation (also called temporal cross-validation or walk-forward validation) strictly maintains temporal ordering: the model is always trained on past data and evaluated on future data, mimicking the actual deployment scenario where you train on historical data and predict future outcomes.

**Hyperparameter tuning and its pitfalls:**

Hyperparameters are the configuration choices you make before training: how deep should the decision trees be, how many hidden layers in the neural network, what learning rate to use. Finding good hyperparameters requires trying many combinations, but each trial uses the validation set for feedback. By the time you've tried hundreds of combinations, the validation set has effectively become part of the training process — your performance estimate is now optimistically biased.

The solution is a three-way split: training data for model learning, validation data for hyperparameter tuning, and a completely held-out test set touched only once at the very end to produce your final unbiased performance estimate. This final test set result is the honest number you should use to decide whether to deploy.

Choosing the right validation strategy is **critical to honest model evaluation**.

**Train/Validation/Test split:**

```
All Data (100%)
├── Training Set   (70%) → model learns from this
├── Validation Set (15%) → hyperparameter tuning
└── Test Set       (15%) → final unbiased evaluation
                           (touch ONCE at the end)
```

---

## 7. Model Evaluation Metrics

Evaluation metrics translate model behavior into numbers — and choosing the wrong metric is like optimizing your product for a metric that doesn't reflect actual customer value. The metric you optimize becomes the model's objective, so it must genuinely align with what matters in your use case.

**Why accuracy is almost never the right metric:**

Accuracy measures the fraction of predictions that are correct. In a dataset where 95% of examples are class A and 5% are class B, a model that always predicts class A achieves 95% accuracy — and is completely useless. Most real ML problems have imbalanced classes: fraud is rare, cancer is rare, equipment failures are rare. In all these cases, accuracy rewards a model for ignoring the minority class entirely.

**The precision-recall trade-off:**

Precision answers: of all the times the model said "positive," how often was it right? Recall answers: of all the actual positives in reality, how many did the model find? These two metrics exist in fundamental tension — you can always increase recall by predicting positive more aggressively, but this reduces precision as you start catching many false positives along with the true ones.

The right balance depends entirely on the cost structure of your problem. In cancer screening, missing a real case (low recall) is catastrophic, so you accept lower precision — flagging cases for follow-up even when some turn out to be benign. In a fraud alert system that requires expensive manual review, false positives cost real money, so you optimize for high precision even if you miss some fraud.

**Threshold as a design decision:**

Classification models typically output a probability score — the likelihood that an example belongs to the positive class. Converting this to a binary decision requires choosing a threshold: predict positive if score > 0.5, or 0.7, or 0.3. The threshold choice directly controls the precision-recall trade-off and should be made explicitly based on business requirements rather than defaulting to 0.5. Different thresholds serve different operational contexts — a high-stakes individual decision might require 0.9 confidence, while a bulk email campaign might use 0.3.

**Calibration — does the probability mean what you think:**

A model that outputs 0.7 for a thousand predictions — if it's well calibrated — should be right about 700 times. Poorly calibrated models output scores that don't correspond to actual probabilities. Calibration matters when the probability itself is used to make decisions (how much credit to extend, how much fraud prevention effort to apply) rather than just the binary prediction.

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

Overfitting and underfitting represent the **two failure modes of learning** — learning too much (memorizing noise) or learning too little (failing to capture real patterns). Understanding where your model sits on this spectrum and knowing how to move it is fundamental to ML practice.

**The intuition behind the bias-variance trade-off:**

Imagine you're trying to draw a curve through a set of data points. A straight line (simple model) might not bend enough to follow the actual pattern in the data — it's too rigid, too biased toward simplicity. This is underfitting. A curve with hundreds of wiggles might pass through every single training point perfectly — but those wiggles reflect noise in the specific training examples you happened to collect, not real patterns. On new data, those wiggles lead to terrible predictions. This is overfitting.

The goal is a model complex enough to capture real structure but simple enough to ignore noise.

**Why training performance lies:**

A model's performance on its own training data is almost never a reliable indicator of how it will perform on new data. A sufficiently complex model will achieve near-perfect training performance on any dataset — it can simply memorize the training examples. What you care about is generalization: how well does the model perform on data it hasn't seen? This is why you always evaluate on held-out data that wasn't used during training.

**Signs and causes of overfitting:**

The telltale signature of overfitting is a large gap between training performance and validation performance — the model performs dramatically better on data it was trained on than on new data. Common causes include a model that's too complex relative to the amount of training data, training for too many iterations (the model keeps improving on training data while validation performance plateaus or degrades), noisy labels in training data (the model learns the noise as if it were signal), and too many features relative to training examples.

**Regularization — imposing simplicity:**

Regularization techniques add a cost to model complexity during training, discouraging the model from using its full capacity to memorize training data. L1 regularization pushes weights toward zero, effectively performing automatic feature selection by making many weights exactly zero. L2 regularization shrinks all weights but rarely to exactly zero. Dropout, used in neural networks, randomly disables neurons during training, forcing the network to learn robust representations that don't depend on any single unit. Early stopping halts training when validation performance stops improving, before the model has time to memorize the training data.

**Diagnosing underfitting:**

Underfitting is simpler to recognize — both training and validation performance are poor, and there's not a large gap between them. The model isn't complex enough or hasn't been given enough information to learn the patterns in the data. Solutions include using a more complex model architecture, engineering more informative features, reducing regularization strength, training for more iterations, or collecting more or higher-quality data.

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

Experiment tracking is the **systematic recording of every ML experiment** — what you tried, what parameters you used, what results you got, and where the outputs are stored. Without it, ML development becomes archaeology: months later, you can't explain why a model performs the way it does or reconstruct the conditions that produced your best result.

**The experiment management problem:**

A typical ML project involves dozens to hundreds of training runs. You try different algorithms, different hyperparameter values, different feature sets, different preprocessing choices. Each run produces a model file, evaluation metrics, and various outputs. Without systematic tracking, this information lives in notebooks with names like "final_v2_actually_final_REAL.ipynb," on individual laptops, in mental notes that get forgotten. When someone asks "why does the production model perform this way?" or "can we reproduce the results from last quarter?" the honest answer is often "we don't know" or "probably not."

**What must be tracked for every experiment:**

Parameters represent everything you configured before training began: algorithm choice, hyperparameter values, random seeds, data version used, feature set version, preprocessing configuration. These are the inputs to the experiment. Without recording them, you can't reproduce the experiment or understand why one run outperformed another.

Metrics represent what you measured after training: validation accuracy, AUC, F1 score, precision, recall at various thresholds, training loss curves, validation loss curves. Metrics need to be recorded in a way that makes comparison across runs easy — not scattered across different output files.

Artifacts are the files produced by training: the trained model itself, preprocessing transformers, plots like confusion matrices and ROC curves, feature importance visualizations, and any other outputs. These need to be stored in a way that connects them to the specific experiment that produced them.

Context connects the experiment to the broader development story: who ran it and when, what Git commit the code was at, what motivated the experiment (following up on a previous finding, testing a hypothesis), and any qualitative notes about what you observed.

**The compound benefit of tracking:**

Experiment tracking becomes dramatically more valuable over time. When you've tracked fifty experiments, you can query across them: "show me all experiments that used feature set v7, sorted by validation AUC" or "compare experiments where I used XGBoost vs LightGBM." This transforms trial-and-error into a systematic learning process where each experiment builds on the insight from all previous ones.

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

Reproducibility means **given the same code, same data, and same configuration, you can recreate the exact same results**. It's simultaneously one of the most important properties of ML systems and one of the most frequently neglected — until someone asks you to reproduce a result and you discover you can't.

**Why ML reproducibility is uniquely difficult:**

Software engineering has a relatively straightforward reproducibility story: given the same source code, you get the same compiled binary. ML adds several additional sources of non-determinism. Randomness is baked into the process — random initialization of model weights, random shuffling of training data, random dropout during training. Different hardware produces different floating-point arithmetic results. Parallel training produces different results depending on how operations happen to be scheduled. Library versions subtly change numerical behavior. Even the operating system can introduce variance.

**The layers of reproducibility:**

Algorithmic reproducibility requires setting all random seeds at the start of every experiment — the seed for Python's random module, numpy's random generator, the ML framework's random operations, and any GPU-specific random operations. These must all be set explicitly and recorded as experiment parameters.

Data reproducibility requires that you know exactly what data was used. Not "the customer dataset from January" but "the customer dataset at commit hash abc1234 of our data repository, downloaded from S3 path s3://data/customers/v3.parquet with SHA-256 hash def5678." Without this level of precision, "the same data" might actually be subtly different data after a pipeline bug was fixed or new records were added.

Environment reproducibility requires that the exact same software versions are used. A different version of numpy, scikit-learn, or CUDA can change numerical results enough to matter. Container-based reproducibility (Docker images with pinned dependencies) provides strong environmental reproducibility — the training environment is itself a versioned artifact.

**Practical reproducibility in teams:**

Perfect mathematical reproducibility (bit-for-bit identical results) is extremely difficult to achieve across different hardware and over time. Practical reproducibility — close enough that the conclusions remain valid — is achievable and worth investing in. The key question to ask is: if someone else runs this training job with these instructions, will they get a model with similar performance characteristics and behaviors? For most purposes, this level of reproducibility is sufficient and far more achievable than perfect bit-for-bit reproduction.

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

A model artifact is **everything needed to reproduce a prediction** — not just the model weights, but the preprocessing logic, configuration, metadata, and documentation that together constitute a deployable, understandable model.

**Why "just save the model file" is insufficient:**

The model weights file is the most visible artifact but far from the complete picture. A weights file without the preprocessing pipeline is useless — you can't make predictions without knowing how to transform raw inputs into the feature format the model expects. A model without documentation of its expected input schema becomes a mystery when the original developer leaves. A model without performance metrics makes it impossible to compare against future candidates or assess production degradation.

**What constitutes a complete model artifact:**

The model weights or parameters are the learned representation — what the training process actually produced. For a decision tree, this is the tree structure and threshold values. For a neural network, this is all the weight matrices. This is the core artifact that determines predictions.

The preprocessing pipeline includes every transformer fit during training: the scaler's mean and standard deviation values, the encoder's category-to-integer mappings, the imputer's fill values. These transformers were fit on training data and must be applied consistently to new data. Saving only the model weights and recreating the preprocessing "from scratch" virtually guarantees subtle differences that degrade performance.

The feature schema documents exactly what the model expects as input: which features, in what order, with what data types, with what valid ranges. This is the contract between the model and the systems that call it. When this contract changes — a new feature added, a feature removed, a type changed — it's a breaking change that requires coordinated updates.

Performance metadata captures how the model performed during evaluation: accuracy metrics, threshold values, evaluation methodology, test set composition. This information answers questions like "is the production model still performing as expected?" and "how does this new candidate compare to what's currently deployed?"

**Artifact storage and retrieval:**

Model artifacts need to be stored in a way that makes specific versions retrievable by content (a hash of the artifact) and by version identifier (a human-readable version number or tag). Object storage like S3 provides the durability and scalability, while a model registry (like MLflow's model registry) provides the metadata layer that makes artifacts discoverable and manageable.

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

---

## 12. ML Metadata Management

ML metadata is the **provenance record of your ML system** — the complete lineage of information that answers: where did this model come from, what data trained it, who approved it, what decisions were made along the way, and what has it done since deployment?

**The lineage problem at scale:**

As ML systems grow, the number of experiments, models, datasets, and deployments multiplies rapidly. A year into active development, you might have hundreds of model versions, dozens of dataset versions, thousands of training runs, and multiple models in production simultaneously. Without metadata management, answering basic questions becomes nearly impossible: "The model in production — what data trained it?" "We found a bug in feature computation — which deployed models are affected?" "Regulators need to know what factors drove this customer's credit decision — what features were most important?"

**What ML metadata encompasses:**

Data metadata tracks everything about the datasets used across the ML lifecycle. This includes where data came from, when it was collected, what transformations were applied, what its statistical properties are, who owns it, and how long it should be retained. Crucially, it connects datasets to the models trained on them, enabling you to answer "if we retrain this model with better data, how many current models would be affected?"

Experiment metadata connects training runs to their context: which code version was used, which dataset, which configuration, when it ran, how long it took, what hardware was used, and what results it produced. This is the layer that makes experiment tracking searchable and comparable.

Model metadata captures the lifecycle of model versions: when each version was created, what experiment produced it, what evaluations it passed, who reviewed it, when it was promoted to each stage, when it was deployed, and when (if ever) it was retired. This creates an audit trail that satisfies both operational ("what changed and when?") and compliance ("can we explain decisions made by this model?") requirements.

**Metadata as organizational memory:**

The most underappreciated value of metadata management is institutional knowledge preservation. When a senior ML engineer leaves, their mental model of "why we made this feature engineering choice" or "why we use this particular validation approach" doesn't leave with them — it's encoded in the metadata. New team members can trace the history of decisions and understand the reasoning, rather than having to rediscover lessons already learned.

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

---

## 13. MLflow Tracking & Registry

MLflow is the most widely adopted open-source platform for ML lifecycle management, providing a unified system for experiment tracking, model packaging, and model registry in a single integrated tool.

**MLflow's four core components and how they fit together:**

The **Tracking** component is where experiment management lives. Every training run creates a record in the tracking server containing all logged parameters, metrics recorded at each step (enabling loss curves), artifacts produced, and tags describing the run's context. The tracking UI provides a dashboard where you can filter and compare runs across experiments, visualize how metrics evolved during training, and drill down into any specific run's details. This is the day-to-day working interface for data scientists exploring the solution space.

The **Projects** component standardizes how ML code is packaged and executed. A project is a directory with a configuration file specifying the environment it needs (conda environment or Docker image) and the entry points that can be run. This means "reproduce this training run" becomes a single command rather than a multi-page installation guide.

The **Models** component defines a standard format for packaging trained models so they can be loaded and used consistently across different deployment contexts. A packaged MLflow model includes the model itself, the environment specification needed to serve it, example inputs and their expected outputs, and the model signature defining expected input and output schemas. This standardization means the same packaged model can be served via REST API, loaded in a Python script, or deployed to cloud inference services without format conversion.

The **Registry** component provides the governance layer for model versions moving from experimentation toward production. The registry maintains a catalog of named models, each with multiple versions. Each version has a lifecycle stage: None (just registered), Staging (being evaluated for production), Production (currently serving users), or Archived (retired). The registry captures who promoted each version, when, and any annotations they added. This creates the audit trail that production ML systems require.

**How teams use MLflow in practice:**

The typical workflow begins with data scientists logging experiments during development — automatically capturing every hyperparameter tried and every metric computed. As promising experiments emerge, the best model versions get registered to the model registry under a meaningful name. The MLOps or platform team then takes over, running additional validation against the registered model, reviewing the attached metadata, and promoting it through staging to production. Any serving system that needs the current production model queries the registry by name and stage rather than hardcoding a specific version — this means updating the production model requires only changing the registry, not modifying serving configuration.

MLflow is the most widely used open-source ML platform.

```
MLflow Components
├── Tracking    → log experiments (params, metrics, artifacts)
├── Projects    → reproducible runs (MLproject file)
├── Models      → model packaging format (mlflow.pyfunc)
└── Registry    → model versioning + lifecycle management
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

DVC (Data Version Control) brings **Git-like version control to data and ML pipelines**, solving the problem that Git is excellent for code but completely unsuitable for the large binary files that constitute ML datasets and model artifacts.

**Why Git alone doesn't work for ML:**

Git tracks changes to files by storing complete snapshots of each version. For a 10-line Python script, this is trivially efficient. For a 50GB dataset, storing multiple versions in Git makes the repository enormous, slow to clone, and expensive to host. Git also has no concept of pipeline dependencies — it doesn't know that changing your preprocessing script means the training step needs to re-run, or that model artifacts become stale when the data they were trained on changes.

**DVC's architecture — Git for metadata, object storage for data:**

DVC's insight is elegant: let Git track small metadata files that describe and point to datasets, while the actual data lives in external storage (S3, GCS, Azure Blob, or local). When you add a dataset to DVC, it computes a content hash of the dataset, moves the actual file to DVC's cache, and creates a tiny metadata file (with a .dvc extension) that contains the hash and storage location. This metadata file goes into Git. The actual data goes to your configured remote storage.

The result: your Git repository stays lean and fast, containing only the lightweight pointers. To reproduce a specific version, you check out the historical metadata files from Git, then use DVC to fetch the corresponding actual data from remote storage. The content hash guarantees you get exactly the right data — if anyone has modified the data since it was stored, the hash won't match and DVC will alert you.

**DVC pipelines — reproducible ML workflows:**

DVC's pipeline feature lets you define your entire ML workflow as a directed acyclic graph where each stage declares its inputs (data files, code files, parameters), outputs (processed data, model files, metrics), and the command that runs the stage. DVC uses file content hashes to determine which stages need to re-run when inputs change.

If you change a preprocessing parameter, DVC knows that the preprocessing stage must re-run, and consequently that training must re-run (since it depends on preprocessed data), but that data validation (which depends only on raw data) does not need to re-run. This intelligent caching dramatically accelerates experimentation — you only pay the compute cost for stages that actually changed.

**Experiments with DVC:**

DVC Experiments provides a lightweight experiment management layer built on top of the pipeline system. Running an experiment with different parameters creates a separate experiment record that tracks what parameters were different and what results were produced, without creating separate Git branches or commits. You can run multiple experiments in parallel, compare their results in a table, and promote the best one to become the new baseline — all with simple commands.

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

Model versioning is the practice of **treating every trained model version as a distinct, identifiable artifact with its own lifecycle** — rather than simply overwriting the "current model" with a new one each time you retrain.

**Why model versioning matters beyond the obvious:**

The obvious reason is rollback: if you deploy a new model and it performs poorly, you want to revert to the previous version. But model versioning provides much deeper value. It enables accountability — you can answer exactly which model version made a specific prediction at any point in history. It enables gradual promotion — a new version can be tested in shadow mode, then canary, then full production without losing track of what's running where. It enables comparative analysis — you can run A/B tests where different user cohorts receive predictions from different model versions simultaneously, with their version assignment logged for later analysis.

**Semantic versioning applied to models:**

Semantic versioning from software engineering (MAJOR.MINOR.PATCH) translates meaningfully to models, though the semantics adapt to ML concerns. A MAJOR version bump indicates a breaking change in the model's interface — the input feature schema changed, the output format changed, or the model's fundamental behavior changed so dramatically that downstream systems need to be updated. A MINOR version bump indicates a meaningful improvement: retraining on new data, adding new features, changing the algorithm — same interface, better performance. A PATCH bump covers minor fixes: threshold recalibration, bug fixes in preprocessing, minor adjustments that don't substantively change model behavior.

**The model lifecycle stages:**

Most mature ML platforms implement a staged lifecycle analogous to software release stages. A newly registered model version starts in a development or candidate stage where it exists in the registry but isn't serving any real traffic. It moves to staging when it's ready for formal evaluation — integration testing, load testing, shadow deployment, formal performance review against the current production model. It moves to production when all validation gates have been passed and appropriate approvals obtained. It moves to archived when it's been replaced by a newer production version — crucially, archived doesn't mean deleted. Archived versions are retained according to the organization's retention policy, enabling rollback and serving as a historical record.

**Champion-challenger management:**

A particularly powerful versioning pattern is the champion-challenger framework. The champion is the currently deployed production model. Challengers are candidate models that have been trained and evaluated but not yet promoted. Multiple challengers can exist simultaneously — one team might be testing a new algorithm while another experiments with an expanded feature set. Each challenger undergoes rigorous evaluation against the champion before any promotion decision is made.

The promotion decision itself should be explicit and documented: which metrics were compared, who reviewed the results, what the review concluded, and who authorized the promotion. This documentation becomes part of the model version's metadata, creating the audit trail that allows you to understand any production model's history at any future point.

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
