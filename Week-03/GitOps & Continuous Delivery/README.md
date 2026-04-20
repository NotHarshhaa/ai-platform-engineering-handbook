# GitOps & Continuous Delivery

---

## 1. GitOps Principles

GitOps is an operational framework where **Git is the single source of truth** for both infrastructure and application configuration.

**The 4 Core GitOps Principles (OpenGitOps):**

```
┌─────────────────────────────────────────────────────────────┐
│                   GitOps Principles                         │
├──────────────────┬──────────────────────────────────────────┤
│ 1. Declarative   │ Entire system described declaratively    │
│ 2. Versioned     │ State stored in Git (immutable,versioned)│
│ 3. Pulled        │ Agents pull from Git (not pushed to)     │
│ 4. Reconciled    │ Agents continuously reconcile state      │
└──────────────────┴──────────────────────────────────────────┘
```

**Traditional CI/CD vs GitOps:**

```
Traditional Push-based CI/CD:
Developer → Git → CI Pipeline → kubectl apply → Cluster
                                    ↑
                         credentials live in CI
                         (security risk)

GitOps Pull-based:
Developer → Git → CI (build only) → Registry
                    ↓
                  Git (manifests updated)
                    ↑
              ArgoCD/Flux pulls ← Cluster agent
              (credentials stay inside cluster)
```

**Why GitOps wins in production:**

| Concern | Traditional CD | GitOps |
|---|---|---|
| **Audit trail** | CI logs (ephemeral) | Full Git history |
| **Rollback** | Re-run old pipeline | `git revert` |
| **Credentials** | In CI/CD system | Inside cluster only |
| **Drift** | Undetected | Auto-detected & fixed |
| **Recovery** | Rebuild from scratch | Re-sync from Git |
| **Access control** | CI/CD permissions | Git PR + RBAC |

---

## 2. Declarative Infrastructure & Deployments

Everything — apps, infra, config, policies — is described **as desired state in Git**.

```
GitOps = Desired State (Git) ←→ Actual State (Cluster)
                    ↓
           Reconciliation Loop
           (continuous sync)
```

**Declarative deployment examples:**

```yaml
# ── App Deployment (desired state) ──────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3                        # desired: 3 pods
  selector:
    matchLabels:
      app: payment-service
  template:
    spec:
      containers:
      - name: payment
        image: myregistry/payment:v2.4.1   # exact version pinned
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

**Declarative vs Imperative in GitOps context:**

```bash
# ❌ Imperative — not GitOps
kubectl scale deployment payment-service --replicas=5
kubectl set image deployment/payment payment=myregistry/payment:v2.5.0
# → no Git record, ArgoCD will revert these!

# ✅ Declarative — GitOps way
# 1. Edit manifest in Git
# 2. Open PR → review → merge
# 3. ArgoCD detects change → syncs cluster
# → Git is the record, cluster follows
```

**Declarative policy (OPA Gatekeeper):**

```yaml
# Even policies are declarative in Git
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
    - apiGroups: ["apps"]
      kinds: ["Deployment"]
  parameters:
    labels: ["team", "environment"]
```

---

## 3. ArgoCD Architecture

ArgoCD is the most widely adopted GitOps operator for Kubernetes.

```
┌──────────────────────────────────────────────────────────┐
│                     ArgoCD Components                    │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  API Server │  │  Repository  │  │   Application  │   │
│  │  (UI/CLI/   │  │   Server     │  │   Controller   │   │
│  │   gRPC)     │  │  (Git sync)  │  │  (reconciler)  │   │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘   │
│         │                │                  │            │
│  ┌──────▼──────────────────────────────────▼──────────┐  │
│  │                    Redis Cache                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐                       │
│  │  Dex (OIDC) │  │  Notifications│                      │
│  │  (Auth)     │  │  Controller  │                       │
│  └─────────────┘  └──────────────┘                       │
└──────────────────────────────────────────────────────────┘
         │                │
         ▼                ▼
      Git Repos      Target Clusters
```

**ArgoCD Application — the core CRD:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: production            # AppProject for RBAC

  source:
    repoURL: https://github.com/org/gitops-repo
    targetRevision: HEAD         # branch / tag / commit SHA
    path: apps/payment-service/overlays/prod

  destination:
    server: https://kubernetes.default.svc   # target cluster
    namespace: production

  syncPolicy:
    automated:
      prune: true                # delete removed resources
      selfHeal: true             # revert manual changes
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

**AppProject for multi-team RBAC:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  sourceRepos:
  - "https://github.com/org/*"        # allowed source repos

  destinations:
  - namespace: "production"
    server: https://kubernetes.default.svc

  clusterResourceWhitelist:
  - group: ""
    kind: Namespace

  roles:
  - name: developer
    policies:
    - p, proj:production:developer, applications, sync, production/*, allow
    - p, proj:production:developer, applications, get, production/*, allow
```

---

## 4. Helm Chart Fundamentals

Helm is the **package manager for Kubernetes** — bundles related manifests into a versioned, parameterizable chart.

```
my-chart/
├── Chart.yaml           # chart metadata
├── values.yaml          # default configuration values
├── values-prod.yaml     # environment overrides
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl     # reusable template functions
│   └── NOTES.txt        # post-install instructions
└── charts/              # chart dependencies
    └── postgresql/
```

**Chart.yaml:**

```yaml
apiVersion: v2
name: payment-service
description: Payment microservice Helm chart
type: application
version: 1.4.2           # chart version (semver)
appVersion: "2.4.1"      # app version (your image tag)

dependencies:
- name: postgresql
  version: "13.2.0"
  repository: https://charts.bitnami.com/bitnami
  condition: postgresql.enabled       # enable/disable via values
```

**Essential Helm commands:**

```bash
# Install a chart
helm install payment ./my-chart -n production

# Upgrade (or install if not exists)
helm upgrade --install payment ./my-chart \
  -n production \
  -f values-prod.yaml \
  --set image.tag=v2.4.1 \
  --atomic \           # rollback on failure
  --timeout 5m

# List releases
helm list -n production

# Show rendered templates (dry run)
helm template payment ./my-chart -f values-prod.yaml

# Check history
helm history payment -n production

# Rollback
helm rollback payment 3 -n production   # rollback to revision 3
```

---

## 5. Helm Templating & Values Management

```yaml
# values.yaml (defaults)
replicaCount: 1

image:
  repository: myregistry/payment
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

postgresql:
  enabled: true
  auth:
    database: paymentdb
```

**templates/\_helpers.tpl — reusable functions:**

```yaml
{{/*  Chart name helper  */}}
{{- define "chart.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*  Fully qualified app name  */}}
{{- define "chart.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 }}
{{- end }}

{{/*  Common labels  */}}
{{- define "chart.labels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end }}
```

**templates/deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.port }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}

{{- if .Values.autoscaling.enabled }}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "chart.fullname" . }}
spec:
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
{{- end }}
```

**Environment-specific values:**

```yaml
# values-prod.yaml — overrides defaults
replicaCount: 3

image:
  tag: "v2.4.1"          # pinned, not latest

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
```

---

## 6. Kustomize Basics

Kustomize customizes Kubernetes manifests **without templating** — uses overlays and patches on plain YAML.

```
base/                          # environment-agnostic base
├── kustomization.yaml
├── deployment.yaml
├── service.yaml
└── configmap.yaml

overlays/
├── dev/
│   ├── kustomization.yaml     # patches for dev
│   └── replica-patch.yaml
├── staging/
│   ├── kustomization.yaml
│   └── resource-patch.yaml
└── prod/
    ├── kustomization.yaml
    └── hpa.yaml               # extra resources for prod
```

**base/kustomization.yaml:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- configmap.yaml

commonLabels:
  app: payment-service
  managed-by: kustomize

images:
- name: myregistry/payment
  newTag: v2.4.1              # image tag managed here
```

**overlays/prod/kustomization.yaml:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- ../../base              # include base
- hpa.yaml                # prod-only extra resources

patches:
- path: replica-patch.yaml

configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - LOG_LEVEL=warn
  - DB_POOL_SIZE=20
```

**overlays/prod/replica-patch.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 5                    # override base replicas
  template:
    spec:
      containers:
      - name: payment
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
```

**Helm vs Kustomize:**

| | Helm | Kustomize |
|---|---|---|
| **Approach** | Templating | Patching / Overlays |
| **Learning curve** | Steeper | Gentler |
| **Packaging** | Charts (versioned) | Plain YAML directories |
| **Logic** | Full (if/else/loops) | Minimal (patches only) |
| **K8s native** | External tool | Built into kubectl |
| **Best for** | Distributing apps | Environment overlays |

> **Best practice:** Use Helm to package the app, Kustomize to apply environment-specific overlays on top.

---

## 7. Application Deployment via GitOps

**Full GitOps deployment flow:**

```
┌────────────────────────────────────────────────────────┐
│                  Two-Repo Strategy                     │
│                                                        │
│  App Repo (source code)    Config Repo (manifests)     │
│  ├── src/                  ├── apps/                   │
│  ├── tests/                │   └── payment/            │
│  └── Dockerfile            │       ├── base/           │
│           │                │       └── overlays/       │
│           │ CI builds      │           ├── dev/        │
│           ▼                │           ├── staging/    │
│     Image Registry ───────►│           └── prod/       │
│     myregistry/payment:v2  │                ↑          │
│                            │    CI updates image tag   │
└────────────────────────────┴───────────────────────────┘
                                         ↓
                                   ArgoCD watches
                                   config repo →
                                   syncs cluster
```

**CI Pipeline (builds & updates manifests):**

```yaml
# .github/workflows/ci.yml
jobs:
  build-and-update:
    steps:
    # 1. Build and push image
    - name: Build & push
      run: |
        IMAGE=myregistry/payment:${{ github.sha }}
        docker build -t $IMAGE .
        docker push $IMAGE

    # 2. Scan image
    - name: Scan
      run: trivy image --exit-code 1 --severity CRITICAL $IMAGE

    # 3. Update config repo with new image tag
    - name: Update manifest
      run: |
        git clone https://github.com/org/gitops-config
        cd gitops-config

        # Kustomize approach
        cd apps/payment/overlays/dev
        kustomize edit set image myregistry/payment=$IMAGE

        # OR Helm approach
        sed -i "s/tag:.*/tag: ${{ github.sha }}/" values-dev.yaml

        git commit -am "chore: update payment to ${{ github.sha }}"
        git push
```

**ArgoCD then picks up the config repo change automatically.**

---

## 8. Automated Sync & Self-Healing

**Sync policy configuration:**

```yaml
spec:
  syncPolicy:
    automated:
      prune: true          # delete resources removed from Git
      selfHeal: true       # revert drift (manual kubectl changes)
      allowEmpty: false    # never sync empty state (safety)

    syncOptions:
    - Validate=true                    # validate against K8s schema
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - ApplyOutOfSyncOnly=true          # only apply changed resources

    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

**Self-healing in action:**

```
Git says:  replicas: 3
           image: payment:v2.4.1

Someone runs: kubectl scale deployment payment --replicas=1
              kubectl set image deployment payment payment:v2.5.0-hotfix

ArgoCD detects drift (within 3 minutes):
  - replicas: 1 ≠ 3         → DRIFT DETECTED
  - image: v2.5.0 ≠ v2.4.1 → DRIFT DETECTED

ArgoCD self-heals:
  → scales back to 3 replicas
  → reverts image to v2.4.1
  → sends Slack alert: "Drift detected & corrected"
```

**Sync waves for ordering:**

```yaml
# Deploy in waves — infra before apps
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"    # namespaces first

---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"    # CRDs second

---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"    # databases third

---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "3"    # applications last
```

---

## 9. GitOps Repository Structure Design

**Option A: Monorepo (all in one):**

```
gitops-repo/
├── apps/                          # application manifests
│   ├── payment-service/
│   │   ├── base/
│   │   └── overlays/
│   ├── order-service/
│   └── user-service/
├── infrastructure/                # platform components
│   ├── cert-manager/
│   ├── ingress-nginx/
│   ├── monitoring/
│   │   ├── prometheus/
│   │   └── grafana/
│   └── argocd/
│       └── applications/          # ArgoCD App definitions
└── clusters/                      # cluster-level config
    ├── prod-us-east/
    ├── prod-eu-west/
    └── staging/
```

**Option B: Multi-repo (separation of concerns):**

```
org/
├── app-configs/        # teams manage their own apps
│   ├── payment-team/
│   └── order-team/
├── platform-configs/   # platform team manages infra
│   ├── monitoring/
│   └── security/
└── cluster-configs/    # cluster-level bootstrapping
    ├── prod/
    └── staging/
```

**App-of-Apps pattern (ArgoCD bootstrap):**

```yaml
# clusters/prod/apps.yaml — one App to rule them all
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-apps
  namespace: argocd
spec:
  source:
    path: clusters/prod/applications   # folder with all App CRDs
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

# clusters/prod/applications/payment.yaml
# clusters/prod/applications/orders.yaml
# clusters/prod/applications/monitoring.yaml
# ← ArgoCD manages all of these automatically
```

---

## 10. Environment Promotion Strategy

**Ring-based promotion:**

```
Code Merge
    │
    ▼
┌────────┐    automated   ┌─────────┐   manual gate  ┌──────┐
│  dev   │ ─────────────► │ staging │ ─────────────► │ prod │
│        │                │         │                │      │
│ latest │                │ v2.4.1  │                │v2.4.1│
└────────┘                └─────────┘                └──────┘
    ↑                          ↑                         ↑
 auto-sync               auto-sync                   manual sync
 (every merge)          (on success)              (after approval)
```

**Image promotion via config repo:**

```bash
# Promotion script (runs in CI after staging tests pass)
promote() {
  ENV_FROM=$1    # staging
  ENV_TO=$2      # prod
  APP=$3         # payment-service

  # Get current tag in staging
  CURRENT_TAG=$(yq '.image.tag' apps/$APP/overlays/$ENV_FROM/values.yaml)

  # Update prod to same tag
  yq -i ".image.tag = \"$CURRENT_TAG\"" \
    apps/$APP/overlays/$ENV_TO/values.yaml

  git commit -am "promote($APP): $ENV_FROM→$ENV_TO @ $CURRENT_TAG"
  git push

  # Open PR for prod promotion (requires approval)
  gh pr create \
    --title "Promote $APP to prod: $CURRENT_TAG" \
    --body "Promoting from staging. All tests passed." \
    --base main
}
```

**Environment promotion gates:**

```yaml
# .github/workflows/promote.yml
jobs:
  integration-tests:
    environment: staging
    steps:
    - run: ./scripts/run-integration-tests.sh

  promote-to-prod:
    needs: integration-tests
    environment:
      name: production
      url: https://prod.myapp.com
    # ← GitHub requires manual approval here
    steps:
    - run: ./scripts/promote.sh staging prod payment-service
```

---

## 11. Drift Detection & Reconciliation

**Types of drift:**

```
Configuration Drift:
  Git: replicas: 3         Cluster: replicas: 1     ← manual scale
  Git: image: v2.4.1       Cluster: image: v2.5.0   ← hotfix applied

Resource Drift:
  Git: (no ConfigMap)      Cluster: ConfigMap exists ← manually created

Spec Drift:
  Git: cpu limit: 500m     Cluster: cpu limit: 2000m ← manually patched
```

**ArgoCD drift detection:**

```
Every 3 minutes (default), ArgoCD:

1. Fetches desired state from Git
2. Fetches actual state from Kubernetes API
3. Computes diff
4. Reports health status:
   - Synced    ✅ = Git matches cluster
   - OutOfSync ⚠️  = drift detected
   - Degraded  ❌ = resources unhealthy

With selfHeal: true → automatically reconciles
With selfHeal: false → alerts only, human decides
```

**Custom health checks:**

```lua
-- argocd-cm ConfigMap: custom health check for CRD
hs = {}
if obj.status ~= nil then
  if obj.status.phase == "Running" then
    hs.status = "Healthy"
    hs.message = "Application is running"
    return hs
  end
  if obj.status.phase == "Failed" then
    hs.status = "Degraded"
    hs.message = obj.status.message
    return hs
  end
end
hs.status = "Progressing"
return hs
```

**Drift alerts with notifications:**

```yaml
# argocd-notifications-cm
triggers:
  - name: on-sync-failed
    condition: app.status.sync.status == 'OutOfSync'
    template: app-sync-failed

templates:
  - name: app-sync-failed
    slack:
      attachments: |
        [{
          "title": "⚠️ Drift Detected: {{.app.metadata.name}}",
          "color": "#E96D76",
          "text": "App is OutOfSync with Git\nEnv: {{.app.spec.destination.namespace}}"
        }]
```

---

## 12. Secret Management in GitOps

**Never store plaintext secrets in Git.** Use one of these patterns:

**Pattern 1: Sealed Secrets (Bitnami):**

```bash
# Encrypt secret with cluster's public key
kubectl create secret generic db-creds \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-creds.yaml
# ← this encrypted file IS safe to commit to Git

# ArgoCD deploys SealedSecret → controller decrypts → creates Secret
```

```yaml
# sealed-db-creds.yaml (safe to commit)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-creds
spec:
  encryptedData:
    password: AgBDx7mF...   # encrypted, only cluster can decrypt
```

**Pattern 2: External Secrets Operator (recommended for production):**

```yaml
# ExternalSecret — defines WHERE to fetch, not the value
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h

  secretStoreRef:
    name: aws-secrets-manager    # points to SecretStore
    kind: ClusterSecretStore

  target:
    name: db-creds               # creates this K8s Secret
    creationPolicy: Owner

  data:
  - secretKey: password          # K8s Secret key
    remoteRef:
      key: prod/payment/db       # AWS Secrets Manager path
      property: password
```

```yaml
# ClusterSecretStore — connects to AWS
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        serviceAccount:
          name: external-secrets-sa   # IRSA
```

**Pattern 3: HashiCorp Vault + Vault Agent:**

```yaml
# Vault injects secrets as files/env vars at pod startup
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "payment-service"
  vault.hashicorp.com/agent-inject-secret-db: "secret/payment/db"
  vault.hashicorp.com/agent-inject-template-db: |
    {{- with secret "secret/payment/db" -}}
    export DB_PASSWORD="{{ .Data.data.password }}"
    {{- end }}
```

**Secret management comparison:**

| Tool | Storage | Rotation | Complexity |
|---|---|---|---|
| **Sealed Secrets** | Git (encrypted) | Manual | Low |
| **External Secrets** | AWS/GCP/Vault | Automatic | Medium |
| **Vault Agent** | Vault | Automatic | High |
| **SOPS** | Git (encrypted) | Manual | Low |

---

## 13. Rollback Strategies in GitOps

**In GitOps, rollback = reverting Git, not running a command.**

**Strategy 1: Git revert (preferred — keeps history):**

```bash
# Revert last commit in config repo
git revert HEAD --no-edit
git push origin main
# ArgoCD detects change → rolls back cluster automatically

# Revert specific commit
git revert abc1234 --no-edit
git push
```

**Strategy 2: Git reset (rewrites history — use carefully):**

```bash
git reset --hard v2.3.0-tag
git push --force-with-lease origin main
```

**Strategy 3: ArgoCD UI/CLI rollback:**

```bash
# Roll back to previous sync (without changing Git)
argocd app rollback payment-service 5   # rollback to history ID 5

# ⚠️ This creates DRIFT (cluster ≠ Git)
# selfHeal will re-apply Git state on next sync
# So immediately update Git too!
```

**Automated rollback on health check failure:**

```yaml
# ArgoCD with progressive delivery (Argo Rollouts)
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
      - setWeight: 10          # 10% traffic to new version
      - pause: {duration: 5m}
      - analysis:              # run metrics analysis
          templates:
          - templateName: success-rate
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 100

  analysis:                    # auto-rollback if error rate spikes
    successCondition: result[0] >= 0.95
    failureLimit: 3
```

**Rollback decision tree:**

```
Production incident detected
         │
         ▼
Is it a code bug?
  Yes → git revert in app repo → CI rebuilds → update config repo
  No  → Is it a config change?
          Yes → git revert in config repo → ArgoCD auto-syncs
          No  → Is it infra?
                  Yes → Terraform rollback (state + code)
```

---

## 14. Multi-Cluster Deployment Patterns

**ArgoCD managing multiple clusters:**

```yaml
# Register external cluster
argocd cluster add prod-us-east --name prod-us-east
argocd cluster add prod-eu-west --name prod-eu-west
argocd cluster add staging --name staging

# ApplicationSet — deploy to multiple clusters from one definition
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: payment-service-all-clusters
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          environment: production    # targets all prod clusters

  template:
    metadata:
      name: "payment-{{name}}"      # payment-prod-us-east, etc.
    spec:
      source:
        repoURL: https://github.com/org/gitops-config
        path: "apps/payment/overlays/{{metadata.labels.region}}"
      destination:
        server: "{{server}}"        # each cluster's API endpoint
        namespace: production
```

**Multi-cluster repository structure:**

```
gitops-config/
├── clusters/
│   ├── prod-us-east-1/
│   │   ├── cluster-config.yaml     # cluster-level settings
│   │   └── applications/           # apps for this cluster
│   ├── prod-eu-west-1/
│   │   ├── cluster-config.yaml
│   │   └── applications/
│   └── staging/
│       └── applications/
└── apps/
    └── payment/
        ├── base/
        └── overlays/
            ├── us-east/            # region-specific config
            └── eu-west/
```

**Hub-and-Spoke ArgoCD topology:**

```
┌────────────────────────────────────────────┐
│            Management Cluster              │
│         (ArgoCD Hub — never runs apps)     │
│                                            │
│   ┌────────────────────────────────────┐   │
│   │          ArgoCD Control Plane      │   │
│   └──┬──────────────┬──────────────┬───┘   │
└──────┼──────────────┼──────────────┼───────┘
       │              │              │
       ▼              ▼              ▼
  prod-us-east   prod-eu-west    staging
  (workload)     (workload)      (workload)
```

---

## 15. Observability in GitOps Workflows

**Four layers of GitOps observability:**

```
┌────────────────────────────────────────────────┐
│  Layer 1: Git Activity                         │
│  Who changed what, when, PR approvals          │
├────────────────────────────────────────────────┤
│  Layer 2: Sync & Deployment Events             │
│  ArgoCD sync status, history, drift alerts     │
├────────────────────────────────────────────────┤
│  Layer 3: Application Health                   │
│  Pod health, rollout progress, HPA activity    │
├────────────────────────────────────────────────┤
│  Layer 4: Business Metrics                     │
│  Error rates, latency, success rates           │
└────────────────────────────────────────────────┘
```

**ArgoCD metrics (Prometheus):**

```yaml
# Key ArgoCD metrics to alert on
argocd_app_sync_total                    # sync frequency
argocd_app_health_status                 # 0=healthy, 1=degraded
argocd_app_sync_status                   # synced vs out-of-sync
argocd_kubectl_exec_pending              # stuck operations

# Grafana alert: app out of sync > 10 minutes
- alert: ArgoCDAppOutOfSync
  expr: |
    argocd_app_sync_status{sync_status="OutOfSync"} == 1
  for: 10m
  annotations:
    summary: "App {{ $labels.name }} is out of sync"
```

**DORA metrics for GitOps:**

```
Deployment Frequency:
  → Count of ArgoCD successful syncs per day
  → target: multiple times per day (Elite)

Lead Time for Changes:
  → Time from git commit to ArgoCD sync complete
  → target: < 1 hour (Elite)

Change Failure Rate:
  → Syncs followed by rollback within 1 hour
  → target: < 5% (Elite)

Mean Time to Recovery (MTTR):
  → Time from degraded alert to healthy sync
  → target: < 1 hour (Elite)
```

**Full observability stack:**

```yaml
# Notification channels for GitOps events
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token

  trigger.on-deployed: |
    - description: Notify on successful sync
      send: [app-deployed]
      when: app.status.sync.status == 'Synced'

  trigger.on-degraded: |
    - description: Notify on degraded health
      send: [app-degraded]
      when: app.status.health.status == 'Degraded'

  template.app-deployed: |
    slack:
      text: |
        ✅ *{{.app.metadata.name}}* deployed successfully
        Revision: {{.app.status.sync.revision}}
        Namespace: {{.app.spec.destination.namespace}}

  template.app-degraded: |
    slack:
      text: |
        🔴 *{{.app.metadata.name}}* is DEGRADED
        Message: {{.app.status.health.message}}
        Action: <https://argocd.company.com/app/{{.app.metadata.name}}|View in ArgoCD>
```

---

## Summary: Production GitOps Architecture

```
Developer commits code
         │
         ▼
  App Repo CI (GitHub Actions)
  ├── Build & push image
  ├── Scan (Trivy)
  ├── Test (unit + integration)
  └── Update config repo (image tag)
         │
         ▼
  Config Repo (GitOps truth)
  ├── PR opened → peer review
  ├── Policy check (Conftest/OPA)
  ├── Merged to main
         │
         ▼
  ArgoCD detects change (poll/webhook)
  ├── Computes diff (Git vs cluster)
  ├── Sync wave ordering
  ├── Progressive delivery (canary %)
  ├── Health checks
  └── Auto-rollback if degraded
         │
         ▼
  Cluster Updated ✅
  ├── Prometheus scrapes metrics
  ├── Grafana dashboards updated
  ├── Slack notification sent
  └── DORA metrics recorded
```

GitOps mastery = **Git as truth + ArgoCD reconciliation + secret management + drift detection + multi-cluster + full observability**. These 15 concepts form the complete production GitOps playbook.
