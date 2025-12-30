This document outlines the workflows, project management, GitHub setup, and documentation standards for the website. It is designed to ensure consistency, maintainability, and smooth onboarding of future team members.

---

## 1. GitHub Workflow (Version Control)

Even though branch rules aren’t available on our private repo, we follow a **policy-driven workflow**.

### Branching Strategy

- `main` → Always production-ready.
- `staging`→ Integration branch for features.
- `feature/<short-name>` → Branch for each new feature/task.
- `fix/<short-name>` → Branch for bug fixes.

### Pull Request (PR) Workflow

1. Create a branch: `feature/login-api`.
2. Push work and open a PR into `staging`.
3. At least **one reviewer approval** required before merge.
4. PR must link to the corresponding GitHub issue or task.
5. Merge into `staging` for a clean commit history.

**Team Agreement:** No one merges their own PR without review.

---

## 2. Project Management Workflow

### Issues

- Every task, bug, or feature starts as a **GitHub Issue**.
- Issues should include:
  - Clear description of the problem or requirement
  - Acceptance criteria
  - Relevant labels (e.g., `bug`, `enhancement`, `documentation`)

### Pull Requests (PRs)

- All code changes must go through a **Pull Request**.
- Each PR should:
  - Reference its issue using keywords like `Closes #123` or `Fixes #123`
  - Contain a meaningful title and description
  - Pass automated checks before review

### Closing the Loop

- An issue is **open** while work is pending.
- When a PR is merged:
  - The linked issue is automatically **closed**.
  - This ensures that tasks are completed and tracked without manual cleanup.

---

## 3. Documentation (Design & Technical)

All documentation is stored in the `docs/` folder within the repository. Document filenames use SNAKE_CASE formatting.

### Key Docs

1. `README.md` → High-level project overview and setup instructions.
2. Use [Excalidraw](https://excalidraw.com/) or [Mermaid](https://mermaid.js.org/) for diagrams.
3. `docs/WORKFLOWS.md` → Git/GitHub workflows (this file).
4. `docs/API.md` → API contracts and specifications.
5. `docs/features/FEATURE_NAME.md` → Detailed design for complex features.

---

## 4. Code Quality & Reviews

### PR Checklist (Template)

- Linked to a GitHub issue
- Tested locally
- No debug logs or unnecessary prints
- Documentation updated (if required)

### PR Review & Local Testing Workflow

To ensure code quality, consistent integration, and learning for all team members, the following practices are followed:

#### 1. Pull Request Reviews

- Every PR must have at least **one primary reviewer**. A **secondary reviewer** may be assigned for additional feedback.
- Reviews should be conducted **within 24 hours** of the PR being marked `Ready for Review`.
- **Review focus includes**:
  - Code correctness and functionality
  - Alignment with coding standards and project conventions
  - Proper TypeScript typing, error handling, and documentation
  - Passing automated tests and CI checks
- Reviewers provide **inline comments** for clarity and actionable feedback.
- Developers are expected to **address comments promptly** before the PR can be merged.

#### 2. Testing PR Merges Locally

- Before merging, developers should **test how the PR integrates with the staging branch**.
- Recommended workflow:
  1. Fetch the latest `staging` branch:
     ```bash
     git checkout staging
     git pull origin staging
     git fetch origin pull/<PR-NUMBER>/merge:pr-<PR-NUMBER>-merge
     git checkout pr-<PR-NUMBER>-merge
     ```
  2. Build and run the application locally, ensuring functionality works as expected.
  3. Run unit tests and integration tests.
  4. Discard the temporary branch after testing:
     ```bash
     git checkout staging
     git branch -D test-merge
     ```
- This ensures that any integration issues are caught **before the PR is merged**, reducing regressions and conflicts.

#### 3. Reviewer Etiquette & Responsibilities

- **Timely reviews** prevent blocking teammates; aim for **same-day feedback** when possible.
- **Peer reviews** are encouraged for junior developers to learn and improve before senior review.
- Avoid waiting until a feature is fully completed—review in **smaller increments** to maintain fast feedback loops.
- Only merge after all comments are addressed, automated checks pass, and at least one approval is received.

---

## 5. Testing & Deployment

- **Unit Tests** → Jest (JS/TS).
- **CI/CD** → GitHub Actions (free tier):
  - Run tests on every PR.
  - Deploy `main` branch to production using Firebase.

---

## 6. Team Rituals

- **Weekly Sync (30 min)** → Updates, blockers, next steps.
- **Retro Every 2–3 Weeks** → What went well, what to improve.
- **Clear Ownership** → Each dev owns a feature/module.
