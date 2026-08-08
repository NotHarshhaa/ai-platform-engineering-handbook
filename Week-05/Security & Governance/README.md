# Security & Governance

---

## 1. DevSecOps Principles

Let's start with how security used to work, because understanding the old way makes the new way make sense.

In traditional software development, security was treated as a phase that happened at the end. Developers would build a feature or an entire product over months, and then right before release, a separate security team would review it, find vulnerabilities, and send it back to be fixed. This was slow, expensive, and adversarial. Developers resented security teams for blocking releases. Security teams resented developers for building insecure systems and throwing them over the wall at the last minute. And because fixing security issues late in development is vastly more expensive than catching them early, this approach produced a lot of insecure software shipped to production.

DevSecOps is the philosophy that security is not a phase at the end — it is a continuous practice woven into every step of development and operations, from the moment someone writes a line of code to the moment it runs in production.

The "Sec" in DevSecOps is literally inserted into DevOps, which is intentional. Security becomes everyone's responsibility, not just a dedicated security team's problem. Developers write secure code because they have tools and guardrails that catch insecure patterns as they code. CI/CD pipelines automatically scan for vulnerabilities before anything gets deployed. Infrastructure is configured securely by default. Operations teams monitor for security events in production the same way they monitor for performance problems.

The principles that guide DevSecOps in practice:

**Shift left** means moving security checks as early in the development process as possible. "Left" refers to the left side of the development timeline. Catching a SQL injection vulnerability in a developer's IDE as they type costs almost nothing to fix. Catching it in a security audit after deployment costs enormous time and reputational risk. Tools like static analysis scanners (SAST), dependency vulnerability checkers, and pre-commit hooks that enforce secure coding patterns shift security all the way left to the developer's laptop.

**Security as code** means security policies, configurations, and controls are written as code in version-controlled repositories, not maintained as manual processes or tribal knowledge. Network firewall rules are code. Access control policies are code. Audit requirements are code. This means they can be reviewed, tested, versioned, and deployed the same way application code is.

**Automation over manual gates** means security checks happen automatically in pipelines, not through manual review processes that create bottlenecks. A pipeline that automatically scans container images for known vulnerabilities and blocks deployment if critical ones are found is faster and more reliable than a security team manually reviewing images on a schedule.

**Continuous monitoring** means security doesn't stop at deployment. Production systems are continuously monitored for suspicious behavior, anomalous access patterns, and new vulnerabilities in deployed dependencies.

For ML systems, DevSecOps has unique dimensions. Your training data is a sensitive asset that needs access controls and audit trails. Your models themselves can be intellectual property that needs protection. Your inference APIs are attack surfaces. Your data pipelines move sensitive data that needs encryption and access control throughout. Security isn't an add-on — it's built into every layer from the start.

---

## 2. Secure CI/CD Pipelines

Your CI/CD pipeline is the automated highway that takes code from a developer's laptop to production. Because it has broad access — it can deploy to production, access secrets, modify infrastructure — it is also one of the highest-value attack targets in your entire system. A compromised CI/CD pipeline means an attacker can deploy anything they want to your production environment.

Understanding how to secure the pipeline means understanding each stage and what can go wrong.

**Source code security** is the first stage. When a developer pushes code, the pipeline starts. At this point you need to verify: is this code coming from an authorized person? Is it going through the proper review process? Are there secrets accidentally committed in the code — API keys, passwords, tokens embedded in source files? Tools like GitGuardian or truffleHog scan every commit for accidentally committed secrets. Required code reviews and branch protection rules prevent anyone from pushing directly to the main branch and bypassing review.

**Dependency security** is often overlooked but critically important. Your application depends on dozens or hundreds of open-source libraries. Any of those libraries could have known vulnerabilities, or could be a malicious package designed to look like a legitimate one (a supply chain attack). Your pipeline should automatically run dependency scanning tools — Snyk, OWASP Dependency-Check, Dependabot — that check every dependency against databases of known vulnerabilities (CVEs) and block the pipeline if high-severity issues are found.

**Static Application Security Testing (SAST)** analyzes your code without running it, looking for security vulnerabilities like SQL injection patterns, insecure deserialization, hardcoded credentials, use of deprecated cryptographic algorithms. This runs automatically in the pipeline and fails the build if critical issues are found.

**Container image security** — after building your Docker image, scan it for vulnerabilities before pushing to your registry. Tools like Trivy, Snyk Container, or Clair scan every layer of the image for known vulnerable packages. A clean application might be running on a base image with 47 known vulnerabilities. The pipeline catches this before the image ever runs in production.

**Pipeline credentials and secrets** are the most sensitive aspect of pipeline security. Your pipeline needs credentials to deploy to Kubernetes, push to registries, access cloud resources. These credentials must never be stored in the pipeline configuration files themselves or in code repositories. They must be stored in a dedicated secrets management system (Vault, AWS Secrets Manager, GitHub Encrypted Secrets) and injected into the pipeline at runtime. Pipeline jobs should run with the minimum credentials necessary for their specific task — the job that runs tests doesn't need production deployment credentials.

**Pipeline isolation** means each pipeline job runs in an isolated, ephemeral environment. Not a shared server where jobs from different pipelines run simultaneously and might interfere with each other or access each other's credentials. Ephemeral runners that spin up fresh for each job and terminate after ensure no state bleeds between jobs.

**Artifact signing** means after you build a container image or package, you cryptographically sign it. Downstream steps in the pipeline and your deployment infrastructure verify the signature before using the artifact. This ensures that an artifact built by your pipeline hasn't been tampered with between build and deployment.

---

## 3. Container Security Hardening

Containers are the fundamental unit of deployment in modern ML systems. Every model server, every data pipeline component, every API runs in a container. By default, containers are more secure than running software directly on a shared server, but "more secure by default" is not the same as "secure." Hardening means taking deliberate steps to reduce the attack surface of your containers.

**Run as non-root** is the single most important container security practice. By default, many Docker containers run as the root user inside the container. If an attacker exploits a vulnerability in your application and gets code execution inside the container, running as root gives them much more capability — they can read any file, modify system configuration, and potentially escape the container entirely. Running as a non-privileged user limits what an attacker can do even if they achieve code execution.

In practice this means your Dockerfile explicitly creates and switches to a non-root user: `RUN adduser --disabled-password appuser && USER appuser`. And your Kubernetes pod spec enforces this: `securityContext: runAsNonRoot: true`.

**Read-only filesystem** means the container's filesystem is mounted as read-only. Your application can only write to specific volumes explicitly mounted for that purpose. If malware gets into your container and tries to write malicious files or modify system binaries, it can't. The constraint also forces good application design — if your application needs to write files, you have to explicitly decide where and mount a volume, rather than having it write files in random places implicitly.

**Drop capabilities** — Linux capabilities are a fine-grained system of root privileges. Rather than "root can do everything," capabilities let you grant specific abilities: `CAP_NET_BIND_SERVICE` allows binding to privileged ports, `CAP_SYS_ADMIN` allows various administrative operations, etc. By default, containers get a set of capabilities they almost certainly don't need. You should drop all capabilities and add back only what's specifically required. Most application containers need zero Linux capabilities.

**Minimal base images** mean starting from the smallest possible base image, not a full Ubuntu or CentOS with hundreds of installed packages. Distroless images contain only your application and its runtime dependencies — no shell, no package manager, no debugging tools. Less software means fewer potential vulnerabilities. If there's no bash shell in the container, an attacker who gains code execution can't easily run shell commands. Google's Distroless images and Alpine Linux are popular choices for minimal base images.

**No privileged containers** — a privileged container has essentially all the capabilities of the host machine. Never run privileged containers in production. There is almost never a legitimate reason for a model serving container or data pipeline to need privileged mode.

**Resource limits** — always set CPU and memory limits on containers. Without limits, a single misbehaving container can consume all resources on a node, starving other containers. With limits, Kubernetes kills and restarts containers that exceed their memory allocation and throttles CPU-greedy containers, maintaining predictable behavior across the cluster.

**Image provenance** — only run images from trusted registries that you control or have vetted. Never pull images directly from public Docker Hub in production without first scanning them and promoting them through your own private registry. Use image digests (immutable SHA256 references) rather than tags (mutable — someone can push a new image with the same tag) to ensure you're running exactly the image you built and tested.

---

## 4. Kubernetes Security Best Practices

Kubernetes is powerful and flexible, which means it has many places where security can go wrong if you're not deliberately careful. Kubernetes security is about configuring the platform correctly so that the defaults protect you rather than expose you.

**API server security** — the Kubernetes API server is the control plane, the master switch for everything in your cluster. It must be protected aggressively. Access to the API server should require strong authentication (certificates or OIDC tokens, not basic passwords). The API server should not be exposed to the public internet — it should only be accessible from your private network or through a VPN. Every action against the API server is audited.

**RBAC (Role-Based Access Control)** — who is allowed to do what in your Kubernetes cluster? By default, service accounts have broad permissions they don't need. RBAC lets you define exactly what each user, service, and pipeline job is allowed to do — this pod can only list and get pods in namespace X, it cannot create, delete, or access other namespaces. Apply the principle of least privilege: every entity gets exactly the permissions it needs and nothing more. We'll cover RBAC design in depth in the next section.

**Network policies** — by default, every pod in a Kubernetes cluster can talk to every other pod across all namespaces. This is terrible from a security perspective. Network policies are rules that restrict which pods can communicate with which other pods. Your model serving pods should only accept traffic from the API gateway. Your training pods should only reach the feature store, not production databases. We'll cover this in detail in the Network Policies section.

**Pod security** — Kubernetes allows you to enforce security standards on pods at the cluster level. Pod Security Admission (the modern replacement for PodSecurityPolicy) lets you define baseline or restricted profiles that pods must comply with — enforcing non-root execution, read-only filesystems, no privileged containers — automatically across namespaces.

**Secrets management** — Kubernetes has a built-in Secret resource, but by default Secrets are stored in etcd (Kubernetes' data store) as base64-encoded text, which is not encryption. Anyone who can read etcd can read your secrets. You need to enable encryption at rest for Secrets in etcd, or better, use an external secrets management system like Vault and only pull secrets into pods at runtime without ever storing them in Kubernetes Secrets at all.

**Node security** — the nodes (the actual machines) running your Kubernetes workloads also need hardening. Each node runs a kubelet (the node agent) that also has an API — this should require authentication and authorization. Nodes should run minimal operating systems (like Bottlerocket or Flatcar) that have a much smaller attack surface than general-purpose Linux distributions. Node auto-repair and auto-upgrade ensure that OS-level vulnerabilities are patched promptly.

**Namespace isolation** — use Kubernetes namespaces to logically separate workloads. Different teams, different environments (dev/staging/prod), and different security domains get different namespaces. Combined with RBAC and network policies, namespaces create meaningful security boundaries within a single cluster.

---

## 5. RBAC Design Patterns

RBAC stands for Role-Based Access Control. Rather than assigning permissions directly to individual users (which doesn't scale and is impossible to audit), you define roles that represent a set of permissions, and then assign users or services to roles. The user inherits the permissions of their role.

In Kubernetes, RBAC has four key objects. A **Role** or **ClusterRole** defines a set of permissions — what actions (get, list, create, delete, patch) are allowed on what resources (pods, deployments, secrets, configmaps). A **RoleBinding** or **ClusterRoleBinding** assigns a role to a user, group, or service account, granting them those permissions.

The distinction between Role and ClusterRole: a Role is scoped to a specific namespace — it only grants permissions within that namespace. A ClusterRole applies cluster-wide, across all namespaces. Use namespace-scoped roles wherever possible and reserve cluster-wide roles for genuinely cluster-wide operations.

Now let's talk about practical design patterns because the technical primitives are simple, but designing RBAC well is nuanced.

**Least privilege by default** — every user, service account, and pipeline job starts with zero permissions and gets only what they specifically need. Never start with broad permissions and try to narrow them down — you'll always miss something. The question to ask for every permission: can this entity do its job without this permission? If yes, don't grant it.

**Separate roles for separate concerns** — rather than one "developer" role that can do everything, create distinct roles for distinct responsibilities. A role for viewing pod logs (read-only, useful for debugging). A separate role for deploying to a specific namespace. A separate role for managing secrets. Users who need multiple capabilities get multiple role bindings. This way, compromising any single credential only exposes the specific permissions of that role.

**Service account roles should be minimal** — the service accounts that your application pods use to talk to the Kubernetes API should have the most minimal permissions of all. A model serving pod almost certainly doesn't need any Kubernetes API access at all — it shouldn't have a service account with any permissions. A deployment controller needs to manage deployments in its namespace — nothing else. Creating overly permissive service accounts is a common mistake that creates serious risk if a pod is compromised.

**Avoid cluster-admin** — the cluster-admin ClusterRole gives complete, unrestricted access to everything in the cluster. In production, essentially nobody should have this role as their regular working role. Even cluster administrators should use it only for specific administrative tasks, with their regular working role being much more restricted.

**Groups over individual bindings** — rather than binding roles to individual users by name, bind them to groups. "All members of the ML-engineers group get the model-deployer role." When someone joins the team, add them to the group. When someone leaves, remove them from the group. You don't have to update dozens of individual role bindings.

**Regular auditing** — periodically review all role bindings and ask: does this person or service still need this permission? Has their role changed? Is there a service account that was created for a one-time task that still has broad permissions? RBAC permissions accumulate over time if not actively managed.

---

## 6. Network Policies

Imagine you're a company with several departments in an office building. Marketing, engineering, finance, HR. By default, anyone in the building can walk into any room and talk to anyone. From a security perspective this is terrible — a visitor who gets into the building can roam everywhere. You want locked doors: marketing can access common areas and the kitchen, engineering can access their floor and the server room, nobody except finance staff can enter the finance department.

Network policies in Kubernetes are those locked doors. They define which pods are allowed to send network traffic to which other pods and on which ports. Without network policies, any pod in your cluster can send TCP traffic to any other pod on any port. With network policies, you explicitly allow only the communication paths that are necessary.

Here's a concrete ML system example. Your model serving pods need to receive traffic from the API gateway, and they need to call the feature store to get input features. That's it. They should not be able to initiate connections to your training database, your user database, your secrets vault, or any arbitrary internet endpoint. A network policy for model serving pods would say: allow inbound traffic from API gateway pods on port 8080, allow outbound traffic to feature store pods on port 6379, deny everything else.

Network policies are defined as Kubernetes YAML resources that use label selectors to identify the pods they apply to. The policy selects pods with label `app: model-server` and defines ingress rules (who can send to them) and egress rules (where they can send to).

This matters for security because even if an attacker compromises your model serving pod — exploits a vulnerability in your model server code and gains code execution — network policies limit what they can do with that access. They can't reach your training database, they can't exfiltrate data to external servers (if you block arbitrary egress), they can't communicate with other compromised pods to coordinate an attack. The blast radius of a compromised pod is contained.

Important note: network policies require a Container Network Interface (CNI) plugin that supports them. Not all CNI plugins do. Calico, Cilium, and Weave all support network policies. The default networking that comes with some Kubernetes distributions does not.

**Default deny** is the recommended starting posture. You add network policies to each namespace that deny all ingress and all egress by default, then explicitly add allow policies for the communication paths you actually need. This ensures that any new pod you deploy starts isolated and you have to consciously decide what it's allowed to reach.

---

## 7. Secret Management Strategies

Every production system has secrets — passwords, API keys, database credentials, TLS certificates, tokens for external services. Managing these secrets is one of the most important and most often mishandled aspects of production security.

The single rule that everything else flows from: secrets must never be stored in source code, in container images, in plain text configuration files, or anywhere that's version-controlled. The moment a secret enters version control, it's potentially exposed forever, even if you delete it later — Git history preserves everything.

Let's talk about the spectrum of secret management approaches, from bad to good.

**Hardcoded secrets** — the worst approach. Database password written directly in the application code. This gets committed to version control, shared with every developer, and potentially exposed in logs. Never do this.

**Environment variables in plain Dockerfiles or Kubernetes manifests** — slightly better but still wrong. Secrets in your Kubernetes deployment YAML get committed to your GitOps repo. Anyone with read access to that repo has your production database password.

**Kubernetes native Secrets** — Kubernetes has a Secret resource. You create a secret in Kubernetes, and pods can mount it as an environment variable or a file. This keeps secrets out of application code and out of deployment manifests. The problem: Kubernetes Secrets are stored in etcd as base64-encoded values (NOT encrypted by default). They're not really secret — anyone with etcd access or broad Kubernetes API access can read them. Without encryption at rest enabled, Kubernetes Secrets are basically just slightly obfuscated environment variables.

**Kubernetes Secrets with encryption at rest** — significantly better. You configure Kubernetes to encrypt Secrets in etcd using a KMS provider (AWS KMS, Google Cloud KMS). Now secrets in etcd are actually encrypted and only decryptable with the KMS key. This is a reasonable approach for many organizations.

**External secrets management** — the gold standard. You use a dedicated secrets manager (Vault, AWS Secrets Manager, Google Secret Manager, Azure Key Vault) as the authoritative store for all secrets. Applications are not configured with secrets directly — instead, they authenticate to the secrets manager at startup and dynamically retrieve the secrets they need. The secrets are never stored anywhere except the secrets manager.

The advantage is centralized control: you can rotate secrets in one place and all applications pick up the new values. You can audit exactly who accessed which secret and when. You can grant and revoke access to secrets independently of application deployments.

For Kubernetes, the External Secrets Operator can sync secrets from external managers into Kubernetes Secrets automatically, giving you the best of both — your secrets live in Vault but pods can consume them as normal Kubernetes Secrets.

**Secret rotation** — secrets that never change become very dangerous over time. If a leaked database password was never rotated, it's still valid indefinitely. Automated secret rotation means your secrets management system periodically generates new credentials, updates the authoritative store, and updates dependent applications. AWS RDS has native support for automated password rotation through Secrets Manager.

---

## 8. Vault Concepts

HashiCorp Vault is the most widely used dedicated secrets management system in cloud-native environments. Understanding how Vault works conceptually gives you a foundation for understanding any secrets management system.

Vault is fundamentally a system for securely storing, accessing, and managing secrets. But what makes it more than just a fancy encrypted database is its sophisticated authentication, authorization, lease, and audit systems.

**Authentication methods** — before Vault gives you any secret, it must know who you are. Vault supports many authentication methods appropriate for different contexts. In Kubernetes, pods authenticate using their Kubernetes service account JWT token — the pod presents its token, Vault verifies it with the Kubernetes API server, and if the service account is recognized, Vault returns an access token. Applications can also authenticate using cloud IAM roles (AWS IAM, GCP service accounts), TLS client certificates, LDAP, or GitHub tokens. The key insight: the application never has a hardcoded long-lived credential — it authenticates using an identity that already exists in the environment (the pod's service account, the cloud instance's IAM role) and gets a short-lived Vault token in return.

**Policies** — after authentication, Vault checks what the authenticated identity is allowed to access. Vault policies are written in HCL (or JSON) and define which paths (secret storage locations in Vault) can be accessed and with which operations (read, write, list, delete). The training service's policy might grant read access to `secret/data/database/training-db`. It cannot access `secret/data/database/production-db` or any other secret. Policies implement least privilege at the secrets layer.

**Secret engines** — Vault has multiple secret engines for different types of secrets, and this is what makes Vault genuinely powerful beyond just being a key-value store.

The **KV (key-value) secret engine** stores static secrets — you put a value in and read it out. Simple and useful for passwords and API keys that you manage manually.

The **Database secret engine** is transformative. Instead of storing database credentials that you then distribute to applications, Vault generates dynamic credentials on demand. When your application starts and needs a database connection, it requests credentials from Vault. Vault connects to your database and creates a new, unique username and password with appropriate permissions, with a time-limited lease (say, 1 hour). It returns these credentials to your application. When the lease expires, Vault automatically revokes those credentials. Your application never has long-lived database credentials — it gets fresh ones on demand that expire automatically. Even if those credentials are somehow leaked, they expire in an hour.

The **PKI secret engine** is a certificate authority built into Vault. Instead of managing TLS certificates manually, Vault issues short-lived certificates on demand. Services authenticate to Vault, request a certificate, use it for TLS, and it expires after hours or days. Short-lived certificates are far more secure than long-lived certificates because compromised certificates expire quickly.

**Leases and renewal** — all dynamic secrets Vault generates have a lease — a time-to-live. Applications must renew their leases (prove they're still running legitimately) or the secret gets revoked. If an application is compromised and the attacker tries to keep using the credentials, they'll eventually expire. If you detect a compromise, you can revoke all secrets immediately rather than changing passwords everywhere.

**Audit logging** — every single operation against Vault is logged: who authenticated, which secrets were accessed, when, from what IP. This creates a complete audit trail for security investigation and compliance purposes.

---

## 9. Policy as Code (OPA Concepts)

Your organization has many security and compliance requirements. Access control rules, data handling requirements, infrastructure configuration standards, naming conventions. Traditionally, these policies lived in documents, in people's heads, or in manual review checklists. The problem: they were inconsistently applied, easy to bypass accidentally, and impossible to verify automatically.

Policy as Code means encoding these organizational rules as machine-readable code that can be automatically evaluated and enforced. If your policy says "all production containers must run as non-root," that rule should be evaluated automatically on every deployment attempt, not checked by a human reviewer who might miss it.

Open Policy Agent (OPA) is the most widely adopted policy engine in the cloud-native ecosystem. It provides a general-purpose policy engine and a declarative policy language called Rego.

The OPA model is straightforward. You write policies in Rego that express rules about data. OPA receives a query with context (a request to do something, along with information about what that something is), evaluates it against your policies, and returns a decision: allow or deny, with an explanation.

Let's make this concrete. You have a policy: "No container in production may run as root, expose privileged access, or mount the host filesystem." You write this in Rego as a set of rules. When a developer tries to deploy a pod to your Kubernetes cluster, OPA (running as a webhook admission controller in Kubernetes) intercepts the request. It evaluates the pod specification against your Rego policies. If the pod tries to run as root, OPA returns a denial with a message explaining why. Kubernetes rejects the deployment. The developer sees a clear error explaining what they need to fix.

This means the policy is enforced automatically, consistently, on every deployment, with no possibility of human error or intentional bypass. The policy is in version control like code. You can test it with unit tests. You can see the history of policy changes. Everyone can read the policy and understand exactly what's allowed.

In Kubernetes specifically, OPA Gatekeeper is a popular implementation. You define ConstraintTemplates (which define the structure of a policy type) and Constraints (specific instances of policies). For example: a ConstraintTemplate defines "required labels" policies, and a Constraint says "all pods in the production namespace must have labels: `team`, `app`, and `version`." Every pod creation is checked against this.

Beyond Kubernetes admission control, OPA is used for API authorization (can this user with these roles perform this action?), infrastructure validation (does this Terraform plan violate our cloud configuration standards?), data access control (can this user query this data?), and CI/CD gate checks (does this deployment satisfy our security requirements?).

The transformative benefit is that organizational policies become a first-class technical artifact — testable, versionable, auditable, and automatically enforced — rather than a document that people try their best to follow.

---

## 10. Image Scanning & Vulnerability Management

Every container image you build and run contains software — your application code, language runtimes, system libraries, base OS utilities. Any of these components might have known security vulnerabilities. Image scanning is the automated process of checking every layer of your container image against databases of known vulnerabilities (CVEs — Common Vulnerabilities and Exposures) and reporting what's found.

The CVE database is maintained by security researchers and organizations who discover, document, and publish information about vulnerabilities in software packages. When a vulnerability is discovered in OpenSSL, for example, it gets assigned a CVE number with a severity score, affected versions, and remediation information. Image scanning tools check every package in your image against this database.

Image scanners like Trivy, Snyk, Clair, Grype, and AWS ECR image scanning work by extracting the list of installed packages and their versions from every layer of your container image, then looking up each package-version combination against CVE databases. They produce a report: you have 47 vulnerabilities — 2 critical, 8 high, 15 medium, 22 low.

But just having a list of vulnerabilities is not enough. Vulnerability management is the process of deciding what to do about them and ensuring they're addressed systematically.

**Severity triage** — not all vulnerabilities are equally urgent. Critical vulnerabilities with available exploits that affect a key system component need immediate remediation. A low-severity vulnerability in a library you don't actually use is much lower priority. You need a process for triaging and prioritizing.

**Remediation** — the primary fix is usually updating the affected package. This means updating your base image (switching from `python:3.9-slim` to the latest version that has patched packages), updating dependency versions in your requirements.txt or package.json, or switching to a more minimal base image that doesn't include the vulnerable package at all.

**Policy enforcement** — your CI/CD pipeline should fail if an image has critical vulnerabilities. You define the threshold: critical vulnerabilities block deployment always. High vulnerabilities block deployment unless explicitly acknowledged with a documented exception. This is automated and non-negotiable, not a suggestion.

**Continuous scanning** — scanning images only at build time is insufficient because new vulnerabilities are discovered constantly. An image you scanned six months ago as clean might have three new critical vulnerabilities today in packages that weren't known to be vulnerable then. Your container registry should continuously re-scan stored images and alert when new vulnerabilities are discovered in images already in production.

**Vulnerable dependency tracking for ML** — ML systems often depend on scientific Python packages (numpy, scipy, pandas, PyTorch, TensorFlow) that have complex dependency trees. A vulnerability in a transitive dependency (a dependency of a dependency) is easy to miss. Dedicated tools for Python like `pip-audit` or `safety` scan your Python environment specifically and are valuable additions to general container scanning.

---

## 11. Supply Chain Security

In 2020, SolarWinds was compromised in one of the most sophisticated cyberattacks in history. The attackers didn't break into SolarWinds' customers directly. They compromised SolarWinds' own build process and inserted malicious code into SolarWinds' legitimate software update, which then got distributed to 18,000 organizations that trusted SolarWinds. This is a supply chain attack — instead of attacking the target directly, you attack the chain of trust that the target depends on.

Software supply chain security is about ensuring that every component of your software system — the code you write, the open-source libraries you use, the build tools that compile your code, the CI/CD pipeline that deploys it, the container images you run — is exactly what it's supposed to be and hasn't been tampered with.

The software supply chain for your ML system is long. Your training code depends on Python packages from PyPI. Your container is based on a public base image from Docker Hub. Your CI/CD pipeline uses open-source actions from GitHub Actions marketplace. Your infrastructure is provisioned with Terraform modules from public registries. Each of these is a trust relationship — you're trusting that the thing you're pulling down is legitimate and uncompromised.

**Dependency integrity** — when you install a Python package, you're trusting that the package on PyPI is the legitimate version from the legitimate maintainer, not a malicious package with the same name or a compromised version. Pinning exact versions with hashes (in requirements.txt with `--hash` flags or in package-lock.json) ensures you get exactly the same bytes every time and can detect if a package has been modified.

**Typosquatting** is a supply chain attack where an attacker publishes a malicious package with a name very similar to a popular legitimate package — `requets` instead of `requests`, `pytorch-lightning-bolts` instead of `pytorch-lightning`. Developers make typos or copy commands from malicious tutorials and install the wrong package. Scanning for known typosquatting attempts and having clear approved package lists helps mitigate this.

**Private registries** — rather than pulling public images and packages directly from the internet during every build and deployment, pull from your own private registry (or a local mirror) that you control. This means: you explicitly approve and promote packages into your private registry after scanning them, production deployments never go to the public internet for dependencies, and you have an audit trail of exactly what was used.

**Artifact signing and verification** — every artifact produced by your build process (container images, Python packages, Terraform modules, model artifacts) should be cryptographically signed using tools like Sigstore/Cosign. Downstream consumers (your deployment infrastructure, other teams using your model) can verify the signature before using the artifact, ensuring it came from your legitimate build process and hasn't been modified.

**Build provenance** — SLSA (Supply chain Levels for Software Artifacts, pronounced "salsa") is a framework for describing and verifying how software was built. You generate an attestation — a signed document that describes exactly which source code, at which commit, was built by which pipeline, at which time, using which tools, to produce which artifact. Anyone can verify this attestation and confirm the artifact's origin.

---

## 12. SBOM in Production Systems

SBOM stands for Software Bill of Materials. The analogy is to a physical product's bill of materials — the complete list of every component and raw material that goes into a manufactured product. If there's a recall because a specific bolt type is defective, a manufacturer with a complete bill of materials can immediately identify every product that contains that bolt. Without it, they have to inspect every product individually.

An SBOM is the equivalent for software — a complete, machine-readable inventory of every component in your software: every library, every package, every module, their versions, their licenses, their known vulnerabilities, and their relationships to each other.

Why does this matter in production? When a new critical vulnerability is discovered — like the Log4Shell vulnerability in 2021 that affected almost every Java application — organizations without SBOMs had to manually search through their codebases trying to figure out if they used Log4j and where. Organizations with SBOMs could run a query against their inventory and immediately answer: "We have Log4j 2.14.0 in the following 14 production services, all of which need to be patched." The difference was hours of detective work versus minutes of automated search.

SBOMs are generated as part of your CI/CD pipeline using tools like Syft, Anchore, or Trivy. When you build a container image or application package, the tool scans it and produces an SBOM in a standard format — CycloneDX or SPDX are the dominant standards. These SBOM documents are stored alongside your artifacts and indexed for querying.

**What an SBOM contains** — the name and version of every package, the package manager it came from (pip, npm, apt, etc.), its license, its known vulnerabilities at time of generation, the hash of the package for integrity verification, and parent-child relationships (which package depends on which).

**License compliance** — this is an underappreciated SBOM use case. Different open-source licenses have different requirements. Using a GPL-licensed library in certain ways requires you to open-source your own code. Using an AGPL library has implications for web services. An SBOM lets you automatically audit the licenses of every dependency and catch licensing conflicts before they become legal problems.

**For ML systems specifically**, your models themselves should have SBOMs of a sort — model cards that document what training data was used, what preprocessing was applied, what framework and version trained the model, what the evaluation metrics are. This is model provenance documentation, and it's becoming increasingly important for compliance and governance as AI regulation evolves.

---

## 13. Compliance & Audit Logging

Compliance means adhering to regulatory requirements and industry standards that govern how you handle data, operate systems, and protect user privacy. GDPR, HIPAA, SOC 2, PCI-DSS, ISO 27001 — these regulations and standards impose specific requirements on your systems and processes. Audit logging is the technical foundation that proves compliance and supports investigation when things go wrong.

An audit log is a chronological record of events in your system — who did what, to what, when, and from where. Every API call, every database query, every secret access, every configuration change, every deployment, every login — all recorded with sufficient detail to answer: who made this change and why?

**What to log** — for a compliant ML system, you need audit logs at multiple layers. At the infrastructure layer: who logged into which server, who accessed the Kubernetes API and what did they do, who modified network policies or security groups. At the application layer: who called the model API, what inputs did they send, what predictions were returned. At the data layer: who queried training data, who exported data, what transformations were applied. At the secrets layer: which service accessed which secret and when.

**What a good audit log entry contains** — the timestamp (in UTC, to millisecond precision), the identity of who performed the action (username, service account, IP address), the action that was performed, the resource it was performed on, whether it succeeded or failed, and a session or request ID that lets you correlate related events.

**Log integrity** — audit logs are only useful if they can be trusted. If an attacker can modify or delete log entries after compromising a system, they can cover their tracks. Audit logs must be written to an append-only, tamper-evident system. They should be shipped to a separate, highly secured logging system immediately — never stored only on the machine that generated them. Some compliance regimes require cryptographic signing of log entries to detect modification.

**Retention** — regulations specify how long you must retain audit logs. HIPAA requires 6 years. PCI-DSS requires at least 1 year with 3 months immediately available. You need to store logs long enough to satisfy your regulatory requirements, with appropriate access controls so only authorized people can access them.

**Centralized log aggregation** — in a microservices system with many containers running across many nodes, logs from thousands of sources need to be collected and correlated in a central system. The ELK stack (Elasticsearch, Logstash, Kibana), Splunk, and Datadog are common platforms. They provide search, alerting, and visualization across all your audit logs in one place.

**Audit log alerting** — audit logs aren't just for after-the-fact investigation. Real-time analysis of audit logs can detect attacks in progress. Multiple failed login attempts — possible brute force. A service account suddenly accessing secrets it never accessed before — possible credential theft. A user downloading an unusually large amount of data — possible exfiltration. SIEM (Security Information and Event Management) systems like Splunk or cloud-native solutions like AWS Security Hub analyze audit logs in real time and alert on anomalous patterns.

**For ML systems specifically** — if your model makes predictions that influence credit decisions, healthcare recommendations, or other consequential outcomes, regulators may require you to log every prediction with the inputs that drove it, the model version that made it, and the confidence score. This creates an audit trail for model decisions that can be reviewed if a user disputes an outcome.

---

## 14. Access Control & Identity Management

Every person, service, and system that interacts with your ML platform has an identity, and that identity should determine exactly what they're allowed to do. Access control is the system of rules that makes these decisions. Identity management is the system that manages those identities and their lifecycles.

**Authentication vs Authorization** — these are frequently confused but critically distinct. Authentication is proving who you are — presenting credentials (password, certificate, token) and having them verified. Authorization is determining what you're allowed to do given who you are — your authenticated identity is checked against access control policies. You must authenticate before authorization can happen, but authentication alone doesn't grant any access.

**Identity management** covers the full lifecycle of identities in your organization. Provisioning (creating an account when someone joins), managing (updating permissions as roles change), and deprovisioning (revoking access completely and immediately when someone leaves). A common security failure is failing to revoke access promptly — an ex-employee or departed contractor still having valid credentials weeks after leaving.

**SSO (Single Sign-On)** — rather than having separate usernames and passwords for Kubernetes, your model registry, your data platform, your CI/CD system, and every other tool, SSO means your organization has one central identity provider (Okta, Azure AD, Google Workspace) and all systems delegate authentication to it. You log in once to your identity provider, and that authentication is accepted everywhere. When someone leaves the organization and their account is disabled in the identity provider, their access to every connected system is simultaneously revoked.

**Service identities** — humans aren't the only entities that need identities. Every service in your system needs an identity so other services can verify who they're talking to. In Kubernetes, service accounts provide identity for pods. In cloud environments, IAM roles provide identity for cloud resources. The principle is the same: services should authenticate to each other using cryptographically verifiable identities, not shared passwords or tokens.

**Privileged Access Management (PAM)** — some users need elevated, privileged access occasionally — system administrators, security engineers, on-call responders. This privileged access is high-risk and should be tightly controlled. PAM systems provide just-in-time access: you request elevated access for a specific task, it's granted temporarily (with full audit logging), and it expires automatically after a defined period. Nobody has persistent privileged access — they request it when needed and it goes away when the need passes.

**Multi-Factor Authentication (MFA)** — passwords alone are insufficient for any serious production system. A stolen password gives complete access. MFA requires a second factor — typically a time-based one-time password from an authenticator app, a hardware security key, or a biometric. Even if a password is phished or leaked, the attacker can't log in without the second factor. MFA should be mandatory for all human access to production systems.

**Attribute-Based Access Control (ABAC)** — more sophisticated than pure RBAC, ABAC makes access decisions based on multiple attributes simultaneously. Not just "is this user in the ML-engineers group" but "is this user in the ML-engineers group AND accessing from a corporate IP AND during business hours AND requesting access to non-production data." ABAC enables fine-grained policies that RBAC can't express.

---

## 15. Zero Trust Architecture Concepts

Zero Trust is a security model and philosophy whose core principle is: never trust, always verify. Traditional network security was built on the concept of a perimeter — everything inside the corporate network is trusted, everything outside is untrusted. You put up a strong firewall, and within the firewall, systems trust each other implicitly. The problem with this model has become starkly apparent: once an attacker gets inside the perimeter — through a phishing attack, a compromised VPN credential, a malicious insider — they can move freely everywhere. The perimeter model creates a hard shell with a soft interior.

Zero Trust eliminates the concept of a trusted perimeter entirely. The assumption is that the network is already compromised. There is no such thing as a trusted network location. Traffic from inside your data center is no more trusted than traffic from the public internet. Every request, from every source, must be authenticated, authorized, and validated. Every time. No exceptions.

Let's break down what this means in practice.

**Identity is the new perimeter** — instead of "this traffic is coming from inside our network, therefore it's trusted," the question is "this traffic is coming from an authenticated identity with these verified attributes, is this request authorized given those attributes?" The answer is evaluated for every single request, not just at the network boundary.

**Microsegmentation** — instead of one big trusted internal network, you segment your network into very small zones where communication between zones requires explicit authorization. Your model serving service can only communicate with specific services it's explicitly allowed to reach. If the model server is compromised, the attacker is isolated in a tiny segment and cannot move to the database, the training system, or the secrets manager.

**Continuous verification** — in a traditional model, once you're authenticated (you log in at 9am), you're trusted until you log out. Zero Trust continuously re-evaluates trust. Is this user still in a normal location? Is their access pattern normal for their role? Has their device's security posture changed? If something looks anomalous mid-session, trust is reassessed and potentially revoked.

**Least privilege access** — a fundamental principle of Zero Trust is that every identity (human or machine) has access to only the minimum resources required to do their job, and that access expires. No persistent broad access. Just-in-time, just-enough access.

**Assume breach** — Zero Trust design starts from the assumption that your system will be breached, and designs to limit the damage. Every system boundary enforces authentication and authorization. Blast radius is minimized through microsegmentation. Detection and response capabilities are built in because you assume you need them.

**Device trust** — in Zero Trust, it's not enough to verify who the user is. You also verify the device they're using. Is it a managed corporate device? Is the OS patched? Is endpoint protection running? An authenticated user on a compromised personal laptop is a very different risk profile than the same user on a managed, patched corporate device. Device posture affects what level of access is granted.

**For ML systems in practice**, Zero Trust means: every service-to-service call uses mutual TLS with verified certificates. No service trusts another service just because they're in the same Kubernetes cluster. Every API request to your model serving layer requires authentication and authorization regardless of origin. Access to training data and model artifacts requires authenticated identity and explicit authorization, logged for audit. Your CI/CD pipeline's access to production is just-in-time and just-enough, not persistent broad credentials.

The practical implementation of Zero Trust in cloud-native environments combines several of the concepts we've already covered: service mesh for mutual TLS between services, OPA for policy evaluation on every request, Vault for dynamic short-lived credentials, strong IAM with MFA for human access, network policies for microsegmentation, and comprehensive audit logging for continuous monitoring.

Zero Trust is not a product you buy or a configuration you switch on. It's a design philosophy that you implement progressively, layer by layer, across your entire system. Most organizations start with the highest-risk areas — production access, sensitive data access, administrative privileges — and progressively extend Zero Trust principles to the rest of their infrastructure over time.

---

The single idea that connects all of them is this: security is not a feature you add at the end. It's a set of constraints and practices woven into every design decision, every deployment, every access request, and every line of infrastructure configuration. Every concept here — from container hardening to Zero Trust — is a specific answer to a specific question: what happens when an attacker gets in, and how do we limit the damage they can do?
