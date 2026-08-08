# Advanced Deployment Strategies

---

## 1. Blue-Green Deployment Strategy

Let me start with the problem this solves. You have a model or service running in production serving real users. You've built a new version and want to deploy it. The naive approach: shut down the old version, deploy the new one, hope it works. The problem with this: during the switchover, users get errors. And if the new version has a bug, you've already killed the old one — rolling back means going through the same painful process again.

Blue-Green deployment eliminates this entirely. You maintain two identical production environments — call them Blue and Green. At any given time, one of them is live and the other is idle.

Say Blue is currently live, serving all user traffic. You deploy your new version to Green. Green is not receiving any user traffic yet — it's just sitting there running. You test Green thoroughly. You run smoke tests, check that APIs respond correctly, verify the new model loads and produces sane outputs. All of this happens with zero risk because no real users are hitting it.

When you're confident Green is healthy, you flip the load balancer. One configuration change redirects all traffic from Blue to Green. This switch happens in milliseconds. Users experience no downtime whatsoever — their requests were going to Blue, now they go to Green, and they never knew anything happened.

Now here's the part that makes this really powerful: if something goes wrong with Green in the first few minutes after the switch, rolling back is just as fast. Flip the load balancer back to Blue. Blue is still running, still warm, still has the old version loaded. You're back to the previous state in seconds, not minutes.

After the new version (Green) has been running stably for a while, you update Blue with the same new version so it's ready to be the standby for the next deployment cycle.

For ML systems specifically, this is valuable because model deployments have a unique risk: the model might pass all your tests but behave unexpectedly on certain real-world input distributions you didn't anticipate in testing. Blue-Green gives you that instant escape hatch.

The tradeoff is cost — you're running double the infrastructure at all times. For large GPU-based model serving, that's expensive. But for most systems, the reliability it provides is worth it.

---

## 2. Canary Deployment Strategy

Blue-Green is binary — either 0% or 100% of traffic goes to the new version. Canary deployment is more gradual and nuanced, and for ML systems it's often a better fit.

The name comes from the old coal mining practice of bringing a canary into the mine. If there was toxic gas, the canary would show symptoms before the miners did, giving them time to evacuate. In software, the "canary" is a small percentage of real users who get the new version first. If something goes wrong, only they are affected while you catch the problem.

Here's how a typical canary rollout works. You have v1 of your model in production. You deploy v2 alongside it. Initially you configure your load balancer or API gateway to send 1% of traffic to v2 and 99% to v1. You watch the metrics obsessively — latency, error rate, model accuracy metrics, business metrics like conversion rate or click-through rate.

If everything looks good after 30 minutes, you bump to 5%. Watch again. Good? Bump to 20%. Then 50%. Then 100%. If at any point something looks wrong — latency spikes, error rates increase, model outputs drift in unexpected ways — you immediately drain traffic back to 0% on v2 and investigate. Only 20% of users were ever affected, and now you have real production data to debug with.

The key advantage over Blue-Green is that you're validating on real traffic progressively. Your test suite and staging environment can't perfectly replicate production traffic patterns, user behaviors, or edge cases. Canary lets you validate on reality, not on simulated reality.

For ML specifically, canary is how you safely compare a new model against the current production model. Are users completing purchases at the same rate? Are they clicking on recommendations? Are support tickets increasing? These are business-level metrics that only real production traffic can validate.

You can also do canary targeting — instead of random 5% of traffic, you send canary traffic to specific user segments. Power users who are more resilient to bugs, internal employees first, or users in a specific geography. This makes the canary even safer.

---

## 3. Progressive Delivery Concepts

Progressive delivery is the overarching philosophy that encompasses canary deployments, feature flags, and traffic splitting into a unified approach to releasing software safely. It's less of a specific technique and more of a mindset shift about how deployments should work.

The traditional view of deployment is a binary event — something is either deployed or it isn't. It happens at a point in time and applies to everyone simultaneously. Progressive delivery rejects this completely. Instead, deployment is a gradual process — you progressively expand the blast radius of a change, validating at each step before expanding further.

The core insight is that "deploy" and "release" should be separate concepts. Deploying means getting the code or model onto servers. Releasing means exposing it to users. With progressive delivery, you decouple these. You can deploy new code to production without releasing it to anyone. Then you release it to 1% of users. Then 10%. Then specific user segments. Then everyone. Each step is gated by automated checks on metrics.

What makes progressive delivery different from just doing canary deployments carefully is the automation and integration of feedback loops. Modern progressive delivery systems (tools like Argo Rollouts, Flagger) automatically watch your metrics during a rollout. You define: "if error rate goes above 0.5% or latency p99 goes above 200ms during the rollout, automatically halt and roll back." The system enforces these gates without human intervention.

For ML systems, progressive delivery is particularly powerful because model behavior is statistical — it's not as simple as "this function returns the right value." A new model might have slightly different output distributions that affect downstream business metrics in subtle ways that only become apparent across thousands of requests. Progressive delivery gives you the time and traffic volume to detect these statistical differences safely.

---

## 4. Traffic Splitting Techniques

Traffic splitting is the actual mechanism that makes canary deployments and A/B testing work. It's the technical implementation of "send X% of requests to version A and Y% to version B."

There are several ways to split traffic, each with different properties.

**Random splitting** is the simplest. Every incoming request is randomly assigned to a bucket — 90% chance it goes to v1, 10% chance it goes to v2. This is statistically sound over large volumes but has a problem: the same user might get v1 for one request and v2 for the next. For many ML systems this is fine, but for user-facing features it creates an inconsistent experience.

**Sticky session splitting** solves this. When a user first arrives, you assign them to a bucket and remember that assignment, typically in a cookie or by hashing their user ID. Every subsequent request from that user goes to the same version. User 12345 always gets v1. User 67890 always gets v2. This is consistent and allows you to measure per-user behavioral differences, not just per-request metrics.

**Header-based splitting** routes traffic based on request headers. Requests with the header `X-Beta-User: true` go to v2, everyone else goes to v1. This is useful for internal testing — your QA team sends the header, they always hit the new version, while regular users never do.

**Geography-based splitting** sends users from a specific region to one version. Deploy v2 to users in Australia first — if something goes wrong, you've affected a contained, smaller population, and Australian users waking up to a problem in their morning are your canary before US users arrive at work.

**Weighted round-robin** at the load balancer level distributes traffic across backends based on weights. Backend pool A (v1) gets weight 90, backend pool B (v2) gets weight 10. The load balancer mathematically distributes requests in that ratio.

In Kubernetes, this is commonly implemented with service mesh traffic policies (Istio VirtualService), Ingress controllers with weight annotations, or dedicated progressive delivery tools like Argo Rollouts.

---

## 5. Feature Flags for ML Systems

A feature flag (also called a feature toggle) is a conditional in your code that lets you turn functionality on or off without deploying new code. Think of it as a light switch in production that you can flip remotely.

The basic version is simple. Instead of hardcoding which model version to call, your code checks a flag: "if the flag `use_new_recommendation_model` is enabled for this user, call v2. Otherwise call v1." You control that flag from a dashboard or configuration system. To "deploy" the new model to users, you just flip the flag — no code change, no deployment.

But feature flags for ML systems go much deeper than this.

**Model selection flags** let you control which model serves which users without any code deployment. You trained three variations of your fraud model — flag A uses model A for user segment X, flag B uses model B for power users, everyone else gets the baseline. The ML engineer can adjust this from a dashboard in real time.

**Gradual rollout flags** are essentially canary deployments implemented at the application layer rather than the infrastructure layer. The flag system gradually increases the percentage of users who see the new model: 1% today, 5% tomorrow, 20% next week. You define the rollout schedule and the flag system handles the math of who gets what.

**Kill switches** are the safety net. If a newly released model starts behaving badly, you flip a flag and instantly revert to the old model for 100% of users. This is faster than any deployment rollback — there's no deployment to undo, you're just changing a configuration value.

**User targeting** lets you enable new models for specific users. Internal employees get the new model first. Beta testers get it next. High-value customers who you've communicated the change to get it. General public last.

**Experimentation flags** are feature flags combined with analytics. When you enable a flag for a user, you simultaneously enroll them in an experiment. Every action they take is recorded against that experiment variant. You get clean A/B test data without having to do anything at the infrastructure level.

Feature flag services like LaunchDarkly, Split.io, or even a simple Redis-backed custom system make this manageable at scale. The key insight is that feature flags decouple deployment from release, giving you fine-grained control over who experiences what without constantly deploying new code.

---

## 6. Model A/B Testing Strategy

A/B testing is how you make data-driven decisions about which model is actually better — not better on your offline evaluation dataset, but better on real users achieving real outcomes.

Here's why offline metrics aren't enough. You train model v2 and it has 3% better accuracy on your holdout dataset compared to v1. Does that mean users will be better served by v2? Not necessarily. Accuracy on a historical dataset doesn't always translate to better business outcomes. Maybe the 3% improvement is on rare edge cases that don't affect most users. Maybe v2 is slightly less accurate on the cases that matter most for your business. You don't know until you test on real users.

A/B testing answers the question definitively. You split users into two groups — Group A gets the current model (v1, the control), Group B gets the new model (v2, the treatment). You run this for a statistically meaningful period, typically days to weeks depending on your traffic volume, then measure outcomes.

The outcomes you measure must be business metrics, not model metrics. Not "which model has higher precision" but "which model leads to more completed purchases, lower churn, fewer support tickets, higher user ratings." These are what actually matter.

Statistical rigor is critical here. You need enough users in each group that any difference you observe is likely real and not just random chance. The concept of statistical significance tells you: if you ran this experiment 100 times, how often would you see this result by chance? Conventionally you want p-value < 0.05, meaning less than 5% chance the result is random.

You also need to think about what you're measuring carefully. Novelty effects can mislead you — users often engage more with anything new just because it's new, not because it's actually better. Run experiments long enough for novelty to wear off. Segment your analysis — the new model might be better for some user types and worse for others, and the aggregate obscures this.

For ML systems, some additional considerations: make sure users are sticky to their assigned variant (same user always gets same model), exclude users who joined during the experiment from your analysis if their assignment might be contaminated, and be careful about network effects where one user's experience affects another's.

---

## 7. Shadow Deployment

Shadow deployment is one of the most underused but incredibly powerful techniques for validating ML models before they ever touch real user experience.

Here's the concept. You deploy a new model version alongside your production model, but the new version receives no actual users — it receives a copy of all production traffic. Every request that comes into your production model is simultaneously sent (in the background, asynchronously) to the shadow model. The shadow model processes the request and produces a prediction, but that prediction is thrown away. It never goes back to the user. The user only ever sees the production model's response.

What's the point then? You're collecting real production predictions from the shadow model and comparing them to the production model's predictions. You can measure: How different are the outputs? Where do the models disagree? When they disagree, which one's prediction is more aligned with ground truth (if you have delayed labels)? What's the shadow model's latency on real production traffic? Does it handle edge cases in production data that your test suite missed?

This gives you incredibly rich information about the new model's behavior on real production data with absolutely zero risk. Users are not affected in any way. If the shadow model crashes on a certain input, nobody cares — the production model handled that request just fine.

For ML systems specifically, shadow deployment is invaluable because production data always has surprises that your training data and test suite don't capture. Maybe your production traffic includes certain input patterns you never saw in training. Maybe there are encoding edge cases, unusual character sets, or extreme input lengths. Shadow deployment exposes all of this before you commit to serving any users.

The operational complexity is that you need to: duplicate all production traffic to the shadow model (typically done at the service mesh or API gateway level), collect and store the shadow model's predictions, build tooling to compare production vs shadow predictions at scale, and not let the shadow model's processing slow down the production response path (it must be fully async).

After running shadow deployment for a few days and seeing that the shadow model's predictions are reasonable and its infrastructure is stable, you have high confidence for proceeding to canary deployment.

---

## 8. Automated Rollback Mechanisms

Deployments go wrong. This is inevitable. The question is not whether it will happen but how quickly you detect it and how quickly you recover. Manual rollback — someone gets paged, wakes up, logs in, figures out what happened, manually runs rollback commands — takes 15-30 minutes minimum. That's 15-30 minutes of users experiencing errors or degraded service. Automated rollback reduces this to seconds.

Automated rollback means your system continuously monitors key metrics during and after a deployment, and if those metrics violate predefined thresholds, it automatically triggers a rollback without waiting for human intervention.

The implementation has three components: metric collection, threshold definition, and rollback execution.

**Metric collection** means you're continuously measuring the right signals. Error rates from your application logs. Latency percentiles (p50, p95, p99) from your tracing system. Business metrics if they're available in near-real-time. For ML models specifically: prediction confidence distributions (if your model suddenly starts predicting with much lower confidence on average, something is wrong), output distribution shifts (if your regression model used to output values centered around 0.5 and now centers around 0.8, that's suspicious), null/error prediction rates.

**Threshold definition** means you specify what "bad" looks like. Error rate goes above 1% — trigger rollback. p99 latency goes above 500ms — trigger rollback. Prediction null rate goes above 0.1% — trigger rollback. These thresholds need careful calibration. Too tight and you'll trigger false-positive rollbacks on normal statistical fluctuations. Too loose and you'll miss real problems.

**Rollback execution** is the automated action. Tools like Argo Rollouts, Spinnaker, and Flagger have built-in automated rollback capabilities. When a threshold is breached, they immediately halt the progressive rollout if one is in progress, revert traffic to the previous stable version, and send alerts to the team with all the metrics that triggered the rollback.

The mental model to internalize: a deployment without automated rollback is like a surgeon who will cut but won't stop if the patient's blood pressure drops. Monitoring without action is incomplete. Automated rollback closes the loop.

---

## 9. Zero-Downtime Deployment Design

Zero-downtime deployment means users experience no interruption, no errors, and no degradation during the entire deployment process. Not "mostly zero downtime" or "downtime at 2am when traffic is low" — literally zero.

Achieving this requires careful design at multiple levels.

**At the application level**, your services must be stateless — they don't store session data locally. If they did, switching from one instance to another would lose that state. Stateless services can be replaced transparently. Configuration changes are loaded dynamically, not at startup — so you can update configuration without restarting the service.

**At the load balancer level**, you use connection draining. When you're shutting down an old instance, you first tell the load balancer to stop sending it new requests. But the load balancer continues to hold existing connections to that instance open until they complete naturally. Only after all in-flight requests have been served does the instance actually shut down. No request is ever dropped mid-processing.

**At the Kubernetes level**, rolling updates are the default deployment strategy. Kubernetes doesn't shut down all old pods and start new ones simultaneously. It starts one new pod, waits for it to pass health checks and be ready to serve traffic, then shuts down one old pod, then starts another new pod, and so on. At all times during the deployment, some capacity is serving traffic. The combination of readiness probes (Kubernetes won't send traffic to a pod until it says it's ready), PodDisruptionBudgets (maintain at minimum N healthy replicas at all times), and connection draining makes this seamless.

**At the data layer**, schema migrations are a common source of downtime. If your new code requires a new database column that the old code doesn't know about, you can't deploy them simultaneously. The solution is the expand-contract pattern: first deploy a migration that adds the new column but makes it optional (old code ignores it, new code uses it if present). Then deploy the new code. Then deploy a cleanup migration that makes the column required. This separates schema changes from code changes so both can be deployed without incompatibilities.

**For ML models specifically**, zero-downtime means: load the new model into memory before accepting traffic, not after. Serve a warm model, not a cold one. Use model pre-warming — after loading a new model but before routing traffic to it, send it a batch of synthetic requests to ensure it's fully initialized, any caches are warm, and you know the latency is within expected bounds.

---

## 10. Scaling Strategies (Horizontal & Vertical)

Scaling is about how you increase your system's capacity to handle more load. There are two fundamentally different approaches, and understanding when to use each is important.

**Vertical scaling** means making a single machine more powerful. Your model server is running on a machine with 8 CPUs and 32GB RAM, and it's struggling. You upgrade to a machine with 32 CPUs and 128GB RAM. Or you swap a V100 GPU for an A100. The same single instance now handles more load because it has more resources.

Vertical scaling is simple — you're not changing your architecture, just upgrading hardware. But it has hard limits. There's a maximum size machine you can buy. It creates a single point of failure — if that one big machine goes down, everything stops. And cloud pricing means large machines are disproportionately expensive — a machine with 4× the RAM doesn't cost 4× more, it costs much more. Vertical scaling is useful for initial optimization and for workloads that are inherently single-threaded or have high inter-process communication, but it's not a sustainable long-term strategy.

**Horizontal scaling** means adding more machines instead of bigger machines. Instead of one big model server, run five smaller ones behind a load balancer. Traffic is distributed across all five. If one fails, the other four continue serving. When traffic increases, add a sixth and seventh. When traffic drops, remove some instances to save cost.

Horizontal scaling is the cloud-native default because it's essentially limitless — you can keep adding machines — and it provides natural fault tolerance through redundancy. But it requires your application to be designed for it. Your service must be stateless so any instance can handle any request. Your model must be loadable by multiple instances simultaneously. Data consistency across instances must be handled carefully.

**Auto-scaling** combines horizontal scaling with automation. You define rules: when average CPU utilization across all model server instances exceeds 70%, add 2 more instances. When it drops below 30%, remove instances down to a minimum of 2. Kubernetes Horizontal Pod Autoscaler (HPA) does this automatically based on CPU, memory, or custom metrics like requests-per-second. For ML specifically, you often scale on GPU utilization or inference queue depth.

**For ML workloads**, training and inference have different scaling needs. Training is often vertically scaled (you want one machine with 8 GPUs to train a large model efficiently using GPU-to-GPU communication) or scaled across a cluster using distributed training frameworks. Inference is almost always horizontally scaled — many small GPU instances each serving predictions independently.

---

## 11. Load Testing Concepts

Before you put your ML system under real production traffic, you need to know how it behaves under stress. Load testing is how you discover your system's limits, identify bottlenecks, and validate that your capacity planning is correct — all before users experience problems.

Load testing means artificially generating traffic against your system at controlled volumes and observing how it responds. But there are different types of load tests, each answering a different question.

**Load testing** in the narrow sense asks: how does your system perform at expected production load? You simulate the traffic volume you expect on a normal day — say 500 requests per second — and verify that latency and error rates are within acceptable bounds. This is your baseline validation before every production deployment.

**Stress testing** asks: where does the system break? You progressively increase load beyond expected levels — 500 rps, then 1000, then 2000, then 5000 — until something fails. This tells you your system's actual capacity ceiling and what fails first (is it the model server? the database? the network? the load balancer?). Knowing your breaking point lets you design appropriate scaling policies and set realistic SLAs.

**Spike testing** asks: what happens when load suddenly increases dramatically? Real traffic doesn't ramp up linearly — a viral moment, a marketing campaign launch, or a news event can cause traffic to jump from 100 rps to 10,000 rps in seconds. Spike testing simulates this instantaneous surge and verifies that your auto-scaling kicks in fast enough and that the system doesn't fall over while scaling is in progress.

**Soak testing** asks: are there problems that only appear over time? You run moderate load — say 60% of expected production — for many hours or days. This surfaces memory leaks (the process slowly consumes more and more memory until it crashes), connection pool exhaustion, database connection leaks, and gradual performance degradation. Issues that don't appear in a 10-minute test show up in a 24-hour soak test.

For ML systems, load testing has additional dimensions. Model inference is often non-linear — performance might be stable up to batch size 32 and then suddenly degrade at batch size 33 because you hit a GPU memory boundary. The input data characteristics matter — complex inputs take longer to process than simple ones. Your test must use realistic input distributions, not just constant simple requests.

Tools like k6, Locust, JMeter, and Gatling generate artificial load. You write scripts that simulate realistic user behavior — sending requests with realistic payloads at realistic rates — and the tool runs thousands of virtual users concurrently.

---

## 12. Chaos Engineering Basics

Load testing tells you how your system performs under high traffic. Chaos engineering tells you how your system performs when things break — and it answers this question by intentionally breaking things in production to see what happens.

This sounds reckless. It's actually one of the most mature practices in reliability engineering, pioneered by Netflix with their famous Chaos Monkey tool. The logic is compelling: your system will experience failures in production — servers will crash, network links will drop, dependencies will time out. You can either discover how your system handles these failures when they happen unexpectedly in a crisis, or you can discover it proactively in a controlled experiment where you're watching carefully and ready to intervene.

The chaos engineering methodology starts with a hypothesis and an experiment. Hypothesis: "If the feature store becomes unavailable, the prediction service will gracefully fall back to cached features and serve predictions with less than 1% error rate increase." Experiment: kill the feature store and observe.

Common chaos experiments in ML systems:

**Infrastructure failure** — randomly terminate one of your model serving pods. Does Kubernetes automatically replace it? Does the load balancer stop routing traffic to it before it's fully terminated? Do users experience errors during the replacement?

**Network partition** — inject 100ms of artificial latency into calls from the prediction service to the feature store. Does your timeout logic handle this? Do you fall back to cached features, or do your p99 latencies spike unacceptably?

**Dependency failure** — make the model registry unavailable. Can your serving infrastructure continue serving with the models it has already loaded, or does it crash trying to check for model updates?

**Resource exhaustion** — fill up the disk on your training node. Does your training job fail gracefully with a clear error, or does it leave corrupt artifacts in your model registry?

**Data corruption** — send malformed or adversarial inputs to your model. Does it handle them gracefully with a validation error, or does it crash, or worse, produce confident but wrong predictions?

You start chaos experiments in your staging environment and gradually move them to production as your confidence in your system's resilience grows. Netflix famously runs Chaos Monkey in production constantly, randomly killing production instances, because they've built systems resilient enough to handle it.

The practice forces honest conversations about failure modes. Teams often discover that their "fault tolerant" system is actually brittle in specific failure scenarios they never considered. Finding this out via a controlled chaos experiment is vastly better than finding it out during a real outage.

---

## 13. Deployment Observability

You can't manage what you can't measure. Observability is your ability to understand what's happening inside your system from the outside — to ask questions of your system and get meaningful answers, especially when things go wrong.

Observability is commonly described through three pillars, but for ML systems there's effectively a fourth.

**Metrics** are numerical measurements collected at regular intervals. CPU usage, memory consumption, request rate, error rate, latency percentiles (p50, p90, p99), active model replicas. Metrics are cheap to store, easy to graph, and great for dashboards and alerting. When your p99 latency suddenly jumps, your metric alert fires. Prometheus is the standard for collecting metrics in Kubernetes environments, and Grafana visualizes them.

**Logs** are structured records of events that happened. Every request processed, every error thrown, every model loaded, every prediction made. Logs tell you what happened — metrics tell you how much/how fast, but logs tell you the details. When your error rate spikes, you look at logs to understand which requests are failing and why. Tools like the ELK stack (Elasticsearch, Logstash, Kibana) or Datadog aggregate and search logs across all your services.

**Traces** are records of a single request's journey through your entire system. A prediction request arrives at your API gateway, goes to the prediction service, which calls the feature store, which queries a database, which returns features, which get passed to the model, which produces a prediction. A trace captures every hop in this journey with timing for each step. When a request is slow, a trace tells you exactly which component is the bottleneck. Jaeger and Zipkin are popular distributed tracing tools.

**ML-specific observability** is the fourth pillar that general observability tools don't cover. You need to monitor things that are specific to model behavior. Prediction confidence distributions — is the model suddenly less confident than usual? Data drift — are the features you're feeding the model drifting away from what it was trained on? Concept drift — even if features look the same, has the relationship between features and outcomes changed in the real world? Model-specific business metrics — for a recommendation model, are click-through rates stable? For a fraud model, are false positive rates within acceptable bounds?

Tools like Evidently AI, Arize, and WhyLabs are purpose-built for ML observability and track these statistical properties of model behavior over time, alerting when distributions shift beyond thresholds.

**Alerting** ties all of this together. You define conditions that represent "something is wrong" — error rate above 1%, p99 latency above 300ms, prediction null rate above 0.5%, feature drift score above 0.3 — and when any condition is met, you get paged. The alert should contain enough context to start debugging: which service, which metric, the current value vs threshold, a link to the relevant dashboard. PagerDuty and Alertmanager handle the routing and escalation of alerts to the right people.

**Dashboards** give you the at-a-glance view of system health. A good ML deployment dashboard shows: current traffic volume and latency, error rates across services, model performance metrics trending over time, infrastructure resource utilization, recent deployments marked on the time axis (so you can see if a metric changed right after a deployment), and active alerts. The deployment marker is particularly important — it lets you immediately correlate "this metric degraded" with "we deployed this change," which is usually the first question in any incident.

The principle that ties all of observability together: when something goes wrong at 3am and someone is paged, they should be able to go from "something is wrong" to "I know exactly what is wrong and what I need to do about it" in minutes, not hours. Everything you invest in observability pays dividends in reduced mean time to resolution when incidents happen.

---

The common thread: good deployment strategy is about risk management. Every technique here — blue-green, canary, shadow, feature flags, automated rollback, chaos engineering — is a tool for reducing the risk that a change will harm users, and for minimizing recovery time when something inevitably does go wrong. The goal isn't to prevent all failures but to make failures small, fast to detect, and fast to recover from.
