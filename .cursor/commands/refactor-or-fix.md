---
description: Refactor code or fix bugs with root-cause fixes and reuse; no quick hacks.
---

1. **Triage & Guidelines**: Read `.cursorrules` (triage + adopt Debugger or React Native Coder as appropriate). Confirm scope: refactor (improve structure/reuse) or fix (resolve a bug).

2. **Understand**: Reproduce the bug or identify the area to refactor. Trace data flow and dependencies; note existing patterns (Context, TanStack Query, list/modal components).

3. **Propose**: Propose a root-cause fix or refactor; no temporary patches or "bubblegum" fixes. Check for the same pattern elsewhere (grep or semantic search); fix or refactor consistently. Prefer reusing existing components/hooks from `components/` or `hooks/` over copy-paste.

4. **Implement**: Implement the fix or refactor; ensure types and imports are correct. No quick hacks: if the proper fix requires a small extra change (e.g. removing a duplicate property), include it.

5. **Verify**: Run through the QA checklist from `.cursorrules` (imports, types, logic, UI) before marking complete.
