# Git Hooks

This directory contains custom git hooks for the commute.live project.

## Setup

Hooks are automatically configured when you run `npm install` in the root directory. This runs `git config core.hooksPath .githooks` to tell git to use these hooks instead of the default `.git/hooks/` directory.

## Hooks

### pre-push

**Purpose:** Ensures that commits pushed to the `main` branch have a commit message starting with "Publish".

**Why?** This enforces that package versions are updated before publishing to main. The convention is:
- Regular commits on feature branches: normal commit messages
- Commits pushed to main: must start with "Publish" (e.g., "Publish v2.6.0")

**Example workflow:**
```bash
# On feature branch - normal commits
git commit -m "Add school bus filtering"
git commit -m "Fix search bug"

# Ready to merge to main - update versions first
npx lerna version
git push origin main  # ✓ Allowed
```

**Override:** In rare cases where you need to push to main without "Publish", use:
```bash
git push --no-verify origin main
```
