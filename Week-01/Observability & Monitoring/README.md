# Observability & Monitoring

---

## 1. Observability Principles

Observability is the ability to **understand the internal state of a system purely from its external outputs** — logs, metrics, and traces — without needing to deploy new code or restart anything to answer "what's wrong?"

**Monitoring vs Observability:**

```
Monitoring (traditional):
  "Is it up or down?"
  Pre-defined dashboards for known failure modes
  Answers: known unknowns
  "CPU is high" → alert fires → check known runbook

Observability (modern):
  "Why is it behaving this way?"
  Explore arbitrary questions about system state
  Answers: unknown unknowns
  "Why are 3% of users in Germany getting 503s
   only on Firefox after 6pm on weekdays?"
  → Answerable without deploying new instrumentation
```

**The three pillars and how they relate:**

```
┌─────────────────────────────────────────────────────────────┐
│                 Observability Pillars                        │
│                                                             │
│  METRICS              LOGS               TRACES             │
│  ─────────            ──────             ──────             │
│  What is              What               Why did            │
│  happening?           happened?          it happen?         │
│                                                             │
│  Aggregated           Timestamped        End-to-end         │
│  numbers over         event records      request journey    │
│  time                 with context       across services    │
│                                                             │
│  "Error rate          "NullPointer       "Request took      │
│   is 5%"              Exception at       400ms: 200ms in    │
│                        line 47"          payment service"   │
└─────────────────────────────────────────────────────────────┘

They work together:
Alert fires (metric) → investigate logs (what happened) → trace (where)
```

**Observability maturity model:**

```
Level 0 — Nothing
  Flying blind: know about problems from user complaints

Level 1 — Infrastructure monitoring
  CPU, memory, disk, network tracked
  Know server is overloaded, not why app is slow

Level 2 — Application monitoring
  Request rates, error rates, response times
  Know something is wrong, hard to debug why

Level 3 — Logs + metrics
  Correlate errors with log messages
  Can debug most issues, slow on complex distributed problems

Level 4 — Full observability (metrics + logs + traces + context)
  Any question about system behavior answerable
  Unknown unknowns discoverable
  New issues debuggable without code changes
```

**Observability engineering principles:**

```
Instrument everything, aggregate intelligently:
├── Emit rich telemetry from every service
├── Aggregate at collection layer (not at emit layer)
└── High cardinality at source → summarize for storage

Design for failure debugging:
├── Every request gets a unique trace ID
├── Trace ID propagated through every service call
└── Any log line, metric, or span can be correlated by ID

Correlation is the key capability:
  Alert (metric) → trace ID → logs → root cause
  Without correlation → three silos → slow debugging
  With correlation → one click from alert to root cause
```

---

## 2. Metrics vs Logs vs Traces

**Each pillar has distinct characteristics, costs, and use cases:**

```
┌──────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│              │       METRICS         │        LOGS           │       TRACES         │
├──────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│ Data model   │ Numeric time series  │ Unstructured/JSON     │ DAG of spans         │
│ Cardinality  │ Low (aggregated)     │ High (per event)      │ High (per request)   │
│ Volume       │ Low                  │ Very high             │ High                 │
│ Cost         │ Low                  │ High                  │ Medium-High          │
│ Retention    │ Months-Years         │ Days-Weeks            │ Days-Weeks           │
│ Query speed  │ Very fast (pre-agg)  │ Slow (full text)      │ Medium               │
│ Best for     │ Alerting, dashboards │ Debugging, audit      │ Latency, dependency  │
│ Tools        │ Prometheus, Datadog  │ ELK, Loki, Splunk     │ Jaeger, Tempo, Zipkin│
└──────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

**Metrics — numeric signals over time:**

```
Types of metrics:

Counter:
├── Monotonically increasing number
├── Only goes up (resets on restart)
├── Use for: requests_total, errors_total, bytes_sent_total
└── Query: rate(requests_total[5m]) → requests per second

Gauge:
├── Point-in-time value, goes up and down
├── Current state snapshot
├── Use for: memory_bytes, active_connections, queue_depth
└── Query: memory_bytes → current value

Histogram:
├── Samples observations into configurable buckets
├── Calculates: count, sum, per-bucket counts
├── Use for: request_duration, response_size
└── Query: histogram_quantile(0.99, rate(duration_bucket[5m]))
           → p99 latency calculated server-side

Summary:
├── Pre-calculated quantiles at client side
├── Cannot aggregate across instances
└── Use for: when you know quantiles needed upfront
            (less flexible than histogram)

Metric naming convention:
  {namespace}_{subsystem}_{name}_{unit}
  http_server_requests_total
  http_server_request_duration_seconds
  process_memory_bytes
  database_connections_active
```

**Logs — event records with context:**

```
Structured logging (JSON — machine and human readable):
{
  "timestamp": "2024-01-15T14:32:11.234Z",
  "level": "ERROR",
  "service": "payment-api",
  "version": "2.4.1",
  "trace_id": "abc1234def567890",     ← links to distributed trace
  "span_id": "xyz0987",
  "user_id": "usr_123",
  "request_id": "req_456",
  "message": "Payment processing failed",
  "error": "insufficient_funds",
  "duration_ms": 142,
  "http_status": 402
}

Log levels and when to use:
├── DEBUG:   detailed diagnostic, disabled in production
├── INFO:    normal operations, significant events
├── WARN:    unexpected but handled (degraded mode)
├── ERROR:   operation failed, system continues
└── FATAL:  system cannot continue, crash imminent

Log correlation strategy:
  Every request → generate unique trace_id
  Propagate trace_id through all service calls (HTTP header)
  Include trace_id in every log line
  Result: grep trace_id → all logs for that request
          across ALL services
```

**Traces — request journey visualization:**

```
Distributed trace anatomy:

Trace ID: abc1234def567890 (unique per request)

Span 1: API Gateway (total: 380ms)
├── Span 2: auth-service (45ms)
├── Span 3: payment-service (290ms)
│   ├── Span 4: fraud-check (120ms)
│   │   └── Span 5: ML model inference (95ms)
│   └── Span 6: postgres query (130ms)  ← bottleneck!
└── Span 7: notification-service (40ms) [async]

Each span contains:
├── Service name and version
├── Operation name
├── Start time + duration
├── Status (ok/error)
├── Tags: {http.method, db.statement, user.id}
└── Events: timestamped notes within span
    "cache miss", "retry attempt 2"

Trace shows:
├── Which service caused the slowness (postgres: 130ms)
├── Which services are called sequentially vs parallel
├── Where errors originate vs where they propagate
└── What the full dependency chain looks like per request
```

---

## 3. Golden Signals

The four golden signals, defined by Google SRE, are **the minimum metrics needed to understand service health** — if you can only instrument four things, instrument these.

**The Four Golden Signals:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Four Golden Signals                      │
├─────────────────┬───────────────────────────────────────────┤
│ 1. Latency      │ How long does it take to serve a request? │
│ 2. Traffic      │ How much demand is the system receiving?  │
│ 3. Errors       │ What rate of requests are failing?        │
│ 4. Saturation   │ How full is the service?                  │
└─────────────────┴───────────────────────────────────────────┘
```

**1. Latency — response time:**

```
Track separately:
├── Successful request latency
└── Failed request latency (often fast — fail early)

Wrong: average latency (hides tail issues)
  99 requests: 10ms, 1 request: 10,000ms
  Average: 110ms → "looks fine"
  
Right: percentile latency
  p50 (median):  10ms  → typical user experience
  p95:           50ms  → 95th percentile user
  p99:          200ms  → worst 1%
  p99.9:      10000ms  → the "long tail" suffering users

Alert on p99, not average:
  p99 > 500ms → alert (even if p50 is fine)
  High p99 with normal p50 → specific slow queries, GC pauses
```

**2. Traffic — demand level:**

```
Measure: requests per second (RPS), queries per second (QPS)

What traffic tells you:
├── Baseline: normal traffic pattern (weekday vs weekend)
├── Spike: sudden traffic increase → scale up needed?
├── Drop: unexpected traffic decrease → upstream broken?
└── Context for other signals:
    Error rate 5% at 100 RPS = 5 errors/second
    Error rate 5% at 10,000 RPS = 500 errors/second → very different
```

**3. Errors — failure rate:**

```
Explicit errors:
├── HTTP 5xx (server errors)
├── gRPC non-OK status codes
└── Exception/panic rates

Implicit errors (silent failures):
├── HTTP 200 with wrong content ("success" response for wrong data)
├── Requests taking too long (timeout = functional failure)
└── Responses missing required fields

Error rate formula:
  error_rate = error_requests / total_requests
  
Alert thresholds:
  > 0.1% errors: investigate
  > 1% errors: page on-call
  > 5% errors: incident declared
```

**4. Saturation — resource fullness:**

```
Saturation predicts problems before they cause failures:

CPU saturation:
├── > 70% sustained → latency starts increasing
├── > 90% sustained → significant degradation
└── Throttling on containers (more dangerous than raw %)

Memory saturation:
├── > 80% → GC pressure increasing, OOM risk
├── > 95% → imminent OOM kill
└── Memory leak signal: steady increase without traffic increase

Queue saturation:
├── Queue depth growing → processing not keeping up
└── Alert: queue_depth > max_acceptable_lag

Disk saturation:
└── > 85% → alert (leaving headroom for log bursts)

Key insight: service often degrades before it fully fails
Saturation metrics give advance warning (minutes to hours)
```

**USE Method (for resources) + RED Method (for services):**

```
USE (Utilization, Saturation, Errors) — for every resource:
  CPU, memory, disk, network:
  ├── Utilization: % busy (CPU at 70%)
  ├── Saturation: queue/waiting (CPU run queue > 4)
  └── Errors: error events (disk read errors: 0)

RED (Rate, Errors, Duration) — for every service:
  For every API endpoint, microservice:
  ├── Rate: requests per second
  ├── Errors: errors per second
  └── Duration: latency distribution

Combined: USE tells you WHY, RED tells you WHAT
```

---

## 4. Prometheus Architecture

Prometheus is a **pull-based metrics collection system** — it scrapes metrics from instrumented targets on a schedule, stores them in a time-series database, and evaluates alert rules.

**Prometheus architecture:**

```
┌──────────────────────────────────────────────────────────────┐
│                  Prometheus Ecosystem                        │
│                                                             │
│  ┌────────────────┐    ┌───────────────────────────────┐   │
│  │  Service       │    │       Prometheus Server        │   │
│  │  Discovery     │───►│                               │   │
│  │  (K8s, DNS,    │    │  ┌──────────┐ ┌───────────┐  │   │
│  │   static)      │    │  │ Retrieval│ │ TSDB      │  │   │
│  └────────────────┘    │  │ (scraper)│ │ (storage) │  │   │
│                        │  └────┬─────┘ └─────┬─────┘  │   │
│  ┌────────────────┐    │       │              │        │   │
│  │  Targets       │◄───┤  scrape every 15s   │        │   │
│  │  (apps, nodes, │    │  pull metrics        │        │   │
│  │   exporters)   │    │  HTTP GET /metrics   │        │   │
│  └────────────────┘    │       │         ┌───▼──────┐  │   │
│                        │  ┌────▼────┐    │ Rule     │  │   │
│  ┌────────────────┐    │  │ Labels  │    │ Evaluator│  │   │
│  │  Pushgateway   │───►│  │ Storage │    │(alerts + │  │   │
│  │  (batch jobs)  │    │  └─────────┘   │ records) │  │   │
│  └────────────────┘    └───────────────────┬────────┘  │   │
│                                            │            │   │
│  ┌─────────────────────────────────────────▼──────────┐│   │
│  │              Alertmanager                          ││   │
│  │  Routing → PagerDuty, Slack, Email, OpsGenie       ││   │
│  └────────────────────────────────────────────────────┘│   │
│                                                         │   │
│  ┌─────────────────────────────────────────────────────┘   │
│  │  Grafana (visualization, query, dashboards)              │
└──────────────────────────────────────────────────────────────┘
```

**Prometheus data model:**

```
Time series identified by metric name + label set:

http_requests_total{
  method="GET",
  status="200",
  service="payment-api",
  pod="payment-api-7d9f4-xk2j"
} = 15234

Every unique combination of labels = separate time series

High cardinality warning:
  Label: user_id → millions of unique values → millions of series
  → Memory explosion, slow queries
  Rule: never use high-cardinality values as labels
  (user ID, email, request ID → never as label)
  Use for labels: status codes, methods, services, environments
```

**PromQL — Prometheus Query Language:**

```
Instant vector (current value):
  http_requests_total
  → {service="payment-api", status="200"} 15234
  → {service="payment-api", status="500"} 47

Range vector (values over time window):
  http_requests_total[5m]
  → last 5 minutes of samples per series

Rate (per-second rate of increase):
  rate(http_requests_total[5m])
  → smoothed per-second rate over 5 minute window
  → use for counters (always use rate() with counters)

Aggregation:
  sum(rate(http_requests_total[5m])) by (service)
  → total RPS per service (summed across all pods)

Percentile from histogram:
  histogram_quantile(0.99,
    sum(rate(http_request_duration_seconds_bucket[5m]))
    by (service, le)
  )
  → p99 latency per service

Error rate:
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
  → fraction of requests returning 5xx
```

**Prometheus scrape configuration:**

```
Kubernetes service discovery:
  prometheus.yml:
    scrape_configs:
    - job_name: kubernetes-pods
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        target_label: __metrics_path__
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

ServiceMonitor (Prometheus Operator — K8s native):
  apiVersion: monitoring.coreos.com/v1
  kind: ServiceMonitor
  metadata:
    name: payment-api
  spec:
    selector:
      matchLabels:
        app: payment-api
    endpoints:
    - port: metrics       ← scrape /metrics on this port
      interval: 15s
      path: /metrics
```

---

## 5. Metrics Instrumentation

Instrumentation is **adding code to your application** to emit metrics that Prometheus (or any metrics system) can collect.

**Instrumentation philosophy:**

```
What to instrument:
├── Every external call: HTTP, gRPC, DB, cache, message queue
├── Business operations: orders_processed, payments_completed
├── Queue operations: queue_depth, processing_lag, processing_time
├── Resource usage: goroutines, threads, memory, connections
└── Custom business metrics: revenue_per_minute, active_users

Where to instrument:
├── Middleware layer: capture all HTTP metrics automatically
├── Service layer: business logic metrics (manual)
├── Repository layer: database query metrics
└── Client layer: downstream service call metrics

Naming conventions:
  Pattern: {service}_{resource}_{operation}_{unit}
  payment_orders_processed_total       (counter)
  payment_request_duration_seconds     (histogram)
  payment_active_connections           (gauge)
  payment_queue_depth_items            (gauge)
```

**Language-specific instrumentation (conceptual):**

```
Python (prometheus_client):
  Counter example:
    requests_total = Counter(
      'http_requests_total',
      'Total HTTP requests',
      ['method', 'endpoint', 'status']
    )
    → Increment: requests_total.labels('GET', '/api/pay', '200').inc()

  Histogram example:
    request_duration = Histogram(
      'http_request_duration_seconds',
      'HTTP request latency',
      ['method', 'endpoint'],
      buckets=[.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5]
    )
    → Time: with request_duration.labels('GET', '/api').time(): ...

Go (prometheus/client_golang):
  Counter with labels
  Histogram with custom buckets
  Gauge for queue depth
  All registered with prometheus.MustRegister()
  Exposed via http.Handle("/metrics", promhttp.Handler())

Automatic instrumentation (lower effort):
  Middleware wraps handler → captures all HTTP metrics automatically
  DB driver wrappers → capture query metrics
  gRPC interceptors → capture RPC metrics
  Result: zero per-route instrumentation code needed
```

**Exporters — metrics for systems you can't instrument:**

```
Node Exporter:
  Runs on every host (DaemonSet in K8s)
  Exposes: CPU, memory, disk, network, filesystem
  300+ metrics about the Linux system

Kube State Metrics:
  Runs once in cluster
  Exposes: K8s object state (not node metrics)
  Deployment desired vs ready replicas
  Pod phase (running/pending/failed)
  Resource requests vs limits

cAdvisor (Container Advisor):
  Runs on every node (built into kubelet)
  Exposes: per-container CPU, memory, I/O

Blackbox Exporter:
  Probes endpoints (HTTP, TCP, ICMP, DNS)
  External availability check from Prometheus perspective
  "Can Prometheus reach this URL? What's the latency?"

Postgres Exporter, Redis Exporter, MySQL Exporter:
  Connect to DB → expose DB-specific metrics
  Connection pool, query duration, replication lag
```

---

## 6. Grafana Dashboards

Grafana is the **visualization layer** — connecting to Prometheus (and dozens of other data sources) to build dashboards that turn raw metrics into actionable insight.

**Dashboard design principles:**

```
Information hierarchy on a dashboard:

Row 1 — Health at a glance (biggest panels, top):
  ├── Service status (up/down)
  ├── Current error rate (single stat, red/green)
  ├── Current p99 latency vs SLO threshold
  └── Current requests per second

Row 2 — Trend overview (medium panels):
  ├── Request rate over time (graph, last 24h)
  ├── Error rate over time (graph, last 24h)
  └── Latency percentiles over time (p50, p95, p99)

Row 3 — Drill-down (detailed panels):
  ├── Error rate by endpoint
  ├── Latency heatmap
  ├── Upstream dependency health
  └── Resource utilization (CPU, memory)

Row 4 — Infrastructure (supporting context):
  ├── Pod count and restarts
  ├── Node resource usage
  └── HPA scaling events
```

**Dashboard variable patterns:**

```
Template variables make dashboards reusable:

$namespace variable:
  Query: label_values(kube_pod_info, namespace)
  → Dropdown to select: production, staging, dev

$service variable:
  Query: label_values(http_requests_total{namespace="$namespace"}, service)
  → Dropdown changes based on selected namespace

$interval variable:
  Options: 1m, 5m, 15m, 1h
  → Used in PromQL: rate(metric[$interval])

All panels use $namespace, $service, $interval
→ One dashboard for ALL services and environments
→ Filter changes → all panels update simultaneously
```

**Essential Grafana panel types:**

```
Time Series (line graph):
  Best for: trends over time, rate/error/latency over hours
  Show: p50, p95, p99 on same graph with different colors

Stat (single number):
  Best for: current value at a glance
  Show: current error rate, uptime %, active users
  Threshold colors: green/yellow/red

Gauge (arc/dial):
  Best for: saturation metrics (how full is the bucket?)
  Show: CPU %, memory %, disk %

Heatmap:
  Best for: latency distribution over time
  Show: request duration distribution (x=time, y=latency, color=volume)
  Reveals: latency spikes, bimodal distributions

Table:
  Best for: ranked lists, comparison across services
  Show: top 10 slowest endpoints, error count by service

Logs panel:
  Best for: showing log lines alongside metrics
  Links Grafana to Loki (log aggregation)
```

---

## 7. Centralized Logging

Centralized logging means **all logs from all services flow to one searchable system** — instead of SSH-ing to individual servers or pods.

**Why centralize:**

```
Without centralized logging:
  Service A logs → /var/log/app.log on Pod A
  Service B logs → /var/log/app.log on Pod B

  Debugging: SSH to each pod, grep manually
  Pod crashes → logs lost (ephemeral container)
  Correlation across services: impossible at scale

With centralized logging:
  All logs → central store (Elasticsearch/Loki/Splunk)
  Search across all services simultaneously
  Logs survive pod death
  Full text search, filter, aggregate
  Correlate by trace_id across all services instantly
```

**ELK Stack architecture:**

```
Application pods
     │
     │ stdout/stderr (structured JSON)
     ▼
Filebeat / Fluentd / Fluentbit    ← log shipper (DaemonSet)
(running on every node)
     │
     │ forwards to
     ▼
Logstash (optional)               ← parse, transform, enrich
     │
     ▼
Elasticsearch                     ← store, index, search
     │
     ▼
Kibana                            ← visualize, query, dashboard
     │
     ▼
Alerts → PagerDuty / Slack
```

**Grafana Loki — lightweight alternative:**

```
Loki vs Elasticsearch philosophy:

Elasticsearch:
├── Indexes ALL log content (full text search)
├── Expensive storage, fast any-field search
└── Best for: complex log analysis, security (SIEM)

Loki (Grafana):
├── Indexes only LABELS (not log content)
├── Logs stored compressed (cheap)
├── Search: filter by labels first, grep content second
├── Same label model as Prometheus
└── Best for: K8s-native, cost-sensitive, integrated with Grafana

PLG Stack (Promtail + Loki + Grafana):
  Promtail (DaemonSet) scrapes pod logs
  → Attaches K8s labels (namespace, pod, container, app)
  → Ships to Loki
  → Grafana queries Loki with LogQL
  
LogQL example:
  {namespace="production", app="payment-api"} |= "ERROR"
  → All error logs from payment-api in production

  {app="payment-api"} | json | status_code >= 500
  → Parse JSON logs, filter by status code field
```

---

## 8. Log Aggregation Concepts

**Log aggregation is the pipeline** that collects, parses, enriches, and routes logs from sources to destinations.

**Log pipeline stages:**

```
Stage 1 — Collection (where logs come from):
├── Container stdout/stderr → Filebeat/Fluentbit reads from node
├── Syslog → shipped from OS-level services
├── Application push → app sends directly (less preferred)
└── Cloud provider → CloudWatch, Cloud Logging native

Stage 2 — Parsing (structure the unstructured):
├── JSON logs → already structured, pass through
├── Plaintext logs → parse with grok patterns, regex
├── Multiline → stack traces need reassembly across lines
└── Normalize: timestamps to UTC, level to standard values

Stage 3 — Enrichment (add context):
├── Kubernetes metadata: namespace, pod, node, deployment
├── Service version: from pod labels
├── Environment: dev/staging/prod tag
└── Geographic: resolve IP to country/region if needed

Stage 4 — Routing (where logs go):
├── All logs → Elasticsearch (long-term storage, full search)
├── Error logs → PagerDuty/Slack (real-time alerting)
├── Audit logs → separate tamper-evident storage (compliance)
└── Debug logs → drop (or sample 1% to save cost)

Stage 5 — Storage with retention:
├── Debug/info logs: 7-14 days (short, high volume)
├── Error/warn logs: 30-90 days (medium, important)
├── Audit logs: 1-7 years (long, regulatory requirement)
└── Security logs: 1+ years (compliance, forensics)
```

**Log sampling strategies (cost control):**

```
High volume services at DEBUG level generate enormous log volume.
Strategies to control cost without losing signal:

Head sampling:
  Randomly keep N% of all requests' logs
  Simple, but loses rare error context

Tail sampling:
  See full request, THEN decide to keep
  Keep: all errors, all slow requests, N% of normal
  Discard: fast successful requests (low value, high volume)
  More expensive to implement, much better signal preservation

Dynamic sampling:
  High traffic period → sample more aggressively
  Low traffic period → keep more logs
  Error spike → temporarily disable sampling (keep everything)

Reservoir sampling:
  Keep exactly N log lines per time window
  Guarantees bounded storage regardless of traffic spikes
```

**Fluentbit configuration (log shipper):**

```
Fluentbit runs as DaemonSet on every K8s node:

Input:
  Read from: /var/log/containers/*.log
  (all pod logs on this node)

Parser:
  JSON parser → parse structured app logs
  Docker parser → handle Docker log format wrapper

Filter:
  Add K8s metadata (namespace, pod name, labels)
  Drop system pods logs (kube-system namespace)
  Modify: add cluster name, environment tag

Output:
  Elasticsearch:  all logs with 14 day index lifecycle
  Loki:           all logs with label-based indexing
  S3:             raw logs for long-term archive (cheap)
  Kafka:          high-throughput streaming to downstream
```

---

## 9. Distributed Tracing Basics

Distributed tracing tracks **a single request as it flows through multiple services**, showing exactly where time is spent and where errors occur in the full call chain.

**Why distributed tracing is essential:**

```
Without tracing:
  User: "checkout is slow"
  You: look at API gateway logs → no errors
       look at order service logs → no errors
       look at payment service logs → no errors
       look at notification service → no errors
  → Everything looks fine, but checkout is slow
  → Root cause: database connection pool exhaustion
    in inventory service, visible only in traces

With tracing:
  User: "checkout is slow"
  You: find trace for slow checkout request
       expand spans → inventory-service: 8 seconds
       look at inventory-service span tags → db.pool.wait: 7.8s
  → Root cause found in < 2 minutes
```

**Trace propagation — how traces cross service boundaries:**

```
Request enters system at API Gateway:
  Gateway generates: trace_id=abc123, span_id=001
  
  Gateway → Order Service HTTP call:
    Adds headers:
    traceparent: 00-abc123-001-01  ← W3C standard
    (OR x-b3-traceid, x-b3-spanid ← Zipkin B3 format)
  
  Order Service receives request:
    Reads trace_id=abc123 from header
    Creates new span: span_id=002, parent=001
    Calls Payment Service with same trace_id
  
  Payment Service:
    Creates new span: span_id=003, parent=002
    Calls Database (no HTTP → library auto-instruments)
    Database span: span_id=004, parent=003

Final trace tree:
  abc123 (trace)
  └── 001: API Gateway (380ms)
      └── 002: Order Service (320ms)
          ├── 003: Payment Service (200ms)
          │   └── 004: DB Query (180ms) ← bottleneck
          └── 005: Notification (async, 40ms)
```

**Sampling strategies:**

```
100% trace collection = too expensive at production scale
(at 10,000 req/sec → 10,000 traces/sec → petabytes/day)

Head-based sampling (decided at trace start):
  Keep 1% of traces randomly
  Simple, low overhead
  Problem: 99% of errors may be in discarded traces

Tail-based sampling (decided after trace complete):
  See full trace → decide based on outcome
  Keep: all errors, all slow traces (p99+), N% of normal
  Discard: fast successful traces (low diagnostic value)
  Problem: must buffer full trace before sampling decision

Adaptive sampling:
  High traffic → sample more aggressively
  Rare operations → keep more traces
  New error type detected → temporarily increase rate

Recommended:
  100% for errors and slow requests
  1-10% for successful fast requests
  0.1% for very high traffic services
```

---

## 10. OpenTelemetry Fundamentals

OpenTelemetry (OTel) is the **open standard for telemetry instrumentation** — one API and SDK for metrics, logs, and traces that works with any backend (Prometheus, Jaeger, Datadog, Honeycomb, etc.).

**Why OpenTelemetry matters:**

```
Before OpenTelemetry:
  Want Datadog traces? → instrument with Datadog SDK
  Switch to Honeycomb? → re-instrument entire codebase
  Use multiple tools? → multiple SDK imports, conflicts

With OpenTelemetry:
  Instrument ONCE with OTel API/SDK
  Route to ANY backend via OTEL Collector
  Switch vendors: change config, not code
  Industry standard → community + vendor support
```

**OpenTelemetry architecture:**

```
┌──────────────────────────────────────────────────────────────┐
│                 OpenTelemetry Architecture                   │
│                                                             │
│  Application Code                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OTel API (instrument your code against this)       │    │
│  │  OTel SDK (implements the API, exports data)         │    │
│  │  Auto-instrumentation (HTTP, DB, gRPC — zero code)  │    │
│  └──────────────────────────┬─────────────────────────┘    │
│                             │ OTLP (gRPC or HTTP)           │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           OTel Collector                             │  │
│  │  Receivers → Processors → Exporters                  │  │
│  │                                                      │  │
│  │  Receive: OTLP, Jaeger, Zipkin, Prometheus           │  │
│  │  Process: batch, retry, filter, enrich, sample       │  │
│  │  Export:  Prometheus, Jaeger, Datadog, Honeycomb     │  │
│  └──────────────────────────┬─────────────────────────┘  │
│                             │                              │
│         ┌───────────────────┼───────────────────┐         │
│         ▼                   ▼                   ▼         │
│    Prometheus            Jaeger/Tempo         Datadog      │
│    (metrics)             (traces)             (all-in-one) │
└──────────────────────────────────────────────────────────────┘
```

**OTel data model — semantic conventions:**

```
OTel defines standard attribute names across all signals:

HTTP spans standard attributes:
  http.method = "GET"
  http.url = "https://api.company.com/checkout"
  http.status_code = 200
  http.user_agent = "Mozilla/5.0..."

Database spans:
  db.system = "postgresql"
  db.name = "payments"
  db.operation = "SELECT"
  db.statement = "SELECT * FROM orders WHERE..."  ← sanitized

Messaging (Kafka, SQS):
  messaging.system = "kafka"
  messaging.destination = "payment-events"
  messaging.operation = "publish"

Service identification:
  service.name = "payment-api"
  service.version = "2.4.1"
  service.namespace = "production"
  host.name = "pod-payment-7d9f4"

Semantic conventions = same attribute names across all languages
→ Dashboards, alerts work across polyglot microservices
```

**OTel Collector configuration:**

```
Collector pipeline (conceptual):

Receivers (accept incoming telemetry):
  otlp:          receive from apps (gRPC :4317, HTTP :4318)
  prometheus:    scrape prometheus /metrics endpoints
  jaeger:        receive Jaeger format (migration path)
  
Processors (transform in flight):
  batch:         group data before export (efficiency)
  memory_limiter: prevent OOM in collector
  resource:      add/modify resource attributes
  filter:        drop unwanted spans or metrics
  tail_sampling: keep errors/slow, sample normal
  
Exporters (send to backends):
  prometheus:    expose /metrics for Prometheus to scrape
  otlp:          send to Jaeger, Tempo, or cloud backend
  datadog:       send to Datadog
  logging:       debug output to stdout

Pipeline config:
  traces:   receivers[otlp] → processors[batch, tail_sampling] → exporters[jaeger]
  metrics:  receivers[otlp, prometheus] → processors[batch] → exporters[prometheus]
  logs:     receivers[otlp] → processors[batch] → exporters[loki]
```

---

## 11. Alerting & Incident Response

**Alerting bridges monitoring and action** — good alerting pages people for real problems, bad alerting trains people to ignore pages.

**Alert design philosophy:**

```
Every alert must answer YES to ALL of these:
├── Is it actionable? (is there something to do right now?)
├── Is it urgent? (does it need human attention immediately?)
├── Is it accurate? (does it represent a real problem?)
└── Is the right person being paged? (do they have context to act?)

Alert fatigue:
  Too many alerts → engineers stop responding → missed real incidents
  
  Target: < 5 alerts per on-call shift (Google SRE recommendation)
  Reality check: if alert fires and first response is "ignore it"
                 → that alert should be deleted or tuned

Alert categories:
  Page (PagerDuty, wake someone up):
    → SLO burn rate critical, service completely down
    
  Ticket (create Jira, address next business day):
    → Non-critical trend, approaching capacity limit
    
  Log (informational, no action):
    → Background noise, track for pattern recognition
```

**Prometheus alerting rules:**

```
Alert rule anatomy:

groups:
- name: payment-service
  rules:
  
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5..",service="payment-api"}[5m]))
      /
      sum(rate(http_requests_total{service="payment-api"}[5m]))
      > 0.01
    for: 5m                    ← must be true for 5 min (avoid flapping)
    labels:
      severity: critical        ← used by Alertmanager for routing
      team: payments
    annotations:
      summary: "High error rate on payment-api"
      description: |
        Error rate is {{ $value | humanizePercentage }}.
        Runbook: https://wiki/runbooks/payment-high-error-rate
      dashboard: "https://grafana/d/payment-api"

  - alert: SlowP99Latency
    expr: |
      histogram_quantile(0.99,
        rate(http_request_duration_seconds_bucket{service="payment-api"}[5m])
      ) > 0.5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "p99 latency > 500ms for payment-api"
```

**Alertmanager routing:**

```
Alert fires → Alertmanager receives
                    │
            ┌───────▼────────┐
            │  Routing Tree  │
            └───────┬────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
severity=critical  team=payments  severity=warning
    │               │               │
PagerDuty      #payments-alerts  #monitoring-warnings
(wake up)      Slack channel      Slack channel

Deduplication:
  Same alert fires multiple times → send ONE notification
  Group: same alert, same service → one page

Inhibition:
  ServiceDown alert firing → suppress HighErrorRate alert
  (root cause is down, symptom alerts are noise)

Silence:
  Planned maintenance → silence specific alerts for N hours
  Prevents alert storm during known downtime
```

**Incident response lifecycle:**

```
1. Detection
   Alert fires → PagerDuty pages on-call
   (or: user report, automated anomaly detection)

2. Triage (< 5 minutes)
   Is this real? How many users affected?
   What is the blast radius?
   Declare incident level: P1/P2/P3/P4

3. Communication (< 10 minutes from detection)
   Create incident channel: #inc-20240115-payment-down
   Notify stakeholders via status page
   "We are aware of issues with payment processing, investigating"

4. Investigation
   Incident commander: coordinates, not necessarily fixes
   Subject matter experts: dig into metrics, logs, traces
   Theory → test → next theory

5. Mitigation (stop the bleeding)
   Rollback, scale up, circuit break, disable feature
   Prioritize: restore service, understand later

6. Resolution
   Service restored, verify with metrics
   Update status page: "Resolved"
   All-clear notification to stakeholders

7. Post-Mortem (blameless, within 48 hours)
   What happened? Timeline of events
   Why did it happen? Root cause (5 Whys)
   How was it detected? How could we detect faster?
   What action items prevent recurrence?
   Share organization-wide (learning, not blame)
```

---

## 12. Monitoring Kubernetes Workloads

Kubernetes introduces **new layers of observability** — the application metrics you already know plus cluster, node, and workload-level signals.

**Kubernetes observability layers:**

```
Layer 1 — Cluster Control Plane:
├── API server: request rate, latency, errors
├── etcd: leader elections, DB size, write latency
├── Scheduler: pending pods, scheduling latency
└── Controller Manager: reconciliation loops, errors

Layer 2 — Node level:
├── CPU, memory, disk, network per node
├── Kubelet: pod start latency, volume mount time
└── Container runtime: image pull time

Layer 3 — Workload level:
├── Pod count: desired vs running vs ready
├── Pod restarts: OOMKilled, CrashLoopBackOff
├── Resource usage: actual vs requested vs limit
├── HPA events: scale-up/down triggers
└── Resource quotas: namespace consumption

Layer 4 — Application level (your code):
├── Golden signals per service (as described above)
├── Custom business metrics
└── Health check status (liveness, readiness)
```

**Critical Kubernetes metrics to monitor:**

```
Pod health:
  kube_pod_status_phase{phase="Running"} == 1     ← pods running
  kube_pod_container_status_restarts_total          ← restart count
  kube_pod_status_ready                            ← readiness

Deployment health:
  kube_deployment_status_replicas_available
  /
  kube_deployment_spec_replicas                    ← availability ratio
  (alert if < 1.0 for more than 5 minutes)

Resource utilization:
  container_cpu_usage_seconds_total               ← actual CPU
  vs kube_pod_container_resource_requests_cpu_cores  ← requested
  → CPU throttling ratio (actual/limit)

  container_memory_working_set_bytes              ← actual memory
  vs kube_pod_container_resource_limits_memory_bytes ← limit
  → Alert if > 90% of limit (OOMKill risk)

Node pressure:
  kube_node_status_condition{condition="MemoryPressure",status="true"}
  kube_node_status_condition{condition="DiskPressure",status="true"}
  → Alert immediately: pods may be evicted
```

**Kube-prometheus-stack (complete monitoring bundle):**

```
Helm chart installs everything:
├── Prometheus Operator → manage Prometheus via CRDs
├── Prometheus → collects all K8s metrics
├── Alertmanager → routes alerts
├── Grafana → visualization
├── kube-state-metrics → K8s object state metrics
├── node-exporter → host-level metrics
└── Pre-built dashboards:
    ├── K8s cluster overview
    ├── K8s node overview
    ├── K8s deployment details
    ├── K8s pod details
    └── Resource requests vs usage
```

**Kubernetes-specific alerting:**

```
Must-have alerts:

PodCrashLooping:
  kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1
  for: 5m → page (something is consistently failing)

HighPodRestartRate:
  increase(kube_pod_container_status_restarts_total[1h]) > 5
  → warn (pod is unstable)

DeploymentReplicasMismatch:
  kube_deployment_spec_replicas != kube_deployment_status_replicas_available
  for: 15m → warn (rollout stuck or replicas unavailable)

NodeMemoryPressure:
  kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
  → page (pods may be evicted, instability imminent)

PersistentVolumeFillingUp:
  kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes < 0.1
  → warn 10% remaining (database disk almost full)
```

---

## 13. SLOs, SLAs & SLIs

SLOs, SLAs, and SLIs are the **framework for making reliability promises concrete and measurable** — moving from "we try our best" to "we commit to X% availability."

**The three concepts:**

```
┌─────────────────────────────────────────────────────────────┐
│                SLI → SLO → SLA relationship                 │
│                                                             │
│  SLI (Service Level Indicator):                             │
│  The actual measurement — a metric that represents          │
│  user experience quantitatively                             │
│  Example: "fraction of requests completed in < 200ms"       │
│                                                             │
│  SLO (Service Level Objective):                             │
│  The target you set for your SLI                            │
│  Internal promise to yourself and your team                 │
│  Example: "99.5% of requests complete in < 200ms"           │
│                                                             │
│  SLA (Service Level Agreement):                             │
│  The external contract with customers                       │
│  Legal/business commitment with consequences                │
│  Example: "We guarantee 99.9% uptime; refund if breach"     │
│                                                             │
│  Relationship:                                              │
│  SLO must be STRICTER than SLA                              │
│  SLA: 99.9%  → SLO: 99.95% → you have buffer before breach │
└─────────────────────────────────────────────────────────────┘
```

**Common SLIs for different service types:**

```
Request-based services (APIs, web apps):
├── Availability: successful_requests / total_requests
├── Latency: fraction of requests under threshold
│   "what % complete in < 300ms?"
└── Quality: correct_requests / total_requests
    (successful response with valid data, not just 200 OK)

Data pipeline services:
├── Freshness: time since last successful pipeline run
├── Completeness: records processed / expected records
└── Accuracy: records passing validation / total records

Storage systems:
├── Availability: successful reads+writes / total operations
├── Latency: p99 read/write latency
└── Durability: (nearly impossible to measure directly)
    Proxy: frequency of data loss incidents

Batch jobs:
├── Success rate: successful runs / total runs
├── Freshness: time since last successful completion
└── Completeness: % of expected output produced
```

**Error budget — the key concept:**

```
SLO: 99.9% availability over 30 days
     → 0.1% allowed downtime
     → 30 days × 24h × 60m × 0.1% = 43.2 minutes of allowed downtime
     → This is your ERROR BUDGET

Error budget accounting:
  Month starts: 43.2 minutes budget
  Incident Jan 5: 8 minutes → budget: 35.2 remaining
  Incident Jan 12: 20 minutes → budget: 15.2 remaining
  Incident Jan 20: 18 minutes → budget: -2.8 (BREACHED!)
  
  Budget depleted:
  ├── No new features deployed until reliability improves
  ├── Engineering focus shifts to reliability work
  ├── Postmortem required for breach
  └── SLA consequences may apply

Budget healthy:
  ├── Deploy new features (using some budget is OK)
  ├── Invest in technical debt reduction
  └── Try experimental changes (they may use budget)

Error budget policy:
  > 50% remaining: normal operations, feature work
  25-50% remaining: caution, focus reliability alongside features
  < 25% remaining: freeze risky changes, prioritize reliability
  Breached: freeze all changes except reliability fixes
```

**SLO alerting — burn rate alerts:**

```
Simple threshold alerting is not enough:
  SLO: 99.9% availability (43.2 min budget/month)
  Alert: "if availability < 99.9% in last hour"
  Problem: at exactly SLO rate → never alerts until end of month

Burn rate alerting (Google SRE approach):
  Burn rate: how fast you're consuming error budget
  
  Burn rate 1x: consuming budget at exactly SLO rate
    → fine, you'll use exactly your budget over 30 days
  
  Burn rate 2x: budget lasts only 15 days
    → alert (warning, investigate)
  
  Burn rate 14.4x: budget gone in 2 hours
    → PAGE IMMEDIATELY (critical)

Multi-window alerting (reduces false positives):
  Fast burn: burn_rate > 14.4 for 1 hour AND 5 minutes
    → High error rate right now AND sustained
    
  Slow burn: burn_rate > 2 for 6 hours AND 1 hour
    → Gradual degradation before budget runs out

  Two windows required to alert:
  Long window: detects the problem
  Short window: confirms it's still happening (not already resolved)
```

---

## Summary: Observability Architecture

```
Application Services (instrumented with OTel)
              │
              │ OTLP (metrics + traces + logs)
              ▼
    OTel Collector (deployed as DaemonSet/sidecar)
    ├── Receives: OTLP from apps, scrapes from exporters
    ├── Processes: batch, filter, enrich, tail-sample
    └── Exports to multiple backends:
              │
    ┌─────────┼─────────────────┐
    ▼         ▼                 ▼
Prometheus  Jaeger/Tempo       Loki
(metrics)   (traces)           (logs)
    │         │                 │
    └─────────┴─────────────────┘
                    │
                 Grafana
                 (unified UI)
    ├── Dashboards: Golden signals per service
    ├── Explore: ad-hoc metric/log/trace queries
    ├── Correlate: metric → trace → log in one click
    ├── Alert: burn rate rules → Alertmanager
    └── Annotations: deployment events on graphs
              │
        Alertmanager
        ├── Route: severity, team, service
        ├── Deduplicate: one page per incident
        ├── Inhibit: suppress symptom alerts
        └── Send:
            ├── PagerDuty (critical → wake up on-call)
            ├── Slack (warning → team channel)
            └── Jira (info → create ticket)
              │
        Incident Response
        ├── Triage: assess impact, declare severity
        ├── Investigate: metrics → traces → logs → root cause
        ├── Mitigate: rollback, scale, circuit break
        ├── Resolve: verify with metrics, update status page
        └── Post-mortem: blameless, action items, share learnings

Continuous SLO tracking:
  SLI metrics → Prometheus → error budget remaining
  → Team dashboards show budget burn rate in real-time
  → Budget < 25% → automatic feature freeze policy triggered
```

Observability mastery = **instrument everything with OTel + collect all three pillars + correlate by trace ID + alert on SLO burn rate not raw thresholds + measure what matters to users, not just what's easy to measure**.
