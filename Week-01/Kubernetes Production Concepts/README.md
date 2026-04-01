# Kubernetes Production Concepts

---

## 1. Kubernetes Architecture Overview

Kubernetes follows a **master-worker architecture**. The cluster is split into two planes:

- **Control Plane** — the brain; manages the cluster state
- **Worker Nodes** — the muscle; run your actual application workloads

```
┌─────────────────────────────────────────────────────┐
│                   CONTROL PLANE                     │
│  API Server → etcd → Scheduler → Controller Manager │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   Worker Node   Worker Node   Worker Node
   (kubelet +    (kubelet +    (kubelet +
    kube-proxy)   kube-proxy)   kube-proxy)
```

---

## 2. Control Plane Components

| Component | Role |
|---|---|
| **API Server** | Front door of K8s; all communication goes through it |
| **etcd** | Distributed key-value store; stores all cluster state |
| **Scheduler** | Assigns pods to nodes based on resources & constraints |
| **Controller Manager** | Runs controllers (ReplicaSet, Node, Job, etc.) |
| **Cloud Controller Manager** | Integrates with cloud provider (AWS, GCP, Azure) |

> In production, the control plane is **replicated across 3+ nodes** for high availability.

---

## 3. Worker Node Components

| Component | Role |
|---|---|
| **kubelet** | Agent on each node; ensures containers are running |
| **kube-proxy** | Manages network rules for pod-to-pod communication |
| **Container Runtime** | Runs containers (containerd, CRI-O) |

```
Worker Node
├── kubelet          ← talks to API server
├── kube-proxy       ← manages iptables/IPVS rules
├── containerd       ← runs containers
└── Pods             ← your apps live here
```

---

## 4. Pod Lifecycle

A Pod goes through these phases:

```
Pending → Running → Succeeded
                 ↘ Failed
                 ↘ Unknown
```

| Phase | Meaning |
|---|---|
| **Pending** | Scheduled but containers not started yet |
| **Running** | At least one container is running |
| **Succeeded** | All containers exited with code 0 |
| **Failed** | At least one container exited with non-zero code |
| **Unknown** | Node communication lost |

Container states within a pod: `Waiting → Running → Terminated`

> Pods are **ephemeral** — never rely on a pod's IP or existence. Use Deployments + Services instead.

---

## 5. Deployments & ReplicaSets

**ReplicaSet** ensures N copies of a pod are always running.
**Deployment** manages ReplicaSets and adds rolling update + rollback capability.

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3              # ReplicaSet keeps 3 pods alive
  strategy:
    type: RollingUpdate
  template:
    spec:
      containers:
      - name: app
        image: my-app:v2
```

```
Deployment
  └── ReplicaSet (v2)   ← active
        ├── Pod
        ├── Pod
        └── Pod
  └── ReplicaSet (v1)   ← scaled to 0 (kept for rollback)
```

---

## 6. Services & Service Types

Services give pods a **stable network identity** regardless of pod restarts.

| Type | Use Case |
|---|---|
| **ClusterIP** | Internal only; default; pod-to-pod communication |
| **NodePort** | Exposes on each node's IP at a static port (30000–32767) |
| **LoadBalancer** | Provisions cloud load balancer; production external traffic |
| **ExternalName** | Maps service to an external DNS name |

```
Internet → LoadBalancer → NodePort → ClusterIP → Pod
```

Services use **label selectors** to find pods:
```yaml
selector:
  app: my-app     # routes traffic to all pods with this label
```

---

## 7. ConfigMaps & Secrets

Both decouple configuration from container images.

| | **ConfigMap** | **Secret** |
|---|---|---|
| **Stores** | Non-sensitive config (env vars, config files) | Sensitive data (passwords, tokens, certs) |
| **Encoding** | Plain text | Base64 encoded |
| **Encryption** | No | Optional (at-rest with KMS) |

```yaml
# ConfigMap usage
envFrom:
  - configMapRef:
      name: app-config

# Secret usage
envFrom:
  - secretRef:
      name: app-secrets
```

> In production, use **external secret managers** (AWS Secrets Manager, Vault) instead of raw K8s Secrets.

---

## 8. Resource Requests & Limits

```yaml
resources:
  requests:
    cpu: "250m"      # guaranteed minimum (scheduler uses this)
    memory: "256Mi"
  limits:
    cpu: "500m"      # hard ceiling
    memory: "512Mi"  # exceeding this → OOMKilled
```

| | **Requests** | **Limits** |
|---|---|---|
| **Purpose** | Scheduling guarantee | Hard ceiling |
| **CPU breach** | — | Throttled |
| **Memory breach** | — | Pod killed (OOMKilled) |

> Always set both in production. Pods without requests get **BestEffort** QoS — first to be evicted under pressure.

---

## 9. Liveness & Readiness Probes

```yaml
livenessProbe:       # Is the container alive? Restart if not.
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5

readinessProbe:      # Is the container ready to serve traffic?
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 3
```

| Probe | Failure Action | Use For |
|---|---|---|
| **Liveness** | Restart the container | Detecting deadlocks/crashes |
| **Readiness** | Remove from Service endpoints | App still warming up / temporarily busy |
| **Startup** | Restart (only during startup) | Slow-starting apps |

---

## 10. Horizontal Pod Autoscaler (HPA)

Automatically scales pod count based on metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    name: my-deployment
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70   # scale up if CPU > 70%
```

```
Low traffic  → 2 pods
Spike        → HPA triggers → scales to 10 pods
Traffic drops → scales back down to 2
```

> HPA requires **metrics-server** installed in the cluster. For custom metrics, use Prometheus + KEDA.

---

## 11. Rolling Updates & Rollbacks

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1          # max extra pods during update
    maxUnavailable: 0    # never kill old pod before new one is ready
```

**Update flow:**
```
v1 v1 v1          # start
v1 v1 v1 v2       # surge: new pod added
v1 v1 v2          # old pod removed
...
v2 v2 v2          # complete
```

**Rollback instantly:**
```bash
kubectl rollout undo deployment/my-app
kubectl rollout undo deployment/my-app --to-revision=3
```

---

## 12. Namespaces & Multi-Tenancy

Namespaces provide **logical isolation** within a cluster.

```
cluster
├── namespace: production
├── namespace: staging
├── namespace: dev
└── namespace: monitoring
```

```bash
kubectl get pods -n production
kubectl create namespace staging
```

Used with **ResourceQuotas** to limit resource consumption per team:
```yaml
kind: ResourceQuota
spec:
  hard:
    pods: "50"
    requests.cpu: "10"
    limits.memory: "20Gi"
```

---

## 13. RBAC & Access Control

**Role-Based Access Control** — who can do what to which resources.

```
Subject (User/ServiceAccount)
  → RoleBinding
    → Role (namespaced) or ClusterRole (cluster-wide)
      → Rules (verbs on resources)
```

```yaml
kind: Role
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update"]   # can view & update deployments
---
kind: RoleBinding
subjects:
- kind: User
  name: dev-alice
roleRef:
  kind: Role
  name: deployment-editor
```

> In production: use **ServiceAccounts** for pods, apply **least privilege**, audit regularly.

---

## 14. Persistent Volumes & Storage Classes

```
StorageClass → PersistentVolume (PV) → PersistentVolumeClaim (PVC) → Pod
```

| Object | Role |
|---|---|
| **StorageClass** | Defines the type of storage (SSD, HDD, cloud disk) |
| **PersistentVolume** | Actual storage provisioned (manually or dynamically) |
| **PVC** | Pod's request for storage — binds to a PV |

```yaml
kind: PersistentVolumeClaim
spec:
  storageClassName: gp3        # AWS EBS SSD
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
```

Access modes: `ReadWriteOnce` (one node), `ReadOnlyMany`, `ReadWriteMany` (e.g., NFS/EFS)

---

## 15. StatefulSets vs Deployments

| | **Deployment** | **StatefulSet** |
|---|---|---|
| **Pod identity** | Random names (pod-xk2jf) | Stable names (pod-0, pod-1) |
| **Storage** | Shared or none | Each pod gets its own PVC |
| **Scaling order** | Parallel | Ordered (0, 1, 2...) |
| **Use for** | Stateless apps (APIs, web) | Stateful apps (DBs, Kafka, Zookeeper) |

```
Deployment pods:  app-7d9f4-xk2j, app-7d9f4-mn3p  ← random, interchangeable
StatefulSet pods: mysql-0, mysql-1, mysql-2         ← stable, ordered identity
```

---

## 16. Kubernetes Networking Basics

K8s networking follows **4 fundamental rules:**
1. Every pod gets its own IP
2. Pods can talk to any other pod without NAT
3. Nodes can talk to pods without NAT
4. A pod's self-IP is the same as what others see

```
Pod ←──────────────────→ Pod        (via CNI: Calico, Flannel, Cilium)
Pod ←──── Service ──────→ Clients   (via kube-proxy / iptables)
External ←─ Ingress ────→ Services  (Layer 7 routing, TLS termination)
```

| Layer | Tool |
|---|---|
| **Pod networking** | CNI plugin (Calico, Cilium, Flannel) |
| **Service discovery** | CoreDNS (`my-svc.my-ns.svc.cluster.local`) |
| **Ingress (L7)** | Nginx Ingress, Traefik, AWS ALB |
| **Network Policy** | Restrict pod-to-pod traffic (like firewall rules) |

---

These 16 concepts form the **core foundation** of running Kubernetes in production. Master these and you can confidently deploy, scale, secure, and debug real-world K8s workloads.
