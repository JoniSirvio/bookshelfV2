---
description: Smartly adds, commits, and pushes changes to the remote repository.
---

1. **Review & Status**:
   - Run `git status` to check for changes.

2. **Stage Changes**:
   - Run `git add .` to stage all changes.

3. **Generate Commit Message**:
   - IF there are staged changes:
     - Create a conventional commit message (`type(scope): description`).
     - Run `git commit -m "your_message"`.
     - Display the commit hash.
   - ELSE (if clean):
     - Proceed to push directly.

4. **Push**:
   - Run `git push`.
   - If the push fails due to upstream changes, advise the user (e.g., recommend pull/rebase), but do not auto-force.

5. **Verify**:
   - Confirm the push was successful (exit code 0).
