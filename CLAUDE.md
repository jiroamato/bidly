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

### Pull Requests (Semantic PRs)
- PR title follows same `type(scope): description` format as commits
- PR body includes a Summary and Test Plan section
- PRs target `main` unless otherwise specified
