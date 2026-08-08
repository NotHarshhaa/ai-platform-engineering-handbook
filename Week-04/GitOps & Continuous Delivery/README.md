# GitOps & Continuous Delivery

---

## 1. GitOps Principles

To understand GitOps, you first need to understand the problem it solves, because the solution only makes sense in the context of the problem.

Before GitOps, deploying software to Kubernetes was done imperatively. A developer or CI/CD pipeline would run `kubectl apply`, `helm upgrade`, or a series of cloud CLI commands to push changes to a cluster. This worked but created serious operational problems. There was no single record of what was actually deployed — the cluster's state existed only in the cluster itself and in people's heads. Anyone with cluster access could make changes directly, and those changes would leave no trace in version control. If something went wrong, figuring out what changed, when, and who changed it required digging through cluster audit logs that weren't always available or readable. Recreating a cluster after a disaster meant reconstructing dozens of manual steps from memory or incomplete documentation.

GitOps is an operational framework that uses Git repositories as the single source of truth for both infrastructure and application configuration, and uses automated agents to continuously ensure the running system matches what Git says it should look like.

The four core principles of GitOps, defined by Weaveworks who coined the term:

**Declarative** — the entire system is described declaratively. You don't write scripts that say "if this resource doesn't exist, create it; if it exists but is wrong, update it." You write declarations that say "this resource should look like this." The tool figures out how to make reality match your declaration. Kubernetes manifests, Helm charts, and Terraform files are all declarative. Shell scripts with imperative kubectl commands are not GitOps.

**Versioned and Immutable** — the desired state is stored in Git, which is an immutable, append-only version history. You cannot go back and change what was deployed at 2pm last Tuesday — that commit exists forever. Every change is a new commit. This gives you a complete, tamper-evident history of every change to your system. Who changed what, when, why (from the commit message), and what it changed from (the diff). This is the audit trail that compliance teams dream of and on-call engineers need during incidents.

**Pulled automatically** — the desired state is automatically applied to the system by an agent running inside the system, not pushed from outside. This is the pull model. An agent (ArgoCD, Flux) running in your Kubernetes cluster watches your Git repository. When it detects a difference between what Git says should exist and what actually exists in the cluster, it automatically reconciles — applying the Git state to the cluster. This is different from CI/CD pipelines that push changes from outside the cluster, which requires the external system to have cluster credentials.

**Continuously reconciled** — the agent doesn't just apply changes once when you push to Git. It continuously watches both Git and the cluster, ensuring they stay in sync. If someone manually changes a resource in the cluster (a common problem in conventional setups), the agent detects the drift and reverts it back to the Git-declared state. The cluster is self-healing — any unauthorized or accidental modification is automatically corrected.

The practical implications of these principles working together: your Git repository is always an accurate representation of what's running in production. Deploying a new version of an application is as simple as updating a value in a YAML file and pushing to Git. Recovering from a disaster is as simple as pointing a new cluster at the same Git repository. Security is improved because cluster credentials don't need to leave the cluster — the agent has them internally. And your entire deployment history is your Git history.

GitOps doesn't eliminate CI/CD — it changes where the CD part happens. CI (build, test, push image) remains a traditional push-based pipeline. CD moves to the pull-based GitOps model where an agent reconciles cluster state with Git state continuously, rather than a pipeline pushing changes to the cluster.

---

## 2. Declarative Infrastructure & Deployments

Declarative is a word thrown around a lot in modern infrastructure conversations, and it's worth being precise about what it means and why it matters so much to GitOps.

**Declarative** means describing the desired end state without specifying the steps to get there. You say what you want, not how to achieve it.

**Imperative** means specifying a sequence of steps to execute. You say what to do, step by step.

A concrete comparison. You want a Kubernetes Deployment with 5 replicas running nginx:

Imperative approach:
```bash
kubectl create deployment nginx --image=nginx
kubectl scale deployment nginx --replicas=5
```

Declarative approach:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 5
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25.0
```

Applied with `kubectl apply -f deployment.yaml`.

The superficial difference looks minor. The practical difference is enormous.

**Run the imperative commands twice** and you'll try to create a deployment that already exists, fail on the create, and possibly misconfigure the scale. The commands are not idempotent — running them multiple times produces different behavior than running them once.

**Apply the declarative manifest twice** and nothing happens the second time — Kubernetes sees the desired state matches actual state and makes no changes. Declarative specifications are idempotent by nature.

**Change the imperative commands** to update the deployment — you need to write new commands that account for the current state. If the current replica count is 5 and you want 3, you run a scale command. If you don't know the current state, you can't write the right commands.

**Change the declarative manifest** to update the deployment — you change `replicas: 5` to `replicas: 3` in the YAML file and apply it. You don't need to know the current state. You just declare what you want.

**Drift detection with declarative** — because you've declared the desired state explicitly, any deviation from that state is detectable. If someone manually scales the deployment to 7 replicas, a tool watching the manifest can detect "actual state (7 replicas) differs from desired state (5 replicas)" and automatically correct it. With imperative scripts, there's no declared desired state to compare against.

**Self-documentation** — a declarative manifest is complete documentation of the resource's configuration. Reading the YAML file tells you exactly what the resource looks like. Imperative scripts tell you what commands were run, not what state was produced.

In GitOps, everything must be declarative because the entire model depends on Git containing the complete desired state of the system. If parts of your system are configured imperatively (someone ran kubectl commands that aren't captured anywhere), GitOps can't manage those parts — it doesn't know what they should look like.

This is why Kubernetes YAML manifests, Helm charts, and Kustomize overlays are the building blocks of GitOps. They're all declarative specifications of desired state that GitOps agents can compare against actual state and reconcile when they differ.

---

## 3. ArgoCD Architecture

ArgoCD is the most widely adopted GitOps operator for Kubernetes. It runs inside your Kubernetes cluster, watches one or more Git repositories, and continuously ensures your cluster matches the state declared in those repositories. Understanding ArgoCD's architecture helps you configure it correctly, troubleshoot problems, and understand why it makes the design choices it does.

ArgoCD is itself a set of Kubernetes deployments and services. When you install ArgoCD (typically via a Helm chart or the official install manifest), it creates a namespace with several components, each responsible for a distinct piece of the GitOps workflow.

**API Server** is ArgoCD's control plane. It exposes a REST API and gRPC API that the ArgoCD UI, the ArgoCD CLI, and other tools use to interact with ArgoCD. It handles authentication (integrated with OIDC/SSO, Dex for identity federation), authorization (RBAC policies controlling who can sync which applications), and CRUD operations on Application and AppProject objects. The API server is the only ArgoCD component that has an external-facing service — everything else communicates internally.

**Repository Server** is responsible for cloning Git repositories and rendering Kubernetes manifests. When ArgoCD needs to know what a Git repository declares for an application, the Repository Server clones the repo (or uses a local cache), runs whatever rendering tool is needed (plain YAML, Helm template, Kustomize build, Jsonnet), and returns the resulting Kubernetes manifests. The Repository Server is stateless — it doesn't store anything permanently — but it caches repository contents to avoid re-cloning on every reconciliation cycle.

**Application Controller** is the heart of ArgoCD. It's a Kubernetes controller (implementing the standard controller reconciliation loop pattern) that watches Application objects. For each Application, it periodically compares the desired state (what the Repository Server rendered from Git) against the live state (what the Kubernetes API says currently exists). If they differ and auto-sync is enabled, it applies the Git state to the cluster. If they're in sync, it does nothing. If auto-sync is disabled, it reports the drift for a human to address. The Application Controller runs in-cluster and uses the cluster's own service account to apply changes, which means cluster credentials never need to leave the cluster.

**Dex** is an embedded OpenID Connect identity provider. It federates authentication from external providers (GitHub, Google, LDAP, SAML) so ArgoCD users can log in with their existing organizational credentials rather than ArgoCD-specific accounts. Dex is optional but standard in enterprise setups.

**Redis** provides caching for the Application Controller. Rather than re-rendering the complete Git state on every reconciliation loop, ArgoCD caches rendered manifests in Redis. When the repository hasn't changed (most reconciliation cycles), the cached result is used. This dramatically reduces Git API calls and Repository Server load.

**The Application object** is ArgoCD's central custom resource. An Application tells ArgoCD: which Git repository to watch (and which path within it), which Kubernetes cluster and namespace to deploy to, which rendering tool to use (Helm, Kustomize, plain YAML), what sync policy to apply (manual or automatic), and what health checks to use.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: model-server
  namespace: argocd
spec:
  project: ml-platform          # AppProject for RBAC scoping
  
  source:
    repoURL: https://github.com/myorg/gitops-config.git
    targetRevision: main         # Branch, tag, or commit SHA
    path: environments/production/model-server
    
    helm:                        # Helm-specific rendering config
      releaseName: model-server
      valueFiles:
      - values.yaml
      - values-production.yaml
  
  destination:
    server: https://kubernetes.default.svc  # In-cluster deployment
    namespace: ml-production
  
  syncPolicy:
    automated:
      prune: true                # Delete resources removed from Git
      selfHeal: true             # Auto-revert manual changes
      allowEmpty: false          # Never sync empty app (safety check)
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

**AppProject** scopes what a group of Applications can deploy to. An AppProject can restrict which source repositories are allowed, which destination clusters and namespaces are allowed, which Kubernetes resource types can be deployed, and which teams can manage applications in the project. This is the multi-tenancy mechanism — the ML platform team's AppProject allows deploying to ML namespaces from ML repositories, while the data engineering team's AppProject scopes them to data namespaces from data repositories. Neither can accidentally (or intentionally) deploy to the other's territory.

---

## 4. Helm Chart Fundamentals

Helm is the package manager for Kubernetes. Just as `pip install` installs a Python package with all its dependencies configured correctly, `helm install` deploys a Kubernetes application with all its resources configured correctly for your specific needs.

The motivation for Helm is that real Kubernetes applications are not a single YAML file. A complete deployment typically needs: a Deployment, a Service, a ConfigMap, a Secret, an Ingress, an HPA, ServiceMonitor for Prometheus, RBAC roles and bindings, and possibly a PersistentVolumeClaim. That's 8+ separate YAML files, all needing consistent naming, labels, and configuration. Copying and modifying these files for each application or each environment is tedious, error-prone, and produces unmaintainable duplicated YAML.

Helm introduces templating — you write YAML with placeholders, and Helm fills in the values when installing. The template files, their default values, and metadata are packaged together into a Chart.

**Chart structure:**

```
my-model-server/
├── Chart.yaml          # Chart metadata (name, version, description)
├── values.yaml         # Default configuration values
├── charts/             # Dependencies (sub-charts)
└── templates/          # Kubernetes manifest templates
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── servicemonitor.yaml
    └── _helpers.tpl    # Named template snippets (not rendered directly)
```

**Chart.yaml** defines the chart's identity:
```yaml
apiVersion: v2
name: model-server
description: ML model serving infrastructure
type: application
version: 1.3.0          # Chart version (changes when chart structure changes)
appVersion: "2.1.0"     # Application version being deployed
dependencies:
- name: redis
  version: "17.x.x"
  repository: https://charts.bitnami.com/bitnami
  condition: redis.enabled
```

**values.yaml** contains all configurable defaults:
```yaml
replicaCount: 3

image:
  repository: myregistry/model-server
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: false
  host: ""
  tls: []

resources:
  requests:
    memory: "4Gi"
    cpu: "1"
  limits:
    memory: "8Gi"
    cpu: "2"

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

modelConfig:
  version: "v2.1.0"
  registryUrl: "s3://models/fraud-detection"
  batchSize: 32

monitoring:
  enabled: true
  port: 9090
```

**A template file** uses Go templating to reference values:
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "model-server.fullname" . }}
  labels:
    {{- include "model-server.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "model-server.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "model-server.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        env:
        - name: MODEL_VERSION
          value: {{ .Values.modelConfig.version | quote }}
        - name: BATCH_SIZE
          value: {{ .Values.modelConfig.batchSize | quote }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
        {{- if .Values.monitoring.enabled }}
        ports:
        - name: metrics
          containerPort: {{ .Values.monitoring.port }}
        {{- end }}
```

**Helm release lifecycle:**

```bash
# Install with default values
helm install my-model-server ./model-server

# Install with custom values
helm install my-model-server ./model-server \
  --values values-production.yaml \
  --set image.tag=v2.1.0 \
  --set replicaCount=5 \
  --namespace ml-production

# Upgrade an existing release
helm upgrade my-model-server ./model-server \
  --values values-production.yaml \
  --set image.tag=v2.2.0

# Preview what would be deployed without actually deploying
helm template my-model-server ./model-server --values values-production.yaml

# Rollback to previous release version
helm rollback my-model-server 1

# Uninstall all resources for a release
helm uninstall my-model-server

# View deployed releases
helm list --namespace ml-production
```

Helm maintains release history — every install and upgrade is recorded. This history enables rollback and provides an audit trail within the Helm ecosystem, though for GitOps the Git history is the authoritative record.

---

## 5. Helm Templating & Values Management

Helm templating is Go's template language applied to YAML, and mastering it is what separates functional Helm charts from excellent ones. The values management strategy — how you organize and override values across environments — determines how maintainable your Helm-based GitOps configuration is.

**Go template basics for Helm:**

`{{ .Values.key }}` — reference a value from values.yaml. Nested values use dot notation: `{{ .Values.image.repository }}`

`{{ .Release.Name }}` — the name given at helm install time. Used extensively for naming resources.

`{{ .Chart.Name }}` and `{{ .Chart.Version }}` — metadata from Chart.yaml.

`{{- ... -}}` — the `-` trims whitespace before or after the action, preventing blank lines in output.

`{{ if .Values.feature.enabled }}...{{ end }}` — conditional rendering. Resources or blocks can be conditionally included.

`{{ range .Values.list }}...{{ end }}` — iterate over a list or map.

`{{ toYaml .Values.resources | nindent 10 }}` — convert a values map to YAML and indent it. Essential for embedding complex structures like resource requests.

`{{ required "Image tag is required" .Values.image.tag }}` — fail template rendering with a message if a value is not provided.

`{{ default "latest" .Values.image.tag }}` — use a fallback value if the specified value is empty.

**Named templates in `_helpers.tpl`** avoid repetition across template files:

```yaml
# templates/_helpers.tpl

{{/* Full name for resources */}}
{{- define "model-server.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Standard labels applied to all resources */}}
{{- define "model-server.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
```

These named templates are called with `{{ include "model-server.fullname" . }}` throughout your templates, ensuring consistent naming without repetition.

**Values management across environments** is where many teams struggle. The wrong approach is having separate complete values files for each environment, duplicating 95% of content. The right approach is layering — a base values.yaml with sensible defaults, and per-environment override files with only what differs.

```yaml
# values.yaml (base defaults - committed to chart)
replicaCount: 2
image:
  tag: "latest"
resources:
  requests:
    memory: "2Gi"
    cpu: "0.5"

# values-staging.yaml (staging overrides only)
replicaCount: 2
image:
  tag: ""  # Must be provided at deploy time
resources:
  requests:
    memory: "4Gi"
    cpu: "1"

# values-production.yaml (production overrides only)
replicaCount: 10
image:
  tag: ""  # Must be provided at deploy time
resources:
  requests:
    memory: "8Gi"
    cpu: "2"
  limits:
    memory: "16Gi"
    cpu: "4"
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 50
```

With this structure, deploying to production means merging: base values.yaml (provides everything not overridden) + values-production.yaml (overrides environment-specific settings) + deploy-time `--set` flags (provides dynamic values like the specific image tag from the CI pipeline).

**Schema validation** for Helm values using `values.schema.json` prevents misconfiguration:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["image"],
  "properties": {
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": {"type": "string"},
        "tag": {
          "type": "string",
          "pattern": "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
        }
      }
    },
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  }
}
```

If a values file provides `image.tag: "latest"` instead of a proper version tag, Helm validates against this schema and rejects the deployment before it reaches the cluster.

**Helm hooks** execute jobs at specific points in the release lifecycle. Pre-install hooks run jobs before resources are created (database migrations, secret provisioning). Post-install hooks run after resources are ready (smoke tests, notifications). Pre-upgrade and post-upgrade hooks handle the same for upgrades. A database migration hook ensures schema changes happen before the new application version starts:

```yaml
# templates/migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "app.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        command: ["python", "manage.py", "migrate"]
      restartPolicy: Never
```

---

## 6. Kustomize Basics

Kustomize is an alternative to Helm for Kubernetes manifest management. Where Helm uses templating (inserting values into placeholders in template files), Kustomize uses overlays (starting with base YAML files and applying structured patches on top). Neither approach is universally better — they have different strengths and are appropriate for different use cases.

The Kustomize philosophy: base Kubernetes YAML files should be valid, complete YAML that can be applied directly. Customizations for different environments are applied as separate patches, not by inserting variables into templates. This means base configurations are human-readable and runnable without Kustomize, while templated Helm charts are unreadable without rendering.

**Kustomize structure:**

```
app/
├── base/                        # Valid, complete base manifests
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── overlays/
    ├── development/
    │   ├── kustomization.yaml
    │   └── patches/
    │       └── replica-count.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    │       └── resources.yaml
    └── production/
        ├── kustomization.yaml
        └── patches/
            ├── replicas-and-resources.yaml
            └── hpa.yaml
```

**Base kustomization.yaml** lists the resources it includes:
```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- configmap.yaml

commonLabels:
  app: model-server
  managed-by: kustomize

images:
- name: myregistry/model-server
  newTag: latest
```

**Overlay kustomization.yaml** references the base and applies changes:
```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namespace: ml-production

namePrefix: prod-

images:
- name: myregistry/model-server
  newTag: v2.1.0              # Override the image tag

patches:
- path: patches/replicas-and-resources.yaml
  target:
    kind: Deployment
    name: model-server
```

**Patch file** specifies what to change:
```yaml
# overlays/production/patches/replicas-and-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-server
spec:
  replicas: 10
  template:
    spec:
      containers:
      - name: model-server
        resources:
          requests:
            memory: "8Gi"
            cpu: "2"
          limits:
            memory: "16Gi"
            cpu: "4"
```

Kustomize applies this patch to the base Deployment, changing only the specified fields. Everything else from the base Deployment remains unchanged.

**Strategic merge patches** (like the above) understand Kubernetes semantics — they merge lists intelligently. A patch adding a container to a pod's container list adds it alongside existing containers, rather than replacing all containers with just the patched one. This is more intelligent than a simple text merge.

**JSON patches** offer surgical precision for specific field modifications:
```yaml
patches:
- target:
    kind: Deployment
    name: model-server
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 10
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value:
        name: ENVIRONMENT
        value: production
```

**When to use Kustomize vs Helm** — Kustomize is excellent when: you want valid base YAML that can be applied directly, your customizations are structural changes to existing resources (adding labels, changing replicas, overriding images), you prefer composition over templating, or you're working primarily with Kubernetes-native resources. Helm is better when: you're packaging applications for others to install (Helm's distribution model via chart repositories is much better than Kustomize's), you need conditional logic and loops in your configuration, or you're installing complex third-party software where Helm charts are already maintained by the project.

Many teams use both — Helm for third-party applications (install cert-manager, ingress-nginx, Prometheus using their official Helm charts) and Kustomize for their own application deployments (cleaner, no templating complexity, valid base YAML).

---

## 7. Application Deployment via GitOps

GitOps-based application deployment is the practical workflow that ties together Git, ArgoCD, Helm/Kustomize, and your CI/CD pipeline into a complete delivery system. Understanding this end-to-end workflow — from a developer pushing code to a change running in production — is what makes GitOps concrete and operational rather than theoretical.

The workflow has two distinct phases: the CI phase (producing a validated artifact) and the CD phase (deploying that artifact declaratively).

**The CI phase** (traditional push-based pipeline):
1. Developer pushes code to a feature branch
2. CI pipeline triggers: build, test, lint, security scan
3. If all checks pass, Docker image is built and pushed to registry with a unique tag (commit SHA or semantic version)
4. The pipeline does NOT deploy directly to Kubernetes
5. Instead, it updates the GitOps repository with the new image tag

**The GitOps repository update** is the critical handoff step. The CI pipeline commits a change to the GitOps repository that changes the image tag from the old version to the new one:

```bash
# In CI pipeline, after pushing new image
NEW_TAG="v2.1.0-${GITHUB_SHA:0:7}"

# Clone the GitOps repository
git clone https://github.com/myorg/gitops-config.git
cd gitops-config

# Update the image tag (using yq for YAML editing)
yq eval ".image.tag = \"${NEW_TAG}\"" -i \
    environments/staging/model-server/values.yaml

# Or update a Kustomize image reference
cd environments/staging/model-server
kustomize edit set image myregistry/model-server:${NEW_TAG}

# Commit and push
git config user.email "ci@company.com"
git config user.name "CI Bot"
git add -A
git commit -m "chore: update model-server to ${NEW_TAG}

Automated deployment from CI pipeline.
Source commit: ${GITHUB_SHA}
Build: ${GITHUB_RUN_ID}"
git push
```

**The CD phase** (pull-based GitOps):
1. ArgoCD watches the GitOps repository and detects the commit
2. ArgoCD renders the Helm chart or Kustomize overlay with the new values
3. ArgoCD compares rendered output against the cluster's current state
4. ArgoCD detects the image tag difference and applies the change
5. Kubernetes rolls out the new deployment according to its update strategy
6. ArgoCD monitors the rollout and reports health status

The ArgoCD Application watching for these changes:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: model-server-staging
  namespace: argocd
spec:
  project: ml-platform
  source:
    repoURL: https://github.com/myorg/gitops-config.git
    targetRevision: main
    path: environments/staging/model-server
    helm:
      valueFiles:
      - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: ml-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

**Separating application and GitOps repositories** is a critical design decision. Some teams put Helm charts and GitOps configuration in the same repository as application code. This creates coupling — every code change triggers potential GitOps changes, and the repository history mixes application and deployment concerns. Better practice:

Application repository — application code, Dockerfile, CI pipeline. Produces Docker images.

GitOps repository (sometimes called config repo or manifests repo) — Helm charts, Kustomize overlays, environment-specific values. Consumed by ArgoCD. Only deployment-related changes. The CI pipeline from the application repo commits here to trigger deployments.

This separation means: reading the GitOps repository gives you a complete picture of what's deployed where. Changing deployment configuration doesn't require going through application CI. Access control can be different — more engineers have write access to the application repo, fewer (or automated systems only) update deployment tags.

---

## 8. Automated Sync & Self-Healing

Automated sync and self-healing are what transform ArgoCD from a deployment tool into a continuous reconciliation system. Without these features, ArgoCD is just a more auditable way to run `kubectl apply`. With them, it becomes a system that actively maintains declared state against the real world.

**Automated sync** means ArgoCD automatically applies Git changes to the cluster without requiring human action. When you push a commit to the GitOps repository, ArgoCD detects the change within a few minutes (based on polling interval, typically 3 minutes, or immediately via webhook) and automatically syncs the application.

Without automated sync, ArgoCD operates in manual mode — it detects drift and shows it in the UI, but a human must click "Sync" to apply it. Manual mode is appropriate for production environments where you want human oversight of every deployment. Automated sync is appropriate for development and staging environments where fast iteration matters more than manual review.

Configuring automated sync with important safeguards:

```yaml
syncPolicy:
  automated:
    prune: true          # Delete resources that are in cluster but not in Git
    selfHeal: true       # Revert manual changes made outside Git
    allowEmpty: false    # Never sync an application that renders to zero resources
                         # (prevents accidentally deleting everything if rendering fails)
  syncOptions:
  - PrunePropagationPolicy=foreground  # Wait for dependent resources to be deleted
  - RespectIgnoreDifferences=true      # Respect configured ignore rules
  retry:
    limit: 5             # Retry failed syncs up to 5 times
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m    # Maximum wait between retries: 3 minutes
```

**Prune** is a critical setting that requires careful consideration. When you remove a resource from your GitOps repository (delete a Deployment YAML, remove a Service from your Helm chart), what should happen to the resource that already exists in the cluster? Without `prune: true`, the resource stays running indefinitely — ghost resources accumulate in your cluster that are no longer managed but continue consuming resources. With `prune: true`, ArgoCD deletes resources that exist in the cluster but are no longer declared in Git. This is the correct behavior for production but can be dangerous if misconfigured — a rendering error that produces empty output could delete all your resources if `allowEmpty: false` isn't set.

**Self-healing** is what makes GitOps's immutability property real. Without self-healing, someone with kubectl access can change a resource in the cluster, and it stays changed until the next explicit sync. With self-healing, ArgoCD detects any drift from the Git-declared state and automatically reverts it, typically within a few minutes.

This is one of GitOps's most powerful security properties. An attacker who gains kubectl access to your production cluster and modifies a deployment to run their code will find their changes reverted within the next reconciliation cycle. This doesn't make cluster access less important to protect, but it dramatically reduces the window of impact from unauthorized changes.

**Webhook configuration** for immediate sync instead of polling:

Rather than ArgoCD polling Git every 3 minutes, configure your Git provider to send a webhook notification to ArgoCD when code is pushed. ArgoCD receives the webhook, immediately fetches the latest state, and triggers a sync. This reduces the time from git push to deployment start from 3 minutes to seconds.

In GitHub, add a webhook at `https://argocd-server/api/webhook` with a shared secret. ArgoCD validates the webhook signature and triggers refresh immediately on receiving it.

---

## 9. GitOps Repository Structure Design

The structure of your GitOps repository is an architectural decision that affects how easily you can understand the current state of your systems, how quickly you can deploy to specific environments, how you manage permissions for different teams, and how you scale to many applications and environments. Getting this right early prevents painful restructuring later.

There is no single universally correct structure, but there are well-established patterns with known tradeoffs.

**Pattern 1: Environment-based top-level directories**

```
gitops-config/
├── environments/
│   ├── development/
│   │   ├── model-server/
│   │   │   ├── values.yaml
│   │   │   └── kustomization.yaml
│   │   └── feature-store/
│   │       └── values.yaml
│   ├── staging/
│   │   ├── model-server/
│   │   │   └── values.yaml
│   │   └── feature-store/
│   │       └── values.yaml
│   └── production/
│       ├── model-server/
│       │   └── values.yaml
│       └── feature-store/
│           └── values.yaml
├── charts/                   # Helm charts (if co-located)
│   ├── model-server/
│   └── feature-store/
└── apps/                     # ArgoCD Application manifests
    ├── development.yaml      # ArgoCD App of Apps
    ├── staging.yaml
    └── production.yaml
```

This structure makes it easy to answer "what's deployed in production?" — look in `environments/production/`. To deploy a new version, update values in the specific environment directory. CODEOWNERS can restrict who can modify `environments/production/` to senior engineers or automated systems.

**Pattern 2: Application-based top-level directories**

```
gitops-config/
├── model-server/
│   ├── base/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── overlays/
│       ├── development/
│       ├── staging/
│       └── production/
├── feature-store/
│   └── ...
└── argocd-apps/
    └── ...
```

This structure makes it easy to see all environments for a specific application in one place. Better for teams organized around services rather than environments.

**App of Apps pattern** — managing dozens of ArgoCD Application objects manually doesn't scale. The App of Apps pattern uses a parent Application that manages child Application objects, enabling you to define your entire application portfolio declaratively:

```yaml
# apps/production.yaml - Parent Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-apps
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/gitops-config.git
    targetRevision: main
    path: argocd-apps/production    # Directory of Application manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```
argocd-apps/production/
├── model-server.yaml       # ArgoCD Application for model-server
├── feature-store.yaml      # ArgoCD Application for feature-store
├── mlflow.yaml             # ArgoCD Application for MLflow
└── monitoring.yaml         # ArgoCD Application for monitoring stack
```

When you add a new application, you add a new Application manifest to this directory. The parent App of Apps picks it up and creates the child Application automatically. Your entire production application portfolio is declaratively defined and version-controlled.

**ApplicationSets** extend this further with templating for Applications. Instead of writing 10 similar Application manifests for 10 environments or clusters, write one ApplicationSet template:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: model-server
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - env: development
        cluster: dev-cluster
        url: https://dev-k8s.company.com
        namespace: ml-dev
        replicaCount: "1"
      - env: staging
        cluster: staging-cluster
        url: https://staging-k8s.company.com
        namespace: ml-staging
        replicaCount: "3"
      - env: production
        cluster: prod-cluster
        url: https://prod-k8s.company.com
        namespace: ml-production
        replicaCount: "10"
  template:
    metadata:
      name: 'model-server-{{env}}'
    spec:
      project: ml-platform
      source:
        repoURL: https://github.com/myorg/gitops-config.git
        targetRevision: main
        path: 'environments/{{env}}/model-server'
        helm:
          parameters:
          - name: replicaCount
            value: '{{replicaCount}}'
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'
```

One ApplicationSet generates three Applications. Adding a new environment means adding one entry to the generators list.

---

## 10. Environment Promotion Strategy

Promotion is the process of moving a change from one environment to the next — from development to staging to production. In GitOps, promotion means updating the GitOps repository's environment-specific configuration to reflect the new version. The strategy for how this happens determines your deployment velocity, safety, and auditability.

**Manual promotion via pull request** is the safest and most auditable approach for production changes. The process: automated or human creates a pull request that updates the production environment's image tag or configuration, designated reviewers (senior engineers, team leads) review the PR and the changes it represents, the PR is merged after approval, ArgoCD detects the merge and deploys automatically. Every production change has a PR record with reviewer names, timestamps, and discussion.

```bash
# Promotion script: promote staging to production
STAGING_VERSION=$(yq eval '.image.tag' environments/staging/model-server/values.yaml)

# Create a promotion branch
git checkout -b promote/model-server-${STAGING_VERSION}

# Update production values to match staging
yq eval ".image.tag = \"${STAGING_VERSION}\"" -i \
    environments/production/model-server/values.yaml

git add environments/production/model-server/values.yaml
git commit -m "promote: model-server ${STAGING_VERSION} to production

Promoting version that has been validated in staging.
Staging validation duration: 2 days
Key metrics: p99 latency 145ms, error rate 0.02%"

git push origin promote/model-server-${STAGING_VERSION}
# Create PR automatically via GitHub CLI
gh pr create \
    --title "Promote model-server ${STAGING_VERSION} to production" \
    --body "Automated promotion. Review metrics dashboard before approving."
```

**Automated promotion** is used for development environments and can be used for staging with appropriate validation gates. After CI builds and tests pass, the pipeline automatically updates the next environment:

```yaml
# GitHub Actions: Auto-promote to staging after dev validation
- name: Promote to staging
  if: github.ref == 'refs/heads/main' && env.DEV_VALIDATION_PASSED == 'true'
  run: |
    cd gitops-config
    NEW_TAG="${{ env.IMAGE_TAG }}"
    
    yq eval ".image.tag = \"${NEW_TAG}\"" -i \
        environments/staging/model-server/values.yaml
    
    git commit -am "auto-promote: model-server ${NEW_TAG} to staging"
    git push
```

**Progressive promotion with validation gates** — sophisticated promotion pipelines include automated validation before advancing to the next environment:

```
CI passes → Deploy to dev (automated)
  ↓
Dev smoke tests pass (automated, ~5min)
  ↓
Deploy to staging (automated)
  ↓
Staging integration tests pass (automated, ~30min)
  ↓
Staging soak period (configured, 24-48 hours)
  ↓
Human approval (manual PR review)
  ↓
Deploy to production (automated after PR merge)
  ↓
Production canary metrics check (automated, 30min)
  ↓
Full production rollout (automated if metrics pass)
```

Each gate serves a purpose. Integration tests catch correctness issues. Soak periods catch memory leaks and gradual degradation that only appear over time. Human approval adds judgment for risk assessment. Canary metrics provide real-world validation on a subset of production traffic before full exposure.

**Version tracking across environments** — it's valuable to be able to see at a glance what version is in each environment. A simple approach is a dashboard script or a GitHub Actions job that reads each environment's values.yaml and reports:

```bash
#!/bin/bash
echo "=== Environment Version Status ==="
for env in development staging production; do
    VERSION=$(yq eval '.image.tag' environments/${env}/model-server/values.yaml)
    echo "${env}: ${VERSION}"
done
# Output:
# development: v2.2.0-abc1234
# staging: v2.1.0-def5678  
# production: v2.0.0-ghi9012
```

---

## 11. Drift Detection & Reconciliation

Drift is the divergence between the desired state declared in Git and the actual state running in your cluster. It's an inevitability in any real system — manual interventions during incidents, partially applied changes, configuration changes made through cloud provider consoles, Kubernetes operators modifying resources, or simply bugs in the reconciliation process.

**How drift occurs in practice:**

On-call engineers making emergency changes — someone SSHes into a node or runs `kubectl edit` during an incident at 2am to fix a production problem. They forget to update the GitOps repository with their change. The fix stays in place, but Git doesn't know about it.

Kubernetes operators and controllers modifying resources — a cluster autoscaler updates node group sizes, a certificate controller updates TLS certificates, an HPA changes replica counts. These are legitimate changes by authorized systems, but they create differences between Git state and cluster state.

Partially applied changes — a sync that fails halfway through leaves the cluster in an intermediate state that matches neither the old Git state nor the new one.

Namespace or cluster-level configurations made outside GitOps — cluster administrators make cluster-wide changes (new node taints, cluster-level RBAC) outside the GitOps process.

**ArgoCD's drift detection** compares the live state of every managed resource against the desired state from Git. The comparison is performed by the Application Controller on each reconciliation cycle (default every 3 minutes, or triggered by webhooks). It uses a sophisticated diff algorithm that understands Kubernetes conventions — it ignores auto-generated fields like `creationTimestamp`, `generation`, `resourceVersion` that Kubernetes adds and that shouldn't be managed in Git.

**Sync status** in ArgoCD:
- **Synced** — live state matches desired state completely
- **OutOfSync** — differences detected between live and desired state
- **Unknown** — ArgoCD can't determine the sync status (cluster unreachable, rendering failed)

**Health status** (separate from sync status):
- **Healthy** — all resources report healthy (Deployment has desired replicas, all pods running)
- **Progressing** — resources are still being created or updated
- **Degraded** — something is wrong (pod crash loops, insufficient replicas)
- **Missing** — resources declared in Git don't exist in the cluster

**Configuring what to ignore** — not all drift is undesirable. HPA changing replica counts is expected behavior, not unauthorized drift. ArgoCD's ignore differences configuration tells it which fields or resources to ignore during drift detection:

```yaml
spec:
  ignoreDifferences:
  # Ignore HPA-managed replicas
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
  
  # Ignore auto-generated annotations
  - group: ""
    kind: Service
    jsonPointers:
    - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
  
  # Ignore cert-manager managed certificate data
  - group: ""
    kind: Secret
    name: tls-secret
    jsonPointers:
    - /data
```

**Manual drift correction** — when self-healing is disabled (appropriate for production with careful change management), the workflow for correcting drift is explicit. You detect the drift (ArgoCD shows OutOfSync), you investigate what changed and whether it was intentional, you either update the GitOps repository to match the manual change (if the manual change was correct and should persist) or you sync to revert the manual change to the Git state.

**Recording emergency changes** — when on-call engineers make emergency changes directly to the cluster, they should immediately (or as soon as the incident is resolved) either open a PR to update the GitOps repository to reflect the change, or document why the change was made and that it will be reverted. Some teams add labels to manually-modified resources during incidents (`incident/INC-1234`) as a reminder to reconcile after.

---

## 12. Secret Management in GitOps

Secret management in GitOps is one of the hardest problems in the entire GitOps workflow. The fundamental tension: GitOps requires that the complete desired state of your system is in Git, but secrets (database passwords, API keys, TLS certificates) must never be committed to Git in plain text — Git repositories can be accessed by many people and potentially leaked.

Several approaches address this, with different tradeoffs.

**Sealed Secrets** (Bitnami) encrypts secrets using a public key before committing them to Git. The corresponding private key lives only in the cluster. The SealedSecret controller decrypts SealedSecrets and creates regular Kubernetes Secrets. Only the cluster with the matching private key can decrypt them.

```bash
# Install sealed-secrets controller and kubeseal CLI
# Get the cluster's public key
kubeseal --fetch-cert > sealed-secrets-public-key.pem

# Create and encrypt a secret
kubectl create secret generic db-credentials \
    --from-literal=username=mluser \
    --from-literal=password=supersecret \
    --dry-run=client -o yaml | \
kubeseal --cert sealed-secrets-public-key.pem \
    --format yaml > sealed-secrets/db-credentials.yaml

# The sealed-secrets/db-credentials.yaml is safe to commit to Git
# It looks like:
```

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: ml-production
spec:
  encryptedData:
    username: AgBy3i...  # Encrypted value
    password: AgCk4j...  # Encrypted value
  template:
    metadata:
      name: db-credentials
      namespace: ml-production
    type: Opaque
```

The SealedSecret object can be committed to Git. ArgoCD deploys it to the cluster. The sealed-secrets controller decrypts it and creates a regular Kubernetes Secret. If someone reads the Git repository, they see the encrypted values — useless without the private key that only exists in the cluster.

The limitation: if the cluster's private key is lost, all sealed secrets are unrecoverable. Key backup and rotation requires resealing all secrets.

**External Secrets Operator (ESO)** is the most production-ready approach. Secrets live in an external secrets management system (AWS Secrets Manager, Vault, GCP Secret Manager, Azure Key Vault). The External Secrets Operator runs in Kubernetes, authenticates to the external secrets system, and creates Kubernetes Secrets from the external values. What gets committed to Git is the ExternalSecret object — a declarative reference to where the secret lives, not the secret value itself.

```yaml
# This is safe to commit to Git - contains no secret values
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: ml-production
spec:
  refreshInterval: 1h              # Re-sync from source every hour
  secretStoreRef:
    name: aws-secretsmanager       # Reference to a SecretStore
    kind: ClusterSecretStore
  target:
    name: db-credentials           # Creates this Kubernetes Secret
    creationPolicy: Owner
  data:
  - secretKey: username            # Key in the Kubernetes Secret
    remoteRef:
      key: ml-production/db-credentials  # Key in AWS Secrets Manager
      property: username
  - secretKey: password
    remoteRef:
      key: ml-production/db-credentials
      property: password
```

The SecretStore configures how to authenticate to AWS Secrets Manager (typically via IRSA — IAM Roles for Service Accounts):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

ESO's advantages over Sealed Secrets: secrets are managed in a purpose-built system with audit logging, access control, rotation, and versioning. Rotating a secret means updating it in Secrets Manager — ESO automatically picks up the new value within the refresh interval. No re-sealing required. Secret access is audited at the secrets manager level.

**SOPS (Secrets OPerationS)** encrypts specific values within YAML files while keeping the structure readable:

```yaml
# Before encryption (not committed)
database:
  username: mluser
  password: supersecret

# After sops encryption (safe to commit)
database:
    username: ENC[AES256_GCM,data:abc123,tag:xyz]
    password: ENC[AES256_GCM,data:def456,tag:uvw]
sops:
    kms:
    - arn: arn:aws:kms:us-east-1:123456789:key/my-key
```

SOPS integrates with ArgoCD through the KSOPS or HELM-SECRETS plugins, which decrypt secrets during the rendering phase.

---

## 13. Rollback Strategies in GitOps

In GitOps, a rollback is just another git operation. Because Git is the source of truth and every state the system has ever been in is preserved in Git history, rolling back means pointing the system back to a previous Git state. This conceptual simplicity is one of GitOps's major operational advantages.

**Git revert** creates a new commit that undoes the changes of a previous commit, adding to history rather than rewriting it. This is the preferred production rollback method because it preserves audit trail — the deployment was made, it was found to be problematic, it was reverted, all events recorded:

```bash
# Identify the commit that caused the problem
git log --oneline environments/production/model-server/

# a1b2c3d deploy: model-server v2.2.0 to production
# d4e5f6g deploy: model-server v2.1.0 to production
# g7h8i9j deploy: model-server v2.0.0 to production

# Revert the problematic deployment
git revert a1b2c3d --no-edit
git push origin main

# ArgoCD detects the new commit (which reverts to v2.1.0 image tag)
# and syncs the cluster back to v2.1.0
```

The revert commit in Git clearly shows: "model-server v2.2.0 was reverted because [reason from commit message]." This is valuable for post-incident reviews and compliance.

**Direct image tag update** for faster emergency rollback when speed matters more than pristine history:

```bash
# Quickly update the image tag to the previous known-good version
PREVIOUS_VERSION="v2.1.0"

yq eval ".image.tag = \"${PREVIOUS_VERSION}\"" -i \
    environments/production/model-server/values.yaml

git add environments/production/model-server/values.yaml
git commit -m "emergency rollback: model-server to ${PREVIOUS_VERSION}

INCIDENT: INC-1234
Reason: v2.2.0 causing elevated error rates on transaction processing
Rolling back to last known good version
"
git push
```

**ArgoCD sync to previous revision** — ArgoCD can sync to a specific Git commit without you needing to do a git revert or push:

```bash
# Rollback to a specific revision using ArgoCD CLI
argocd app rollback model-server-production \
    --revision d4e5f6g        # The commit SHA to roll back to

# Or in the ArgoCD UI: History and Rollback → select revision → Rollback
```

This is the fastest rollback method — no Git operations required — but it creates a drift state: the cluster is running what was in Git at commit d4e5f6g, but the current HEAD of Git has different content. ArgoCD shows OutOfSync against HEAD. You should follow up with a proper Git revert to bring Git back in line with what's running.

**Automated rollback with sync waves and health checks:**

ArgoCD's sync waves and health assessment enable automated rollback when a deployment doesn't become healthy. Configure sync wave ordering and rely on ArgoCD's health assessment:

```yaml
# Canary deployment first, main deployment second
# If canary isn't healthy, sync stops before touching main
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"   # Deploy first (lower = earlier)
```

Combined with Argo Rollouts for progressive delivery, automated rollback happens when metrics violate thresholds during a canary deployment, without any human intervention.

**Preventing rollback foot-guns** — some rollback scenarios require care. Rolling back to a version that used a different database schema requires ensuring the database is also compatible. Rolling back a model version in production while keeping the new feature store schema could cause serving errors if the old model doesn't understand the new feature format. GitOps rollback handles the Kubernetes state — it doesn't automatically handle dependent data systems. Document data dependencies in your promotion and rollback runbooks.

---

## 14. Multi-Cluster Deployment Patterns

Most production ML systems eventually span multiple Kubernetes clusters — separate clusters for different environments, different regions, different cloud providers, or different tenants. GitOps with multiple clusters adds complexity but also enables powerful deployment patterns.

**Why multiple clusters:**

Environment isolation — truly separating production from staging requires separate clusters, not just separate namespaces. A node failure in a shared cluster could take down both environments simultaneously.

Geographic distribution — serving users in Asia, Europe, and North America with acceptable latency requires clusters in multiple regions. Model serving for real-time predictions can't tolerate cross-continental network latency.

Cloud provider diversity — avoiding vendor lock-in or meeting specific regulatory requirements may require clusters in different clouds.

Blast radius limitation — a critical bug in an operator or a cluster upgrade gone wrong only affects one cluster, not everything.

**ArgoCD multi-cluster management:**

ArgoCD can manage multiple clusters from a single ArgoCD installation (hub-and-spoke model) or from multiple ArgoCD installations (one per cluster or per environment).

In the hub-and-spoke model, one ArgoCD instance in a management cluster has credentials for all target clusters:

```yaml
# ApplicationSet deploying to multiple clusters
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: model-server-global
  namespace: argocd
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          environment: production  # Select all clusters labeled as production
  template:
    metadata:
      name: 'model-server-{{name}}'
    spec:
      project: ml-platform
      source:
        repoURL: https://github.com/myorg/gitops-config.git
        targetRevision: main
        path: 'clusters/{{name}}/model-server'
      destination:
        server: '{{server}}'
        namespace: ml-production
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
```

This ApplicationSet automatically creates Applications for every cluster with the `environment: production` label. When you add a new region cluster and label it appropriately, ArgoCD automatically starts managing it.

**GitOps repository structure for multi-cluster:**

```
gitops-config/
├── base/                            # Shared base configurations
│   └── model-server/
│       ├── deployment.yaml
│       └── service.yaml
├── clusters/
│   ├── us-east-1/
│   │   ├── cluster.yaml             # Cluster metadata/labels
│   │   └── model-server/
│   │       └── values.yaml          # US-East specific values
│   ├── eu-west-1/
│   │   └── model-server/
│   │       └── values.yaml          # EU-West specific values
│   └── ap-southeast-1/
│       └── model-server/
│           └── values.yaml
├── environments/
│   ├── staging/
│   └── production/
└── argocd-apps/
    ├── applicationsets/
    │   └── model-server.yaml        # ApplicationSet for all clusters
    └── apps/
```

**Progressive multi-cluster rollout** — when deploying a new model version globally, you don't want to update all regions simultaneously. A failure in one region during rollout should halt the rollout to remaining regions:

```
Deploy to us-east-1 (primary region, ~10% of traffic)
  ↓ Wait 30 minutes, validate metrics
Deploy to eu-west-1 (25% of traffic)
  ↓ Wait 30 minutes, validate metrics
Deploy to ap-southeast-1 (remaining traffic)
  ↓ Validate global metrics
Complete
```

This requires tooling beyond standard ArgoCD — either custom deployment pipelines that update cluster-specific values files progressively, or Argo Rollouts with analysis templates that gate progression based on per-cluster metrics.

**Cluster registration in ArgoCD:**

```bash
# Add a new cluster to ArgoCD management
argocd cluster add my-new-cluster-context \
    --name production-us-west-2 \
    --label environment=production \
    --label region=us-west-2

# ArgoCD creates a service account in the target cluster
# with necessary RBAC permissions and stores the credentials
```

---

## 15. Observability in GitOps Workflows

Observability in GitOps means being able to answer questions about your deployment process itself — not just whether your applications are healthy, but whether your GitOps system is working correctly, what changes are being deployed, how long deployments take, and what's causing sync failures.

**ArgoCD metrics** — ArgoCD exposes Prometheus metrics that give deep insight into the GitOps system's operation:

```promql
# Number of applications in each sync status
argocd_app_info{sync_status="OutOfSync"}  # Applications that have drifted

# Application health status
argocd_app_info{health_status="Degraded"}  # Applications with health problems

# Sync operation duration - how long do deployments take?
histogram_quantile(0.99, 
    rate(argocd_app_sync_duration_seconds_bucket[1h])
)

# Repository reconciliation time
rate(argocd_repo_pending_request_total[5m])

# Number of sync operations over time (deployment frequency metric)
rate(argocd_app_sync_total[1h])
```

**DORA metrics through GitOps** — the four DORA (DevOps Research and Assessment) metrics measure software delivery performance:

Deployment frequency is the rate of `argocd_app_sync_total` for production applications.

Lead time for changes is the time from commit to the GitOps repository until that commit is reflected in the cluster. Calculate by recording the commit timestamp in the deployment commit and comparing to the ArgoCD sync completion time.

Change failure rate is the percentage of deployments that resulted in rollbacks or incidents. Track revert commits in the GitOps repository and incidents linked to deployments.

Time to restore service is measured from the first failed sync or health degradation event to restoration.

**Deployment audit trail** — every change to the GitOps repository creates a Git commit with author, timestamp, and message. Every ArgoCD sync operation is recorded in ArgoCD's operation history. Together, these create a complete audit trail: who committed what change when, and when that change was applied to which cluster.

For compliance requirements (SOX, HIPAA, PCI-DSS), this audit trail is valuable. ArgoCD's operation logs, combined with Git commit history, provide tamper-evident records of every production change.

**Alerting on GitOps health:**

```yaml
# Alertmanager rule for sync failures
groups:
- name: argocd-alerts
  rules:
  - alert: ArgoCDAppOutOfSync
    expr: |
      argocd_app_info{sync_status="OutOfSync", project="ml-platform"} == 1
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "ArgoCD application {{ $labels.name }} is out of sync"
      description: "Application has been OutOfSync for 30 minutes - manual intervention may be required"
  
  - alert: ArgoCDAppDegraded
    expr: |
      argocd_app_info{health_status="Degraded"} == 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "ArgoCD application {{ $labels.name }} is degraded"
  
  - alert: ArgoCDSyncFailed
    expr: |
      argocd_app_sync_total{phase="Error"} > 0
    for: 0m
    labels:
      severity: high
    annotations:
      summary: "ArgoCD sync failed for {{ $labels.name }}"
```

**GitOps dashboard** in Grafana — a dedicated dashboard for the GitOps layer shows: number of applications per health/sync status, deployment frequency over time, sync duration trends, recent sync operations and their outcomes, applications most frequently going OutOfSync (which might indicate unauthorized manual changes), and deployment timeline (which applications were deployed when, correlated with application metrics).

**Notification integration** — ArgoCD's notification controller sends deployment events to Slack, PagerDuty, or email:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  trigger.on-sync-succeeded: |
    - description: Notify on successful sync
      send: [slack-deployment]
      when: app.status.operationState.phase in ['Succeeded']
  
  trigger.on-sync-failed: |
    - description: Alert on sync failure  
      send: [slack-alerts, pagerduty]
      when: app.status.operationState.phase in ['Error', 'Failed']
  
  template.slack-deployment: |
    message: |
      :white_check_mark: *Deployed {{ .app.metadata.name }}*
      Version: {{ .app.status.summary.images | join ", " }}
      Commit: {{ .app.status.operationState.syncResult.revision | truncate 8 "" }}
      Author: {{ (call .repo.GetCommitMetadata .app.status.operationState.syncResult.revision).Author }}
```

**Correlating deployment events with application metrics** — in Grafana, add ArgoCD sync events as annotations on your application dashboards. When you see a latency spike at 14:23, you can immediately see that a deployment happened at 14:21, correlating the infrastructure event with the application impact. This is the GitOps-native equivalent of deployment markers on dashboards, and it works automatically because ArgoCD emits structured events that can be queried and annotated.

---

The thread connecting all of them is this: GitOps is fundamentally about making the deployment process auditable, reversible, and consistent by treating system state the same way good engineers treat code — versioned, reviewed, immutable once merged, and always recoverable. Every concept here, from ArgoCD's reconciliation loop to multi-cluster patterns to secret management, is a specific solution to a specific challenge in maintaining that discipline at production scale.
