---
description: Smartly adds and commits changes based on completed tasks.
---

1. **Review Context**:
   - Read `task.md` to identify the most recently completed or in-progress tasks.
   - Read `AI_GUIDELINES.md` to ensure any strict project rules are kept in mind (though less relevant for just committing, it's good practice).

2. **Check Status**:
   - Run `git status` to see which files have been modified.

3. **Stage Changes**:
   - Run `git add .` to stage all changes.
     - *Self-Correction*: If there are files that clearly shouldn't be committed (like temp files not in gitignore), stage files individually instead. But generally `git add .` is fine if `.gitignore` is set up.

4. **Generate Commit Message**:
   - Create a conventional commit message following this format: `type(scope): description`
   - **Type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - **Scope**: The file or component being changed (e.g., `auth`, `BookList`, `styles`)
   - **Description**: A concise summary of the change. Use the `task.md` completion details to populate this.
   
5. **Execute Commit**:
   - Run `git commit -m "your_generated_message"`
   - display the commit hash and message to the user.

6. **Verify**:
    - Run `git log -1` to confirm the commit was successful.
