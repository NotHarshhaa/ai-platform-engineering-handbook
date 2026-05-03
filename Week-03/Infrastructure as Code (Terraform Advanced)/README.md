# Infrastructure as Code (Terraform Advanced)

---

## 1. Infrastructure as Code Principles

Let's start from the very beginning and understand why Infrastructure as Code exists, because once you understand the problem it solves, every other concept in this section makes intuitive sense.

Before Infrastructure as Code, provisioning infrastructure meant logging into a web console, clicking through menus, filling out forms, and manually configuring servers, networks, databases, and load balancers. This approach has a name — ClickOps — and it has serious, fundamental problems.

The first problem is reproducibility. If you manually configured a production environment over six months, clicking through hundreds of settings across dozens of services, can you reproduce that exact environment? Maybe. But it will take another six months, you'll forget things, you'll make slightly different choices, and your new environment will be subtly different from the original in ways that cause mysterious bugs. The environment exists in your hands and your memory, not in any durable, transferable form.

The second problem is collaboration. Your infrastructure configuration lives nowhere that your team can see, review, or contribute to. If you get hit by a bus tomorrow, nobody knows exactly how the infrastructure was configured. There's no version history, no code review, no way to understand why a particular setting was chosen.

The third problem is consistency across environments. You have development, staging, and production environments. They should be as similar as possible to ensure that what works in staging actually works in production. But with manual configuration, they inevitably drift apart. Someone changes a setting in production to fix an incident and forgets to make the same change in staging. Now they're different in ways nobody documented.

The fourth problem is speed and scale. Manually provisioning a new environment takes days or weeks. Running experiments that need temporary infrastructure means waiting for someone to set it up. Scaling out requires manually repeating the same steps across many resources.

Infrastructure as Code solves all of these by treating your infrastructure configuration the same way you treat application code. You write files that describe what infrastructure you want, store those files in version control, review changes through pull requests, and run automated tools that read your files and create the infrastructure they describe.

The core principles that define good Infrastructure as Code practice:

**Everything is in version control** — every piece of infrastructure configuration is checked into Git. Every change goes through a pull request. Every configuration has a commit history that answers who changed what, when, and why. If production is on fire, you can look at recent commits and immediately see what changed. You can revert to a previous state by reverting a commit. The infrastructure's history is as auditable as the application code's history.

**Infrastructure is reproducible** — given the same code, you should always get the same infrastructure. Running your Terraform code today and running it again in six months should produce identical infrastructure. This means no manual steps outside the code, no undocumented one-time configurations, no "oh, I also had to do this thing manually."

**Infrastructure is idempotent** — you can run your IaC tool multiple times against existing infrastructure without breaking anything. If the desired state matches the current state, nothing happens. If they differ, only the differences are applied. Running Terraform against infrastructure that's already in the right state makes no changes.

**Environments are cattle, not pets** — traditional servers were treated like pets: given names, carefully maintained, kept running for years. Infrastructure as Code environments are cattle: if one breaks, you don't fix it, you destroy it and create a new identical one from code. This is only possible because all configuration is in code — you're never afraid to delete something because you know exactly how to recreate it.

**Self-documenting** — your IaC code is the documentation of your infrastructure. Someone joining the team reads the Terraform files and understands the complete infrastructure topology, configurations, and relationships. No separate, inevitably outdated infrastructure documentation documents needed.

---

## 2. Declarative vs Imperative Infrastructure

This is a fundamental concept that underlies how Terraform and tools like it work, and understanding the difference deeply will make you a much better infrastructure engineer.

**Imperative** means you write instructions that describe the steps to achieve a result. You tell the computer exactly what to do, in what order. You are describing the process.

Here's an imperative approach to creating a server: "Check if a server named web-server-1 exists. If it doesn't exist, create it with these specifications. Then check if the security group exists. If it doesn't, create it. Then attach the security group to the server."

Notice that you have to think about the current state yourself. You have to check what exists, handle cases where things do or don't exist, and write different code paths for different scenarios. If you run this script twice and the server already exists from the first run, you need to handle that case explicitly — otherwise you might try to create a duplicate and fail.

Most traditional programming and scripting is imperative. Bash scripts that provision infrastructure are imperative. AWS CLI commands run in sequence are imperative. Ansible in its earlier form was largely imperative.

**Declarative** means you write a description of the desired end state. You tell the computer what you want to exist, not how to create it. The tool figures out the steps to get from the current state to your desired state.

Here's a declarative approach to the same server: "There should exist a server named web-server-1 with these specifications, attached to a security group with these rules."

That's it. You don't check if it exists first. You don't write different code for create vs update vs no-change scenarios. You just describe what you want. Terraform reads your description, figures out what currently exists, calculates the difference between current state and desired state, and executes only the steps needed to close that gap.

If the server doesn't exist, Terraform creates it. If it already exists with the right specs, Terraform does nothing. If it exists but with wrong specs, Terraform modifies only the specific attributes that are wrong. You don't think about any of this — you just write the desired state and Terraform handles the transition.

This has profound implications for how you write and reason about infrastructure.

**Declarative code is self-healing** — if someone manually changes infrastructure outside of Terraform (someone goes into the AWS console and changes a setting), your declarative code still describes what it should look like. The next time you run Terraform, it detects the drift and corrects it back to the declared state. Imperative scripts don't have this property — they don't know what currently exists, so they can't detect or correct drift.

**Declarative code is easier to read and reason about** — you can look at a Terraform file and immediately understand what the infrastructure looks like. It's a description of reality, not a series of steps to build reality. New team members can understand your infrastructure by reading the declarations, without needing to mentally trace through procedural logic.

**The tradeoff** — declarative systems can feel like magic because you don't control the steps. When something goes wrong, debugging requires understanding how the tool interprets your declarations, which can be less intuitive than debugging step-by-step procedural code. Understanding Terraform's plan output is essential for this reason — it's the window into how Terraform interpreted your declarations and what steps it plans to take.

Terraform is declarative. You declare desired state in HCL (HashiCorp Configuration Language). Terraform handles the imperative steps to get there.

---

## 3. Terraform Architecture Overview

Understanding how Terraform is actually structured internally helps you understand why it behaves the way it does, why certain operations are fast and others slow, and how to debug problems when they arise.

Terraform has several major components that work together.

**Terraform Core** is the brain of the operation. It's the binary you download and run. It reads your configuration files, builds an internal graph of all the resources you've declared and their relationships, calculates the difference between your desired state and the current state, and determines what operations need to happen and in what order. Core doesn't know anything about specific cloud providers or services — it doesn't know what an AWS EC2 instance or a Kubernetes namespace is. It only knows about the abstract concepts of resources, data sources, providers, and state.

**Providers** are plugins that extend Terraform Core with knowledge of specific platforms. The AWS provider teaches Terraform how to create, read, update, and delete AWS resources. The Kubernetes provider teaches it about Kubernetes resources. The Google Cloud provider, the Azure provider, the Vault provider, the Datadog provider — there are over a thousand providers in the public registry, and you can write custom private providers for internal platforms.

Providers are separate binaries from Terraform Core. When you run `terraform init`, Terraform downloads the provider plugins your configuration requires and stores them locally. Providers are versioned separately from Terraform Core, which means you can update Terraform Core independently from provider updates, and you can pin specific provider versions to ensure consistent behavior.

**Resources** are the actual infrastructure objects declared in your configuration — an EC2 instance, a VPC, a Kubernetes namespace, a Route53 DNS record. Each resource type is defined by a provider, which tells Terraform what attributes it has, which are required vs optional, and how to create/read/update/delete it through the provider's API.

**Data Sources** are how you read information about existing infrastructure that Terraform doesn't manage. If you have an existing VPC that was created outside of Terraform and you want to deploy resources into it, you use a data source to query information about that VPC. Data sources are read-only — they don't create or modify anything, they just fetch information.

**State** is Terraform's record of what infrastructure it has created and what the current attributes of that infrastructure are. This is a critical concept and we'll cover it in depth in its own section, but architecturally, state is how Terraform Core knows what already exists so it can calculate what needs to change.

**The execution model** — when you run `terraform plan`, here's what happens internally: Terraform reads all your .tf configuration files and builds a complete in-memory representation of your desired state. It reads the current state from the state file. It calls the relevant providers to refresh its knowledge of current resource attributes (checking if attributes have changed outside of Terraform). It builds a directed acyclic graph (DAG) of all resources and their dependencies, which determines the correct order of operations. It walks the graph, comparing desired state to current state for each resource, and produces a list of operations: create, update, or delete. This list of operations is the plan you review before applying.

When you run `terraform apply`, it executes those operations in the correct dependency order, calling the provider APIs to create, update, or delete each resource, and updates the state file to reflect the new reality after each operation.

---

## 4. Providers & Resources

Providers and resources are the vocabulary of Terraform. Once you understand how they work, reading and writing Terraform code becomes intuitive.

**Providers** are the adapters between Terraform and the outside world. Each provider is responsible for a specific API or platform. The AWS provider talks to the AWS API. The Kubernetes provider talks to the Kubernetes API. The GitHub provider talks to the GitHub API. The Cloudflare provider talks to Cloudflare's API.

In your Terraform configuration, you declare which providers you're using in a `required_providers` block, specifying the source (usually the Terraform Registry) and a version constraint:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}
```

Then you configure each provider — telling it how to authenticate and what default settings to use:

```hcl
provider "aws" {
  region = "us-east-1"
}
```

Providers handle authentication to their respective APIs. The AWS provider can authenticate using environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), IAM instance profiles, AWS SSO, or explicit credentials in the provider block. The Kubernetes provider can authenticate using a kubeconfig file, a service account token, or cluster certificate data.

**Resources** are the individual infrastructure objects you declare. Each resource has a type (defined by the provider), a local name (used to reference it within your Terraform code), and a body of configuration arguments.

```hcl
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  
  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

Here `aws_instance` is the resource type (provided by the AWS provider), `web_server` is the local name you've given it, and the block contains the configuration arguments for this specific instance.

Resource types follow a naming convention: the prefix matches the provider. `aws_instance`, `aws_s3_bucket`, `aws_vpc` are all AWS resources. `kubernetes_deployment`, `kubernetes_namespace`, `kubernetes_service` are all Kubernetes resources.

**Resource attributes** have two categories: arguments (inputs you provide to configure the resource) and attributes (values that are known only after the resource is created — like the ID or IP address that AWS assigns). You reference a resource's attributes in other resources using the syntax `resource_type.local_name.attribute`:

```hcl
resource "aws_eip" "web_ip" {
  instance = aws_instance.web_server.id  # References the ID of the instance above
}
```

This reference also creates an implicit dependency — Terraform knows it must create `aws_instance.web_server` before `aws_eip.web_ip` because the EIP needs the instance's ID.

**Data sources** look similar to resources but are prefixed with `data`:

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical's AWS account
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}
```

This queries AWS for the most recent Ubuntu 22.04 AMI without creating anything. You then reference it as `data.aws_ami.ubuntu.id`.

---

## 5. Terraform State Management

State is one of the most important and most misunderstood aspects of Terraform. Getting state management wrong is the source of the majority of serious Terraform problems in production. Understanding it deeply is essential.

Terraform maintains a state file — by default named `terraform.tfstate` — that records what infrastructure Terraform has created and the current known attributes of that infrastructure. This file is Terraform's map of the real world. Without it, Terraform has no memory of what it has done.

Here's why state is necessary. Your Terraform configuration describes desired state. The real world has current state. To calculate what needs to change, Terraform needs to know both. The configuration file gives it desired state. The state file gives it a record of current state. Terraform compares the two and produces a plan.

Without state, Terraform would have no choice but to query every possible resource in your cloud account on every run to figure out what currently exists — which would be impossibly slow and still wouldn't reliably work because it couldn't know which resources in your account belong to this Terraform configuration vs resources created by other means.

**What the state file contains** — for every resource Terraform manages, the state file records: the resource type and local name, all the configuration arguments you provided, and all the attributes of that resource including ones assigned by the cloud provider after creation (like the AWS-assigned resource ID, IP addresses, ARNs). When you run `terraform plan`, Terraform compares the configuration to the state (and optionally refreshes the state by querying the provider API) to determine what has changed.

**State file format** — the state file is JSON. You can open it and read it. This is also a security concern — if your configuration includes sensitive values (passwords, keys), they end up in the state file in plain text. This is why securing access to your state file is critical.

**State drift** — drift happens when real infrastructure diverges from what's recorded in state. This can happen when someone modifies infrastructure manually outside of Terraform (going into the AWS console and changing a setting), when a resource changes state on its own (an EC2 instance is terminated by AWS due to a billing issue), or when the state file becomes inconsistent with reality for other reasons. Running `terraform refresh` updates the state file to reflect current reality without making any changes to infrastructure.

**terraform state commands** — Terraform provides a set of commands for directly manipulating state when necessary. `terraform state list` shows all resources tracked in state. `terraform state show resource_type.name` shows the state of a specific resource. `terraform state mv` moves a resource in state — used when you rename a resource in your configuration and need state to follow. `terraform state rm` removes a resource from state without destroying it — used when you want Terraform to stop managing a resource without deleting the actual infrastructure. `terraform import` adds an existing resource that was created outside Terraform into state so Terraform can manage it going forward.

These commands are powerful and should be used carefully. Corrupting state is one of the most painful situations in Terraform because it can cause Terraform to try to create resources that already exist or lose track of resources it should be managing.

---

## 6. Remote Backends & State Locking

By default, Terraform stores state in a local file. This works fine for individual experimentation but is completely unworkable for teams. If three engineers each have their own local state file, they have three divergent views of the infrastructure. If two engineers run `terraform apply` simultaneously, they'll corrupt each other's state. If a state file is lost or deleted, Terraform loses its map of the infrastructure.

Remote backends solve these problems by storing state in a shared, centralized location that all team members and CI/CD systems access.

**Remote backends** are storage systems where Terraform writes and reads its state file. The most commonly used backends are AWS S3, Google Cloud Storage, Azure Blob Storage, and Terraform Cloud. Instead of a local file, state lives in a cloud object store that all members of the team access.

Configuring a remote backend in Terraform looks like this:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/ml-platform/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

This tells Terraform to store state in an S3 bucket at a specific path. The `encrypt = true` ensures the state file is encrypted at rest. The `dynamodb_table` reference is for state locking.

**State locking** is the mechanism that prevents two Terraform operations from running simultaneously against the same state, which would corrupt it. When you run `terraform apply`, Terraform first tries to acquire a lock on the state. If the lock is held by another process (another engineer or CI/CD run is in progress), Terraform waits or fails with an error telling you the lock is held and by whom. After the apply finishes, the lock is released.

For S3 backends, locking is implemented using a DynamoDB table. Terraform creates a record in DynamoDB when it acquires a lock and deletes it when done. DynamoDB's conditional writes ensure that only one process can acquire the lock at a time. For GCS backends, locking uses GCS object locking. For Terraform Cloud, locking is built into the service.

**State file organization** — as your infrastructure grows, you'll have state for many different components and environments. How you organize state files matters. The key principle: state should be scoped to what can change together and what has similar blast radius. If your networking infrastructure and your ML training infrastructure are in the same state file, then every Terraform operation that touches networking must have access to the full state including ML training resources. This creates unnecessary coupling.

Common organization patterns: one state file per environment per component — `production/networking/terraform.tfstate`, `production/ml-platform/terraform.tfstate`, `staging/networking/terraform.tfstate`. This scopes blast radius and access control — the team managing ML infrastructure doesn't need access to the networking state and can't accidentally destroy networking resources.

**State file security** — because state contains sensitive values in plain text, the S3 bucket or GCS bucket storing state must have strict access controls. Only the engineers and CI/CD systems that legitimately need to manage that infrastructure should have read/write access. Enable bucket versioning so you can recover from accidental state corruption. Enable server-side encryption. Block public access completely.

---

## 7. Terraform Modules & Reusability

As your Terraform codebase grows, you'll find yourself writing the same patterns over and over. Every time you create a new ML training environment, you create a VPC, subnets, security groups, IAM roles, EFS for shared storage, an EKS cluster, node groups, and a set of Kubernetes namespaces — in the same pattern, with the same relationships, but with different names and slightly different sizes. Writing all of that from scratch every time is tedious, error-prone, and means any improvement to the pattern needs to be applied in dozens of places.

Modules are Terraform's mechanism for abstraction and reuse. A module is a collection of Terraform configuration files in a directory that encapsulate a pattern, expose inputs, and produce outputs. You write the pattern once and call it multiple times with different inputs.

Think of a Terraform module like a function in programming. A function has parameters (inputs), a body of logic, and a return value (outputs). A module has input variables (the parameters), a set of resources and data sources (the body), and output values (the return values).

Here's what a simple module structure looks like. You create a directory called `modules/ml-training-cluster/` and inside it you have:

`main.tf` — all the resources the module creates: EKS cluster, node groups, IAM roles, security groups.

`variables.tf` — the inputs the module accepts:
```hcl
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "cluster_name" {
  description = "Name for the EKS cluster"
  type        = string
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}
```

`outputs.tf` — the values the module exposes after creation:
```hcl
output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  description = "Name of the created cluster"
  value       = aws_eks_cluster.main.name
}
```

Then you call this module from your root configuration:
```hcl
module "production_cluster" {
  source       = "./modules/ml-training-cluster"
  environment  = "production"
  cluster_name = "ml-prod"
  node_count   = 10
}

module "staging_cluster" {
  source       = "./modules/ml-training-cluster"
  environment  = "staging"
  cluster_name = "ml-staging"
  node_count   = 3
}
```

Two clusters, completely different sizes and names, from the same module definition. The underlying pattern — how the cluster is structured, what IAM roles it gets, what security groups control its access — is defined once and reused.

**Module sources** — modules can come from different places. Local directories (as above), the Terraform public registry (`hashicorp/kubernetes/aws`), a private registry, Git repositories, or S3 buckets. Using modules from the public registry gives you community-maintained, well-tested implementations of common patterns. Using private Git repositories lets you share modules across your organization without making them public.

**Module versioning** — when you use a module from a Git source, you should pin it to a specific version tag:
```hcl
module "ml_cluster" {
  source  = "git::https://github.com/myorg/terraform-modules.git//ml-cluster?ref=v2.3.0"
}
```

Pinning versions ensures that a module update doesn't unexpectedly change all the infrastructure that uses it. You update intentionally by changing the version reference, testing in staging first.

**Nested modules** — modules can call other modules. A high-level `ml-environment` module might call a `networking` module, a `compute-cluster` module, and a `storage` module, composing them into a complete environment.

---

## 8. Variable & Output Management

Variables and outputs are the interface of your Terraform configuration and modules. Variables are inputs — things you provide to configure what gets built. Outputs are things your configuration exposes after building — values that other configurations or humans need to know about.

**Input Variables** are declared with a `variable` block:
```hcl
variable "instance_type" {
  description = "EC2 instance type for model serving"
  type        = string
  default     = "g4dn.xlarge"
  
  validation {
    condition     = contains(["g4dn.xlarge", "g4dn.2xlarge", "p3.2xlarge"], var.instance_type)
    error_message = "Instance type must be a GPU instance type."
  }
}
```

Several things to note here. The `description` is not optional in good Terraform code — it documents what the variable does. The `type` constraint ensures the variable receives the right kind of value — string, number, bool, list, map, or complex object types. The `default` makes the variable optional — if no value is provided, the default is used. The `validation` block enforces business rules on the input — here ensuring only GPU instance types are used for model serving.

**How variable values are provided** — in order of precedence (highest wins): command line flags (`terraform apply -var="instance_type=p3.2xlarge"`), `.tfvars` files (files containing variable assignments), environment variables prefixed with `TF_VAR_` (`TF_VAR_instance_type=p3.2xlarge`), and default values in the variable declaration. In practice, you use `.tfvars` files for environment-specific values and default values for sensible defaults.

**tfvars files** — you typically have one per environment. `production.tfvars` contains production-specific values (larger instance types, higher replica counts, production database sizes). `staging.tfvars` contains staging-specific values. You pass the appropriate file when running Terraform: `terraform apply -var-file=production.tfvars`.

**Sensitive variables** — mark variables that contain secrets with `sensitive = true`:
```hcl
variable "database_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}
```

This prevents Terraform from displaying the value in plan output or logs. It doesn't prevent the value from being stored in state (it still is, in plain text), but it prevents accidental exposure in terminal output.

**Output Values** are declared with an `output` block:
```hcl
output "model_serving_endpoint" {
  description = "URL for the model serving API"
  value       = "https://${aws_lb.model_serving.dns_name}/predict"
}

output "kubeconfig_command" {
  description = "Command to configure kubectl access to the cluster"
  value       = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.aws_region}"
}
```

Outputs serve several purposes. They expose information from a module to the calling configuration. They display useful information to the person running Terraform (like how to connect to the infrastructure just created). They allow cross-module references — one module can use another module's outputs as inputs.

**Complex variable types** — for ML infrastructure, you often want to pass structured configuration rather than individual primitive values:
```hcl
variable "node_groups" {
  description = "Configuration for EKS node groups"
  type = map(object({
    instance_type = string
    min_size      = number
    max_size      = number
    desired_size  = number
    gpu_enabled   = bool
  }))
}
```

This lets callers pass a map of node group configurations, enabling flexible, composable infrastructure definitions.

---

## 9. Workspaces for Environment Isolation

Terraform workspaces are a built-in mechanism for maintaining multiple independent state files from the same Terraform configuration. The idea is that you have one configuration and you create separate workspaces for different environments (dev, staging, production), each with its own state.

By default, every Terraform configuration operates in a workspace called `default`. You create additional workspaces with `terraform workspace new staging` and switch between them with `terraform workspace select production`. The current workspace name is accessible in your configuration via `terraform.workspace`, which lets you use it to vary behavior by environment.

```hcl
locals {
  instance_type = {
    dev        = "t3.medium"
    staging    = "g4dn.xlarge"
    production = "g4dn.2xlarge"
  }
}

resource "aws_instance" "model_server" {
  instance_type = local.instance_type[terraform.workspace]
  # ...
}
```

This configuration automatically uses the right instance type based on which workspace is active.

Workspaces are appealing for their simplicity — one configuration, multiple environments. However, it's important to understand their limitations so you can decide when they're the right tool and when they're not.

**Where workspaces work well** — for genuinely identical environments that differ only in scale (same topology, different sizes), workspaces are clean and simple. Feature branches or ephemeral environments for testing — you create a workspace for a PR, test the infrastructure changes, then delete the workspace and the state is gone.

**Where workspaces fall short** — for environments that differ structurally, not just in scale. Production might have a multi-region setup, multi-AZ databases, WAF configuration, and compliance controls that staging doesn't have. Trying to express all of this through workspace-based conditionals (`if terraform.workspace == "production"`) leads to messy, hard-to-read configuration. At that point, separate configurations per environment (the directory-per-environment pattern) is cleaner.

**Workspace vs directory-per-environment** — the alternative to workspaces is maintaining separate directories for each environment, each with its own backend configuration pointing to separate state. `environments/production/main.tf`, `environments/staging/main.tf`. These share modules but have completely independent configurations and state. This is more verbose but also more explicit and harder to accidentally apply production changes to staging. For production-grade, long-running environments, directory-per-environment is generally preferred. Workspaces are great for ephemeral or highly similar environments.

---

## 10. Dependency Management in Terraform

Terraform builds a directed acyclic graph (DAG) of all resources in your configuration and uses this graph to determine the correct order of operations and which resources can be created in parallel. Understanding how dependencies work helps you write more correct and more efficient Terraform.

**Implicit dependencies** are created automatically when you reference one resource's attributes in another resource's configuration. When you write:

```hcl
resource "aws_subnet" "ml_subnet" {
  vpc_id = aws_vpc.main.id  # Reference to aws_vpc.main
  # ...
}
```

Terraform automatically knows that `aws_vpc.main` must be created before `aws_subnet.ml_subnet` because the subnet needs the VPC's ID. This is an implicit dependency — you didn't explicitly declare it, but Terraform inferred it from the reference. This is the preferred way to express dependencies because it's directly tied to the actual data relationship.

**Explicit dependencies** with `depends_on` are for cases where there's a dependency that isn't expressed through attribute references. This is less common but necessary sometimes:

```hcl
resource "aws_iam_role_policy_attachment" "ml_training" {
  role       = aws_iam_role.training.name
  policy_arn = aws_iam_policy.ml_access.arn
}

resource "aws_eks_node_group" "training_nodes" {
  cluster_name = aws_eks_cluster.main.name
  # ...
  
  depends_on = [
    aws_iam_role_policy_attachment.ml_training  # Must exist before nodes can start
  ]
}
```

Here the node group doesn't reference the policy attachment's attributes directly, but the nodes won't function correctly until the IAM policy is attached to the role. The `depends_on` makes this implicit requirement explicit.

**Resource dependencies in practice** — the typical dependency chain for an ML infrastructure might look like: VPC → Subnets → Security Groups → EKS Cluster → Node Groups → Kubernetes Namespaces → Helm Releases → Kubernetes ConfigMaps. Each layer depends on the layer below it. Terraform's DAG handles this automatically through the implicit references you create when writing the configuration.

**Parallel creation** — resources with no dependency relationship between them are created in parallel. Terraform determines from the DAG which resources have no ordering constraint and runs their API calls concurrently. This is why a large Terraform apply that creates hundreds of resources completes much faster than sequential creation would — independent resources are created simultaneously.

**The `-parallelism` flag** controls how many concurrent operations Terraform runs. Default is 10. For large infrastructures, increasing this speeds up applies. For APIs with strict rate limits, decreasing it prevents rate limiting errors.

**Circular dependencies** — if resource A depends on resource B and resource B depends on resource A, Terraform detects this as a circular dependency and refuses to create a plan. Circular dependencies are always a design problem — they mean your resource relationships are fundamentally tangled. The solution is to restructure the design to break the cycle, often by introducing an intermediate resource or reordering how attributes are referenced.

---

## 11. DRY Infrastructure Patterns

DRY stands for Don't Repeat Yourself. In the context of Terraform, it means structuring your code so that the same concept, pattern, or configuration exists in exactly one place. If you need to change it, you change it in one place and the change propagates everywhere it's used.

Repeated code in Terraform is dangerous in ways that are specific to infrastructure. If you have the same security group rule defined in 15 different places across your codebase, and a security team requirement changes that rule, you need to find and update all 15 instances. Miss one and you have an inconsistent security posture that might only be discovered in an audit or after an incident.

**Modules are the primary DRY mechanism** — as discussed in the modules section, encapsulating a repeated infrastructure pattern into a module and calling it with different inputs is the primary way to eliminate repetition.

**Local values** are another DRY tool within a single configuration. Instead of repeating the same expression or the same set of tags in every resource:

```hcl
locals {
  common_tags = {
    team        = "ml-platform"
    managed_by  = "terraform"
    environment = var.environment
    cost_center = "ML-Infrastructure"
  }
  
  name_prefix = "${var.environment}-${var.project_name}"
}

resource "aws_instance" "training_node" {
  # ...
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-training"
    Role = "model-training"
  })
}

resource "aws_s3_bucket" "model_artifacts" {
  bucket = "${local.name_prefix}-model-artifacts"
  tags   = local.common_tags
}
```

The common tags are defined once in `locals`. Every resource uses them. If you need to add a new tag organization-wide, you add it in one place.

**`for_each` and `count` for resource repetition** — when you need multiple instances of a resource with similar but slightly different configurations, instead of copying the resource block multiple times, use `for_each` or `count`:

```hcl
variable "ml_namespaces" {
  default = {
    training = { cpu_limit = "16", memory_limit = "64Gi" }
    serving  = { cpu_limit = "8",  memory_limit = "32Gi" }
    feature  = { cpu_limit = "4",  memory_limit = "16Gi" }
  }
}

resource "kubernetes_namespace" "ml" {
  for_each = var.ml_namespaces
  
  metadata {
    name = each.key
    labels = {
      environment = var.environment
      purpose     = each.key
    }
  }
}
```

One resource block creates three namespaces with different names and can be extended by adding entries to the `ml_namespaces` variable — no code duplication required.

**Composition over inheritance** — rather than trying to build one mega-module that handles every possible configuration through a complex web of conditionals, build small, focused modules that each do one thing well, and compose them together. This is DRY at the architectural level — the same small module is used in many places.

**The tradeoff of abstraction** — DRY is not about eliminating all repetition regardless of cost. Over-abstraction makes code harder to understand and modify. If you abstract a pattern that only appears twice and might be different in the future, you've created complexity without sufficient benefit. Apply DRY where the repetition is real, substantial, and likely to need to change together.

---

## 12. Provisioners & When to Avoid Them

Provisioners in Terraform are mechanisms for executing scripts or commands on a resource after it's created — running a shell script on a newly created EC2 instance, copying files to it, or executing a remote configuration management command against it.

Terraform supports three types: `local-exec` runs a command on the machine where Terraform is executing. `remote-exec` connects to a remote resource (usually via SSH or WinRM) and runs commands on it. `file` copies files from the machine running Terraform to a remote resource.

Before explaining when to avoid them, let me explain when they seem useful, because that makes the pitfalls obvious.

Suppose you create an EC2 instance with Terraform and then need to install some software on it before it's usable. The naive approach is to add a `remote-exec` provisioner:

```hcl
resource "aws_instance" "training_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "p3.2xlarge"
  
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nvidia-driver-470",
      "sudo apt-get install -y python3-pip",
      "pip3 install torch transformers",
    ]
    
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/id_rsa")
    }
  }
}
```

This seems to work. But here's why it's problematic.

**Provisioners break idempotency** — if the provisioner script fails halfway through (network interruption, package server unavailable), Terraform marks the resource as "tainted" and will destroy and recreate it on the next apply. This means your EC2 instance gets destroyed and a new one created every time the provisioner fails. This is destructive and unpredictable.

**Provisioners break the declarative model** — the scripts you run in provisioners are imperative. They change state in ways that aren't tracked in Terraform's state file. The next time you run `terraform plan`, Terraform won't know that the software was installed and won't include it in its desired state calculation. If someone terminates and recreates the instance, the provisioner runs again — but if something has changed about the environment, the provisioner might fail or produce different results.

**Provisioners require network access and credentials** — for `remote-exec`, Terraform needs SSH access to the instance during apply. This requires your CI/CD system to have SSH keys and network access to the instance, which creates operational complexity and security concerns.

**Provisioners are slow and fragile** — downloading and installing packages at instance creation time is slow and dependent on external services being available. A flaky package mirror fails your entire Terraform apply.

**What to use instead:**

For instance configuration, use cloud-init user data (baked into the instance's launch configuration and runs on first boot without Terraform maintaining a connection) or pre-baked AMIs (build an AMI with all software pre-installed using Packer, then have Terraform launch instances from the pre-baked AMI — fast, reliable, fully versioned). For ongoing configuration management, use dedicated tools like Ansible, Chef, or Puppet that are designed for this and handle drift detection, idempotency, and failure recovery properly.

**When provisioners are acceptable** — they're not categorically forbidden. Local-exec is sometimes used for integrations where no better mechanism exists, like calling an external registration API after creating a resource. File provisioner can be useful in specific bootstrap scenarios. But they should always be a last resort, and you should be able to explain clearly why better alternatives aren't applicable.

---

## 13. Terraform Plan & Apply Workflow

The plan and apply workflow is the core operational loop of Terraform. Understanding what happens at each stage and how to use this workflow correctly is fundamental to operating Terraform safely in production.

**`terraform init`** is the first command you run in any Terraform directory. It initializes the working directory: downloads provider plugins specified in your configuration, downloads any modules referenced from remote sources, and configures the backend (connecting to the remote state). You must run init whenever you add a new provider or module, change provider versions, or change the backend configuration. Init is safe to run repeatedly — it's idempotent and doesn't modify infrastructure.

**`terraform validate`** checks that your configuration is syntactically valid and internally consistent — that all required arguments are provided, that references to other resources are valid, that types match. It doesn't connect to any providers or check whether resources actually exist. It's fast and safe to run as part of a CI check on every PR.

**`terraform plan`** is where the real work happens. Terraform reads your configuration, reads the current state, optionally calls provider APIs to refresh resource attributes, builds the dependency graph, compares desired state to current state for every resource, and produces a human-readable diff of what it intends to do. Create (green +), update in place (yellow ~), destroy (red -), and destroy then recreate (-/+) are the four operation types.

Reading the plan output carefully is the most important habit you can develop as a Terraform practitioner. Before running apply, you should be able to answer: How many resources are being created, updated, or destroyed? For updates, which specific attributes are changing and are those the changes you expect? Are there any unexpected destroys? A `-/+` (destroy and recreate) is particularly important to notice — it means the resource will be deleted and recreated, causing potential downtime and loss of any data associated with the resource.

You should save the plan to a file for important applies: `terraform plan -out=plan.tfplan`. This ensures that what you apply is exactly what was planned — no changes can sneak in between planning and applying.

**`terraform apply`** executes the planned changes. If you run it without a saved plan file, it will re-plan first and show you the plan, then ask for confirmation before proceeding. If you run it with a saved plan file (`terraform apply plan.tfplan`), it executes exactly the operations in the plan without re-planning or asking for confirmation. The latter is the preferred pattern for CI/CD pipelines — plan in one stage, review, then apply in a subsequent stage.

During apply, Terraform executes resource operations in the order determined by the dependency graph, running independent operations in parallel. It updates the state file after each resource operation succeeds — if the apply fails partway through, the state reflects what was successfully completed, so a subsequent apply will continue from where it left off rather than starting from scratch.

**`terraform destroy`** plans and applies the destruction of all resources managed in the current state. This is a dangerous operation and should be used very carefully in production. For destroying specific resources rather than everything, use `terraform destroy -target=resource_type.name`.

**The `-target` flag** applies changes to only a specific resource and its dependencies, ignoring everything else. This is useful for debugging or for making targeted changes in emergencies. However, using `-target` regularly is a code smell — it suggests your configuration isn't properly modularized and you're trying to work around unintended dependencies.

---

## 14. Infrastructure Versioning Strategy

Versioning your infrastructure code is not just about storing it in Git — it's about deliberately managing changes to infrastructure over time so that any version can be understood, reproduced, and rolled back if needed.

**Semantic versioning for modules** — when you build reusable Terraform modules, version them using semantic versioning. Patch versions (1.0.0 → 1.0.1) for bug fixes that don't change the interface. Minor versions (1.0.0 → 1.1.0) for new features that are backward compatible. Major versions (1.0.0 → 2.0.0) for breaking changes — changes that will require callers to update their configurations. Tag your Git repository with version tags and reference those tags in module sources.

**Pin provider versions** — always pin provider versions in your `required_providers` block. Using `version = "~> 5.0"` (meaning >= 5.0.0 and < 6.0.0) prevents major version upgrades from breaking your code while allowing patch updates. Using no version constraint at all means a provider update could introduce breaking changes at any time. Update provider versions deliberately, test in staging first, and document the update in a commit message.

**Terraform version pinning** — pin the Terraform version itself using a `.terraform-version` file (used by `tfenv`, the Terraform version manager) or in the `required_version` field in the terraform block. Different versions of Terraform have different behaviors and syntax, and using different versions across team members or CI/CD creates inconsistencies.

**Infrastructure change management** — large infrastructure changes should go through the same process as application changes. Write the change in a branch, get it reviewed via pull request, run `terraform plan` in CI and include the plan output in the PR for reviewers to see exactly what will change, merge and deploy. A plan output in a PR is tremendously valuable for reviewers because it shows the concrete effect of the code change on real infrastructure.

**Tagging infrastructure for traceability** — every resource Terraform creates should be tagged with information that links it back to its code origin. At minimum: the Terraform module or configuration that manages it, the environment it belongs to, the team responsible for it, the Git repository and commit that last modified it. This makes it trivially easy to find the code for any resource you're looking at in the cloud console, and makes cost allocation possible.

**State file versioning** — enable versioning on your S3 bucket (or whatever storage backs your remote state). If state becomes corrupted, S3 versioning lets you roll back to a previous state version. This has saved many teams from potentially catastrophic situations where state corruption made Terraform believe resources needed to be destroyed.

---

## 15. Managing Multi-Environment Infrastructure

Managing multiple environments — typically development, staging, and production — is where most of the complexity and best practice nuance in Terraform lives. Get this right and your infrastructure operations are smooth and safe. Get it wrong and you're constantly fighting environment drift, accidental production changes, and configuration confusion.

The core tension in multi-environment Terraform is this: you want environments to be similar enough that staging validations are meaningful for production, but you also need environments to be different enough that they're cost-appropriate (development doesn't need production-scale resources) and appropriately isolated (a staging mistake doesn't affect production).

**Directory-per-environment structure** is the most explicit and safest approach for production-grade infrastructure. You organize your Terraform code like this:

```
infrastructure/
├── modules/
│   ├── ml-cluster/
│   ├── networking/
│   └── model-registry/
├── environments/
│   ├── development/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       └── backend.tf
```

Each environment directory has its own `main.tf` that calls shared modules with environment-appropriate inputs, its own `backend.tf` pointing to environment-specific state storage, and its own `terraform.tfvars` with environment-specific variable values. Each environment has completely independent state, independent backend, and independent apply workflow.

**Variable differentiation** — the `terraform.tfvars` files capture all the differences between environments. Production gets `node_count = 20`, `instance_type = "p3.2xlarge"`, `enable_multi_az = true`. Staging gets `node_count = 5`, `instance_type = "g4dn.xlarge"`, `enable_multi_az = false`. Development gets `node_count = 2`, `instance_type = "t3.large"`, `enable_multi_az = false`. All three environments use the same modules and patterns, just with different scale.

**Promotion workflow** — changes should always flow from development → staging → production, never directly to production. Your CI/CD pipeline enforces this. When a PR is merged to the main branch, the CI system automatically runs `terraform plan` against all environments and may auto-apply to development. Staging requires a manual approval or a specific trigger. Production requires a more formal approval process, possibly with a mandatory waiting period after staging validation.

**Account isolation** — for serious production environments, consider isolating environments in completely separate cloud accounts, not just separate state files in the same account. Separate AWS accounts provide a much harder security boundary — a compromised IAM role in staging cannot access production resources in another account. AWS Organizations makes managing multiple accounts tractable. The Terraform code itself stays the same; you just configure different provider credentials for each account.

---

## 16. Terraform Security Best Practices

Terraform's power — it can create, modify, and destroy production infrastructure — is also what makes it a high-value target for security mistakes. Insecure Terraform usage can expose credentials, grant excessive permissions, or allow unauthorized changes to critical infrastructure.

**Never hardcode credentials in Terraform files** — this is the most commonly violated rule and the most dangerous. AWS access keys, database passwords, API tokens should never appear in your .tf files or .tfvars files. These files go into version control, and secrets in version control are exposed to everyone with read access to the repository, forever. Use environment variables, AWS IAM roles with instance profiles or OIDC federation, or a secrets manager to inject credentials at runtime.

**Protect your state file** — as covered earlier, state files contain sensitive values in plain text. Your state storage backend must have access controls allowing only authorized humans and systems to read and write state. Enable encryption at rest. Enable versioning for recovery. Never commit state files to version control — add `*.tfstate` and `*.tfstate.backup` to your `.gitignore`.

**Least privilege for Terraform's IAM permissions** — the IAM user or role that Terraform uses to create infrastructure should have exactly the permissions needed to manage the resources in its scope, and nothing more. Terraform doesn't need to be able to access your billing information, your organization's root account, or services it doesn't manage. Scope permissions to specific resources and resource types wherever IAM allows. For production applies, consider using short-lived credentials via OIDC federation rather than long-lived IAM user access keys.

**CI/CD pipeline security** — your CI/CD pipeline that runs Terraform applies is extremely sensitive. If an attacker can inject malicious Terraform code into a branch that then gets planned and applied, they can create resources under your cloud account or exfiltrate data. Protect the CI/CD system: require PR reviews before apply, use OIDC federation for temporary credentials rather than static keys stored as CI secrets, run plans in untrusted contexts but applies only from protected branches.

**Sentinel and OPA for policy enforcement** — beyond access control, enforce infrastructure standards as code. You can use OPA or Terraform's Sentinel (in Terraform Cloud/Enterprise) to automatically check plans against organizational policies before they're applied. Policies like "no security groups with 0.0.0.0/0 ingress on port 22," "all S3 buckets must have encryption enabled," "no public RDS instances" — these are checked automatically and block non-compliant plans. This is safer than relying on human reviewers to catch every policy violation in PR reviews.

**`terraform plan` review in CI** — your CI pipeline should run `terraform plan` on every PR and post the plan output as a PR comment. Reviewers must look at the plan, not just the code. Code changes that look small can produce large infrastructure changes — reviewers need to see what actually changes. A plan showing `-/+ destroy and recreate` for a production database should raise an immediate flag.

**Audit logging for Terraform applies** — every `terraform apply` against production should be logged — who ran it, when, what plan was applied, what the outcome was. In CI/CD environments, this is captured in pipeline logs. For human applies, use a wrapper script that logs applies to a centralized system. Combined with state file versioning, this gives you a complete audit trail of every infrastructure change.

**Scanning Terraform code for security issues** — static analysis tools like `tfsec`, `checkov`, and `Terrascan` analyze your Terraform code for security misconfigurations before you apply anything. They catch common mistakes: S3 buckets without logging enabled, security groups too permissive, unencrypted EBS volumes, public-facing resources that should be private. Run these in your CI pipeline alongside `terraform validate`.

---

The thread that runs through all of them is this: infrastructure is code, and everything that makes application code better — version control, testing, code review, modularity, documentation, least privilege — applies equally to infrastructure code. Terraform is the tool, but the discipline is treating infrastructure with the same rigor and care you'd give to any production software system.
