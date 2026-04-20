# Advanced Git & CI/CD Engineering

---

## 📘 ADVANCED GIT ENGINEERING

---

## 1. Git Internals & Object Model

Git is fundamentally a **content-addressable filesystem** — every piece of data is stored as an object identified by its SHA-1 hash. Understanding this unlocks everything else.

**Four Git object types:**

```
┌─────────────────────────────────────────────────────────────┐
│                  Git Object Model                           │
│                                                             │
│  blob     → stores file content (no filename, no metadata)  │
│  tree     → stores directory structure (names + blob refs)  │
│  commit   → stores snapshot (tree + parent + metadata)      │
│  tag      → stores annotated tag (points to any object)     │
└─────────────────────────────────────────────────────────────┘

Every object:
├── Content-addressed: SHA = hash(type + size + content)
├── Immutable: SHA never changes, content never changes
├── Deduplicated: identical files = one blob, referenced many times
└── Stored compressed in .git/objects/
```

**How a commit really works:**

```
git commit -m "Add payment feature"

Creates these objects:

blob: a3f8c2...  ← content of payment.go
blob: b4e9d1...  ← content of main.go

tree: c5f0e3...
  100644 blob a3f8c2... payment.go
  100644 blob b4e9d1... main.go
  040000 tree d6a1f4... internal/   ← nested tree

commit: e7b2a5...
  tree    c5f0e3...        ← points to root tree
  parent  prev_commit...   ← links to previous state
  author  Harshhaa <...>
  date    2024-01-15
  message Add payment feature
```

**Refs — human-readable pointers to commits:**

```
.git/refs/
├── heads/
│   ├── main          → abc1234  (local branch)
│   └── feature/x     → def5678
├── remotes/
│   └── origin/
│       └── main      → abc1234  (remote tracking)
└── tags/
    └── v2.4.1        → ghi9012  (tag object)

.git/HEAD             → ref: refs/heads/main (current branch)
.git/ORIG_HEAD        → saved before risky operation (merge/rebase)
.git/FETCH_HEAD       → last fetched commit

Special refs:
├── HEAD~1            → parent of HEAD
├── HEAD~2            → grandparent of HEAD
├── HEAD^2            → second parent (merge commit)
└── main@{yesterday}  → where main was yesterday (reflog)
```

**The reflog — Git's safety net:**

```
Every movement of HEAD is recorded in .git/logs/

git reflog
e7b2a5 HEAD@{0}: commit: Add payment feature
d6c3b4 HEAD@{1}: rebase: finish
c5a2b3 HEAD@{2}: rebase: start
b4f1a2 HEAD@{3}: checkout: moving to feature branch

Even after hard reset or dropped stash:
git checkout HEAD@{3}   ← recover "lost" state
git stash apply stash@{0}   ← recover dropped stash
Reflog entries kept for 90 days by default
```

**Pack files — storage optimization:**

```
Loose objects → Pack files (compression + delta encoding)

git gc (or automatic after ~6700 loose objects)

Pack file stores:
├── Full snapshots of recent versions
├── Delta encoding: store diff between similar blobs
└── Result: repository stays compact even with long history

Example:
  1000 versions of a 10MB config file
  Without pack: 10GB
  With pack (delta encoding): ~50MB
```

---

## 2. Branching Strategies

**Git Flow** — structured, release-centric:

```
main ─────●────────────────────────────────●──────
           \                              /
develop ────●──●──●──●──●──●──●──●──●──●──
                \        \        /
feature/A ───────●──●──●──/        /
                          \       /
feature/B ─────────────────●──●──/

release/v2.0 ────────────────●──●──●
                                      \
hotfix/v1.9.1 ──────────────────────●──●

Branches:
├── main: production-ready code only, tagged releases
├── develop: integration branch, next release
├── feature/*: one branch per feature (from develop)
├── release/*: stabilization (from develop, → main + develop)
└── hotfix/*: emergency fixes (from main → main + develop)

Best for: scheduled releases, mobile apps, multiple versions
Worst for: continuous delivery (too much ceremony)
```

**Trunk-Based Development** — speed, CI-first:

```
main ●──●──●──●──●──●──●──●──●──●──●──●──●──
     │        │              │
     (deploy) (deploy)       (deploy)

Short-lived feature branches (< 1 day):
main ●────────────────────────────────────●──
       \                                 /
        feature/x ●──●──● (hours, not days)

Rules:
├── Commit to main (or merge) at least daily
├── Feature flags hide incomplete features in production
├── No long-running branches
└── CI must be fast (< 10 min) to make this work

Best for: continuous delivery, high-performing teams
Requires: feature flags, comprehensive testing, fast CI
```

**GitHub Flow** — simple, web-app focused:

```
main ●──────────────────────────────────●──●──
       \                               /
        feature ●──●──●──(PR)──review──

Rules:
├── main is always deployable
├── All work on branches from main
├── Open PR for feedback early
├── Deploy branch to staging before merging
└── Merge = deploy to production

Best for: web services, SaaS, continuous deployment
Simpler than Git Flow, more structured than TBD
```

**Strategy selection guide:**

```
Delivery model        → Branching strategy
────────────────────────────────────────────
Continuous (daily+)   → Trunk-Based Development
Frequent (weekly)     → GitHub Flow
Scheduled releases    → Git Flow
Large monorepo        → Trunk-Based + feature flags
Multiple live versions→ Git Flow with long-lived release branches
```

---

## 3. Rebase vs Merge (Advanced Usage)

**How they differ conceptually:**

```
Merge (preserves history, honest):
        A──B──C  feature
       /         \
──1──2──────────── M  main
                  (merge commit M shows it happened)

Rebase (rewrites history, linear):
               A'─B'─C'  feature (NEW commits, same changes)
              /
──1──2──────── main

A,B,C → A',B',C' have same diffs but NEW SHA hashes
History looks like feature was built on top of latest main
```

**When to use each:**

```
Use Merge when:
├── Preserving complete history is important
├── Working on a shared/public branch
├── Merging long-running release branches
└── You want to see exactly when integration happened

Use Rebase when:
├── Keeping history clean and linear
├── Updating a local feature branch with upstream changes
├── Preparing commits before opening a PR
└── Working alone on a private branch

Golden rule:
  NEVER rebase commits that have been pushed to a shared branch
  Rebase rewrites SHA → teammates' history diverges → chaos
```

**Advanced rebase scenarios:**

```
Rebase onto different base:
git rebase --onto main feature-base feature-tip
  "Take commits from feature-base..feature-tip
   and replay them onto main"
  
  Used when: splitting a feature, moving a branch

Preserve merge commits during rebase:
git rebase --rebase-merges main
  Replays merge commits as-is (not flattened)

Rebase with autosquash:
git rebase -i --autosquash HEAD~10
  Auto-arranges: commits marked "fixup!" or "squash!"
  are automatically placed and labeled for squashing
```

---

## 4. Interactive Rebase & History Rewriting

Interactive rebase is **surgery on your commit history** — clean up messy work-in-progress commits before sharing with the team.

**Interactive rebase operations:**

```
git rebase -i HEAD~5   (last 5 commits)

Opens editor:
pick a1b2c3 Add user authentication
pick d4e5f6 WIP: fix bug
pick g7h8i9 more fixes
pick j1k2l3 fix typo
pick m4n5o6 Add tests for auth

Commands:
p, pick   = use commit as-is
r, reword = use commit but edit message
e, edit   = use commit but pause to amend
s, squash = meld into previous commit (keep message)
f, fixup  = meld into previous commit (discard message)
d, drop   = remove commit entirely
b, break  = pause here
x, exec   = run shell command

Result after rebase:
pick a1b2c3 Add user authentication
f    d4e5f6 WIP: fix bug          ← squashed into auth
f    g7h8i9 more fixes            ← squashed into auth
f    j1k2l3 fix typo              ← squashed into auth
pick m4n5o6 Add tests for auth    ← kept separate, clean

Clean history:
●  Add tests for auth
●  Add user authentication
```

**Other history rewriting tools:**

```
git commit --amend:
  Modify the most recent commit:
  ├── Change commit message
  ├── Add forgotten files
  └── Remove accidentally committed file
  Only safe before pushing!

git filter-branch / git filter-repo:
  Rewrite entire repository history:
  ├── Remove sensitive file from ALL commits
  ├── Change author email across all commits
  ├── Extract subdirectory into new repo
  └── git filter-repo is modern replacement (faster, safer)

BFG Repo Cleaner:
  Fast removal of large files or secrets from history
  Use when: accidentally committed credentials or huge binary
  More user-friendly than filter-branch for common cases
```

---

## 5. Cherry-Pick, Revert & Reset Strategies

**Cherry-pick — transplant specific commits:**

```
Scenario: hotfix committed to develop, need it on main

develop: ●──A──B──C──hotfix──D──E
                              │
main:    ●──────────────────── ●  ← need hotfix here

git checkout main
git cherry-pick hotfix-sha

main:    ●──────────────────────●──hotfix'
                                   (new SHA, same diff)

Cherry-pick range:
git cherry-pick A^..D    ← pick commits A through D

Cherry-pick without commit (stage only):
git cherry-pick --no-commit sha   ← apply changes but don't commit
```

**Revert — safe undo for shared history:**

```
Scenario: commit abc123 broke production, it's already pushed

git revert abc123
  Creates NEW commit that undoes changes from abc123
  History preserved (honest: "we made a mistake, here's the fix")
  Safe for shared/public branches

git revert --no-commit abc123 def456
  Stage reverts for multiple commits, commit as one

When to use:
├── Undoing pushed commits on shared branch
├── Undoing a merge: git revert -m 1 <merge-commit>
└── Compliance: audit trail must show what happened
```

**Reset — powerful, local-only undo:**

```
git reset modes:

--soft   (move HEAD, keep staging, keep working tree)
  git reset --soft HEAD~1
  → Undo last commit but keep all changes staged
  → Use when: want to re-commit differently

--mixed  (move HEAD, clear staging, keep working tree) [DEFAULT]
  git reset HEAD~1
  → Undo last commit, unstage changes, keep files
  → Use when: want to re-stage and re-commit selectively

--hard   (move HEAD, clear staging, clear working tree)
  git reset --hard HEAD~1
  → Completely discard last commit AND all changes
  → DANGEROUS: working tree changes are gone
  → Use when: completely abandon recent work

Reset to remote state:
  git reset --hard origin/main
  → Discard all local commits and changes

Recovery after accidental hard reset:
  git reflog → find old HEAD sha
  git reset --hard abc1234 → recover
```

---

## 6. Git Bisect for Debugging

Git bisect performs a **binary search through commit history** to find exactly which commit introduced a bug — turning hours of manual investigation into minutes.

**Bisect workflow:**

```
Scenario: v2.0 works, v3.0 is broken, 500 commits between them

Manual search: test each commit = up to 500 tests
Binary search (bisect): log2(500) ≈ 9 tests

git bisect start
git bisect bad              ← current HEAD is broken
git bisect good v2.0        ← v2.0 was known good

Git checks out commit at midpoint (~commit 250)
You test → broken:
git bisect bad              ← narrows to 251-500

Git checks out commit ~375
You test → works:
git bisect good             ← narrows to 376-500

... continues ~7 more rounds ...

Git identifies:
"abc1234 is the first bad commit"
git show abc1234            ← see exactly what changed
git bisect reset            ← return to original HEAD
```

**Automated bisect (most powerful):**

```
git bisect start
git bisect bad HEAD
git bisect good v2.0
git bisect run ./test.sh    ← script: exit 0=good, exit 1=bad

Git runs binary search automatically, no manual testing
Script might be:
  ├── Unit test that fails on the regression
  ├── curl to an endpoint checking expected behavior
  └── grep for presence/absence of a string in build output

Git finds culprit commit completely automatically
```

---

## 7. Git Hooks (Client & Server Side)

Git hooks are **scripts that fire automatically at specific points** in the Git workflow — enabling automation, validation, and policy enforcement.

**Hook locations and types:**

```
Client-side hooks (.git/hooks/):
  Pre-operation (can abort the operation):
  ├── pre-commit      → runs before commit created
  │   Use: lint, test, secret scanning
  ├── prepare-commit-msg → modify default commit message
  ├── commit-msg      → validate commit message format
  │   Use: enforce conventional commits
  ├── pre-push        → runs before push to remote
  │   Use: run full test suite
  └── pre-rebase      → runs before rebase

  Post-operation (informational, can't abort):
  ├── post-commit     → notification after commit
  └── post-checkout   → after checkout (e.g., install dependencies)

Server-side hooks (in remote repository):
  ├── pre-receive     → before any refs updated
  │   Use: enforce branch protection, validate commit format
  ├── update          → per-branch version of pre-receive
  └── post-receive    → after all refs updated
      Use: trigger CI/CD, send notifications, deploy

Hook behavior:
  Exit 0  → success, operation proceeds
  Exit non-zero → failure, operation aborted
```

**Hook distribution with pre-commit framework:**

```
Problem: .git/hooks not tracked by Git
         Every developer must set up hooks manually

Solution: pre-commit framework (version-controlled hooks)

.pre-commit-config.yaml (committed to repo):
repos:
- repo: https://github.com/pre-commit/pre-commit-hooks
  hooks:
  - id: trailing-whitespace
  - id: end-of-file-fixer
  - id: detect-private-key       ← secret detection
  - id: check-yaml

- repo: https://github.com/gitleaks/gitleaks
  hooks:
  - id: gitleaks                 ← credential scanning

- repo: local
  hooks:
  - id: conventional-commit
    name: Validate commit message
    entry: scripts/validate-commit.sh
    language: script

Developer setup: pre-commit install (once)
Result: hooks run automatically on every commit
```

---

## 8. Git Submodules & Monorepo Strategy

**Submodules — embedding one repo inside another:**

```
Use case: shared library used by multiple projects

parent-repo/
├── src/
├── libs/
│   └── shared-auth/    ← git submodule (separate repo)
│       ├── (tracked at specific commit SHA)
│       └── .git        ← separate git history
└── .gitmodules         ← declares submodule config

.gitmodules:
[submodule "libs/shared-auth"]
  path = libs/shared-auth
  url = https://github.com/org/shared-auth.git
  branch = main

Workflow:
  git submodule add URL libs/shared-auth    ← add
  git submodule update --init --recursive   ← clone
  git submodule update --remote             ← pull latest

Challenges:
├── Developers forget to initialize submodules
├── Submodule pinned to commit SHA (must explicitly update)
├── Two repos to manage, push, and review
└── CI must checkout submodules explicitly
```

**Monorepo strategy:**

```
Monorepo: all projects in one repository

org-monorepo/
├── services/
│   ├── payment-api/
│   ├── order-service/
│   └── user-service/
├── libraries/
│   ├── shared-auth/
│   └── common-utils/
├── infrastructure/
│   ├── terraform/
│   └── k8s/
└── tools/

Benefits:
├── Atomic commits across multiple services
├── Shared code without package publishing
├── Single CI/CD system, unified tooling
├── Easy cross-service refactoring
└── Dependency graph is visible

Challenges:
├── CI runs on every commit (use affected-only CI)
├── Repository grows very large (use shallow clones)
├── Access control: all or nothing by default (use CODEOWNERS)
└── Merge conflicts in shared files

Tooling for monorepos:
├── Nx (JavaScript/TypeScript focused, affected graph)
├── Bazel (Google-origin, any language, hermetic builds)
├── Turborepo (Next-gen JS monorepo, fast caching)
└── Pants (Python-focused, incremental builds)

Affected-only CI (key for monorepo performance):
  Git diff detects which packages changed
  CI only builds/tests changed packages + their dependents
  Result: team working on payment-api doesn't trigger
          order-service tests (if no shared dep changed)
```

---

## 9. Semantic Versioning (SemVer)

Semantic Versioning is a **precise communication protocol** for what changed in a release — version numbers carry meaning.

**SemVer format and rules:**

```
MAJOR.MINOR.PATCH[-PRE_RELEASE][+BUILD_METADATA]

2   .  4  .  1  -  rc.1  +  build.123
│      │      │     │           │
│      │      │     │           └── build metadata (ignored in precedence)
│      │      │     └── pre-release (rc.1 < 2.4.1)
│      │      └── PATCH: backward-compatible bug fixes
│      └── MINOR: backward-compatible new functionality
└── MAJOR: incompatible API changes

Rules:
├── PATCH: bug fix that doesn't change API → 2.4.0 → 2.4.1
├── MINOR: new feature, fully backward compatible → 2.4.1 → 2.5.0
├── MAJOR: breaking change → 2.5.0 → 3.0.0
└── 0.x.x: initial development, anything may change

Pre-release ordering:
1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-beta < 1.0.0-rc.1 < 1.0.0

Dependency constraints (package managers):
├── ^2.4.1  → >=2.4.1 <3.0.0  (compatible with 2.x)
├── ~2.4.1  → >=2.4.1 <2.5.0  (compatible patch)
├── 2.4.*   → any patch of 2.4
└── >=2.4.1 → anything 2.4.1 or higher
```

**Conventional Commits — machine-readable commit messages:**

```
Format: <type>[(scope)][!]: <description>

Types:
├── feat:     new feature → bumps MINOR
├── fix:      bug fix → bumps PATCH
├── feat!:    breaking change → bumps MAJOR (! = breaking)
├── fix!:     breaking fix → bumps MAJOR
├── docs:     documentation only → no version bump
├── chore:    maintenance → no version bump
├── refactor: code change, no new feature/fix → no bump
├── perf:     performance improvement → PATCH
└── test:     adding tests → no bump

Examples:
  feat(auth): add OAuth2 support
  fix(payment): handle null card number
  feat!: remove deprecated v1 API endpoints
  fix!: change error response schema

  BREAKING CHANGE in body also triggers MAJOR:
  feat(api): redesign authentication

  BREAKING CHANGE: auth token format changed from JWT to opaque token

Tools that read conventional commits:
├── semantic-release → auto version bump + changelog
├── standard-version → local release script
└── release-please (Google) → PR-based release management
```

---

## 10. Tagging & Release Management

**Tags — permanent pointers to specific commits:**

```
Lightweight tag (just a pointer, no metadata):
  git tag v2.4.1
  → pointer to current commit, stored in refs/tags/

Annotated tag (full object with metadata — PREFERRED):
  git tag -a v2.4.1 -m "Release v2.4.1: payment service fixes"
  → creates tag object: tagger, date, message, GPG signature
  → shows in git log --oneline --decorate
  → visible in GitHub releases

Tag management:
  git tag                        ← list all tags
  git tag -l "v2.*"              ← list matching pattern
  git push origin v2.4.1         ← push specific tag
  git push origin --tags         ← push all tags
  git tag -d v2.4.1              ← delete local tag
  git push origin :refs/tags/v2.4.1  ← delete remote tag

Tagging a past commit:
  git tag -a v2.3.1 abc1234 -m "Backport: tag old release"
```

**Automated release pipeline:**

```
Conventional commits drive automated releases:

Developer workflow:
  feat(payment): add Apple Pay support
  → commit pushed to main
  
semantic-release analyzes commits since last tag:
  ├── Finds feat → MINOR bump
  ├── Determines new version: 2.4.0 → 2.5.0
  ├── Generates CHANGELOG.md from commit messages
  ├── Updates version in package.json / pyproject.toml
  ├── Creates Git tag: v2.5.0 (annotated, GPG-signed)
  ├── Pushes tag and version bump commit
  ├── Creates GitHub Release with changelog as notes
  └── Triggers release CI pipeline (build artifacts, Docker push)

Result: zero human decision-making for routine releases
        humans focus on code quality, not release mechanics
```

---

## 11. Secure Git Workflows

**Signed commits — cryptographic author verification:**

```
Problem: anyone can set git config user.email to anything
         → impersonation, supply chain attacks

Solution: GPG or SSH signed commits

GPG signing:
  git config --global user.signingkey YOUR_GPG_KEY_ID
  git config --global commit.gpgsign true
  git commit -S -m "feat: add secure payment"

SSH signing (modern, simpler):
  git config --global gpg.format ssh
  git config --global user.signingkey ~/.ssh/id_ed25519.pub
  git config --global commit.gpgsign true

Verification:
  git log --show-signature    ← shows GPG/SSH signature status
  git verify-commit HEAD      ← verify specific commit

GitHub/GitLab: shows "Verified" badge on signed commits
Enforce: require signed commits in branch protection rules
```

**Branch protection (non-negotiable for production):**

```
GitHub Branch Protection for main:

Required:
├── Require pull request reviews (minimum 2 approvers)
├── Require status checks to pass (CI must be green)
├── Require branches to be up-to-date before merging
├── Require conversation resolution before merge
├── Require signed commits (GPG/SSH)
└── Restrict who can push (platform team only can bypass)

Blocked:
├── Force push to protected branch
├── Delete protected branch
└── Merge without required approvals

CODEOWNERS:
  /infrastructure/ @platform-team
  /security/       @security-team
  *.tf             @platform-team @security-team
  → These teams auto-assigned as reviewers
  → Their approval required for relevant file changes
```

**Secret scanning and prevention:**

```
Prevention (stop before commit):
├── pre-commit hooks: gitleaks, detect-secrets
├── IDE plugins: highlight potential secrets
└── Developer education: never commit credentials

Detection (catch in CI):
├── GitHub Secret Scanning (built-in, auto-notifies)
├── GitGuardian (organization-wide monitoring)
└── Gitleaks in CI pipeline

Response when secret committed:
1. Rotate/revoke the secret IMMEDIATELY (assume compromised)
2. Remove from history: git filter-repo (all branches, all forks)
3. Force push new history (with admin bypass)
4. Notify security team
5. Audit: was secret used? Check access logs
6. Post-mortem: prevent recurrence
```

---

## 🚀 ADVANCED CI/CD ENGINEERING

---

## 12. CI/CD Architecture & Pipeline Design

**CI/CD is the nervous system of modern software delivery** — connecting every code change to its deployment outcome through automated, reliable, auditable workflows.

**Pipeline architecture layers:**

```
┌─────────────────────────────────────────────────────────────┐
│                  CI/CD Architecture                         │
│                                                             │
│  Source Layer       Trigger Layer       Execution Layer     │
│  ─────────────      ─────────────       ────────────────    │
│  Git repos      →   Webhooks /      →   Runners / Agents    │
│  Registries         Polling             (GitHub, Jenkins,   │
│  Artifact stores    Schedules           GitLab, Tekton)     │
│                     API triggers                            │
│                                                             │
│  Orchestration Layer           Delivery Layer               │
│  ─────────────────────         ──────────────────           │
│  Pipeline definitions      →   Target environments          │
│  (YAML as code)                (Dev, Staging, Prod)         │
│  Stage dependencies            Deployment strategies        │
│  Conditional execution         (canary, blue-green)         │
└─────────────────────────────────────────────────────────────┘
```

**Pipeline design principles:**

```
Fast Feedback First:
├── Fail fast: cheapest checks run first (lint before integration test)
├── Parallelize: independent stages run concurrently
└── Cache aggressively: dependencies cached between runs

Separation of Concerns:
├── CI (code quality) separated from CD (deployment)
├── Build once, deploy many times (same artifact to all envs)
└── Environment-specific config injected at deploy time, not build time

Immutable Artifacts:
├── Build Docker image ONCE with commit SHA tag
├── Same image promoted from dev → staging → prod
├── Never rebuild for each environment
└── Image tested in dev = exact image in prod

Idempotent Pipelines:
├── Re-running same pipeline → same result
├── No manual steps embedded in automated pipeline
└── Failures can be retried safely
```

**CI/CD system comparison:**

```
GitHub Actions:
├── Native to GitHub, zero setup for GitHub repos
├── Marketplace of 10,000+ actions
├── Free for public repos, generous free tier
└── Best for: GitHub-native, modern teams

GitLab CI:
├── Built into GitLab, deeply integrated
├── Auto DevOps: zero-config CI for common patterns
└── Best for: GitLab shops, self-hosted requirement

Jenkins:
├── Most flexible, highly extensible (plugins)
├── Self-hosted, full control
└── Best for: complex enterprise requirements, legacy integration

Tekton / ArgoCD Workflows:
├── Kubernetes-native pipelines as K8s CRDs
└── Best for: K8s-first, cloud-native organizations
```

---

## 13. Pipeline as Code

Pipeline as Code means **CI/CD pipelines are version-controlled, reviewed, and treated with the same engineering rigor as application code** — no more click-based pipeline configuration.

**Benefits over UI-based pipelines:**

```
Pipeline as Code (YAML/Groovy in repo):
├── Versioned: pipeline changes tracked in Git history
├── Reviewable: pipeline changes go through PR review
├── Reproducible: any branch can have its own pipeline version
├── Testable: pipeline can be validated before merge
├── Auditable: who changed the pipeline, when, why
└── Recoverable: broken pipeline → git revert

UI-configured pipelines (Jenkins Classic, etc.):
├── Config lives in database, not in code
├── No review process for pipeline changes
├── Backup required separately from code
└── "Who changed this and why?" → unanswerable
```

**GitHub Actions pipeline-as-code anatomy:**

```
.github/workflows/ci-cd.yml

Trigger definition:
├── on: push, pull_request, schedule, workflow_dispatch
├── Paths filtering: only trigger if relevant files changed
└── Branch filtering: run full suite only on main

Job structure:
├── Jobs run in parallel by default
├── needs: [job-name] → creates dependency ordering
└── if: conditions → conditional job execution

Step structure within job:
├── uses: → reference external action (community or org)
├── run: → execute shell commands
└── with: → pass inputs to action

Environment and secrets:
├── env: → environment variables (non-sensitive)
├── secrets: → encrypted secret references
└── environment: → deployment environment (with protection rules)
```

**Declarative vs scripted pipelines:**

```
Declarative (YAML — preferred):
  Clear structure, linting support, easier to read
  GitHub Actions, GitLab CI, Tekton = declarative

Scripted (Groovy — Jenkinsfile):
  Full programming language power
  Complex logic, dynamic pipeline generation
  Harder to lint, more footguns

When to use scripted:
  Dynamic pipeline generation based on repo content
  Complex conditional logic exceeding YAML expressiveness
  Legacy Jenkins environments
```

---

## 14. Multi-Stage Pipeline Design

Multi-stage pipelines model the **full delivery lifecycle** with distinct stages that gate progression — you can't deploy to production without passing all earlier stages.

**Stage design philosophy:**

```
Progressive validation — each stage proves more:
  Commit stage    → proves code is correct (fast, < 5 min)
  Acceptance stage → proves features work (medium, < 20 min)
  Performance stage → proves it scales (slow, as needed)
  Production stage  → proves it delivers value (continuous)

Stage independence:
  Each stage reads artifacts from artifact store
  Stages don't depend on previous stage's working directory
  Any stage can be re-run independently
```

**Multi-stage pipeline layout:**

```
Code pushed to main branch:

Stage 1 — Commit (< 5 min, always runs on every commit)
  ├── Code compilation / type checking
  ├── Unit tests (fast, no external deps)
  ├── Lint and format validation
  ├── Secrets scanning
  └── Dependency vulnerability scan

Stage 2 — Build (< 5 min, runs if Stage 1 passes)
  ├── Build Docker image
  ├── Tag with commit SHA (immutable)
  ├── Scan image with Trivy
  ├── Sign image with Cosign
  └── Push to container registry

Stage 3 — Integration (< 20 min, runs on build success)
  ├── Deploy to ephemeral/dev environment
  ├── Run integration tests against live services
  ├── API contract tests
  └── Cleanup ephemeral environment

Stage 4 — Staging Deployment (< 10 min)
  ├── Deploy to staging environment
  ├── Run smoke tests
  ├── Run E2E tests
  ├── Performance baseline check
  └── Security scan of running service

Stage 5 — Production Deployment (human gate or automated)
  ├── Manual approval gate (or automated for mature teams)
  ├── Canary deployment (10% → 50% → 100%)
  ├── Metric monitoring between canary steps
  └── Full rollout or automated rollback

Stage 6 — Post-Deploy Verification (continuous)
  ├── Smoke tests in production
  ├── Synthetic monitoring
  └── Business metric baseline check
```

---

## 15. Matrix Builds & Parallel Execution

**Matrix builds test across multiple dimensions simultaneously** — instead of 5 sequential test runs, run all 5 in parallel in < same time as 1.

**Matrix build patterns:**

```
Multi-version testing:
  strategy:
    matrix:
      python-version: [3.9, 3.10, 3.11, 3.12]
      os: [ubuntu-latest, macos-latest, windows-latest]
  → 4 versions × 3 OS = 12 parallel jobs
  → All run simultaneously
  → Total time ≈ time of slowest single job

Include/exclude in matrix:
  strategy:
    matrix:
      os: [ubuntu, windows, macos]
      db: [postgres, mysql]
      exclude:
      - os: macos
        db: mysql          ← skip this combination
      include:
      - os: ubuntu
        db: sqlite         ← add extra combination
        experimental: true

Fail-fast control:
  strategy:
    fail-fast: false       ← don't cancel all jobs if one fails
    matrix:                   (useful for compatibility testing)
      version: [3.9, 3.10, 3.11]
```

**Parallelizing test suites (split, not matrix):**

```
Problem: 10,000 unit tests take 30 minutes sequentially

Solution: split tests across N parallel runners

strategy:
  matrix:
    shard: [1, 2, 3, 4, 5]   ← 5 parallel shards
steps:
- run: pytest tests/ --shard=${{ matrix.shard }} --total-shards=5

Result: 30 min → ~6 min (5x speedup)

Intelligent test splitting (by duration):
  pytest-split: uses historical timing to balance shards
  Each shard runs equal duration (not equal number of tests)
  Result: all 5 shards finish in approximately same time
```

---

## 16. Reusable Workflows & Composite Actions

**Reusable workflows** prevent copy-paste CI/CD configuration across repositories — update once, all consumers get the improvement.

**GitHub Actions reusability hierarchy:**

```
Level 1 — Steps (within a job):
  Uses: action (single step in a job)
  Example: actions/checkout@v4

Level 2 — Composite Actions (group steps):
  Custom action combining multiple steps
  Lives in .github/actions/ or separate repo
  Reusable within same job, no separate runner

Level 3 — Reusable Workflows (group jobs):
  Entire workflow called from another workflow
  Runs on its own runner
  Can have inputs, outputs, secrets

Level 4 — Workflow Templates (org-level):
  Templates in .github/workflow-templates/ repo
  Suggested to teams when creating new workflows
```

**Composite Action example (concept):**

```
.github/actions/build-and-push/action.yml:

Inputs:
├── image-name (required)
├── dockerfile-path (default: ./Dockerfile)
└── registry (default: ghcr.io)

Steps bundled inside:
├── Set up Docker Buildx
├── Login to registry
├── Extract metadata (tags, labels)
├── Build multi-platform image
├── Scan with Trivy
└── Push if scan passes

Teams use it as single step:
- uses: org/.github/.github/actions/build-and-push@v2
  with:
    image-name: payment-service
```

**Reusable workflow (concept):**

```
Org-level workflow: .github/workflows/standard-deploy.yml

Inputs:
├── environment (dev/staging/prod)
├── service-name
└── image-tag

Secrets: inherited from caller

Jobs:
├── validate: check deployment config
├── deploy: ArgoCD sync
├── verify: smoke tests
└── notify: Slack notification

Team calls it with 5 lines:
uses: org/.github/.github/workflows/standard-deploy.yml@v3
with:
  environment: production
  service-name: payment-api
  image-tag: ${{ needs.build.outputs.image-tag }}
secrets: inherit
```

---

## 17. Environment-Based Deployments

**Environments model the real-world promotion path** from development through to production — with distinct configurations, access controls, and approval gates per environment.

**Environment hierarchy:**

```
Development environment:
├── Purpose: developer integration testing
├── Deploy trigger: auto on merge to main
├── Approval: none (fully automated)
├── Data: synthetic/anonymized
├── Scale: minimal (1 replica)
└── Access: all engineers

Staging environment:
├── Purpose: pre-production validation, QA
├── Deploy trigger: auto after dev smoke tests pass
├── Approval: none (automated) or tech lead
├── Data: anonymized production clone (refreshed daily)
├── Scale: production-like (but smaller)
└── Access: engineers + QA team

Production environment:
├── Purpose: serving real users
├── Deploy trigger: manual gate or automated canary
├── Approval: required (named approvers)
├── Data: real user data
├── Scale: full
└── Access: platform team + on-call engineers only

Ephemeral environments (per PR):
├── Purpose: isolated PR testing, demo
├── Deploy trigger: PR opened/updated
├── Approval: none
├── Lifetime: destroyed on PR close
└── URL: pr-123.preview.company.com
```

**Environment configuration management:**

```
Configuration hierarchy (never hardcode in image):

Base config (same across all envs):
  LOG_FORMAT=json
  METRICS_PORT=9090
  HEALTH_PATH=/health

Environment-specific (injected at deploy time):
  DEV:
    LOG_LEVEL=debug
    REPLICAS=1
    DB_HOST=dev-postgres.internal

  STAGING:
    LOG_LEVEL=info
    REPLICAS=2
    DB_HOST=staging-postgres.internal

  PROD:
    LOG_LEVEL=warn
    REPLICAS=5
    DB_HOST=prod-postgres.internal

Secrets (always from Vault/Secrets Manager, never hardcoded):
  DB_PASSWORD → injected at runtime from Vault
  API_KEY → injected at runtime from Vault
```

---

## 18. Secrets Management in CI/CD

**Secrets in CI/CD are a primary attack surface** — the pipeline has credentials to deploy everywhere, making it a high-value target.

**Secret storage hierarchy (safest → least safe):**

```
Most secure:
├── External secrets manager (HashiCorp Vault, AWS Secrets Manager)
│   └── Secrets fetched at pipeline runtime, not stored in CI
├── CI/CD native encrypted secrets (GitHub Encrypted Secrets)
│   └── Encrypted at rest, never exposed in logs
├── Environment-scoped secrets
│   └── Only available to specific deployment environments
└── NEVER:
    ├── Hardcoded in YAML/code
    ├── In environment variables visible in logs
    ├── In artifact/image layers
    └── In Git repository (even private)
```

**Secret access patterns in pipelines:**

```
Pattern 1 — CI native secrets (simple, less flexible):
  GitHub Secrets → available as ${{ secrets.DB_PASSWORD }}
  Rotation: manual (update in GitHub Settings)
  Audit: limited (who accessed this secret?)
  Scope: repo-level, env-level, or org-level

Pattern 2 — OIDC + cloud secrets (recommended for cloud):
  GitHub Actions → OIDC token → AWS/GCP role assumption
  → Fetch secrets from AWS Secrets Manager / GCP Secret Manager
  → No long-lived credentials stored in GitHub at all
  Rotation: automatic (cloud manages it)
  Audit: full CloudTrail log of every access
  Scope: fine-grained IAM policy per workflow

Pattern 3 — Vault with pipeline authentication:
  Pipeline authenticates to Vault (JWT/OIDC method)
  → Vault issues short-lived secrets for pipeline run
  → Secrets expire after pipeline completes
  Rotation: automated by Vault
  Audit: Vault audit log (every secret access logged)
  Scope: Vault policies per team/service/environment
```

**Secret hygiene rules:**

```
Never print secrets in logs:
  BAD:  echo "Connecting to $DB_PASSWORD"
  GOOD: mask secrets (GitHub auto-masks registered secrets)

Short-lived credentials where possible:
  OIDC tokens > long-lived API keys
  Pipeline role assumed per-run > permanent credentials

Least privilege:
  Dev deployment role → can only deploy to dev namespace
  Prod deployment role → can only deploy to prod namespace
  Read access ≠ write access (separate secrets per operation)

Rotation policy:
  Long-lived credentials rotated every 90 days maximum
  Compromised secret: rotate immediately (not "soon")
```

---

## 19. Dependency Caching Strategies

**Caching transforms slow pipelines into fast ones** — dependency installation is often the majority of pipeline time; caching reduces it to seconds.

**Cache key design:**

```
Cache key = hash(lockfile) → cache is valid until lockfile changes

Node.js:   key = hash(package-lock.json)
Python:    key = hash(requirements.txt) or hash(poetry.lock)
Go:        key = hash(go.sum)
Java:      key = hash(pom.xml) or hash(build.gradle)
Rust:      key = hash(Cargo.lock)

Cache hierarchy (fallback chain):
  Primary key:  node-modules-{{ hash('package-lock.json') }}
  Restore keys: node-modules-   ← partial match (older cache)
  
  If exact match: full cache hit (fastest)
  If partial match: restore closest cache, update after install
  If no match: cold start, populate cache after install
```

**Layer caching in Docker builds:**

```
Docker layer cache is the most impactful optimization:

Inefficient (cache busted every time source changes):
  FROM node:20-alpine
  COPY . .                    ← source copy invalidates all below
  RUN npm ci                  ← re-runs every time ANY file changes
  CMD ["node", "index.js"]

Optimized (dep install cached separately from source):
  FROM node:20-alpine
  COPY package*.json ./       ← rarely changes → cached layer
  RUN npm ci                  ← only re-runs when deps change
  COPY src/ ./src/            ← frequently changes → above cached
  CMD ["node", "index.js"]

BuildKit cache mounts (advanced — don't write to image layer):
  RUN --mount=type=cache,target=/root/.npm \
      npm ci
  RUN --mount=type=cache,target=/root/.cache/pip \
      pip install -r requirements.txt

Result: pip/npm cache persists between builds without being
        included in final image size
```

**GitHub Actions caching:**

```
Cache scope:
├── Branch-level: cache available within same branch
├── Base branch: feature branches can read main's cache
└── Cross-repo: not available (security isolation)

Cache size limits:
├── GitHub: 10GB per repository (LRU eviction)
└── Self-hosted: configure your own storage (S3, GCS)

Cache invalidation:
├── Key mismatch → cache miss (install from scratch)
├── Weekly eviction → cold start guaranteed periodically
└── Manual: delete cache via API or UI if corrupted
```

---

## 20. Artifact Management

**Artifacts are the outputs of builds** — every stage produces and consumes artifacts, enabling build-once-deploy-many and traceability.

**Artifact types and lifecycle:**

```
Ephemeral artifacts (within pipeline run):
├── Test results (JUnit XML, coverage reports)
├── Build logs
├── Intermediate compiled outputs
└── Lifetime: hours to days (auto-cleaned)

Release artifacts (long-lived):
├── Docker images (tagged with version + SHA)
├── Compiled binaries (uploaded to release)
├── Helm charts (in chart repository)
├── Python/npm packages (in package registry)
└── Terraform modules (in module registry)
Lifetime: version retention policy (e.g., 90 days for pre-release, forever for release)

Artifact metadata (always attach):
├── Source: git commit SHA, branch, repo
├── Build: pipeline run ID, timestamp, duration
├── Quality: test results summary, scan results
└── Provenance: who built it, on what runner (SLSA)
```

**Artifact registry strategy:**

```
One registry per artifact type:
├── Docker images: GHCR / ECR / GCR / Artifactory
├── Helm charts: ChartMuseum / OCI registry
├── npm packages: npm private / Artifactory
├── Python packages: PyPI private / Artifactory
└── Generic artifacts: S3 / GCS bucket

Promotion pattern (same artifact, multiple tags):
  Build:    payment-api:sha-abc1234
  Dev:      payment-api:dev-latest → points to sha-abc1234
  Staging:  payment-api:staging-latest → promoted from dev
  Prod:     payment-api:v2.4.1 → semver tag on production artifact
  
  Never rebuild for each environment
  Same SHA-tagged image promoted through all stages
```

---

## 21. Docker Build & Push Automation

**Automated Docker builds are the foundation** of container-based CD — every merge produces an image ready to deploy.

**Docker build automation pipeline:**

```
Trigger: push to main branch

Build phase:
├── Checkout code (sparse checkout for large repos)
├── Set up Docker Buildx (enables multi-platform, cache features)
├── Extract metadata:
│   ├── Tags: sha-{commit}, branch-main, latest, v2.4.1 (if tagged)
│   └── Labels: org.opencontainers.image.* (OCI standard labels)
├── Cache configuration:
│   └── GitHub Actions cache or registry cache (--cache-from/to)
├── Build multi-platform (linux/amd64 + linux/arm64):
│   └── Buildx with QEMU for cross-platform
└── Build args (inject at build time, not in image):
    └── BUILD_DATE, GIT_SHA, VERSION

Security phase:
├── Scan image with Trivy (fail on CRITICAL)
├── Sign image with Cosign (keyless OIDC signing)
└── Generate SBOM (attach to image)

Push phase:
├── Push to registry (SHA tag always, version tag on release)
├── Attach SBOM to registry entry
└── Update deployment manifest with new SHA tag
```

**Multi-platform builds:**

```
Why multi-platform:
├── Production: x86_64 (AMD64) servers
├── Development: Apple Silicon (ARM64) MacBooks
└── One image, both architectures → same behavior everywhere

Build strategy:
  Approach 1: Build and push manifest list
    Single docker buildx build --platform linux/amd64,linux/arm64
    → Registry serves correct platform automatically
    
  Approach 2: Build per-platform, merge manifest
    Build AMD64 in CI → push with platform tag
    Build ARM64 in CI (different runner) → push with platform tag
    docker manifest create → merge into multi-arch image
    → Faster (parallel), better for slow cross-compilation
```

---

## 22. Automated Versioning & Release Pipelines

**Fully automated release pipeline — zero human decision on version numbers:**

```
Developer workflow:
  Write code → conventional commit messages → push → done

Automated release pipeline:

Trigger: push to main branch
          │
          ▼
Commit analysis (semantic-release / release-please):
├── Scan commits since last tag
├── Determine version bump from commit types:
│   feat → MINOR, fix → PATCH, feat! → MAJOR
└── Calculate new version: 2.4.0 → 2.5.0
          │
          ▼
Pre-release validation:
├── All CI checks must be green
├── No pending PRs labeled "block-release"
└── Release branch protection checks
          │
          ▼
Release creation:
├── Update version in manifest files (package.json, etc.)
├── Generate CHANGELOG.md from commit messages
├── Create release commit
├── Create annotated Git tag (v2.5.0)
├── Push tag and commit to main
└── Create GitHub/GitLab Release with changelog as body
          │
          ▼
Artifact publication (triggered by tag):
├── Build Docker image tagged v2.5.0 + sha-abc1234
├── Build and publish npm/pypi package v2.5.0
├── Build and publish Helm chart v2.5.0
└── Attach SBOM and signatures to all artifacts
          │
          ▼
Deployment trigger:
└── New tag → triggers deployment pipeline to production
```

---

## 23. Blue-Green & Canary Deployment Automation

**Blue-Green Deployment — instant switchover:**

```
Architecture:
  Load Balancer
       │
  ┌────┴────┐
  │         │
Blue       Green
(v2.4.1)   (v2.5.0)  ← deploy here first
 Active     Inactive

Automated flow:
1. Deploy v2.5.0 to Green (load balancer still routes to Blue)
2. Run smoke tests and health checks against Green directly
3. Switch load balancer → 100% traffic to Green (instant)
4. Monitor for 15 minutes (metrics, error rate, latency)
5a. All good: Blue becomes idle (keep for rollback for 1 hour)
5b. Issues detected: switch load balancer back to Blue (< 30 seconds)

Advantages:
├── Zero-downtime deployment
├── Instant rollback (flip switch back)
└── Full test of new version before users see it

Disadvantages:
├── 2x infrastructure cost (two full environments running)
└── Database migrations must be backward compatible
    (both Blue and Green may run simultaneously briefly)
```

**Canary Deployment — gradual traffic shifting:**

```
Architecture with Istio/Argo Rollouts:

Production traffic (1000 req/min):
├── 90% → stable (v2.4.1) ← 900 req/min
└── 10% → canary (v2.5.0) ← 100 req/min

Automated canary progression:

Phase 1: Deploy v2.5.0 as canary (1% traffic)
  Wait 10 minutes
  Check: error rate, latency p99, business metrics
  If metrics good → Phase 2

Phase 2: Increase to 10% traffic
  Wait 15 minutes
  Check: same metrics + user-facing metrics
  If metrics good → Phase 3

Phase 3: Increase to 50% traffic
  Wait 30 minutes
  Full metric evaluation
  If metrics good → Phase 4

Phase 4: 100% traffic (full rollout)
  Old version scaled down
  Release complete

Auto-rollback trigger at any phase:
  error_rate > 1% → immediate: route 100% back to stable
  latency_p99 > 200ms → immediate rollback
  business_metric drops > 5% → alert + pause (human decides)
```

---

## 24. Rollback Strategies

**Rollback speed and safety depend entirely on preparation before deployment:**

```
Strategy 1 — Git revert (GitOps rollback):
  Trigger: git revert <merge-commit-sha>
  Push to main → ArgoCD detects → redeploys old version
  Speed: 3-5 minutes
  Use when: GitOps workflow, normal degradation
  Safety: full audit trail, PR-based

Strategy 2 — Registry rollback (direct):
  argocd app set payment-api --kustomize-image payment:sha-prev
  Speed: 1-2 minutes
  Use when: urgent (faster than PR-based)
  Risk: bypasses GitOps (creates drift until Git is also updated)
  Must-do: immediately create PR to update Git to match

Strategy 3 — Blue-green flip:
  Load balancer switch: 100% back to Blue
  Speed: < 30 seconds
  Use when: blue-green setup active, immediate rollback needed
  Best for: critical production incidents

Strategy 4 — Argo Rollouts abort:
  kubectl argo rollouts abort payment-api
  Automatically routes back to stable ReplicaSet
  Speed: < 1 minute
  Use when: canary deployment is in progress

Database rollback complexity:
  Code rollback is easy.
  Database schema rollback is hard.
  
  Expand-contract pattern prevents this:
  Phase 1: Add new column (backward compatible)
  Phase 2: Deploy code that uses both old and new column
  Phase 3: Migrate data to new column
  Phase 4: Remove old column (after rollback window passes)
  
  Result: any phase can be rolled back safely
```

---

## 25. CI/CD Security Best Practices

**The CI/CD pipeline is the most privileged system in your organization** — it has credentials to deploy everywhere. Securing it is non-negotiable.

**Pipeline security attack surfaces:**

```
Supply chain attacks:
├── Malicious third-party actions/plugins
│   → Pin actions to commit SHA, not tag
│   → actions/checkout@v4 can be changed; SHA cannot
│   → Use: actions/checkout@abc1234def567890 (immutable)
│
├── Compromised dependencies (npm, pip packages)
│   → Dependency scanning in every pipeline
│   → Lock files committed (no floating versions)
│   └── SBOM generated per build

Credential exposure:
├── Secrets leaked in logs
│   → Mask all secrets, never echo to stdout
│   → Review logs before sharing publicly
│
├── Long-lived credentials
│   → Use OIDC (no stored credentials)
│   → Short-lived tokens generated per run

Infrastructure risk:
├── Shared runners with access to everything
│   → Use dedicated runners per environment tier
│   → Self-hosted runners with network segmentation
│
└── Overprivileged pipeline service accounts
    → Least privilege: deploy-only to target namespace
    → Separate credentials per environment
    → Production credentials never in dev pipeline
```

**SLSA (Supply-chain Levels for Software Artifacts):**

```
SLSA defines levels of supply chain security:

Level 1: Documented build process, some provenance
Level 2: Tamper-resistant build service + signed provenance
Level 3: Hardened build environment, auditable
Level 4: Two-person review, hermetic builds

Practical implementation:
├── Generate provenance: who built this, from what source
├── Sign artifacts: Sigstore/Cosign (keyless OIDC signing)
├── Verify at deploy time: signature checked before deployment
└── SBOM: full inventory of what's in the artifact
```

---

## 26. Observability in CI/CD

**You can't improve what you can't measure** — CI/CD observability means tracking pipeline performance, failure patterns, and delivery metrics continuously.

**Pipeline observability layers:**

```
Metrics (quantitative):
├── Pipeline duration: P50, P95, P99 over time
├── Success rate: % of pipeline runs that pass
├── Stage-level duration: where is time spent?
├── Queue wait time: how long before runner starts?
├── Cache hit rate: effectiveness of caching strategy
├── Deployment frequency: DORA metric (runs/day)
└── Lead time: commit timestamp → production deploy timestamp

Logs (diagnostic):
├── Every step's output searchable
├── Structured logs with run ID, job ID, step name
├── Correlated to Git commit, PR, author
└── Retained for 90 days (audit requirement)

Traces (end-to-end):
├── Single trace ID across entire pipeline run
├── Visualize: which steps ran, how long, what failed
├── Distributed tracing if pipeline spans multiple systems
└── Tools: OpenTelemetry + Jaeger, Honeycomb, Datadog

Dashboards:
├── DORA metrics dashboard (deployment freq, lead time, etc.)
├── Pipeline health (failure rate by stage, flaky tests)
├── Cost dashboard (runner minutes per team per month)
└── Security dashboard (scan findings trend, blocked deployments)
```

**DORA metrics — measure delivery performance:**

```
Elite performers (2023 State of DevOps benchmarks):

Deployment Frequency:
├── Elite:   On-demand (multiple/day)
├── High:    Daily to weekly
├── Medium:  Weekly to monthly
└── Low:     Monthly to < 6 months

Lead Time for Changes (commit → production):
├── Elite:   < 1 hour
├── High:    1 day to 1 week
├── Medium:  1 week to 1 month
└── Low:     > 1 month

Change Failure Rate:
├── Elite:   0-5%
├── High:    5-10%
├── Medium:  10-15%
└── Low:     > 15%

MTTR (Mean Time to Restore):
├── Elite:   < 1 hour
├── High:    < 1 day
├── Medium:  1 day to 1 week
└── Low:     > 1 week

Track these per team, aggregate for org
Improvement trend matters more than absolute number
```

---

## Summary: Complete CI/CD Architecture

```
Developer commits with Conventional Commits format
              │
              ▼
Git Push → Webhook fires
              │
    ┌─────────▼──────────┐
    │    Commit Stage    │  < 5 min
    │  Lint, Unit Tests  │
    │  Secrets Scan, SAST│
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │    Build Stage     │  < 5 min
    │  Docker build      │
    │  Image scan, Sign  │
    │  Push (SHA tag)    │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │  Integration Stage │  < 20 min
    │  Deploy to dev     │
    │  Integration tests │
    │  Contract tests    │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │  Staging Deploy    │  < 10 min
    │  E2E tests         │
    │  Performance check │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │  Release(if tagged)│
    │  SemVer bump       │
    │  Changelog + Tag   │
    │  Artifact publish  │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │  Production Deploy │
    │  Canary 1%→100%    │
    │  Metric gates      │
    │  Auto-rollback     │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │  Observability     │
    │  DORA metrics      │
    │  Pipeline dashboard│
    │  Alert on failure  │
    └────────────────────┘
```

Advanced Git and CI/CD mastery = **understanding Git at the object level + branching strategy matched to team cadence + pipeline as code + build-once-deploy-many + security at every layer + continuous measurement of delivery performance**.
