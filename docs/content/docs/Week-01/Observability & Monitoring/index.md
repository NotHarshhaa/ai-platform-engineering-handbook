---
title: "Observability & Monitoring"
description: "AI Platform Engineering Handbook - Week 1 - Advanced DevOps"
weight: 40
toc: true
---

---

## 1. Observability Principles

Before anything else, let's separate two concepts that are often conflated: monitoring and observability. They're related but fundamentally different in philosophy, and understanding the difference shapes how you build systems.

**Monitoring** is the practice of collecting predefined metrics and checking them against predefined thresholds. You know in advance what might go wrong, you instrument for it, and you alert when it happens. CPU above 90%? Alert. Error rate above 1%? Alert. Disk full? Alert. Monitoring answers questions you thought to ask before the incident.

**Observability** is the property of a system that allows you to understand its internal state by examining its external outputs. An observable system lets you ask arbitrary questions about what's happening inside it — questions you didn't think to ask before, questions that arise during an incident when you're trying to understand something you've never seen before. Observability answers questions you didn't know you'd need to ask.

The term comes from control theory. A system is observable if you can determine its internal state from its outputs. Applied to software: an observable software system is one where, when something unexpected happens, you have enough data to understand why.

The practical difference matters enormously during incidents. Monitoring tells you that something is wrong — error rate is elevated. Observability lets you figure out why — which specific requests are failing, from which users, hitting which service, caused by which code path, correlated with which recent deployment, affecting which percentage of traffic to which model version.

Tne three foundational principles of observability:

**You can't predict every failure mode** — complex distributed systems fail in unpredictable ways. The interaction between 15 microservices, under specific load patterns, with specific combinations of input data, produces failure modes that nobody designed for and nobody anticipated. If your monitoring only covers failure modes you thought of, you're blind to everything else. Observability means your system emits rich enough data that even novel failure modes can be investigated.

**Instrumentation must be built in, not bolted on** — observability is not something you add after a system is built. It's designed into the system from the start. Every service emits structured logs. Every request carries a trace ID. Every key operation is timed and counted. This is part of how the system works, not an afterthought. Retrofitting observability onto a system built without it is painful and incomplete.

**High cardinality data is what you actually need** — cardinality refers to the number of unique values a field can have. Low cardinality: `status=200` or `status=500` (a handful of values). High cardinality: `user_id=a8f3b2...` or `request_id=9d7c3e...` (millions of possible values). Most traditional monitoring systems struggle with high cardinality because they store aggregated metrics. But high cardinality is exactly what you need during debugging — you don't want to know that 0.1% of requests failed, you want to know which specific requests failed, from which users, and trace them individually. Observability tooling is designed to handle high cardinality data that traditional metrics systems can't.

**The three pillars** — metrics, logs, and traces are the three primary data types that feed observability. Each answers different questions. Metrics tell you what is happening and when. Logs tell you what happened in detail. Traces tell you how a request flowed through your system. We'll cover each in depth in the next section.

For ML systems, observability has special dimensions beyond standard software systems. Your model's behavior needs to be observable — not just "did the service return 200 OK?" but "what was the model's prediction confidence distribution?", "are input features drifting from training distribution?", "which user segments are getting different prediction quality?". Model observability is a discipline in itself that sits on top of the infrastructure observability layer.

---

## 2. Metrics vs Logs vs Traces

These three data types are the pillars of observability. Each has distinct characteristics — how it's generated, how it's stored, how it's queried, what it's good for, and what it can't tell you. Using all three together gives you a complete picture. Over-relying on any one leaves blind spots.

**Metrics** are numerical measurements collected at regular intervals and stored as time series. A metric has a name, a value, a timestamp, and a set of labels (key-value pairs that provide context). Examples: `http_requests_total{method="POST", status="200", endpoint="/predict"}`, `model_inference_latency_seconds{model_version="v2.1", percentile="p99"}`, `kubernetes_pod_cpu_usage{pod="model-server-abc123", namespace="production"}`.

Metrics are aggregated data — instead of storing one data point per request, you store the count, sum, average, or distribution across many requests. This aggregation makes metrics extremely efficient to store and query. Querying 6 months of request rate data takes milliseconds because it's stored as aggregated time series, not millions of individual request records.

Metrics are excellent for: dashboards showing overall system health, alerting on threshold violations (error rate above 1%), capacity planning, long-term trend analysis, and SLO tracking. They're terrible for: understanding why a specific request failed (you only have aggregates, not individual data points), debugging complex interactions, and any question that requires high cardinality data.

**Logs** are timestamped records of discrete events that happened in your system. Every time something notable occurs — a request arrives, an exception is thrown, a model is loaded, a database query is executed — your application writes a log entry. Logs can be unstructured (plain text) or structured (JSON with defined fields).

Structured logging is vastly superior:
```json
{
  "timestamp": "2024-01-15T14:23:41.123Z",
  "level": "ERROR",
  "service": "model-server",
  "version": "v2.1.0",
  "request_id": "req-9f7c3e2a",
  "user_id": "usr-a8f3b291",
  "model_version": "v2.1",
  "input_tokens": 847,
  "error": "CUDA out of memory",
  "stack_trace": "...",
  "latency_ms": 1203
}
```

Structured logs are machine-parseable. You can filter all errors from model version v2.1, group errors by type, correlate specific requests by request_id, and join log events across services using a shared trace ID. Unstructured text logs require regex parsing and are fragile.

Logs are excellent for: understanding exactly what happened during a specific request, debugging errors by reading stack traces and context, audit trails of user actions and system changes, and detailed diagnosis of specific failures. They're expensive compared to metrics — storing every log event for months requires significant storage — and querying across large log volumes can be slow.

**Traces** are records of a request's journey through a distributed system. In a microservices architecture, a single user request might touch 8 services before returning a response. A trace captures the entire journey — every service hop, the time spent in each, the operations performed, and any errors that occurred.

A trace consists of spans. A span represents a unit of work — one HTTP call, one database query, one model inference. Each span has a span ID, a parent span ID (except the root span), start time, duration, status, and attributes. All spans sharing a trace ID belong to the same trace.

Traces are excellent for: understanding end-to-end latency and which service is responsible for slowness, identifying cascading failures, understanding complex request flows, and debugging performance problems in distributed systems. They answer questions like "why did this specific request take 4 seconds?" — you can see that it spent 3.2 seconds waiting for the feature store and 0.8 seconds in model inference.

**Using all three together** — the power comes from correlation. Your metrics alert fires: p99 latency elevated for the predict endpoint. You look at your dashboard, narrow the time window to the spike. You query logs for the error trace IDs during that window. You open a specific trace to see that requests spent 3 seconds in the feature store. You look at feature store metrics and see connection pool exhaustion at that timestamp. Root cause: feature store connection pool too small for current traffic. Each pillar answered a different piece of the puzzle.

---

## 3. Golden Signals

The concept of golden signals comes from Google's Site Reliability Engineering (SRE) book. Google observed that across virtually all services — web services, databases, batch jobs, ML serving — there are four metrics that, together, tell you whether your service is healthy and if not, why not. Monitoring these four signals gives you the highest return on observability investment.

**Latency** is how long it takes to service a request. This must be measured as a distribution, not an average. Averages are deeply misleading for latency because they hide the tail. If 99% of requests complete in 50ms and 1% take 30 seconds, the average might be 350ms — which looks acceptable but represents a terrible user experience for 1% of your users. Always measure and alert on percentiles: p50 (median), p95, p99, p99.9. The right percentile to alert on depends on your user expectations.

Latency must be measured separately for successful requests and failed requests. A request that fails immediately has very low latency — including it in your success latency metrics makes your latency look artificially good during incidents when many requests are failing fast.

For ML systems, latency has special subcomponents worth measuring separately: feature retrieval latency (how long to get features from the feature store), model inference latency (the actual model forward pass), and pre/post-processing latency. When inference is slow, you need to know whether the model itself is slow or the surrounding infrastructure is.

**Traffic** is a measure of demand on your system. Requests per second is the most common measure, but the right metric depends on your service type. For a streaming service, it might be active connections. For a batch ML training system, it might be jobs queued and running. For a model serving API, it's requests per second and perhaps also requests by model version.

Traffic is the denominator for error rate calculations — you can only interpret absolute error counts in the context of traffic volume. 100 errors per minute during 10,000 requests per minute (1%) is very different from 100 errors per minute during 110 requests per minute (91%). Traffic is also essential for capacity planning and understanding when you're approaching your system's limits.

**Errors** is the rate of requests that are failing. This includes both explicit failures (HTTP 500 responses, exceptions thrown, predictions returning null) and implicit failures (HTTP 200 responses that return wrong data, predictions that are technically valid but nonsensical). The explicit errors are easier to measure — your instrumentation can count non-200 response codes. Implicit errors require business logic to detect — a prediction confidence below 0.1% might indicate the model is generating garbage even though the request technically succeeded.

Error rate, calculated as errors divided by total requests over a time window, is your primary signal that something is functionally wrong. Most SLOs are expressed in terms of error rate. The distinction between client errors (4xx — the caller is sending bad requests) and server errors (5xx — your service is broken) matters for alerting — you should alert on server errors but not necessarily on client error rates that are beyond your control.

**Saturation** is how full or overloaded your service is. It's a measure of how much of your capacity you're using. CPU utilization, memory usage, GPU utilization for ML inference, database connection pool utilization, queue depth — these are all saturation metrics. When saturation approaches 100%, latency increases and errors often follow. Saturation is a leading indicator — it warns you that problems are coming before they arrive, giving you time to scale before users are affected.

For ML systems, GPU utilization and GPU memory are critical saturation metrics. A model server at 95% GPU memory is close to OOMKilling under load. A training job at 40% GPU utilization is wasting expensive resources. Saturation metrics for GPU workloads guide both incident response and capacity optimization.

**The insight behind golden signals** — you don't need 200 different metrics to understand whether your service is healthy. You need these four, measured well, displayed clearly, and alerted on thoughtfully. If all four golden signals are in their normal ranges, your service is almost certainly fine. If any is abnormal, you have a clear starting point for investigation.

---

## 4. Prometheus Architecture

Prometheus is the de facto standard monitoring system in the Kubernetes and cloud-native ecosystem. Understanding its architecture deeply is essential for anyone building production ML infrastructure, because you will encounter Prometheus in virtually every Kubernetes environment.

Prometheus is a time series database combined with a metrics collection engine and a query language. Its architecture is deliberately simple, which is part of why it's so widely adopted.

**The pull model** — Prometheus collects metrics by pulling (scraping) them from targets, rather than having targets push metrics to Prometheus. This is the opposite of many traditional monitoring systems. Prometheus periodically makes HTTP GET requests to `/metrics` endpoints on each configured target. Each target responds with the current values of all its metrics in Prometheus's text exposition format. Prometheus stores these samples in its time series database.

The pull model has several advantages. You can tell from the scraper whether a target is up or down — if the scrape fails, the target is probably unhealthy. You have central control over what's scraped and how often. You can easily test what a target is exposing by hitting its `/metrics` endpoint in a browser or with curl. The disadvantage is that very short-lived targets (batch jobs that complete before the next scrape) might be missed — Prometheus has a separate component called Pushgateway for these.

**Scrape targets** are discovered statically (you list target addresses in the config) or dynamically through service discovery. Kubernetes service discovery is the most important for our context — Prometheus can automatically discover all pods, services, and nodes in a Kubernetes cluster and scrape the ones that are configured to expose metrics (indicated by Kubernetes annotations). When a new Pod starts, Prometheus discovers it automatically.

**The data model** — every metric has a name and a set of labels (key-value pairs). Labels are what give Prometheus its power and flexibility. `http_requests_total` is a metric name. `{method="POST", handler="/predict", status="200"}` are labels. The combination of a metric name and a specific set of label values is called a time series. Prometheus stores the value of each time series at each scrape interval.

The four metric types Prometheus supports: **Counter** (a value that only goes up, like total request count), **Gauge** (a value that can go up and down, like current memory usage), **Histogram** (records a distribution of observations into configurable buckets, like request latency), and **Summary** (similar to histogram but calculates percentiles client-side).

Histograms are particularly important for latency monitoring because they let you calculate percentiles server-side using Prometheus's `histogram_quantile` function. Measuring p99 latency over a time window is a Histogram query.

**PromQL** (Prometheus Query Language) is the query language for analyzing stored metrics. It's powerful and somewhat unusual because it operates on time series natively. Key operations:

```promql
# Rate of HTTP requests per second over 5-minute window
rate(http_requests_total[5m])

# P99 latency from histogram data
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Error rate as a ratio
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))

# ML model inference latency by model version
histogram_quantile(0.95,
  rate(model_inference_duration_seconds_bucket{namespace="production"}[5m])
) by (model_version)
```

**Alertmanager** is a separate component that receives alerts from Prometheus (when an alerting rule's condition is true), deduplicates them (if the same alert fires from multiple Prometheus instances), groups related alerts together, applies silences, and routes alerts to notification receivers (PagerDuty, Slack, email, OpsGenie). Alertmanager handles the "what to do when an alert fires" problem while Prometheus handles "when should an alert fire."

**Prometheus Operator and kube-prometheus-stack** — in Kubernetes, the Prometheus Operator is the standard way to deploy and manage Prometheus. It introduces Kubernetes Custom Resources like `ServiceMonitor` and `PodMonitor` that define which services to scrape, making Prometheus configuration itself declarative and Kubernetes-native. The kube-prometheus-stack Helm chart deploys the Prometheus Operator, Prometheus, Alertmanager, Grafana, and a comprehensive set of pre-built dashboards and alerting rules for Kubernetes cluster monitoring in a single command.

---

## 5. Metrics Instrumentation

Instrumentation is the practice of adding metrics collection code to your application so that it emits data about its behavior. Good instrumentation is what makes your system observable — without it, Prometheus has nothing to scrape and your dashboards are empty.

The golden rule of instrumentation: measure what matters to users, not what's easy to measure. CPU usage is easy to measure but doesn't directly tell you whether your model server is giving users good predictions. Inference latency and prediction quality directly measure user experience. Start with what matters, add lower-level metrics for diagnosis.

**Python instrumentation with prometheus-client:**

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Counter: only goes up, tracks total occurrences
INFERENCE_REQUESTS = Counter(
    'model_inference_requests_total',
    'Total number of inference requests',
    ['model_version', 'status']  # Labels
)

# Histogram: records distribution of values (latency, sizes)
INFERENCE_LATENCY = Histogram(
    'model_inference_duration_seconds',
    'Time spent running model inference',
    ['model_version'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Gauge: can go up and down (current value)
ACTIVE_REQUESTS = Gauge(
    'model_server_active_requests',
    'Number of requests currently being processed'
)

MODEL_CONFIDENCE = Histogram(
    'model_prediction_confidence',
    'Distribution of prediction confidence scores',
    ['model_version'],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1.0]
)

def run_inference(request, model_version):
    ACTIVE_REQUESTS.inc()
    start_time = time.time()
    
    try:
        result = model.predict(request.features)
        
        duration = time.time() - start_time
        INFERENCE_LATENCY.labels(model_version=model_version).observe(duration)
        INFERENCE_REQUESTS.labels(model_version=model_version, status='success').inc()
        MODEL_CONFIDENCE.labels(model_version=model_version).observe(result.confidence)
        
        return result
    except Exception as e:
        INFERENCE_REQUESTS.labels(model_version=model_version, status='error').inc()
        raise
    finally:
        ACTIVE_REQUESTS.dec()

# Expose metrics on /metrics endpoint
start_http_server(8000)
```

**Labeling strategy** — labels are powerful but come with cost. Each unique combination of label values creates a new time series in Prometheus. If you label by `user_id`, and you have 10 million users, you create 10 million time series — this is called a cardinality explosion and can crash Prometheus. Labels should have bounded cardinality. Good labels: `model_version` (a few values), `status` (success/error/timeout), `endpoint` (/predict, /health). Bad labels: user IDs, request IDs, input text (unbounded cardinality).

**USE method for resources** — for every resource (CPU, memory, GPU, network, disk), instrument Utilization (how much of the resource is being used), Saturation (how much work is queued/waiting for the resource), and Errors (error events for the resource). This gives you a complete picture of resource health.

**RED method for services** — for every service, instrument Rate (requests per second), Errors (failed requests per second), and Duration (distribution of request latency). The RED method is the service-level complement to the resource-level USE method, and together they give a complete picture of system health. Rate, Errors, and Duration map directly to three of the four golden signals.

**ML-specific metrics** — beyond standard request metrics, ML systems should instrument: feature retrieval latency and errors, model load time (how long to load weights into memory), input validation failures (malformed inputs reaching the model), prediction distribution statistics (mean confidence, distribution of output values), data drift metrics (statistical distance between current input distribution and training distribution), and model-specific business metrics (click-through rate for recommendation models, conversion rate for propensity models).

---

## 6. Grafana Dashboards

Grafana is the standard visualization layer for Prometheus (and many other data sources). It turns raw time series data into dashboards — collections of visualizations that give operational teams a real-time view of system health. A well-designed dashboard can reduce mean time to detection from minutes to seconds. A poorly designed dashboard is ignored.

Understanding Grafana starts with understanding its components.

**Data sources** — Grafana connects to external data stores (Prometheus, Loki, Elasticsearch, CloudWatch, InfluxDB, and many more) and queries them on demand. You configure data sources with connection details, and then every panel in every dashboard queries one of your configured data sources. Prometheus is the most common data source, but a full observability stack might also have Loki for logs and Tempo for traces — all in the same Grafana instance, allowing you to navigate between metrics, logs, and traces in a unified interface.

**Panels** are individual visualizations within a dashboard. Each panel has a query (PromQL for Prometheus data sources), a visualization type, and display options. Common panel types:

Time series panels show how a metric changes over time — the classic line graph. Use for: request rate over time, latency trends, error rate evolution. Every time series panel on your dashboard should have meaningful Y-axis units (seconds not just numbers, requests/second not just rate), a legend that explains what each line is, and appropriate thresholds (red line at your SLO violation level).

Stat panels show a single current value prominently. Use for: current error rate, current p99 latency, current active connections. Stat panels are great for the "at a glance" overview section at the top of a dashboard.

Gauge panels show a current value relative to a defined range, like a speedometer. Use for: CPU utilization percentage, disk usage percentage, GPU memory utilization.

Table panels show structured data in rows and columns. Use for: top 10 slowest endpoints, list of current incidents, model version deployment status.

Heatmap panels show distribution data over time — how latency distribution changes throughout the day. Use for: latency histograms, prediction confidence distributions.

**Dashboard design principles:**

Design for the 3am scenario. When someone is paged at 3am and opens your dashboard, they should be able to answer "is there a problem and how bad is it?" within 10 seconds, and "where is the problem?" within 60 seconds. Put the most important signals at the top. Use color consistently — red is bad, green is good, yellow is warning. Avoid dashboard sprawl — one well-designed dashboard beats ten dashboards of individual metrics.

Use template variables for filtering. A model server dashboard should have a variable for `model_version` that filters all panels. A variable for `namespace` that lets you switch between staging and production. Variables are configured in dashboard settings and propagate to all panel queries automatically.

```promql
# Panel query using template variables
histogram_quantile(0.99,
  rate(model_inference_duration_seconds_bucket{
    namespace="$namespace",
    model_version="$model_version"
  }[5m])
)
```

Annotate your dashboards with deployment events. Grafana supports annotations — vertical lines marking specific events in time. Whenever a deployment happens, you add a Grafana annotation. Operators can immediately see correlations between "we deployed at 2pm" and "latency spiked at 2:03pm" without having to check multiple systems.

**Grafana alerting** — Grafana can directly create alerts from panel queries, routing alerts through Alertmanager or its own notification system. This lets you define alerts visually in the same place you define dashboards, and preview what they would have triggered historically on your time series graph.

---

## 7. Centralized Logging

In a modern microservices or Kubernetes environment, logs are generated by hundreds of containers running across dozens of nodes. Finding the logs relevant to a specific request or incident means looking in the right place at the right time. Without centralized logging, this means SSH-ing into individual nodes, running kubectl logs for specific pods, manually correlating output from multiple sources. This is tedious at best and impossible during fast-moving incidents.

Centralized logging means all logs from all services and infrastructure are shipped to a single, searchable, queryable system. Regardless of which node a Pod is running on, you can search across all logs from all services for the time window of interest, filter by service, by log level, by error type, by user ID, by request ID — anything in the log's structured fields.

**The logging pipeline** has three stages: collection, shipping, and storage/querying.

**Collection** happens at the source. Applications write logs to stdout (the Kubernetes-recommended approach — each container writes its logs to stdout, and the container runtime captures them). The container runtime writes these logs to files on the node. Collection agents running on each node (as DaemonSets in Kubernetes) pick up these files and prepare them for shipping. Alternatively, applications can directly write to a remote log store using a logging library configured with the appropriate backend.

**Shipping** moves logs from the collection points to centralized storage. Fluentd and Fluent Bit are the most widely used log shippers in Kubernetes environments. Fluent Bit is lighter and recommended for the per-node collection agent (it runs on every node, so resource efficiency matters). Fluentd is more feature-rich and used for aggregation and transformation. The Vector log pipeline is an increasingly popular modern alternative.

Shippers handle buffering (to handle temporary network outages without losing logs), parsing (extracting structured fields from log text, transforming formats), enrichment (adding metadata like Kubernetes pod name, namespace, node, cluster name from the container runtime's metadata), and routing (sending different log streams to different destinations — audit logs to one place, application logs to another).

**Storage and querying** — the central log store must support full-text search across enormous volumes of data. Common options:

Elasticsearch is the traditional choice — a distributed search and analytics engine that indexes logs for fast full-text and structured queries. Kibana is Elasticsearch's visualization companion. The ELK stack (Elasticsearch, Logstash, Kibana) or EFK (Elasticsearch, Fluent Bit, Kibana) are classic centralized logging architectures.

Loki is Grafana Labs' log aggregation system designed specifically for Kubernetes environments. Unlike Elasticsearch, Loki doesn't index log content — it indexes only the metadata labels (pod name, namespace, service). Logs are stored compressed in object storage (S3, GCS). Queries filter by label first, then search within the matching log streams. This makes Loki dramatically cheaper to operate than Elasticsearch (no expensive indexing of every word), at the cost of slower full-text search. For most use cases, filtering by service and time window and then searching within that filtered set is fast enough.

Loki integrates natively with Grafana, letting you navigate from a metrics alert in Grafana directly to the relevant Loki logs in the same interface, connected by the same time window.

**Structured logging is essential** — centralized logging's value multiplies with structured logs. If all your logs are unstructured text, searching for all errors from the model server in the last hour requires text pattern matching. If your logs are structured JSON with a `level` field and a `service` field, it's a precise filter: `{service="model-server"} |= "level=error"`. The difference in reliability and speed is enormous.

---

## 8. Log Aggregation Concepts

Log aggregation goes beyond just centralizing logs — it's about transforming, enriching, correlating, and routing logs to extract maximum value from the data being emitted.

**Parsing and structured extraction** — many application logs are text with embedded structured data. A log line like `2024-01-15 14:23:41 ERROR model_server request_id=abc123 user_id=usr-456 latency_ms=1203 error="CUDA OOM"` contains valuable fields but they're embedded in text. Log shippers parse this into a structured record with actual fields: `request_id: "abc123"`, `user_id: "usr-456"`, `latency_ms: 1203`, `error: "CUDA OOM"`. Then you can filter, aggregate, and visualize by any of these fields.

Grok patterns (for Fluentd), VRL (for Vector), and Logstash filter plugins are all mechanisms for parsing unstructured log text into structured records. But the better solution is for applications to emit structured JSON logs in the first place, eliminating the need for complex parsing.

**Metadata enrichment** — when Fluent Bit collects a log from a container, it knows the Pod name, namespace, container name, and node name from the Kubernetes API. Enriching every log record with this metadata means you can filter logs by Kubernetes context without the application needing to know its own Kubernetes identity.

**Log correlation** — the most powerful log analysis links log records from different services that handled the same request. This is done through a shared correlation ID (trace ID, request ID) that travels with the request through every service. When the API gateway receives a request, it generates a request ID and adds it to the request headers. Every service that handles the request includes this ID in its log records. In the centralized log system, searching for a specific request ID returns all log records from all services that touched that request, in chronological order, giving you the complete story of what happened.

This only works if every service actually propagates and logs the correlation ID — it requires consistent implementation across all services. OpenTelemetry (covered later) provides standardized propagation so the trace ID automatically flows through HTTP and gRPC calls.

**Log sampling** — at high traffic volumes, logging every request at DEBUG level produces an overwhelming volume of data that's expensive to store and slow to query. Log sampling means you log a representative subset of requests in full detail rather than all of them. Different strategies: random sampling (log 1% of all requests), head-based sampling (decide whether to log when the request arrives and log all records for sampled requests), tail-based sampling (buffer logs and decide whether to log at the end of the request based on whether it was interesting — slow, errored, or high-value).

For ML systems, log all errors and all slow requests (latency above p99 threshold), and sample normal requests. Log all requests from specific high-value user segments or requests to specific model versions under test. This ensures you have complete data for debugging failures and good statistical data for understanding normal behavior, without storing logs for every routine successful prediction.

---

## 9. Distributed Tracing Basics

When a user request to your ML platform touches the API gateway, the model router, the feature store, the model server, and the monitoring system before returning a response, and that response is slow, a stack trace doesn't help you. Stack traces are for single-process debugging. Distributed tracing is for multi-service debugging.

A trace represents the entire lifecycle of a request as it propagates through multiple services. It's structured as a tree of spans, where each span represents a unit of work — processing in one service, a database call, an HTTP request to another service, a model inference call.

Every span has:
- A trace ID (same across all spans in the trace)
- A span ID (unique to this span)
- A parent span ID (the span that caused this span, except for the root span)
- An operation name (what work this span represents)
- A start timestamp and duration
- Status (success or error)
- Attributes (key-value pairs with additional context)
- Events (timestamped annotations within the span's duration)

```
Trace: req-9f7c3e2a (total: 847ms)
├── API Gateway handler (12ms)
│   ├── Authentication check (3ms)
│   └── Route to model router (2ms)
├── Model Router (823ms)
│   ├── Feature retrieval (621ms)  ← This is why it's slow
│   │   ├── Cache lookup (3ms) [MISS]
│   │   └── Feature store query (617ms)
│   └── Model inference (198ms)
│       ├── Input preprocessing (12ms)
│       ├── Forward pass (178ms)
│       └── Output postprocessing (8ms)
└── Response serialization (12ms)
```

Reading this trace, you immediately see that feature retrieval took 621ms of the 847ms total — specifically a cache miss followed by a slow feature store query. Without this trace, you'd know the request was slow but have no idea where to look.

**Context propagation** — for spans to form a coherent trace across service boundaries, trace context (trace ID and parent span ID) must travel with the request. When Service A makes an HTTP call to Service B, it adds the trace context to the request headers. Service B extracts the context, creates a child span, and propagates the context when calling Service C. This chain of propagation is what links spans from different services into a single trace.

The W3C Trace Context standard (`traceparent` and `tracestate` headers) is the modern, interoperable standard for HTTP trace context propagation. B3 propagation (from Zipkin) is older and still widely encountered. OpenTelemetry supports both.

**Trace storage and querying** — traces are stored in dedicated trace backends. Jaeger is the most widely used open-source option. Zipkin is older and simpler. Tempo (from Grafana Labs) stores traces in object storage and integrates natively with Grafana, allowing navigation from metrics or logs directly to relevant traces. Cloud options include AWS X-Ray, Google Cloud Trace, and Datadog APM.

Trace backends let you search for traces by: service name, operation name, duration (find all traces slower than 2 seconds), status (find all error traces), and attribute values (find all traces with `model_version=v2.1`). This last capability — searching by arbitrary attribute — is high-cardinality querying that metrics can't support.

**Sampling** — storing every trace for high-traffic systems would be prohibitively expensive. Most production tracing systems sample — only a fraction of requests generate full traces. Head-based sampling decides at the start of a request whether to trace it (simple but may miss slow or failing requests). Tail-based sampling buffers trace data and decides after the request completes, ensuring you always trace slow and failed requests regardless of sampling rate. Tail-based sampling is more complex but produces much more useful trace data.

---

## 10. OpenTelemetry Fundamentals

Before OpenTelemetry, the observability tool landscape was fragmented. Different APM vendors had different instrumentation libraries, different data formats, different propagation protocols. If you instrumented your application with Datadog's tracing library and then wanted to switch to Jaeger, you had to re-instrument your entire application. Vendor lock-in was a significant problem.

OpenTelemetry (OTel) is a CNCF project that provides a standardized, vendor-neutral specification and implementation for generating, collecting, and exporting observability data — metrics, logs, and traces. It's now the industry standard for instrumentation and is supported by every major observability vendor.

The key components of OpenTelemetry:

**The specification** defines the data models (what a span looks like, what a metric looks like), the APIs (how application code generates telemetry), and the semantic conventions (what attributes to use for common concepts — HTTP requests should use `http.method`, `http.url`, `http.status_code`; database calls should use `db.system`, `db.name`). Semantic conventions ensure that data from different services and different languages uses consistent attribute names, enabling cross-service analysis.

**SDKs** implement the specification in specific languages — Python, Java, Go, JavaScript, .NET, and more. The SDK handles span creation, metric recording, context propagation, sampling decisions, and exporting. Once you initialize the OTel SDK in your application, it provides the APIs your code uses to create spans and record metrics.

**Auto-instrumentation** is one of OpenTelemetry's most powerful features. For common frameworks and libraries, OTel provides automatic instrumentation — you configure it once and it automatically generates spans for every incoming HTTP request, every outgoing HTTP call, every database query, every message queue operation. For Python, the `opentelemetry-auto-instrumentation` package instruments Flask, FastAPI, requests, SQLAlchemy, Redis, and many other popular libraries without code changes.

```python
# Manual instrumentation example
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Initialize the tracer
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("model-server")

def run_inference(features, model_version):
    with tracer.start_as_current_span("model_inference") as span:
        span.set_attribute("model.version", model_version)
        span.set_attribute("input.feature_count", len(features))
        
        with tracer.start_as_current_span("feature_validation"):
            validated = validate_features(features)
        
        with tracer.start_as_current_span("forward_pass") as fp_span:
            result = model.predict(validated)
            fp_span.set_attribute("prediction.confidence", result.confidence)
        
        span.set_attribute("prediction.label", result.label)
        return result
```

**The OpenTelemetry Collector** is a standalone service that receives telemetry data from applications, processes it (filtering, transforming, batching), and exports it to multiple backends. Rather than configuring each service to export directly to Jaeger, Prometheus, and Loki separately, services export to the Collector, and the Collector routes to all backends. This decouples instrumentation from backend choice — you can add or change backends by reconfiguring the Collector without touching application code.

The Collector pipeline: receivers (accept incoming data in various formats — OTLP, Prometheus, Jaeger, Zipkin), processors (transform data — add attributes, sample, batch), exporters (send to backends — Jaeger, Prometheus, Tempo, Loki, Datadog, Grafana Cloud).

**For ML systems**, OpenTelemetry enables end-to-end tracing from the user API request through model routing, feature retrieval, model inference, and back. By using OTel from the beginning, you avoid vendor lock-in — you can switch from Jaeger to Tempo to Datadog APM by changing Collector configuration, not application code. The semantic conventions are evolving to cover ML-specific operations, making ML telemetry more consistent and queryable across tools.

---

## 11. Alerting & Incident Response

Alerting is the mechanism that tells you something is wrong in your system. Done well, alerts wake you up only when something genuinely requires attention. Done poorly, alerts wake you up constantly for things that don't need human intervention — leading to alert fatigue, where engineers start ignoring alerts because so many are false positives, and then miss the ones that matter.

**Alert design principles:**

Every alert should be actionable. If there's nothing a human can do when an alert fires, it shouldn't be an alert — it should be a dashboard metric to observe or a recording rule to track. An alert that fires for "CPU above 70%" on a node that auto-scales is not actionable — the system handles it automatically. An alert that fires for "all pods in the model server deployment are crash-looping" is actionable — a human needs to investigate immediately.

Alert on symptoms, not causes. Alert on elevated error rates (the symptom users experience), not on the specific CPU spike or memory pressure that might be causing it (a cause that might not actually affect users). Cause-based alerting produces many alerts for the same user-visible problem, creating noise. Symptom-based alerting produces one alert per user-visible problem, creating clarity.

Tune alert thresholds based on data, not intuition. "Alert when error rate exceeds 1%" sounds reasonable but might fire constantly in a system that normally has 0.8% errors. Look at your historical data, understand normal operating ranges, and set thresholds outside the normal range.

**Alert severity levels** give responders immediate context for urgency:

Critical/P1 — user impact, needs immediate response 24/7. Model serving is completely down. Error rate above SLO. These should be rare. Paged immediately regardless of time.

High/P2 — significant impact, needs response within hours. Elevated error rate below SLO threshold but trending up. One of N replicas is failing. Business hours response acceptable.

Warning/P3 — potential future problem, needs response within a day or two. Disk space filling up, memory usage growing over days, queue depth slowly increasing. Proactive attention before it becomes critical.

**Prometheus alerting rules** define conditions that trigger alerts:

```yaml
groups:
- name: model-server-alerts
  rules:
  - alert: ModelServerHighErrorRate
    expr: |
      (
        sum(rate(model_inference_requests_total{status="error"}[5m]))
        /
        sum(rate(model_inference_requests_total[5m]))
      ) > 0.01
    for: 5m  # Must be true for 5 minutes before firing (prevents flapping)
    labels:
      severity: critical
      team: ml-platform
    annotations:
      summary: "Model server error rate above 1%"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
      runbook_url: "https://wiki.company.com/runbooks/model-server-high-errors"
  
  - alert: ModelInferenceP99LatencyHigh
    expr: |
      histogram_quantile(0.99,
        rate(model_inference_duration_seconds_bucket[5m])
      ) > 2.0
    for: 10m
    labels:
      severity: high
    annotations:
      summary: "Model inference P99 latency above 2 seconds"
```

The `for` clause is critical — it prevents alerts from firing on momentary spikes. The condition must be continuously true for the specified duration before the alert fires. This dramatically reduces false positives from brief anomalies.

**Runbooks** are the documentation that tells an on-call engineer what to do when a specific alert fires. A good runbook contains: what the alert means, what the impact is, immediate diagnostic steps (what to look at first), likely causes and their solutions, escalation path if the on-call engineer can't resolve it, and links to relevant dashboards and documentation. Runbooks should be linked directly from alert definitions so the on-call engineer can navigate there immediately from the alert notification.

**Incident response process** — when a critical alert fires:

Detection: alert fires, on-call engineer is paged.

Triage: what is the user impact? How many users affected? How severe? This determines urgency.

Communication: for significant incidents, open an incident channel and start a status page update. Internal stakeholders need to know even before resolution. "We're investigating elevated error rates on the model serving API" is better than silence.

Investigation: use your observability stack. Dashboard → metrics → logs → traces. Follow the data. The golden signals point to what's wrong. Logs and traces explain why.

Mitigation: restore service as quickly as possible, even if imperfectly. Roll back the last deployment if it's deployment-related. Scale up if it's capacity-related. Disable a broken feature flag. Perfection can wait for post-incident.

Resolution: confirm service is restored and stable. Update status page.

Post-incident review (blameless post-mortem): what happened? What was the impact? What worked well in the response? What didn't? What would prevent this? Write it up within 48 hours while memory is fresh. The output is action items that reduce future incidents.

---

## 12. Monitoring Kubernetes Workloads

Kubernetes adds a layer of complexity to monitoring because you have two distinct layers to observe: the Kubernetes infrastructure layer (cluster components, nodes, pods, deployments) and the application layer (your actual services running on Kubernetes). Both need monitoring and they interact — an unhealthy node affects the applications on it, an OOMKilled pod is both a Kubernetes event and an application failure.

**Kubernetes infrastructure monitoring** covers the components that make up the cluster itself.

Node metrics are fundamental. Each node's CPU, memory, disk, and network utilization determine whether there's capacity for workloads. `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `node_disk_io_time_seconds_total` from the Node Exporter (a Prometheus exporter that runs on each node and exposes hardware and OS-level metrics) provide this data. Alerts on high node memory utilization prevent OOMKills before they happen.

Control plane metrics show the health of Kubernetes itself. API server request latency and error rates indicate whether kubectl and controllers can communicate reliably. etcd latency and size indicate database health. Scheduler throughput shows whether Pods are being scheduled promptly.

Pod and workload metrics from the Kubernetes API itself: pod restarts (high restart counts indicate crash loops), pending pod count (pods stuck pending indicate scheduling problems — insufficient resources, affinity conflicts), deployment rollout status, node readiness.

**kube-state-metrics** is a critical component that exposes Kubernetes object state as Prometheus metrics. It queries the Kubernetes API and exposes metrics like `kube_deployment_status_replicas_available`, `kube_pod_container_status_restarts_total`, `kube_pod_status_phase`, `kube_node_status_condition`. These are metadata about Kubernetes resources — not resource utilization (that's Node Exporter and cAdvisor) but the logical state of objects.

```promql
# Alert when a deployment has fewer ready replicas than desired
kube_deployment_status_replicas_ready
  
kube_deployment_spec_replicas

# Alert on excessive pod restarts
increase(kube_pod_container_status_restarts_total[1h]) > 5

# Pending pods - might indicate resource pressure
kube_pod_status_phase{phase="Pending"} > 0
```

**Application monitoring on Kubernetes** — your application containers should expose Prometheus metrics on a `/metrics` endpoint, and your Prometheus instance should scrape them. Using Prometheus Operator's `ServiceMonitor` resources makes this declarative:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: model-server-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: model-server
  namespaceSelector:
    matchNames:
    - ml-production
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

This tells Prometheus Operator to scrape any service with label `app: model-server` in the `ml-production` namespace every 15 seconds. When you deploy a new model server service with that label, it's automatically discovered and scraped.

**GPU monitoring for ML workloads** — NVIDIA provides a Prometheus exporter called `dcgm-exporter` (NVIDIA Data Center GPU Manager Exporter) that exposes detailed GPU metrics. Running this as a DaemonSet on GPU nodes exposes: GPU utilization percentage, GPU memory used and free, GPU temperature, GPU power consumption, and GPU error counts. These are essential for understanding whether your model serving and training workloads are using GPU resources efficiently and for detecting hardware issues.

```promql
# GPU memory utilization across all GPU nodes
DCGM_FI_DEV_MEM_COPY_UTIL

# Alert on GPU memory nearly full
DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_TOTAL > 0.9

# GPU temperature alert
DCGM_FI_DEV_GPU_TEMP > 85
```

**Namespace-level resource usage** — for multi-tenant clusters where different teams share resources, monitoring resource usage per namespace enables fair accounting and prevents surprise resource exhaustion:

```promql
# CPU usage by namespace
sum by (namespace) (
  rate(container_cpu_usage_seconds_total[5m])
)

# Memory usage by namespace
sum by (namespace) (
  container_memory_working_set_bytes
)
```

---

## 13. SLOs, SLAs & SLIs

SLOs, SLAs, and SLIs form a framework for defining, measuring, and communicating the reliability of your services in precise, quantitative terms. This framework comes from Google's SRE practice and is now widely adopted across the industry. Understanding this framework is important for production engineers because it changes how you think about reliability — from "is the service up?" to "is the service meeting user expectations?"

**SLI (Service Level Indicator)** is the actual measurement — a quantitative metric that indicates the level of service being provided. An SLI is a carefully chosen metric that correlates with user experience. Good SLIs measure things users care about, not internal technical metrics that users never see.

Examples of SLIs:
- Request success rate: the proportion of valid requests that returned a successful response
- Latency: the proportion of requests that completed within a specified threshold
- Availability: the proportion of time the system was able to serve requests

For ML systems, SLIs might include: the proportion of inference requests returning a prediction within 500ms, the proportion of training jobs that complete without error, the proportion of model predictions with confidence above a minimum threshold.

**SLO (Service Level Objective)** is a target value or range for an SLI. It's an internal commitment about the reliability level you aim to provide. An SLO is not a promise to users (that's the SLA) — it's a goal that guides engineering decisions.

Examples of SLOs:
- 99.9% of API requests will succeed (success rate SLI ≥ 99.9%)
- 95% of predictions will complete within 200ms (latency SLI ≥ 95% under 200ms)
- The model serving API will be available 99.95% of the time

SLOs are not 100% because 100% reliability is impossible and pursuing it is prohibitively expensive. Choosing the right SLO is a product and business decision — what reliability level do users actually need? What can you afford to provide? More nines (99.9% → 99.99%) require exponentially more engineering effort.

**Error budget** is the mathematical consequence of an SLO. If your SLO is 99.9% success rate, your error budget is 0.1% of requests — that's how many errors you're "allowed" to have while still meeting your SLO. In a month with 10 million requests, your error budget is 10,000 failed requests. If you've already burned 8,000 of those errors, you have only 2,000 remaining for the rest of the month.

Error budgets change the conversation about reliability from emotional ("we should have zero errors") to rational ("we have X% of our error budget remaining, should we take the risk of deploying this change?"). A risky deployment that might cause 5,000 errors is fine if you have 50,000 errors of budget remaining. The same deployment is inadvisable if you have only 3,000 remaining. Error budgets make reliability tradeoffs explicit and data-driven.

**SLA (Service Level Agreement)** is a formal agreement between a service provider and a customer that specifies the consequences if SLOs aren't met — typically financial penalties, service credits, or termination rights. SLAs are external and contractual. SLOs are internal targets. The SLO should be stricter than the SLA — you target 99.95% availability internally so that you have buffer before violating the 99.9% SLA. If your internal target is your SLA target, any failure violates customer agreements.

**Implementing SLO monitoring with Prometheus:**

```yaml
# Recording rule for success rate SLI over 1-hour windows
- record: job:request_success_rate:ratio_rate1h
  expr: |
    sum(rate(http_requests_total{status!~"5.."}[1h]))
    /
    sum(rate(http_requests_total[1h]))

# Alert when error budget is burning too fast
- alert: ErrorBudgetBurnRateTooHigh
  expr: |
    (
      1 - job:request_success_rate:ratio_rate1h
    ) > (1 - 0.999) * 14.4  # 14.4x burn rate = depletes monthly budget in 2 hours
  for: 5m
  annotations:
    summary: "Error budget burning at 14.4x rate"
```

The burn rate concept is important for SLO alerting. Instead of alerting when error rate exceeds the SLO threshold (which would only fire when you're already in violation), you alert when the error budget is being consumed at a rate that will exhaust the budget before the end of the measurement window. A 14.4x burn rate means you'll exhaust your monthly error budget in 50 hours — alert now so you can fix the problem before the budget is gone.

**Balancing reliability and velocity** — the most profound insight from the error budget model is that reliability and development velocity are in tension, and error budgets make that tension explicit and manageable. If your error budget is healthy (you've used only 20% of the month's budget with half the month to go), you have room to take risks — deploy that risky migration, try that new feature flag, experiment with a new model architecture. If your error budget is nearly exhausted (you've used 95% of the month's budget with two weeks to go), you should freeze risky changes until the budget recovers. The error budget is the objective arbiter of when to prioritize reliability vs velocity.

---

The connecting thread through all of them is this: you cannot improve what you cannot measure, and you cannot debug what you cannot observe. Building observable systems from the start — with structured logs, meaningful metrics, distributed traces, clear SLOs, and thoughtful alerting — transforms operations from reactive firefighting into proactive engineering. Every concept here, from the golden signals to error budgets, is a tool for understanding your system deeply enough to make it reliably better over time.