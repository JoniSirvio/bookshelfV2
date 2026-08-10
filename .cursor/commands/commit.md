---
description: Write a proper commit message for staged changes and run git commit.
---

Write a proper commit message for the staged changes.

1. **Gather context**: Run `git status` and `git diff --staged` to see what is staged.

2. **Compose the message** using this format:
   - **Summary line**: Conventional commit style — `type(scope): description` (e.g. `fix(shelf): prevent duplicate books on re-add`). Keep it short and imperative.
   - **Blank line**
   - **Body**: A list of major changes in the commit. Each list item starts with `-`. A single list item may span multiple lines; keep each line to a maximum of 72 characters.
   - **Blank line**
   - **Impact**: A short summary of how this commit affects the codebase. Maximum 72 characters per line.

3. **Commit**: When the message is written, run `git commit` with that message (e.g. `git commit -m "summary" -m "body and impact"` or use a temporary file and `git commit -F` so the full multi-line message is preserved).

Ensure the description is imperative and concise (e.g. `refactor(theme): add theme.ts and migrate colors`, not "Added theme.ts").
