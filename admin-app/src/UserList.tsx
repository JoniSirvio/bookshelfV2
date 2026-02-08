import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { call } from "./firebase";

interface UserRow {
  uid: string;
  email: string | null;
  disabled: boolean;
  metadata: { creationTime: string; lastSignInTime: string | null };
}

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "1rem",
};

const modalCardStyle: React.CSSProperties = {
  background: "var(--color-white)",
  borderRadius: "var(--radius)",
  padding: "1.5rem",
  maxWidth: 400,
  width: "100%",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
};

export default function UserList() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const load = (pageToken?: string) => {
    setLoading(true);
    call<{ pageToken?: string; maxResults?: number }, { users: UserRow[]; nextPageToken: string | null }>("listUsers", { pageToken, maxResults: 50 })
      .then((data) => {
        if (pageToken) setUsers((prev) => [...prev, ...data.users]);
        else setUsers(data.users);
        setNextToken(data.nextPageToken);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setAddEmail("");
    setAddPassword("");
    setAddError("");
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const result = await call<{ email: string; password: string }, { uid: string; email: string | null }>("createUser", {
        email: addEmail.trim(),
        password: addPassword,
      });
      setUsers((prev) => [
        {
          uid: result.uid,
          email: result.email ?? addEmail.trim(),
          disabled: false,
          metadata: { creationTime: new Date().toISOString(), lastSignInTime: null },
        },
        ...prev,
      ]);
      closeAddModal();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1 className="page-title" style={{ margin: 0 }}>Users</h1>
        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <UserPlus size={18} />
          Add user
        </button>
      </div>
      {loading && !users.length && (
        <div className="loading">
          <div className="spinner" aria-hidden />
          <p style={{ margin: 0 }}>Loading users…</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
          <p style={{ margin: 0 }}>No users yet.</p>
        </div>
      )}
      {!loading && users.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>UID</th>
                <th>Disabled</th>
                <th>Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <Link to={`/users/${u.uid}`}>{u.email ?? "(no email)"}</Link>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--color-text-secondary-alt)" }}>
                    {u.uid}
                  </td>
                  <td style={{ color: "var(--color-text-secondary-alt)", fontSize: "14px" }}>
                    {u.disabled ? "Yes" : "No"}
                  </td>
                  <td style={{ color: "var(--color-text-secondary-alt)", fontSize: "14px" }}>
                    {u.metadata.lastSignInTime ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nextToken && (
            <button type="button" className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => load(nextToken)}>
              Load more
            </button>
          )}
        </div>
      )}

      {addModalOpen && (
        <div style={modalOverlayStyle} onClick={closeAddModal} role="dialog" aria-modal="true" aria-labelledby="add-user-title">
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h2 id="add-user-title" className="section-title" style={{ marginTop: 0 }}>Add user</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Password (min 6 characters)</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {addError && <p className="error">{addError}</p>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? "Creating…" : "Create user"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeAddModal} disabled={addLoading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
