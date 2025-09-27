This document outlines the workflows, project management, GitHub setup, and documentation standards for the new website. It is designed to ensure consistency, maintainability, and smooth onboarding of furture team members.

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

All documentation lives in the `docs/` folder inside the repo.

### Key Docs

1. `README.md` → High-level project overview and setup instructions.
2. `docs/architecture.md` → System architecture and diagrams.
    - Use [Excalidraw](https://excalidraw.com/) or [Mermaid](https://mermaid.js.org/) for diagrams.
3. `docs/workflows.md` → Git/GitHub workflows (this file).
4. `docs/api.md` → API contracts and specifications.
5. `docs/features/feature-name.md` → Detailed design for complex features.

---

## 4. Code Quality & Reviews

### PR Checklist (Template)

- Linked to a GitHub issue
- Tested locally
- No debug logs or unnecessary prints
- Documentation updated (if required)

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
