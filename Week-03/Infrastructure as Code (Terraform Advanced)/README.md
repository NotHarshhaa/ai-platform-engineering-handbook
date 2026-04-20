# Infrastructure as Code (Terraform Advanced)

---

## 1. Infrastructure as Code Principles

IaC means managing and provisioning infrastructure through **machine-readable definition files** rather than manual processes or interactive tools.

**Core IaC Principles:**

```
┌─────────────────────────────────────────────────────────────┐
│                    IaC Principles                           │
├─────────────────┬───────────────────────────────────────────┤
│ Idempotency     │ Run 100x → same result every time         │
│ Versioning      │ Infra lives in Git like application code  │
│ Immutability    │ Replace, don't patch running infra        │
│ Reproducibility │ Same config → identical environments      │
│ Self-documenting│ Code IS the documentation                 │
│ Automation      │ No manual clicks, fully scriptable        │
└─────────────────┴───────────────────────────────────────────┘
```

**Why IaC matters in production:**

```
Without IaC                    With IaC
──────────────────────         ──────────────────────
Manual console clicks          Git PR for every change
"Works on my cloud"            Identical dev/staging/prod
No audit trail                 Full Git history
Snowflake servers              Cattle, not pets
Hours to recreate              Minutes to recreate
Config drift                   Drift detection built-in
```

**IaC Maturity Model:**
```
Level 0: Manual (ClickOps)
Level 1: Scripts (Bash/Python)
Level 2: IaC tools (Terraform)        ← most teams here
Level 3: IaC + CI/CD pipelines
Level 4: Policy-as-Code + GitOps      ← production excellence
```

---

## 2. Declarative vs Imperative Infrastructure

```
Imperative: "Do these steps in this order"
Declarative: "Here is the desired end state"
```

**Imperative (Bash/Ansible):**
```bash
# You describe HOW to get there
aws ec2 run-instances --image-id ami-123 --count 3
aws ec2 describe-instances                    # check if exists
if [ $count -lt 3 ]; then                    # manual diffing
  aws ec2 run-instances --count 1            # manual correction
fi
```

**Declarative (Terraform):**
```hcl
# You describe WHAT you want
resource "aws_instance" "web" {
  count         = 3                 # Terraform figures out HOW
  ami           = "ami-123"         # to get from current → desired
  instance_type = "t3.micro"
}
# Run again → no changes (idempotent)
# Run with count=5 → adds 2 more (convergent)
```

| | Imperative | Declarative |
|---|---|---|
| **You define** | Steps to execute | Desired end state |
| **Re-run behavior** | Creates duplicates | Idempotent |
| **Drift handling** | Manual | Automatic |
| **Tools** | Bash, Ansible, Chef | Terraform, Pulumi, CDK |
| **Learning curve** | Lower | Higher |
| **Scale** | Hard | Designed for it |

---

## 3. Terraform Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Your Machine / CI                   │
│                                                        │
│   .tf files ──► Terraform Core ──► Execution Plan      │
│                      │                                 │
│              ┌───────┴────────┐                        │
│              ▼                ▼                        │
│         State File      Provider Plugins               │
│       (terraform.tfstate) (aws, gcp, azure...)         │
└──────────────────────────┬─────────────────────────────┘
                           │ API calls
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       AWS API          GCP API         GitHub API
    (EC2, S3, RDS)   (GKE, GCS)       (repos, teams)
```

**Key components:**

```
Terraform Core
├── Configuration Parser   → reads .tf files
├── State Manager          → tracks real-world resources
├── Graph Builder          → builds dependency DAG
├── Plan Engine            → diffs state vs config
└── Apply Engine           → executes changes via providers

Provider Plugin (e.g. AWS)
├── Resource CRUD handlers → create/read/update/delete
├── Data source handlers   → read-only queries
└── Schema definitions     → validates your config
```

**Terraform workflow:**
```
Write (.tf) → Init → Plan → Apply → (State updated)
                              ↓
                          Destroy (when needed)
```

---

## 4. Providers & Resources

**Providers** are plugins that talk to APIs. **Resources** are the things they manage.

```hcl
# ── Provider Configuration ──────────────────────────────

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"        # ~> = pessimistic constraint
    }                             # allows 5.40, 5.41... not 6.0
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.27.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {                 # tags applied to ALL resources
    tags = {
      ManagedBy   = "terraform"
      Environment = var.environment
      Team        = "platform"
    }
  }
}

# ── Multi-region provider alias ──────────────────────────

provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

# ── Resources ────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = { Name = "${var.environment}-vpc" }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id          # implicit dependency
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = var.availability_zones[count.index]
}

# ── Data Sources (read existing infra) ───────────────────

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# Use data source output
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id   # dynamic lookup
  instance_type = "t3.micro"
}
```

---

## 5. Terraform State Management

State is Terraform's **source of truth** — maps your config to real-world resources.

```
terraform.tfstate (JSON)

{
  "resources": [
    {
      "type": "aws_instance",
      "name": "web",
      "instances": [{
        "attributes": {
          "id": "i-0abc123def456",      ← real AWS resource ID
          "private_ip": "10.0.1.50",
          "instance_type": "t3.micro"
        }
      }]
    }
  ]
}
```

**What state does:**
```
Config ──────►  State ──────► Real Infrastructure
   │              │                   │
   │              └── maps IDs ───────┘
   │
   └── Plan = diff(Config, State)
```

**State operations:**
```bash
# List all resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Move resource (rename without destroy)
terraform state mv aws_instance.web aws_instance.app

# Import existing resource into state
terraform import aws_instance.legacy i-0abc123def456

# Remove from state (don't destroy real resource)
terraform state rm aws_instance.web

# Force refresh state from real infra
terraform refresh
```

**State file risks:**
```
⚠️  State contains SENSITIVE DATA (passwords, keys)
⚠️  Concurrent applies cause state corruption
⚠️  Local state = single point of failure
→   Always use REMOTE BACKENDS in production
```

---

## 6. Remote Backends & State Locking

Remote backends store state **centrally and securely** with locking to prevent concurrent writes.

```hcl
# ── S3 Backend (AWS — most common) ──────────────────────

terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "prod/us-east-1/networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true                  # AES-256 encryption
    dynamodb_table = "terraform-locks"     # state locking
    kms_key_id     = "arn:aws:kms:..."    # KMS encryption
  }
}
```

**DynamoDB table for locking:**
```hcl
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

**How state locking works:**
```
Engineer A runs apply          Engineer B runs apply
       │                              │
       ▼                              ▼
  Acquires lock ◄──── BLOCKED ────── Tries to acquire
  (DynamoDB item)                    lock → waits/fails
       │
  Makes changes
       │
  Releases lock
                ────────────────────► B can now proceed
```

**Other backend options:**

| Backend | Best For |
|---|---|
| **S3 + DynamoDB** | AWS-native teams |
| **Terraform Cloud** | Managed + free tier available |
| **GCS** | GCP teams |
| **Azure Blob** | Azure teams |
| **GitLab HTTP** | GitLab CI integration |

**State file organization strategy:**
```
s3://company-tf-state/
├── global/
│   └── iam/terraform.tfstate
├── prod/
│   ├── networking/terraform.tfstate
│   ├── eks/terraform.tfstate
│   └── rds/terraform.tfstate
└── staging/
    ├── networking/terraform.tfstate
    └── eks/terraform.tfstate
```

---

## 7. Terraform Modules & Reusability

Modules are **reusable, self-contained packages** of Terraform configuration.

```
modules/
├── vpc/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
├── eks/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── rds/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

**Module definition:**
```hcl
# modules/vpc/variables.tf
variable "environment" { type = string }
variable "cidr_block"  { type = string }
variable "az_count"    { type = number; default = 2 }

# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block = var.cidr_block
  tags       = { Name = "${var.environment}-vpc" }
}

resource "aws_subnet" "private" {
  count  = var.az_count
  vpc_id = aws_vpc.this.id
  # ...
}

# modules/vpc/outputs.tf
output "vpc_id"             { value = aws_vpc.this.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
```

**Calling a module:**
```hcl
# environments/prod/main.tf

module "vpc" {
  source      = "../../modules/vpc"     # local module
  environment = "prod"
  cidr_block  = "10.0.0.0/16"
  az_count    = 3
}

module "eks" {
  source          = "../../modules/eks"
  vpc_id          = module.vpc.vpc_id           # module output
  subnet_ids      = module.vpc.private_subnet_ids
}

# Registry module (Terraform Registry)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.2"
  # ...
}
```

**Module versioning with Git:**
```hcl
module "vpc" {
  source = "git::https://github.com/company/tf-modules.git//vpc?ref=v2.3.0"
}
```

---

## 8. Variable & Output Management

```hcl
# ── variables.tf ────────────────────────────────────────

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_config" {
  type = object({
    instance_type = string
    min_size      = number
    max_size      = number
  })
  default = {
    instance_type = "t3.micro"
    min_size      = 1
    max_size      = 3
  }
}

variable "db_password" {
  type      = string
  sensitive = true     # redacted from logs & output
}

# ── Variable precedence (highest to lowest) ──────────────
#
# 1. CLI flags           -var="env=prod"
# 2. .tfvars files       terraform.tfvars / *.auto.tfvars
# 3. Environment vars    TF_VAR_environment=prod
# 4. Default values      default = "dev"

# ── terraform.tfvars ────────────────────────────────────
environment = "prod"
instance_config = {
  instance_type = "t3.large"
  min_size      = 3
  max_size      = 10
}

# ── outputs.tf ──────────────────────────────────────────

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "db_endpoint" {
  description = "RDS connection endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true    # won't show in plan output
}

# Output from module
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
```

**Locals for computed values:**
```hcl
locals {
  name_prefix  = "${var.environment}-${var.project}"
  common_tags  = {
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
  }
  is_prod      = var.environment == "prod"
  replica_count = local.is_prod ? 3 : 1
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "${local.name_prefix}-db"
  tags               = local.common_tags
}
```

---

## 9. Workspaces for Environment Isolation

Workspaces let you use **one codebase with multiple state files**.

```bash
# Create and switch workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace list
# * prod
#   staging
#   dev

terraform workspace select staging
terraform workspace show   # → staging
```

**Using workspace in config:**
```hcl
locals {
  env = terraform.workspace   # "dev" / "staging" / "prod"

  config = {
    dev = {
      instance_type = "t3.micro"
      replica_count = 1
      enable_backups = false
    }
    staging = {
      instance_type = "t3.small"
      replica_count = 1
      enable_backups = true
    }
    prod = {
      instance_type = "t3.large"
      replica_count = 3
      enable_backups = true
    }
  }
}

resource "aws_db_instance" "main" {
  instance_class      = local.config[local.env].instance_type
  multi_az            = local.config[local.env].replica_count > 1
  backup_retention    = local.config[local.env].enable_backups ? 7 : 0
}
```

**State files per workspace in S3:**
```
s3://tf-state/
├── env:/
│   ├── dev/terraform.tfstate
│   ├── staging/terraform.tfstate
│   └── prod/terraform.tfstate
```

> ⚠️ Workspaces are best for **similar environments**. For drastically different infra (different accounts, regions), use **separate directories** instead.

---

## 10. Dependency Management in Terraform

Terraform builds a **Directed Acyclic Graph (DAG)** to determine order of operations.

**Implicit dependencies (preferred):**
```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "app" {
  vpc_id     = aws_vpc.main.id    # implicit → subnet created AFTER vpc
  cidr_block = "10.0.1.0/24"
}

resource "aws_security_group" "app" {
  vpc_id = aws_vpc.main.id        # also depends on vpc
}
```

**Explicit dependencies (`depends_on`):**
```hcl
resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id
  policy = data.aws_iam_policy_document.app.json

  # Policy must wait for IAM role to exist
  # even though no direct reference
  depends_on = [aws_iam_role.app]
}
```

**Dependency graph visualization:**
```bash
terraform graph | dot -Tsvg > graph.svg
```

```
aws_vpc.main
    │
    ├──► aws_subnet.app[0]
    │         │
    │         └──► aws_instance.web
    │
    ├──► aws_subnet.app[1]
    │
    └──► aws_security_group.app
              │
              └──► aws_instance.web (depends on both)
```

**`for_each` vs `count`:**
```hcl
# count — ordered, fragile (deleting middle = reshuffles)
resource "aws_subnet" "this" {
  count      = 3
  cidr_block = cidrsubnet(var.cidr, 8, count.index)
}

# for_each — keyed, stable (preferred for maps)
resource "aws_subnet" "this" {
  for_each   = var.subnets          # map or set
  cidr_block = each.value.cidr
  tags       = { Name = each.key }
}
```

---

## 11. DRY Infrastructure Patterns

**Don't Repeat Yourself** — eliminate duplication across environments.

**Pattern 1: Terragrunt (most popular DRY tool):**
```
infrastructure/
├── terragrunt.hcl              # root config (backend, providers)
├── modules/
│   ├── vpc/
│   └── eks/
└── live/
    ├── dev/
    │   ├── vpc/terragrunt.hcl
    │   └── eks/terragrunt.hcl
    └── prod/
        ├── vpc/terragrunt.hcl
        └── eks/terragrunt.hcl
```

```hcl
# live/dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()    # inherits backend config
}

terraform {
  source = "../../../modules//vpc"
}

inputs = {
  environment = "dev"
  cidr_block  = "10.1.0.0/16"
}
```

**Pattern 2: Composition with modules:**
```hcl
# environments/prod/main.tf — compose shared modules

module "networking" {
  source      = "../../modules/networking"
  environment = local.env
}

module "compute" {
  source     = "../../modules/compute"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}

module "database" {
  source     = "../../modules/database"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  sg_ids     = [module.compute.app_sg_id]
}
```

**Pattern 3: dynamic blocks:**
```hcl
variable "ingress_rules" {
  type = list(object({
    port     = number
    protocol = string
    cidr     = string
  }))
}

resource "aws_security_group" "app" {
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = [ingress.value.cidr]
    }
  }
}
```

---

## 12. Provisioners & When to Avoid Them

Provisioners run scripts **after** resource creation. They're a last resort.

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # ── file provisioner ────────────────────────
  provisioner "file" {
    source      = "scripts/setup.sh"
    destination = "/tmp/setup.sh"
  }

  # ── remote-exec provisioner ─────────────────
  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/setup.sh",
      "sudo /tmp/setup.sh"
    ]
  }

  # ── local-exec provisioner ──────────────────
  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> inventory.txt"
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("~/.ssh/id_rsa")
    host        = self.public_ip
  }
}
```

**Why provisioners are problematic:**

```
❌ Not idempotent — re-runs may break things
❌ Break plan/apply separation
❌ Failures leave resources in unknown state
❌ Require network access (SSH/WinRM)
❌ Hard to test and debug
❌ Terraform can't track what they changed
```

**Better alternatives:**

| Instead of provisioner... | Use instead |
|---|---|
| Installing software | Packer (bake AMI) |
| Config management | Ansible, Chef, Puppet |
| Bootstrapping | `user_data` / cloud-init |
| Triggering pipelines | `local-exec` with null_resource |
| K8s resources | Kubernetes/Helm provider |

```hcl
# ✅ Better: user_data for bootstrapping
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  user_data = base64encode(templatefile("scripts/setup.sh.tpl", {
    environment = var.environment
    db_host     = aws_db_instance.main.endpoint
  }))
}
```

---

## 13. Terraform Plan & Apply Workflow

```
terraform init     → download providers, set up backend
terraform validate → syntax + schema check
terraform fmt      → format code consistently
terraform plan     → show what WILL change (dry run)
terraform apply    → execute the changes
terraform destroy  → tear down all resources
```

**Reading the plan:**
```hcl
# Plan output symbols:
+ resource will be CREATED
- resource will be DESTROYED
~ resource will be UPDATED in-place
-/+ resource will be DESTROYED then CREATED (replacement)
<= data source will be READ

Terraform will perform the following actions:

  # aws_instance.web will be updated in-place
  ~ resource "aws_instance" "web" {
      ~ instance_type = "t3.micro" → "t3.small"
        id            = "i-0abc123"
    }

  # aws_security_group.new will be created
  + resource "aws_security_group" "new" {
      + id   = (known after apply)
      + name = "prod-app-sg"
    }

Plan: 1 to add, 1 to change, 0 to destroy.
```

**Production workflow (CI/CD):**
```yaml
# GitHub Actions
jobs:
  plan:
    steps:
      - run: terraform init
      - run: terraform validate
      - run: terraform fmt --check
      - run: terraform plan -out=tfplan      # save plan
      - run: |
          terraform show -json tfplan | \
          conftest verify                    # OPA policy check

  apply:
    needs: plan
    environment: production                  # requires approval
    steps:
      - run: terraform apply tfplan          # apply saved plan only
```

**Targeted operations (use sparingly):**
```bash
# Plan/apply only specific resource
terraform plan -target=module.vpc
terraform apply -target=aws_instance.web

# Useful for: unblocking dependency issues
# Avoid for: regular workflow (hides drift)
```

---

## 14. Infrastructure Versioning Strategy

**Version everything — code, modules, providers, Terraform itself.**

```hcl
# Pin Terraform version
terraform {
  required_version = ">= 1.7.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40.0"     # patch updates only
    }
  }
}
```

**`.terraform.lock.hcl` — lock file (commit this!):**
```hcl
# .terraform.lock.hcl — auto-generated, always commit
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.40.0"
  constraints = "~> 5.40.0"
  hashes = [
    "h1:abc123...",    # cryptographic hash → tamper proof
  ]
}
```

**Module versioning strategy:**
```
v0.x.x  → Experimental, breaking changes expected
v1.0.0  → Stable API, semver from here
v1.x.x  → Backward compatible additions
v2.0.0  → Breaking changes (major bump)
```

**Git tagging for module releases:**
```bash
git tag -a v1.2.0 -m "Add RDS read replica support"
git push origin v1.2.0

# Teams consume pinned version
module "rds" {
  source  = "git::https://github.com/org/modules.git//rds?ref=v1.2.0"
}
```

---

## 15. Managing Multi-Environment Infrastructure

**Strategy 1: Separate directories (recommended for prod):**
```
infrastructure/
├── modules/          # shared, reusable
│   ├── vpc/
│   ├── eks/
│   └── rds/
└── environments/
    ├── dev/
    │   ├── main.tf   # calls modules with dev vars
    │   ├── backend.tf
    │   └── terraform.tfvars
    ├── staging/
    │   ├── main.tf
    │   └── terraform.tfvars
    └── prod/
        ├── main.tf
        └── terraform.tfvars
```

**Strategy 2: Separate AWS accounts per environment:**
```hcl
# Assume role per environment
provider "aws" {
  alias = "prod"
  assume_role {
    role_arn = "arn:aws:iam::PROD_ACCOUNT_ID:role/TerraformRole"
  }
}

provider "aws" {
  alias = "staging"
  assume_role {
    role_arn = "arn:aws:iam::STAGING_ACCOUNT_ID:role/TerraformRole"
  }
}
```

**Environment-specific variable files:**
```bash
# Apply to specific environment
terraform apply -var-file="environments/prod.tfvars"

# prod.tfvars
environment       = "prod"
instance_type     = "t3.large"
min_replicas      = 3
enable_monitoring = true
backup_retention  = 30
multi_az          = true

# dev.tfvars
environment       = "dev"
instance_type     = "t3.micro"
min_replicas      = 1
enable_monitoring = false
backup_retention  = 1
multi_az          = false
```

**Promotion flow:**
```
dev ──[test]──► staging ──[approve]──► prod
 │                  │                    │
 │                  │                    │
tfvars            tfvars              tfvars
(small)          (medium)             (large)
same modules ────────────────────────────────
```

---

## 16. Terraform Security Best Practices

```hcl
# ── 1. Never hardcode credentials ───────────────────────

# ❌ NEVER
provider "aws" {
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG"
}

# ✅ Use IAM roles / environment variables
provider "aws" {
  region = var.region
  # credentials from: instance profile / env vars / ~/.aws
}

# ── 2. Sensitive variables ───────────────────────────────

variable "db_password" {
  type      = string
  sensitive = true    # redacted from state display & logs
}

# ✅ Inject at runtime, never in .tfvars committed to git
# export TF_VAR_db_password=$(aws secretsmanager get-secret-value ...)

# ── 3. Encrypt state ────────────────────────────────────

terraform {
  backend "s3" {
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123:key/abc"
    dynamodb_table = "terraform-locks"
  }
}

# ── 4. Restrict state bucket access ─────────────────────

resource "aws_s3_bucket_policy" "tf_state" {
  policy = jsonencode({
    Statement = [{
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }  # HTTPS only
      }
    }]
  })
}
```

**Policy-as-Code with OPA/Conftest:**
```rego
# policy/no_public_s3.rego
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.after.block_public_acls == false
  msg := "S3 bucket must block public ACLs"
}
```

**Security checklist:**
```
Secrets Management
├── ✅ No secrets in .tf files or tfvars committed to git
├── ✅ Use AWS Secrets Manager / Vault for runtime secrets
├── ✅ Mark sensitive variables/outputs
└── ✅ Rotate credentials regularly

State Security
├── ✅ Remote backend with encryption at rest
├── ✅ State bucket — restricted IAM access
├── ✅ State locking enabled (DynamoDB)
└── ✅ Enable S3 versioning for state recovery

Access Control
├── ✅ Use IAM roles, not long-lived access keys
├── ✅ Least-privilege IAM policies for Terraform role
├── ✅ Separate roles per environment
└── ✅ Enable CloudTrail for all Terraform API calls

CI/CD
├── ✅ Plan in PR, apply after merge (GitOps)
├── ✅ Policy-as-Code gates (OPA/Conftest/Checkov)
├── ✅ Required approval for prod applies
└── ✅ Scan for secrets before push (git-secrets, trufflehog)
```

---

## Summary: Production Terraform Architecture

```
Git Repository (source of truth)
         │
         ▼
   Pull Request
         │
    ┌────┴─────┐
    │  CI/CD   │
    │ Pipeline │
    └────┬─────┘
         │
    ┌────▼──────────────────┐
    │  terraform init       │
    │  terraform validate   │
    │  terraform fmt -check │
    │  checkov scan         │  ← policy enforcement
    │  terraform plan       │
    │  conftest verify      │  ← OPA policy gate
    └────┬──────────────────┘
         │ PR merged + approved
    ┌────▼──────────────────┐
    │  terraform apply      │
    │  (saved plan only)    │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  Remote S3 State      │  ← encrypted + locked
    │  CloudTrail Audit     │  ← every API call logged
    └───────────────────────┘
```

Terraform advanced mastery = **modules + remote state + CI/CD + policy-as-code + least privilege**. These 16 concepts give you everything needed to build production-grade IaC at scale.
