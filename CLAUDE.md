# Project Instructions

## Git Workflow

### Branch Naming (Semantic Feature Branches)
- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `refactor/<description>` — code refactoring
- `docs/<description>` — documentation changes
- `chore/<description>` — maintenance, tooling, dependencies
- `test/<description>` — adding or updating tests

### Commit Messages (Semantic Commits)
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<optional scope>): <description>

[optional body]
```
Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`, `ci`, `build`

Examples:
- `feat(agents): add bid analysis agent`
- `fix(ui): correct sidebar collapse on mobile`
- `refactor(api): extract shared validation logic`

### Commit After Every File Change
- **Always commit immediately after modifying a file.** Do not batch multiple file changes into a single commit unless they are part of the same atomic logical change.
- This ensures a clean, granular git history and makes it easy to revert individual changes.
- Each commit must follow the semantic commit message format above.

### Branching Strategy
- `dev` is the primary integration branch. All feature branches are created from `dev` and merged back into `dev`.
- **Never merge directly to `main`.** `main` is reserved for release-ready code only.
- Only merge `dev` into `main` at the end of the project when ready for release.

### Pull Requests (Semantic PRs)
- PR title follows same `type(scope): description` format as commits
- PR body includes a Summary and Test Plan section
- PRs target `dev` unless otherwise specified
