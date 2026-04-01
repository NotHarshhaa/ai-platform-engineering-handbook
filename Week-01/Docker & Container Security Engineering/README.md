# Docker & Container Security Engineering

---

## 1. Containerization Fundamentals

Containers package your app + dependencies into an **isolated, portable unit** that runs consistently anywhere.

**How containers work under the hood:**

```
┌─────────────────────────────────────┐
│           Your Application          │
├─────────────────────────────────────┤
│         Container Runtime           │
├──────────────┬──────────────────────┤
│  Namespaces  │    cgroups           │
│  (isolation) │  (resource limits)   │
├──────────────┴──────────────────────┤
│            Host OS Kernel           │
└─────────────────────────────────────┘
```

| Linux Primitive | What it isolates |
|---|---|
| **Namespaces** | PID, network, mount, UTS, IPC, user |
| **cgroups** | CPU, memory, disk I/O limits |
| **Union FS** | Layered filesystem (OverlayFS) |
| **Seccomp** | Restricts syscalls a container can make |

**Containers vs VMs:**

```
VMs:         App | App | App
             OS  | OS  | OS       ← full OS per VM (heavy)
             Hypervisor
             Host OS

Containers:  App | App | App
             Libs| Libs| Libs     ← shared kernel (lightweight)
             Container Runtime
             Host OS Kernel
```

---

## 2. Dockerfile Best Practices

```dockerfile
# ✅ GOOD Dockerfile

# 1. Pin exact versions — never use :latest
FROM node:20.11-alpine3.19

# 2. Set working directory explicitly
WORKDIR /app

# 3. Copy dependency files FIRST (cache optimization)
COPY package*.json ./

# 4. Install deps before copying source code
RUN npm ci --only=production

# 5. Copy source after deps (cache hit on unchanged deps)
COPY src/ ./src/

# 6. Drop to non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 7. Declare port (documentation + tooling)
EXPOSE 3000

# 8. Use exec form (no shell, direct signal handling)
CMD ["node", "src/index.js"]
```

**Common mistakes to avoid:**

| ❌ Bad | ✅ Good |
|---|---|
| `FROM ubuntu:latest` | `FROM ubuntu:22.04` |
| `RUN apt-get update && apt-get install curl vim git...` | Install only what's needed |
| `COPY . .` as first step | Copy deps first, then source |
| Running as root | Always `USER nonroot` |
| Secrets in ENV vars | Use build secrets or runtime injection |
| No `.dockerignore` | Always add `.dockerignore` |

**.dockerignore (always include):**
```
.git
node_modules
*.log
.env
.env.*
Dockerfile*
README.md
tests/
```

---

## 3. Multi-Stage Builds

Separates **build environment** from **runtime environment** — drastically reduces image size and attack surface.

```dockerfile
# ─── Stage 1: Builder ───────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o app ./cmd/main.go

# ─── Stage 2: Runtime (tiny final image) ────────────
FROM gcr.io/distroless/static-debian12

WORKDIR /app

# Copy ONLY the compiled binary from builder
COPY --from=builder /build/app .

USER nonroot:nonroot
CMD ["/app/app"]
```

**Size comparison (Go app example):**
```
golang:1.22 full image    →  800MB
With builder only         →  800MB
With multi-stage          →  8MB    ← 99% smaller!
```

**Multi-stage for Node.js:**
```dockerfile
# Stage 1: Install & build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
```

---

## 4. Image Layer Optimization

Every `RUN`, `COPY`, `ADD` instruction creates a **new layer**. Layers are cached and reused.

```
Image = Stack of read-only layers + thin writable layer on top

Layer 5: COPY src/ ./        ← changes often
Layer 4: RUN npm ci          ← changes when package.json changes
Layer 3: COPY package*.json  ← rarely changes
Layer 2: WORKDIR /app
Layer 1: FROM node:20-alpine ← base (almost never changes)
```

**Key optimization rules:**

```dockerfile
# ❌ BAD — separate RUN = separate layers + cache busting
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN rm -rf /var/lib/apt/lists/*

# ✅ GOOD — chain with && = single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      git && \
    rm -rf /var/lib/apt/lists/*   # clean up in SAME layer!
```

**Layer cache strategy:**
```
Least changing ──────────────────► Most changing
     ↓                                   ↓
Base image → System deps → App deps → Source code
```

> Cleaning up (`rm -rf /var/cache`) only works if done **in the same RUN** as installation. A separate cleanup layer doesn't reduce size.

---

## 5. Distroless & Minimal Base Images

**The less in the image, the smaller the attack surface.**

```
Image Size & Attack Surface Comparison:

ubuntu:22.04          →  77MB   | Full OS, shell, package manager
debian:slim           →  74MB   | Slimmed debian
alpine:3.19           →  7MB    | Musl libc, busybox shell
gcr.io/distroless/*   →  2-20MB | No shell, no package manager
scratch               →  0MB    | Completely empty
```

**Distroless images (by Google):**
```dockerfile
# For Java
FROM gcr.io/distroless/java21-debian12

# For Python
FROM gcr.io/distroless/python3-debian12

# For static Go/Rust binaries
FROM gcr.io/distroless/static-debian12

# For C/C++
FROM gcr.io/distroless/cc-debian12
```

**Why distroless is powerful for security:**

| Feature | Alpine | Distroless |
|---|---|---|
| Shell (sh/bash) | ✅ Yes | ❌ No |
| Package manager | ✅ Yes | ❌ No |
| Attack surface | Low | Minimal |
| Debugging | Easy | Hard (use debug variant) |
| CVE exposure | Low | Very Low |

**Debugging distroless (use debug variant temporarily):**
```bash
# Debug variant has busybox shell
docker run --rm -it gcr.io/distroless/static-debian12:debug sh
```

---

## 6. Non-Root Containers

By default, containers run as **root (UID 0)** — a major security risk. If an attacker escapes the container, they're root on the host.

```dockerfile
# ── Dockerfile ──────────────────────────────────────

# Alpine — create system user
RUN addgroup -S appgroup && \
    adduser -S -G appgroup -u 1001 appuser

# Debian/Ubuntu — create system user  
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup \
            --shell /bin/false --no-create-home appuser

# Set ownership
COPY --chown=appuser:appgroup . .

# Switch to non-root
USER appuser
```

**Enforce non-root in Kubernetes:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true    # extra hardening
  capabilities:
    drop: ["ALL"]                 # drop all Linux capabilities
```

**File permission pattern:**
```dockerfile
# App owns its files, not root
RUN chown -R appuser:appgroup /app && \
    chmod -R 550 /app              # read + execute only
```

---

## 7. Health Checks in Containers

Health checks tell Docker/K8s whether your container is actually working.

```dockerfile
# Dockerfile HEALTHCHECK
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=15s \
            --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

**Health check types:**

```dockerfile
# HTTP check
HEALTHCHECK CMD curl -f http://localhost:8080/health

# TCP check
HEALTHCHECK CMD nc -z localhost 5432

# Custom script
HEALTHCHECK CMD /app/scripts/healthcheck.sh

# No health check (override parent image)
HEALTHCHECK NONE
```

**What a good /health endpoint returns:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "cache": "ok",
    "disk": "ok"
  }
}
```

**In Docker Compose:**
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## 8. Container Networking Basics

```
Docker Network Types:

bridge (default)  → containers talk via virtual switch
                    NAT to host network
                    isolated from host

host              → container shares host network stack
                    no isolation, max performance

none              → no networking at all
                    fully isolated

overlay           → multi-host networking (Docker Swarm/K8s)

macvlan           → container gets its own MAC/IP on LAN
```

**Bridge network (most common):**
```bash
# Create isolated network
docker network create --driver bridge app-network

# Containers on same network resolve by name
docker run --network app-network --name db postgres
docker run --network app-network --name api my-api
# api container can reach db via: http://db:5432
```

**Network isolation in Compose:**
```yaml
services:
  frontend:
    networks: [public]          # only on public network

  backend:
    networks: [public, private] # bridges both

  database:
    networks: [private]         # only reachable from backend!

networks:
  public:
  private:
    internal: true              # no external access
```

---

## 9. Docker Compose for Multi-Service Apps

```yaml
# docker-compose.yml — Production-grade example

version: "3.9"

services:
  # ── API Service ──────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner           # multi-stage target
    image: my-api:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: postgres        # resolved by service name
    env_file: .env.production  # secrets from file
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy   # wait for DB ready
    networks: [backend]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M

  # ── Database ─────────────────────────────────
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser"]
      interval: 10s
      retries: 5

volumes:
  pgdata:

networks:
  backend:
    internal: true

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## 10. Container Image Scanning

Scans images for **known CVEs** in OS packages and language dependencies.

**Popular scanners:**

```bash
# Trivy (most popular, free)
trivy image myapp:latest
trivy image --severity HIGH,CRITICAL myapp:latest
trivy image --exit-code 1 --severity CRITICAL myapp:latest  # fail CI on critical

# Grype (Anchore)
grype myapp:latest

# Docker Scout (built into Docker)
docker scout cves myapp:latest
docker scout recommendations myapp:latest

# Snyk
snyk container test myapp:latest
```

**Trivy output example:**
```
myapp:latest (alpine 3.19)
┌──────────────┬─────────┬──────────┬─────────────────────┐
│   Library    │   CVE   │ Severity │     Fixed Version   │
├──────────────┼─────────┼──────────┼─────────────────────┤
│ openssl      │ CVE-xxx │ CRITICAL │ 3.1.5-r0            │
│ libcurl      │ CVE-yyy │ HIGH     │ 8.5.0-r0            │
└──────────────┴─────────┴──────────┴─────────────────────┘
```

**In CI/CD Pipeline:**
```yaml
# GitHub Actions
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1          # block merge on critical CVEs
```

---

## 11. Software Bill of Materials (SBOM)

An **SBOM** is a complete inventory of every component in your image — like a nutrition label for software.

```
SBOM contains:
├── OS packages (alpine-baselayout 3.4.3)
├── Language packages (express 4.18.2)
├── Transitive dependencies (lodash 4.17.21)
├── Licenses (MIT, Apache-2.0, GPL-3.0)
└── CVE cross-reference per component
```

**Generate SBOM:**
```bash
# Using Syft (best SBOM generator)
syft myapp:latest -o spdx-json > sbom.spdx.json
syft myapp:latest -o cyclonedx-json > sbom.cyclonedx.json

# Using Docker buildx
docker buildx build --sbom=true -t myapp:latest .

# Using Trivy
trivy image --format spdx-json myapp:latest > sbom.json
```

**SBOM formats:**

| Format | Standard Body | Use Case |
|---|---|---|
| **SPDX** | Linux Foundation | Open source compliance |
| **CycloneDX** | OWASP | Security-focused |
| **SWID** | ISO/IEC | Enterprise |

> Increasingly **required by law** — US Executive Order 14028 mandates SBOMs for software sold to federal agencies.

---

## 12. Image Signing & Verification

Ensures the image you pull is **exactly what was published** — not tampered with.

```
Developer builds image
       ↓
Signs with private key  (Cosign / Notary)
       ↓
Pushes image + signature to registry
       ↓
Consumer verifies with public key before pulling
       ↓
Rejected if signature invalid or missing
```

**Cosign (industry standard):**
```bash
# Generate key pair
cosign generate-key-pair

# Sign image (after pushing to registry)
cosign sign --key cosign.key myregistry.io/myapp:latest

# Verify before deploying
cosign verify --key cosign.pub myregistry.io/myapp:latest

# Keyless signing (using OIDC — no key management)
cosign sign myregistry.io/myapp:latest  # uses GitHub/GCP identity
```

**Enforce in Kubernetes with Policy Controller:**
```yaml
# Only allow signed images from trusted registry
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
spec:
  images:
  - glob: "myregistry.io/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...
```

---

## 13. Secure Registry Practices

Your container registry is a **critical piece of supply chain security**.

**Registry security checklist:**

```
Authentication & Authorization
├── ✅ Enable authentication (no anonymous pulls in prod)
├── ✅ Use RBAC — devs push, CI/CD pushes, K8s only pulls
├── ✅ Use short-lived tokens, not static passwords
└── ✅ Rotate credentials regularly

Image Hygiene
├── ✅ Enable vulnerability scanning on push (ECR, GCR, Harbor)
├── ✅ Set retention policies — delete old/untagged images
├── ✅ Use immutable tags — never overwrite :v1.2.3
├── ✅ Use digest pinning in production
└── ✅ Enforce image signing policy

Network
├── ✅ Private registry — no public internet exposure
├── ✅ TLS only — no plain HTTP
└── ✅ VPC/VNet endpoint for K8s pulls
```

**Digest pinning (most secure):**
```dockerfile
# Tag — can be overwritten, not safe
FROM node:20-alpine

# Digest — cryptographically pinned, immutable ✅
FROM node:20-alpine@sha256:a9c3e28f2c9f0b0d8c4a1b7e6d...
```

**Self-hosted option — Harbor:**
```yaml
# Harbor gives you:
# - Vulnerability scanning (Trivy built-in)
# - Image signing (Notary)
# - RBAC
# - Replication
# - Audit logs
```

---

## 14. Runtime Container Security

Securing containers **while they're running** — last line of defense.

**Seccomp (syscall filtering):**
```yaml
# Kubernetes — use runtime/default seccomp profile
securityContext:
  seccompProfile:
    type: RuntimeDefault   # blocks 300+ dangerous syscalls
```

**AppArmor (mandatory access control):**
```bash
# Apply AppArmor profile to container
docker run --security-opt apparmor=docker-default myapp
```

**Read-only filesystem:**
```yaml
securityContext:
  readOnlyRootFilesystem: true   # container can't write to /

# Allow specific writable paths via volumes
volumeMounts:
- name: tmp
  mountPath: /tmp
- name: logs
  mountPath: /app/logs
volumes:
- name: tmp
  emptyDir: {}
```

**Runtime threat detection — Falco:**
```
Falco watches kernel events and alerts on:
├── Shell spawned inside container       → likely intrusion
├── Sensitive file read (/etc/shadow)    → credential theft attempt  
├── Network tool executed (nmap, curl)   → reconnaissance
├── Privilege escalation attempt         → exploit attempt
└── Container drift (new binary created) → supply chain attack
```

```yaml
# Falco rule example
- rule: Shell in Container
  desc: Shell spawned in a container
  condition: >
    spawned_process and container
    and shell_procs
  output: "Shell in container (user=%user.name container=%container.name)"
  priority: WARNING
```

**Complete runtime security stack:**
```
Prevention Layer:    Non-root + read-only FS + dropped capabilities
Detection Layer:     Falco runtime monitoring
Network Layer:       K8s NetworkPolicy (deny all, allow explicit)
Scanning Layer:      Trivy in CI + registry scanning
Policy Layer:        OPA Gatekeeper / Kyverno admission control
```

---

## Summary: Security Hardening Checklist

```
Build Time
├── ✅ Pin base image versions & digests
├── ✅ Multi-stage builds
├── ✅ Minimal/distroless base images
├── ✅ No secrets in Dockerfile or layers
├── ✅ Scan image for CVEs (Trivy)
└── ✅ Generate & attest SBOM

Runtime
├── ✅ Non-root user
├── ✅ Read-only root filesystem
├── ✅ Drop all Linux capabilities
├── ✅ Seccomp & AppArmor profiles
├── ✅ Resource limits (CPU + memory)
└── ✅ Liveness + readiness probes

Registry & Supply Chain
├── ✅ Sign images (Cosign)
├── ✅ Verify signatures before deploy
├── ✅ Immutable tags + digest pinning
├── ✅ Private registry with RBAC
└── ✅ Continuous CVE monitoring
```

This is the **complete security engineering mindset** for containers — security at every layer from build to runtime.
