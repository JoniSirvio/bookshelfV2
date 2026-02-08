# BookShelf Admin – Next Steps & Ideas

A prioritised plan to make the admin a **superb** control plane: more insight, better UX, and safer operations.

---

## 1. Quick wins (high impact, low effort)

| Idea | What | Why |
|------|------|-----|
| **Search users** | Search/filter on the Users list by email or UID (client-side or via a new `searchUsers` function). | Finding a specific user in a long list is essential. |
| **Last active** | Store `lastActiveAt` in Firestore when the app is used; show it in Users list and User detail. | Helps spot inactive accounts and prioritise support. |
| **Password reset** | “Send password reset email” on User detail (Cloud Function that calls `auth.generatePasswordResetLink(email)` and optionally sends email, or returns link for admin to share). | Support and onboarding without sharing passwords. |
| **Export users** | “Export CSV” on Users page: email, UID, disabled, book count, AI usage, last active. | Backup, reporting, or moving data. |

---

## 2. Dashboard that tells a story

| Idea | What | Why |
|------|------|-----|
| **Simple trends** | Store daily/weekly aggregates (e.g. in Firestore `config/statsDaily` or a small collection) and show: new users over time, AI usage over time (sparklines or small charts). | One glance to see if the product is growing and how AI is used. |
| **Top readers** | “Users with most books” or “Most AI usage this month” on the dashboard. | Identify power users and potential advocates. |
| **Health check** | Card: “Firestore reads (approx.)”, “Gemini calls this month” if you add counters, or link to Firebase/GCP console. | Avoid billing surprises and plan capacity. |

---

## 3. User management – deeper control

| Idea | What | Why |
|------|------|-----|
| **Delete user** | “Delete user” (with strong confirmation): remove Firebase Auth user and optionally wipe their Firestore data. | GDPR-style right to be forgotten; cleaning test accounts. |
| **Bulk actions** | Select multiple users → “Disable selected”, “Export selected”. | Handling abuse or batch operations. |
| **Impersonation (read-only)** | “View as user” that opens a read-only view of that user’s books/usage (no edit, no auth as them). | Support and debugging without touching their account. |

---

## 4. Books & content

| Idea | What | Why |
|------|------|-----|
| **Search books (per user)** | Filter the Books table by title or author (client-side). | Finding one book in a long list. |
| **Global book search** | Search books across all users (new Cloud Function + admin UI). | “Who has this book?” for support or insights. |
| **Bulk book actions** | Select books in User detail → “Remove selected”, “Move to Read”, etc. | Fixing bad imports or bulk status changes. |

---

## 5. Feature flags & config

| Idea | What | Why |
|------|------|-----|
| **Feature flags** | Firestore `config/featureFlags` (e.g. `enableAIRecommendations`, `maintenanceMode`). Admin UI: toggles; main app reads flags and hides/disables features. | Roll out or turn off features without a release. |
| **Announcement banner** | Store “message” and “active” in config; main app shows a dismissible banner when active. | Maintenance notices or promotions. |

---

## 6. Safety & audit

| Idea | What | Why |
|------|------|-----|
| **Audit log** | Log admin actions (who did what, when) to Firestore `adminAuditLog` or BigQuery. Admin UI: “Recent actions” page. | Accountability and debugging (“who disabled this user?”). |
| **Confirm destructive actions** | Strong confirmation for “Delete user”, “Delete all user data”, with typing the user’s email or a code. | Prevents accidental deletion. |

---

## 7. UX polish

| Idea | What | Why |
|------|------|-----|
| **Pagination for users** | Proper “Page 1, 2, 3” or “Load more” with clearer counts. | Already have nextPageToken; surface it better. |
| **Keyboard shortcuts** | e.g. `/` to focus user search, Esc to close modals. | Power users work faster. |
| **Responsive tables** | Cards on small screens instead of one wide table. | Admin on tablet or phone. |

---

## Suggested order (to make it superb)

1. **Search users** + **Last active** – daily value for finding and understanding users.  
2. **Password reset** – completes “user management” for support.  
3. **Dashboard trends** (or at least “new users this week”) – makes the dashboard feel alive.  
4. **Feature flags** – safe, reversible control over app behaviour.  
5. **Audit log** – trust and safety as the admin gains more power.  
6. **Export users** – reporting and backup.  
7. Then **Delete user**, **Global book search**, or **Announcement banner** depending on what you need most.

---

## Out of scope (for now)

- **2FA for admin** – can be added later with Firebase Auth (e.g. phone or TOTP).  
- **Roles** – one “admin” role is enough until you have multiple teams (then add e.g. “support” read-only).  
- **In-app push from admin** – would need FCM and a new flow; nice later.

Use this as a backlog: pick the items that give you the most value first and iterate.
