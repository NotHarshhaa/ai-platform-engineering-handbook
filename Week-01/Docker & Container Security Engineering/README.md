# Docker & Container Security Engineering

---

## 1. Containerization Fundamentals

Before containers existed, deploying software was genuinely painful in ways that are hard to appreciate if you haven't lived through it. You'd write an application on your laptop, running Python 3.9 with specific library versions on macOS. The staging server runs Python 3.7 on Ubuntu. Production runs Python 3.8 on CentOS. Each environment has different library versions installed, different system dependencies, different file paths, different environment variables. Your application works perfectly on your laptop and mysteriously breaks in production. The phrase "it works on my machine" became a running joke in the industry because it was so universally true and so universally frustrating.

Virtual machines were the first attempt at solving this. You package the entire operating system along with your application into a VM image. Now you have consistency — the VM is the same everywhere. But VMs are heavy. They include a full OS kernel, gigabytes of operating system files, and take minutes to start. Running 50 services means running 50 full VMs, each with its own OS consuming gigabytes of RAM just for the operating system overhead. This is expensive and slow.

Containers solve the same problem as VMs — application isolation and consistency — but with a fundamentally different approach. Instead of virtualizing the hardware and running separate OS kernels, containers share the host machine's OS kernel and use Linux kernel features to create isolated environments for each application.

The two key Linux kernel features that make containers work are namespaces and cgroups.

**Namespaces** provide isolation. Linux has several types of namespaces, each isolating a different aspect of the system. The PID namespace means processes inside a container can only see their own processes — the container thinks it's the only thing running on the machine, unaware of thousands of other processes on the host. The network namespace gives the container its own network stack — its own network interfaces, routing tables, and port space. A container can bind to port 8080 without conflicting with other containers also binding to port 8080, because each has its own isolated port space. The mount namespace isolates the filesystem — the container has its own view of the filesystem, completely separate from the host's filesystem. The UTS namespace isolates the hostname. The IPC namespace isolates inter-process communication. Together, these namespaces create the illusion that the container is running in its own isolated machine.

**Cgroups** (control groups) provide resource control. While namespaces create isolation, cgroups enforce limits. They allow the kernel to limit how much CPU, memory, network bandwidth, and disk I/O a group of processes can use. When you say a container can use at most 2 CPUs and 4GB of RAM, cgroups enforce that boundary. If the container tries to allocate more memory than allowed, the kernel's OOM killer terminates the process.

A container image is the static, immutable blueprint of a container — the filesystem snapshot that defines what's inside the container. When you run a container, the runtime creates an isolated environment from the image, adds a writable layer on top (so the running container can write files without modifying the shared image), and starts the specified process.

Because containers share the host kernel, they're dramatically lighter than VMs. Starting a container takes milliseconds instead of minutes. Running 50 containers on a machine uses a fraction of the memory of 50 VMs because there's only one OS kernel, not 50. You can run hundreds of containers on a single machine.

The consistency guarantee comes from the image itself. A container image contains everything the application needs to run: the application code, the exact runtime version, all library dependencies, configuration files. The image is built once and runs identically on any machine with a compatible container runtime — your laptop, CI/CD, staging, production. "It works on my machine" becomes "it works in this container" and the container is the same everywhere.

---

## 2. Dockerfile Best Practices

A Dockerfile is the recipe for building a container image. It's a text file containing a series of instructions that the container build tool (Docker, Buildah, Kaniko) executes in order to produce an image. Writing Dockerfiles well matters enormously — poor Dockerfiles produce large, slow-to-build, insecure images that make your entire development and deployment cycle worse.

Let's go through what good Dockerfile practice looks like and why each decision matters.

**Choose your base image carefully** — the `FROM` instruction is the first line of every Dockerfile and sets your starting point. The choice of base image determines the attack surface, image size, and available tooling. Using `FROM ubuntu:latest` gives you a full Ubuntu installation with hundreds of packages you almost certainly don't need. For a Python ML application, `FROM python:3.11-slim` is a much better starting point — it's Ubuntu-based but with non-essential packages removed. Better still is `FROM python:3.11-slim-bookworm` which pins a specific Debian version. Always pin specific versions, never use `latest` — `latest` changes without warning and makes your builds non-reproducible.

**Pin dependency versions** — both in the base image tag and in your application dependencies. Your `requirements.txt` should have exact versions (`torch==2.1.0`, not `torch>=2.0`). If you don't pin versions, rebuilding your image six months from now might produce a completely different application because dependencies updated. This causes subtle bugs that are extremely hard to trace to their source.

**Order instructions from least to most frequently changing** — this is the single most impactful practice for build speed. Docker builds images in layers, and each instruction creates a new layer. Docker caches layers — if a layer's instruction and all its inputs haven't changed since the last build, Docker reuses the cached layer instead of running the instruction again. Critically, when any layer changes, all subsequent layers are invalidated and must be rebuilt from scratch.

What this means in practice: put instructions that change rarely (installing system dependencies, copying requirements files) at the top, and instructions that change frequently (copying your application code) at the bottom.

Bad ordering:
```dockerfile
FROM python:3.11-slim
COPY . /app               # Copies everything including code that changes every commit
RUN pip install -r requirements.txt  # This runs every time ANY file changes
```

Good ordering:
```dockerfile
FROM python:3.11-slim
COPY requirements.txt /app/requirements.txt  # Only this file
RUN pip install -r /app/requirements.txt     # Cached unless requirements.txt changes
COPY . /app                                  # Code changes don't invalidate pip cache
```

With the good ordering, `pip install` only re-runs when `requirements.txt` changes. When you change only application code, Docker uses the cached pip layer and only runs the final `COPY`. For a project with many dependencies, this can be the difference between a 30-second rebuild and a 15-minute rebuild.

**Minimize the number of layers** — each RUN instruction creates a new layer. Chaining related commands into a single RUN instruction with `&&` reduces layer count and, importantly, allows you to clean up intermediary files within the same layer, preventing them from persisting in the image:

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        libsndfile1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

If you ran `apt-get update` and `apt-get install` as separate layers, and then `rm -rf /var/lib/apt/lists/*` as another, the cache files from `apt-get update` would exist permanently in the second layer even though the third layer deletes them. In a single layer, the entire operation produces a layer that never contained the cache files in the first place.

**Use `.dockerignore`** — just like `.gitignore` tells Git which files to exclude, `.dockerignore` tells Docker which files and directories to exclude from the build context (the set of files sent to the Docker daemon for building). Without `.dockerignore`, `COPY . /app` copies everything — your entire `.git` directory, local development configurations, test data, documentation, virtual environments. This massively increases build time and image size. A good `.dockerignore` includes: `.git`, `__pycache__`, `*.pyc`, `node_modules`, `.env`, `*.log`, `tests/`, local data directories.

**Set WORKDIR** — always set a working directory with the `WORKDIR` instruction rather than using `cd` in RUN commands. WORKDIR creates the directory if it doesn't exist and sets it as the working directory for all subsequent instructions. Using absolute paths avoids ambiguity and makes the Dockerfile easier to understand.

**Expose the right port** — `EXPOSE` doesn't actually publish a port, it's documentation that says "this container listens on this port." Always include it because it helps humans and tooling understand the container's expected interface.

**Use ENTRYPOINT and CMD correctly** — `ENTRYPOINT` defines the executable that always runs. `CMD` provides default arguments that can be overridden. For a model server, `ENTRYPOINT ["python", "-m", "model_server"]` and `CMD ["--port", "8080"]` means you can override the port at runtime without overriding the entire command. Use JSON array form (`["python", "app.py"]`) rather than string form (`python app.py`) — the JSON form uses exec directly, while the string form uses a shell, which creates an extra shell process and can cause issues with signal handling.

---

## 3. Multi-Stage Builds

Multi-stage builds solve one of the most common problems in container image construction: the tension between needing a rich build environment and wanting a minimal runtime image.

To understand the problem, think about building a compiled application. You need compilers, build tools, development headers, and test frameworks to build and test the application. But to run it in production, you need only the compiled binary and its runtime dependencies. If you use a single Dockerfile that includes everything needed to build the application, your final image contains all those build tools that you only needed during compilation — making your production image gigabytes larger than necessary.

For ML systems, this problem appears in a different form. To build a Python ML package that has native extensions (like numpy, scipy, or PyTorch), you might need C compilers, CUDA development headers, and build toolchains. To train or serve the model, you need only the installed Python packages, not the compilers used to build them.

Multi-stage builds let you have multiple `FROM` statements in a single Dockerfile, each starting a new build stage. You can copy artifacts from one stage to another, and only the final stage ends up in the produced image.

Here's a concrete example for an ML inference service:

```dockerfile
# Stage 1: Builder — has all tools needed to install dependencies
FROM python:3.11 AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies into a specific location
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/build/packages -r requirements.txt


# Stage 2: Runtime — minimal image with only what's needed to run
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy only the installed packages from the builder stage
COPY --from=builder /build/packages /usr/local/lib/python3.11/site-packages

# Copy application code
COPY src/ /app/src/

# Run as non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

ENTRYPOINT ["python", "-m", "src.model_server"]
```

The builder stage uses the full `python:3.11` image and installs `build-essential` with compilers. It installs all Python dependencies, some of which need compilation. The runtime stage starts fresh from `python:3.11-slim` — a much smaller image — and copies only the installed packages from the builder. The compilers, build tools, and intermediate build artifacts are not in the final image at all.

**Test stages** — multi-stage builds also work well for running tests within the image build:

```dockerfile
FROM python:3.11-slim AS base
# ... install dependencies ...

FROM base AS test
COPY tests/ /app/tests/
RUN python -m pytest /app/tests/

FROM base AS production
# ... copy only production code, no test files ...
```

You can build just the test stage during CI (`docker build --target test`) to validate the application, and build the production stage for deployment. Tests run in the same environment as production, eliminating "tests pass but production fails" scenarios.

**Build arguments across stages** — you can pass build arguments to control behavior across stages:
```dockerfile
ARG MODEL_VERSION=latest
FROM base AS production
RUN python download_model.py --version=$MODEL_VERSION
```

**Caching with multi-stage builds** — BuildKit (Docker's modern build engine, now default) is smarter about caching with multi-stage builds. Stages that haven't changed don't get rebuilt even if other stages change. If your dependencies didn't change, the builder stage is cached and reused, even if your application code changed in the runtime stage.

The result of well-implemented multi-stage builds for ML services is often dramatic — images that would be 8GB as single-stage become 2GB or less, because all the CUDA development headers, compilers, and build artifacts are left in the builder stage that never makes it to the final image.

---

## 4. Image Layer Optimization

Every instruction in a Dockerfile that produces filesystem changes creates a new layer. Understanding layers — what they are, how they're stored, and how they affect image size and build performance — lets you make deliberate decisions that result in smaller, faster images.

A layer is a diff — the set of filesystem additions, modifications, and deletions that an instruction produces relative to the previous layer. Docker stores images as a stack of these diffs. When you run a container, Docker overlays all the layers into a unified filesystem view using a union filesystem (overlayfs in modern systems). The container sees a single unified filesystem, but the storage driver manages it as a stack of read-only layers with a writable layer on top.

Several important properties of layers:

**Layers are immutable** — once created, a layer never changes. If you modify a file in a later layer, the original file still exists in the earlier layer and is shadowed by the modification. If you delete a file in a later layer, the file still occupies space in the earlier layer — it's just hidden. This is why cleanup must happen in the same RUN instruction as the installation that created the files. If you install something in one layer and delete the cache in the next layer, the cache still occupies space in the earlier layer.

**Layers are shared across images** — if you have 10 images that all start with `FROM python:3.11-slim`, they all share the same base image layers. Only one copy of those layers is stored on disk and in registry. This makes pulling related images fast — layers that are already cached locally don't need to be downloaded. For ML teams where everyone is using similar base images, this sharing can save significant storage and bandwidth.

**Layer size matters for pull times** — when Kubernetes pulls an image to a new node (because a Pod is scheduled there for the first time), it pulls each layer. Large images on nodes that don't have them cached mean slow Pod startup. For ML serving where fast scaling is important, minimizing image size directly reduces the time from "need more Pods" to "Pods are serving traffic."

Practical layer optimization techniques:

**Combine all related operations** — as mentioned in Dockerfile best practices, chain related commands with `&&` so they're a single layer:
```dockerfile
# Bad: two layers, cache exists in layer 1 even after layer 2 deletes it
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# Good: one layer, only the installed package remains
RUN apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

**Remove what you don't need in the same layer you create it** — Python `.pyc` files and `__pycache__` directories, pip's download cache, npm's cache, apt's package lists — all of these are created during installation and should be removed in the same RUN instruction.

**Install only what you actually need** — every package you install grows the image and adds potential vulnerabilities. For system packages, use `--no-install-recommends` with apt to install only the requested package without its "recommended" packages (which are often optional and large). Audit your dependencies regularly and remove ones no longer used.

**Analyze your image** — tools like `dive` are invaluable for understanding what's in each layer:
```bash
dive myregistry/model-server:v2.1.0
```

Dive shows you each layer, what's in it, what's changed relative to the previous layer, and how much space each layer uses. This helps you identify unexpectedly large layers, files that shouldn't be in the image, and opportunities for optimization. Running dive regularly during image development is the fastest way to understand where size is coming from and where to optimize.

**Layer caching in CI/CD** — for CI/CD builds, explicitly cache the Docker layer cache between builds. Without this, every CI build starts from scratch and re-downloads all dependencies. With BuildKit cache mounting and registry cache layers, CI builds can achieve near-local build speeds.

---

## 5. Distroless & Minimal Base Images

The base image you choose is the foundation of your container's security posture. A base image is not neutral — every package included in it is a potential vulnerability. A package you never use is a vulnerability that can never benefit you. Distroless and minimal base images reduce your attack surface by including only what's actually needed to run your application.

Let's understand the spectrum from largest to smallest.

**Full distribution images** like `ubuntu:22.04` or `debian:bookworm` include a complete Linux userspace — shell (`/bin/bash`), package manager (`apt`), common utilities (`curl`, `wget`, `tar`, `gzip`, `grep`, `find`), system libraries, and more. These are large (70-120MB compressed), have hundreds of installed packages, and present a large attack surface. Most of this is useful for interactive debugging but serves no purpose in a production container. An attacker who compromises your application and gets code execution inside the container has a full shell and utilities to work with.

**Slim variants** like `python:3.11-slim` or `debian:bookworm-slim` strip out many packages — documentation, development headers, unnecessary utilities — but retain the shell and package manager. They're significantly smaller (30-50MB compressed) and have fewer vulnerabilities, while still being relatively easy to work with during development and debugging.

**Alpine images** like `python:3.11-alpine` are based on Alpine Linux, an extremely minimal distribution using musl libc instead of glibc. Alpine images are tiny (5-10MB) and have a very small package count. The tradeoff is compatibility — some Python packages that have native extensions assume glibc and don't work correctly (or don't have musl-compatible wheels), requiring compilation from source in your build stage. For ML libraries like numpy, scipy, and PyTorch, Alpine can be problematic and the compilation time penalty is significant.

**Distroless images** take minimalism further than Alpine. Distroless images, maintained by Google, contain only the application runtime and its dependencies — no shell, no package manager, no utilities. There is nothing to execute except your application's runtime. A distroless Python image contains the Python interpreter and standard library, but not bash, not apt, not curl — nothing else.

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --target=/app/packages -r requirements.txt
COPY src/ /app/src/

FROM gcr.io/distroless/python3-debian12 AS production
COPY --from=builder /app /app
WORKDIR /app
ENTRYPOINT ["python3", "src/model_server.py"]
```

The security benefits are significant. If an attacker exploits a vulnerability in your model server and gains code execution, they have a Python interpreter and nothing else. No shell to run commands, no curl to download tools, no utilities to explore the filesystem. The lateral movement options from a compromised distroless container are dramatically limited compared to a full Ubuntu container.

The operational tradeoff is debugging difficulty. When something goes wrong in a distroless container, you can't `kubectl exec` into it and run shell commands to investigate. You need to rely on logs, metrics, and traces for debugging, which is better practice anyway for production systems. For situations where you need to debug a specific container, you can use Kubernetes's ephemeral containers feature to attach a temporary debugging container with full tooling to a running distroless container without modifying the container itself.

**Chainguard images** are a newer option from the Chainguard company, providing extremely minimal, continuously rebuilt images with a strong security focus. They typically have zero known CVEs at build time because they're rebuilt frequently with the latest patched packages and include only what's needed.

**For ML specifically** — ML images are notoriously large because of PyTorch, TensorFlow, and CUDA. Going fully distroless with ML libraries is challenging because of complex native dependencies. A practical approach is multi-stage builds with slim bases for the final image, combined with the layer optimization techniques from the previous section. Reducing from 8GB to 3GB still represents a massive improvement in pull time, attack surface, and storage cost, even if you can't reach the 50MB distroless ideal.

---

## 6. Non-Root Containers

By default, processes inside a container run as root (UID 0) unless explicitly configured otherwise. This is one of the most common security misconfigurations in containerized applications, and it's important to understand why it matters and how to fix it.

First, let's understand container root vs host root. The root user inside a container is not the same as the root user on the host — namespaces provide isolation. But this isolation is imperfect. Container escape vulnerabilities have been found and will continue to be found in container runtimes and the Linux kernel. If an attacker compromises your application and gets code execution inside the container running as root, and they then find a container escape vulnerability, they arrive on the host machine as root. Host root is unlimited power — they can read any file, kill any process, install anything, access any other container.

If your application runs as a non-root user inside the container and the attacker exploits the same application vulnerability, they have code execution as a low-privilege user. A container escape still potentially exists, but they arrive on the host as a low-privilege user with dramatically fewer capabilities. Defense in depth means making each level of exploitation harder, and running as non-root is a low-cost, high-value layer.

Beyond security, there are operational reasons to run as non-root. Many organizations' security policies require it. Kubernetes security policies (PodSecurityAdmission with Restricted profile) can prevent root containers from being scheduled. Compliance frameworks may mandate it.

Creating a non-root user in a Dockerfile:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies as root (before switching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ /app/src/

# Create a non-root user and group
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Change ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

ENTRYPOINT ["python", "-m", "src.model_server"]
```

Alternatively, using the numeric form of the USER instruction which doesn't require the user to exist in the image's `/etc/passwd`:

```dockerfile
USER 1001:1001
```

Using numeric UIDs (especially ones above 10000 to avoid potential conflicts with system users) is actually preferred in Kubernetes environments where you can enforce non-root by checking UIDs rather than usernames.

**Read-only filesystem** complements non-root nicely. If the container filesystem is mounted read-only, even a root process inside the container can't modify system files. In Kubernetes:

```yaml
securityContext:
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
```

For applications that need to write files (temporary files, logs, model downloads), you explicitly mount writable volumes at specific paths rather than making the entire filesystem writable. This forces deliberate decisions about where writes happen and limits what a compromised process can modify.

**Dropped capabilities** — Linux capabilities break root's monolithic privilege into discrete units. Even when running as root inside a container, you can drop all capabilities except the ones your application genuinely needs (which is usually none). Adding this to your Kubernetes pod spec:

```yaml
securityContext:
  capabilities:
    drop:
    - ALL
```

Drops all Linux capabilities from the container process. A container with no capabilities has far less power even if it's running as root.

**File permissions matter** — when running as non-root, ensure your application files have appropriate permissions. Configuration files should be readable but not necessarily writable. Log directories the application writes to should be owned by the application user. Model weight files loaded at startup should be readable. Getting permissions right during the Dockerfile build is important — changing permissions at container startup is slow and error-prone.

---

## 7. Health Checks in Containers

Kubernetes has its own probe system (covered in the Kubernetes section), but Docker also has a native health check mechanism that operates at the container level, independent of any orchestrator. Understanding Docker health checks matters because they work in environments beyond Kubernetes — Docker Compose, Docker Swarm, and standalone Docker — and they provide a foundation that Kubernetes can build on.

The `HEALTHCHECK` instruction in a Dockerfile defines a command that Docker runs periodically inside the container to determine if it's healthy. Docker tracks health status and uses it for various purposes: `docker ps` shows health status, Docker Swarm uses it for service management, and some deployment tools use it to gate traffic.

```dockerfile
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=60s \
            --retries=3 \
    CMD curl --fail --silent http://localhost:8080/health || exit 1
```

The parameters:
`--interval=30s` — how often to run the health check. Too frequent and you're adding unnecessary load. Too infrequent and you take longer to detect failures.
`--timeout=10s` — how long to wait for the health check command to complete before considering it failed. Should be shorter than the interval.
`--start-period=60s` — grace period after container start during which health check failures don't count against the retry limit. This is for applications (like model servers loading large weights) that take time to initialize. Setting this too short causes containers to be marked unhealthy during normal startup.
`--retries=3` — how many consecutive failures before the container is marked unhealthy.

The health check command must exit 0 for healthy, exit 1 for unhealthy. The example uses `curl --fail` which exits non-zero on HTTP error responses. For services without curl (distroless images), you use an alternative like a dedicated health check binary compiled into the image, or a Python one-liner:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1
```

**What your health endpoint should check** — a health endpoint that just returns 200 OK unconditionally is nearly useless. A good health endpoint verifies that the application is actually functional. For a model server, this means: can I access the model in memory? Is the model loaded and can it make a simple inference? Is the database connection pool healthy? Are critical dependencies reachable? A health check that validates actual functionality catches deadlocks, resource exhaustion, and partial failures that a simple process-alive check misses.

**Liveness vs readiness in Docker** — Docker's HEALTHCHECK is a single signal. Kubernetes's split into liveness and readiness (and startup) is more nuanced and more useful. In Docker-only environments, the HEALTHCHECK does double duty — it both signals whether the container is alive and whether it can receive traffic. In Kubernetes, the HEALTHCHECK is used less because Kubernetes's probe system is richer, but it still provides useful metadata visible in container state.

**Health check in Docker Compose** — Docker Compose uses health checks for service dependency management:

```yaml
services:
  model-server:
    build: .
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    
  inference-gateway:
    depends_on:
      model-server:
        condition: service_healthy  # Don't start until model-server is healthy
```

This ensures the inference gateway only starts after the model server has passed its health check — critical for ML services where dependent services fail if they start before the model is loaded.

---

## 8. Container Networking Basics

Container networking is one of the most conceptually tricky aspects of containers because there are multiple networking contexts happening simultaneously — the host machine's network, the container's private network, bridge networks, and overlay networks — and understanding which applies in which situation requires some foundation building.

Let's build up from scratch.

**Default container networking** — when Docker starts on a machine, it creates a virtual network bridge called `docker0`. This bridge has an IP address (typically `172.17.0.1`) and acts as a gateway for containers. By default, every container gets a virtual network interface connected to this bridge and an IP address in the bridge's subnet (like `172.17.0.2`, `172.17.0.3`, etc.). Containers on the same bridge can communicate with each other using these IPs. The host machine can reach containers via these IPs. But these IPs are private to the host — machines outside the host cannot reach them directly.

This default bridge network is fine for basic experimentation but has a problem for multi-container applications: containers on the default bridge can only reference each other by IP, not by name. Since container IPs are assigned dynamically and change when containers restart, relying on IPs is fragile.

**User-defined bridge networks** solve the naming problem. When you create a custom network and put containers on it, Docker provides automatic DNS resolution — containers can reach each other by container name or service name. If your model server container is named `model-server`, your gateway container can connect to it at `http://model-server:8080` and Docker's built-in DNS resolves `model-server` to the correct container IP automatically.

```bash
docker network create ml-network
docker run --network=ml-network --name model-server myimage/model-server
docker run --network=ml-network --name gateway myimage/gateway
```

Now the gateway container can connect to `model-server:8080` regardless of what IP the model server container happens to have.

**Port publishing** — containers have their own network namespace with their own port space. A container process binding to port 8080 is binding to port 8080 in the container's namespace, not the host's port 8080. To make the container accessible from outside the host (or from the host itself without knowing the container IP), you publish ports with the `-p` flag: `-p 9090:8080` publishes the host port 9090 and forwards traffic to container port 8080. Host port 9090 is now accessible from anywhere the host is reachable, and traffic arrives at the container on port 8080.

**None network** — `--network=none` gives the container no network access whatsoever — no interfaces except the loopback. This is for containers that process data from volumes and don't need any network access. Maximum network isolation.

**Host network** — `--network=host` removes network namespace isolation — the container shares the host's network namespace directly. There's no bridge, no NAT, no port publishing — the container's processes bind directly to the host's network interfaces. This maximizes networking performance (no virtual network overhead) but eliminates isolation — the container can access any port on the host and vice versa without any mapping. Only use this when you have specific performance requirements and understand the security implications.

**Container-to-container communication patterns** — when two containers need to communicate, the recommended approach is user-defined bridge networks with DNS. Avoid linking (an older Docker feature that's deprecated), avoid using container IPs directly (they change), and avoid `--network=host` for isolation reasons.

**DNS in containers** — by default, containers use the host's DNS configuration (inherited from `/etc/resolv.conf`) for external name resolution. Docker also intercepts DNS queries for container names on user-defined networks and resolves them internally. You can configure custom DNS servers for containers if your application needs to resolve internal company DNS names.

---

## 9. Docker Compose for Multi-Service Apps

Most real ML applications are not a single container — they're a collection of services that need to work together. A model server, a feature store, a Redis cache, a PostgreSQL database, a monitoring agent, an API gateway. During development and testing, spinning up all of these manually with individual `docker run` commands is tedious and error-prone. Docker Compose solves this by defining an entire multi-service application in a single YAML file and managing it with simple commands.

A Docker Compose file describes: what services (containers) make up the application, how to build or pull each service's image, what environment variables each service needs, what ports to publish, what volumes to mount, what networks to create, and what dependencies exist between services.

A realistic Docker Compose file for a local ML development environment:

```yaml
version: "3.9"

services:
  model-server:
    build:
      context: .
      dockerfile: Dockerfile
      target: development     # Build the development stage
    ports:
      - "8080:8080"
    volumes:
      - ./src:/app/src         # Mount source code for live reload
      - model-weights:/app/models
    environment:
      - LOG_LEVEL=DEBUG
      - FEATURE_STORE_URL=redis://feature-store:6379
      - MODEL_PATH=/app/models/current
    depends_on:
      feature-store:
        condition: service_healthy
      mlflow:
        condition: service_healthy
    networks:
      - ml-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  feature-store:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - feature-data:/data
    networks:
      - ml-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.8.0
    ports:
      - "5000:5000"
    environment:
      - MLFLOW_BACKEND_STORE_URI=postgresql://mlflow:mlflowpass@db/mlflow
      - MLFLOW_ARTIFACT_ROOT=/mlflow/artifacts
    volumes:
      - mlflow-artifacts:/mlflow/artifacts
    depends_on:
      db:
        condition: service_healthy
    networks:
      - ml-network
    command: mlflow server --host 0.0.0.0 --port 5000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=mlflow
      - POSTGRES_PASSWORD=mlflowpass
      - POSTGRES_DB=mlflow
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - ml-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mlflow"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  model-weights:
  feature-data:
  mlflow-artifacts:
  postgres-data:

networks:
  ml-network:
    driver: bridge
```

With this file, `docker compose up` starts all four services in the correct order (dependencies first), `docker compose logs -f model-server` streams model server logs, `docker compose down` stops everything cleanly, and `docker compose down -v` stops everything and removes volumes (for a clean slate).

**Environment-specific overrides** — Docker Compose supports override files that layer on top of the base configuration. `docker-compose.override.yml` is automatically merged with `docker-compose.yml`. You can have `docker-compose.production.yml` with production-specific settings and apply it with `docker compose -f docker-compose.yml -f docker-compose.production.yml up`. This pattern avoids duplicating the entire configuration for each environment.

**Using Compose for CI testing** — one of the most valuable uses of Docker Compose is running integration tests in CI that require real services:

```yaml
# docker-compose.test.yml
services:
  test-runner:
    build:
      context: .
      target: test
    depends_on:
      model-server:
        condition: service_healthy
    command: pytest tests/integration/
    networks:
      - ml-network
```

`docker compose -f docker-compose.yml -f docker-compose.test.yml run test-runner` starts all services and runs integration tests against real running services, then exits with the test exit code. No mocking, no stubs — real integration tests against real services.

**Compose vs Kubernetes** — Docker Compose is for development and testing environments, not production. It runs on a single machine, has no built-in high availability, no automatic scaling, and no advanced health-based scheduling. Production workloads go to Kubernetes. The practical workflow: develop with Docker Compose locally, test with Docker Compose in CI, deploy with Kubernetes in production.

---

## 10. Container Image Scanning

Every container image you build is a collection of software — your application code, language runtimes, system libraries, and base OS utilities. Any of these components can have known security vulnerabilities (CVEs — Common Vulnerabilities and Exposures). Image scanning is the automated process of checking every component in your image against databases of known vulnerabilities and reporting what it finds.

The CVE ecosystem: when a security researcher discovers a vulnerability in a software package, they report it responsibly, it gets assigned a CVE identifier (like CVE-2021-44228, the Log4Shell vulnerability), and it's published in the National Vulnerability Database with a severity score (Critical, High, Medium, Low) and affected version ranges. Image scanners check every package in your image against this database.

How scanners work: they extract the software bill of materials from your image (the complete list of every installed package and version across every layer), look up each package-version pair against CVE databases, and report which packages have known vulnerabilities and how severe they are. This happens in seconds and catches vulnerabilities that would otherwise require manual tracking of every security bulletin for every package in your image.

**Trivy** is the most widely used open-source scanner. Running it is straightforward:

```bash
trivy image myregistry/model-server:v2.1.0
```

It produces output showing every vulnerability found, the affected package, the severity, the installed version, and the fixed version (if available). You can output this in various formats (table, JSON, SARIF) for integration with different tools.

**Integrating scanning into CI/CD** — scanning should happen automatically in your pipeline, not as an afterthought. After building an image and before pushing to the registry or deploying, run the scanner and gate the pipeline on the results:

```yaml
# GitHub Actions example
- name: Scan image for vulnerabilities
  run: |
    trivy image \
      --severity CRITICAL,HIGH \
      --exit-code 1 \
      --no-progress \
      myregistry/model-server:${{ github.sha }}
```

`--exit-code 1` causes Trivy to exit with a non-zero code if vulnerabilities above the specified severity are found, failing the pipeline. `--severity CRITICAL,HIGH` means only Critical and High severities block the pipeline (Medium and Low are reported but don't fail the build).

**Vulnerability management beyond just scanning** — scanning gives you a list, but you still need a process for what to do with it. Critical vulnerabilities with known exploits need immediate attention — update the affected package or base image. High vulnerabilities should be addressed on a defined timeline (typically within a week). Medium and Low can go through normal maintenance cycles.

The primary remediation is updating. Most vulnerabilities in base images are fixed in newer base image versions — simply updating your `FROM python:3.11-slim` to a newer patch version often eliminates dozens of vulnerabilities. For vulnerabilities in your own dependencies, update the dependency to a fixed version. For vulnerabilities in packages you don't actually use (they came in as transitive dependencies), removing the unnecessary package is the cleanest fix.

**False positives and accepted risks** — some reported vulnerabilities don't actually affect your application. A vulnerability in a C library that's only exploitable through a code path your application never calls is technically a CVE but not actually a risk in practice. Most scanners support `.trivyignore` or equivalent files where you document acknowledged vulnerabilities with reasons:

```
# CVE-2023-XXXXX - Affects LDAP functionality in libssl, not used in our application
CVE-2023-XXXXX
```

This prevents the same "known false positive" from blocking your pipeline every build while maintaining a record of why it was accepted.

**Continuous scanning of registry images** — scanning at build time is necessary but not sufficient. New CVEs are published constantly. An image you scanned six months ago as clean may have dozens of critical vulnerabilities today because new vulnerabilities were discovered in packages that were already installed. Your container registry (ECR, GCR, Docker Hub with Scout, Harbor) should continuously re-scan stored images and alert when new vulnerabilities are discovered in production images.

---

## 11. Software Bill of Materials (SBOM)

We covered SBOMs conceptually in the Security section, but here we'll focus on the container-specific mechanics — how SBOMs are generated for container images, what they contain, how they're stored and used, and why they matter for ML infrastructure specifically.

A container image SBOM is a complete, machine-readable inventory of every software component inside the image — every OS package installed, every Python library, every system library, every file that came from a package. This inventory is structured data that can be searched, queried, and analyzed programmatically.

**Generating SBOMs** — tools like Syft and Trivy can generate SBOMs from container images:

```bash
# Generate SBOM with Syft in SPDX format
syft myregistry/model-server:v2.1.0 -o spdx-json > model-server-sbom.spdx.json

# Generate SBOM with Trivy in CycloneDX format
trivy image --format cyclonedx myregistry/model-server:v2.1.0 > model-server-sbom.cdx.json
```

The output is a structured document listing every component. For a Python ML image, this includes: the base OS packages (hundreds of packages from the Debian base image), Python itself, every Python package from your requirements.txt, and all their transitive dependencies.

**SBOM formats** — two formats have emerged as standards. SPDX (Software Package Data Exchange) is an ISO standard originally developed by the Linux Foundation. CycloneDX is a newer format from OWASP with a strong focus on security use cases. Both are JSON-based and widely supported by security tools. Generating both from your pipeline gives maximum compatibility with different consumers.

**Attaching SBOMs to images** — rather than storing SBOMs as separate files that can get separated from their images, attach the SBOM directly to the image in the registry using OCI artifacts:

```bash
# Attach SBOM to image in registry using cosign
cosign attach sbom --sbom model-server-sbom.spdx.json \
    myregistry/model-server:v2.1.0
```

Now the SBOM is discoverable alongside the image and retrieved with it. Tools that process your image can automatically find and use its SBOM without separate coordination.

**Querying SBOMs at vulnerability disclosure time** — the primary value of SBOMs is the ability to answer "are we affected?" quickly when a new critical vulnerability is announced. Instead of manually checking each service, you query your SBOM database:

```bash
# Find all images containing a specific vulnerable package
grype db diff && grype sbom:model-server-sbom.spdx.json
```

This immediately tells you whether your model server image contains the vulnerable component and which version. With SBOMs for all your images in a central store, you can query across your entire fleet in seconds.

**License compliance with SBOMs** — SBOMs include license information for every component. This is valuable for compliance — ensuring you don't have GPL-licensed components in a proprietary product, identifying LGPL dependencies that have specific requirements, or auditing for commercially incompatible licenses. Automated license policy enforcement against SBOMs catches these issues before they become legal problems.

**For ML models** — SBOMs for ML systems should extend beyond the container to include the model itself. What training data was used? What framework version trained it? What preprocessing was applied? This is model provenance documentation — increasingly required by AI governance regulations — and it's the ML analog of an SBOM for software. Connecting the model's provenance document to the container's SBOM gives you end-to-end traceability from raw data to deployed prediction.

---

## 12. Image Signing & Verification

You build a container image in your CI/CD pipeline, push it to your registry, and your deployment infrastructure pulls and runs it. How does your deployment infrastructure know that the image it's pulling is the same image your pipeline built? How does it know the image wasn't tampered with in transit, that the registry wasn't compromised and the image replaced with a malicious one, or that someone didn't manually push a backdoored image to your registry?

Without image signing, it doesn't. Your deployment infrastructure accepts any image from the configured registry, trusting that the registry is authoritative. Image signing adds cryptographic verification — the pipeline signs the image after building it, and the deployment infrastructure verifies the signature before running it. Unsigned images are rejected.

**How signing works** — cryptographic signing uses asymmetric key pairs. The signer has a private key kept secret. The verifier has the corresponding public key (can be widely shared). The signer creates a cryptographic signature of the image's content hash using the private key. Anyone with the public key can verify the signature — confirming that someone with the private key signed this exact image. If even one byte of the image changed after signing, verification fails.

**Cosign** from the Sigstore project is the modern standard for container image signing. It integrates with OCI registries and supports multiple key management strategies.

Signing with Cosign using a key pair:
```bash
# Generate a key pair (private key stored securely, public key distributed)
cosign generate-key-pair

# Sign the image after pushing to registry
cosign sign --key cosign.key myregistry/model-server:v2.1.0

# Verify the signature
cosign verify --key cosign.pub myregistry/model-server:v2.1.0
```

The signature is stored in the same registry as the image (as an OCI artifact attached to the image manifest), so no separate storage is needed.

**Keyless signing with Sigstore** — managing signing keys is itself a security challenge. If the private key is compromised, an attacker can sign malicious images. Keyless signing with Sigstore's Fulcio certificate authority eliminates long-lived signing keys entirely. Instead, the CI/CD pipeline authenticates with its OIDC identity (GitHub Actions has an OIDC token, GCP service accounts have tokens, etc.), and Sigstore issues a short-lived certificate tied to that identity. The signature is bound to the identity (`https://github.com/myorg/myrepo/.github/workflows/build.yml@refs/heads/main`) rather than a key. Verification checks that the image was signed by the expected CI/CD identity, not just any holder of a key.

```bash
# Keyless signing in GitHub Actions
cosign sign --yes myregistry/model-server:${{ github.sha }}

# Verification checking identity
cosign verify \
    --certificate-identity-regexp "^https://github.com/myorg/myrepo/" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    myregistry/model-server:v2.1.0
```

**Enforcing signature verification in Kubernetes** — signing is only useful if deployment infrastructure enforces verification. In Kubernetes, this is done with admission controllers. Connaisseur and Policy Controller (from Sigstore) are admission webhooks that intercept every Pod creation request and verify that the container images pass your signature policy before allowing the Pod to be scheduled. If an image is unsigned or the signature doesn't match your policy, the Pod creation is rejected.

**Transparency log** — Sigstore's Rekor is a public, immutable transparency log where all signatures are recorded. Every signature your pipeline creates is logged in Rekor with a timestamp. This creates an auditable record of every image signing event — you can prove when an image was signed, by what identity, and verify that the signature hasn't been backdated or fabricated.

---

## 13. Secure Registry Practices

Your container registry is where all your images live — the authoritative source from which all deployments pull. It's a high-value target: compromising the registry and replacing images with malicious versions would let an attacker run arbitrary code in every environment that pulls those images. Securing the registry is critical.

**Use a private registry** — public Docker Hub is appropriate for public open-source images, not for proprietary ML models, internal applications, or images that contain any embedded configuration. Run a private registry — AWS ECR, Google Artifact Registry, Azure Container Registry, GitHub Container Registry, or self-hosted Harbor. Private registries require authentication to pull images, preventing unauthorized access.

**Registry authentication** — every client (developer machines, CI/CD systems, Kubernetes clusters) must authenticate to pull from the private registry. In cloud-native environments, this is typically done through cloud IAM: ECR uses AWS IAM roles, Artifact Registry uses GCP service accounts. Kubernetes nodes in EKS get an IAM role that allows ECR pulls without storing credentials. This is far better than storing long-lived registry credentials as secrets.

**Immutable tags** — image tags are mutable by default. If you tag an image `v2.1.0` and push it, then push a different image with the same tag `v2.1.0`, the tag now points to the new image. This means the same tag can refer to different images over time, making deployments non-deterministic and making it impossible to guarantee that what's in production matches what was tested. Enable immutable tags in your registry — once a tag is pushed, it cannot be overwritten. If you need to update, create a new version tag. Immutable tags ensure that deploying `v2.1.0` today and deploying `v2.1.0` six months from now get the same image.

**Reference images by digest** — even with immutable tags, best practice is to reference images by their SHA256 digest in production deployments. A digest is content-addressed — it's derived from the image content, so if the content changes, the digest changes. Referencing by digest guarantees you get exactly the image you built and tested, not just the current image behind that tag.

```yaml
# Tag reference (the tag could theoretically be moved)
image: myregistry/model-server:v2.1.0

# Digest reference (immutably refers to a specific image)
image: myregistry/model-server@sha256:7d9c9b6f1a2e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c
```

**Access control** — apply least privilege to registry access. CI/CD systems that build and push images need push access. Kubernetes clusters that pull images need pull-only access. Individual developers might need pull access for debugging but shouldn't need push access. Use separate credentials or IAM policies for push vs pull operations.

**Image retention policies** — without retention policies, registries accumulate images indefinitely. An active development team can generate thousands of images per month. Implement automated retention: keep the last N versions of each image, keep all images tagged with semantic versions, delete untagged images after N days. This manages storage costs and reduces the surface area of images that need vulnerability scanning.

**Vulnerability scanning at the registry level** — as mentioned in the scanning section, many registries support continuous scanning of stored images. Enable this and configure alerts when new critical vulnerabilities are found in images that are currently deployed. ECR Basic Scanning and Enhanced Scanning, Artifact Registry's vulnerability scanning, and Harbor's built-in Trivy integration all provide this capability.

**Audit logging** — enable audit logging on your registry. Every push, pull, tag creation, and deletion should be logged with the authenticating identity, timestamp, and what was accessed. This creates an audit trail for security investigations and compliance. If an unauthorized image appeared in your registry, audit logs tell you who pushed it and when.

**Network-level restrictions** — in addition to authentication, restrict which networks can access the registry. Your registry should not be accessible from arbitrary internet sources — restrict access to your corporate network, your cloud VPC, and specific CI/CD runner IPs. This means even if credentials are stolen, they can only be used from authorized network locations.

---

## 14. Runtime Container Security

Everything discussed so far — secure Dockerfiles, minimal base images, image scanning, signing — addresses security of the image before it runs. Runtime container security is about monitoring and protecting containers while they're actually executing in production. This is where the rubber meets the road: your container is running in production, processing real requests, and potentially being actively targeted by attackers.

**Understanding what runtime security protects against** — by the time a container is running in production, it's passed all your pre-deployment checks. Runtime threats come from different vectors: a vulnerability in your application code is exploited by malicious user input, a previously unknown vulnerability (zero-day) is exploited in a library your scanner didn't know was vulnerable, a developer's account is compromised and someone is trying to use running containers for lateral movement, or a dependency you pulled in had malicious code that activates at runtime.

**Seccomp profiles** — syscall filtering is one of the most powerful runtime security controls available. Linux applications communicate with the kernel through system calls (syscalls). A typical container process might legitimately use 50-100 different syscalls. But Linux has over 400 syscalls, many of which your application will never call. Seccomp (Secure Computing Mode) allows you to define a whitelist of syscalls a container is allowed to make. Any attempt to call a syscall not in the whitelist results in the process being killed.

Docker has a default seccomp profile that blocks the most dangerous syscalls. Kubernetes allows you to apply custom seccomp profiles:

```yaml
securityContext:
  seccompProfile:
    type: RuntimeDefault  # Use the container runtime's default seccomp profile
```

For maximum security, create a custom profile allowing only the specific syscalls your application needs. Tools like `strace` and `inspektor-gadget` help you determine which syscalls your application actually uses.

**AppArmor and SELinux** — these are Mandatory Access Control (MAC) systems that enforce security policies at the OS level, outside the container. AppArmor profiles define what files a process can access, what capabilities it can use, and what network operations it can perform. If malware inside your container tries to read `/etc/shadow` (the password database) or execute unexpected binaries, AppArmor blocks it regardless of the process's permissions. These protections exist at the kernel level, below the container runtime — a container escape exploit that circumvents container namespace isolation still hits AppArmor/SELinux policy enforcement.

**Runtime behavior monitoring** — tools like Falco watch all syscalls made by all containers in real-time and alert on suspicious behavior patterns. Falco rules describe normal and abnormal behavior: it's normal for a model server to make network connections on port 8080, read model files, and write logs. It's suspicious for a model server to spawn a shell process, download files with curl, modify system files, or make connections to unexpected external IPs.

Falco alerts in real time when these rules are violated:

```yaml
- rule: Shell spawned in container
  desc: A shell was spawned inside a container - potential exploitation
  condition: container.id != "" and proc.name in (shell_binaries)
  output: "Shell spawned (container=%container.name user=%user.name proc=%proc.name parent=%proc.pname)"
  priority: WARNING
```

This rule fires whenever a shell (bash, sh, zsh) is spawned inside any container. For production model servers built on distroless images, this should never happen legitimately — any alert is a genuine security event.

**Immutable containers** — in production, containers should be treated as immutable. The application code, dependencies, and configuration were baked into the image at build time. Nothing should change at runtime. Enforcing this through `readOnlyRootFilesystem: true` in the pod security context means even if an attacker gets code execution, they can't modify the container's filesystem to install persistence mechanisms. Combine this with network egress restrictions and you dramatically limit what an attacker can do with code execution in a container.

**Resource limits as security** — as mentioned in the Kubernetes section, resource limits are security controls, not just operational concerns. A container without CPU limits can perform a denial-of-service attack against other containers on the same node by consuming all available CPU. Memory without limits can OOM the entire node. Always set limits on production containers.

**Audit container activity** — beyond Falco's real-time alerting, audit logging of container activity helps with post-incident forensics. Knowing which files were accessed, which network connections were made, and which processes were spawned during a container's lifetime is essential for understanding the scope of a security incident. eBPF-based tools like Tetragon provide deep observability into container behavior with minimal overhead.

**Regular image updates** — runtime security also means keeping images updated. Even if your image had no known vulnerabilities when you built it, new CVEs are published constantly. Establish a process for regularly rebuilding images with updated base images and dependencies, scanning the rebuilt images, and rolling them out to production. For production ML systems, this might be monthly updates for baseline security maintenance and immediate updates when critical vulnerabilities are announced.

---

The connecting thread across all of them is the principle of defense in depth — security at every layer rather than relying on any single control. Build minimal images to reduce attack surface. Run as non-root to limit privilege. Scan for known vulnerabilities to catch the obvious. Sign images to ensure integrity. Monitor runtime behavior to catch the unexpected. No single control is sufficient, but together they create a layered security posture where each layer compensates for potential failures in others.
