---
description: Refactor code or fix bugs with root-cause fixes and reuse; no quick hacks.
---

1. **Scope**: Confirm whether this is a refactor (improve structure/reuse) or a fix (resolve a bug).

2. **Understand**: Reproduce the bug or identify the area to refactor. Trace data flow and dependencies; note existing patterns (Context, TanStack Query, list/modal components).

3. **Propose**: Propose a root-cause fix or refactor; no temporary patches. Grep for the same pattern elsewhere and fix or refactor consistently. Prefer reusing existing components/hooks from `components/` or `hooks/` over copy-paste.

4. **Implement**: Implement the fix or refactor; ensure types and imports are correct. If the proper fix requires a small extra change (e.g. removing a duplicate property), include it.

5. **Verify**: Check lints, confirm no `any` types crept in, and consider edge cases (null data, network failure) before marking complete.
