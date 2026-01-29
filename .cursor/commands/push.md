---
description: Stage changes, commit if needed, and push to the remote repository.
---

1. **Review & Status**: Run `git status` to check for changes.

2. **Stage Changes**: Run `git add .` to stage all changes.

3. **Generate Commit Message**: If there are staged changes, create a conventional commit message (`type(scope): description`), run `git commit -m "your_message"`, and display the commit hash. If the working tree is clean, proceed to push.

4. **Push**: Run `git push`. If the push fails due to upstream changes, advise the user (e.g. recommend pull/rebase); do not auto-force.

5. **Verify**: Confirm the push was successful (exit code 0).
