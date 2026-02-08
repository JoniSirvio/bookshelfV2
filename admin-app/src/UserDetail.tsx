import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { call } from "./firebase";

interface UserDetailData {
  uid: string;
  email: string | null;
  disabled: boolean;
  customClaims: Record<string, unknown>;
  metadata: { creationTime: string; lastSignInTime: string | null };
}

interface Book {
  id: string;
  title?: string;
  authors?: string[];
  status?: string;
  review?: string;
  rating?: number;
  readOrListened?: string;
  startedReading?: string;
  finishedReading?: string;
  recommendationReason?: string;
  [key: string]: unknown;
}

interface AIUsage {
  recommendationCount: number;
  chatTurnCount: number;
  lastRecommendationAt: number | null;
  lastChatAt: number | null;
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
  maxWidth: 480,
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
};

export default function UserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    status: string;
    review: string;
    rating: string;
    readOrListened: string;
    startedReading: string;
    finishedReading: string;
    recommendationReason: string;
    authors: string;
  }>({
    title: "",
    status: "unread",
    review: "",
    rating: "",
    readOrListened: "",
    startedReading: "",
    finishedReading: "",
    recommendationReason: "",
    authors: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteBook, setDeleteBook] = useState<Book | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [booksFilter, setBooksFilter] = useState<"all" | "unread" | "read" | "recommendation">("all");

  const fetchData = () => {
    if (!uid) return;
    setLoading(true);
    Promise.all([
      call<{ uid: string }, UserDetailData>("getUserDetail", { uid }),
      call<{ uid: string }, { books: Book[] }>("getUserBooks", { uid }).then((r) => r.books),
      call<{ uid: string }, AIUsage>("getUserAIUsage", { uid }),
    ])
      .then(([u, b, usageData]) => {
        setUser(u);
        setBooks(b);
        setUsage(usageData);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [uid]);

  const setDisabled = async (disabled: boolean) => {
    if (!uid) return;
    setActionLoading(true);
    try {
      await call("setUserDisabled", { uid, disabled });
      setUser((prev) => (prev ? { ...prev, disabled } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const setAdmin = async (admin: boolean) => {
    if (!uid) return;
    setActionLoading(true);
    try {
      await call("setAdminClaim", { uid, admin });
      setUser((prev) =>
        prev ? { ...prev, customClaims: { ...prev.customClaims, admin } } : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (book: Book) => {
    setEditBook(book);
    setEditForm({
      title: String(book.title ?? ""),
      status: String(book.status ?? "unread"),
      review: String(book.review ?? ""),
      rating: book.rating != null ? String(book.rating) : "",
      readOrListened: String(book.readOrListened ?? ""),
      startedReading: book.startedReading ? (book.startedReading as string).slice(0, 10) : "",
      finishedReading: book.finishedReading ? (book.finishedReading as string).slice(0, 10) : "",
      recommendationReason: String(book.recommendationReason ?? ""),
      authors: Array.isArray(book.authors) ? book.authors.join(", ") : "",
    });
  };

  const closeEdit = () => {
    setEditBook(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !editBook) return;
    setEditSaving(true);
    try {
      const data: Record<string, unknown> = {
        title: editForm.title.trim() || undefined,
        status: editForm.status as "unread" | "read" | "recommendation",
        review: editForm.review.trim() || undefined,
        recommendationReason: editForm.recommendationReason.trim() || undefined,
      };
      if (editForm.rating !== "") {
        const n = Math.min(5, Math.max(1, parseInt(editForm.rating, 10)));
        if (!isNaN(n)) data.rating = n;
      }
      if (editForm.readOrListened.trim()) data.readOrListened = editForm.readOrListened;
      if (editForm.startedReading.trim()) data.startedReading = editForm.startedReading;
      if (editForm.finishedReading.trim()) data.finishedReading = editForm.finishedReading;
      if (editForm.authors.trim()) {
        data.authors = editForm.authors.split(",").map((s) => s.trim()).filter(Boolean);
      }
      await call("updateUserBook", { uid, bookId: editBook.id, data });
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== editBook.id) return b;
          return {
            ...b,
            title: (data.title as string | undefined) ?? b.title,
            status: (data.status as string | undefined) ?? b.status,
            review: (data.review as string | undefined) ?? b.review,
            rating: (data.rating as number | undefined) ?? b.rating,
            readOrListened: (data.readOrListened as string | undefined) ?? b.readOrListened,
            startedReading: (data.startedReading as string | undefined) ?? b.startedReading,
            finishedReading: (data.finishedReading as string | undefined) ?? b.finishedReading,
            recommendationReason: (data.recommendationReason as string | undefined) ?? b.recommendationReason,
            authors: (data.authors as string[] | undefined) ?? b.authors,
          };
        })
      );
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update book");
    } finally {
      setEditSaving(false);
    }
  };

  const openDelete = (book: Book) => {
    setDeleteBook(book);
  };

  const closeDelete = () => {
    setDeleteBook(null);
    setDeleteConfirming(false);
  };

  const handleConfirmDelete = async () => {
    if (!uid || !deleteBook) return;
    setDeleteConfirming(true);
    try {
      await call("deleteUserBook", { uid, bookId: deleteBook.id });
      setBooks((prev) => prev.filter((b) => b.id !== deleteBook.id));
      closeDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete book");
    } finally {
      setDeleteConfirming(false);
    }
  };

  if (!uid) return null;

  const isAdmin = (user?.customClaims as { admin?: boolean })?.admin ?? false;

  const filteredBooks =
    booksFilter === "all"
      ? books
      : books.filter((b) => (b.status ?? "") === booksFilter);
  const countUnread = books.filter((b) => (b.status ?? "") === "unread").length;
  const countRead = books.filter((b) => (b.status ?? "") === "read").length;
  const countRecommendation = books.filter((b) => (b.status ?? "") === "recommendation").length;

  const formatAuthors = (b: Book): string => {
    if (Array.isArray(b.authors) && b.authors.length > 0) return b.authors.join(", ");
    if (typeof b.authors === "string") return b.authors;
    return "—";
  };

  return (
    <div className="container">
      <p style={{ marginBottom: "1.5rem" }}>
        <Link to="/users" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          ← Back to users
        </Link>
      </p>
      {loading && (
        <div className="loading">
          <div className="spinner" aria-hidden />
          <p style={{ margin: 0 }}>Loading…</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {user && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="section-title">Profile</h2>
            <dl className="key-value">
              <dt>Email</dt>
              <dd>{user.email ?? "—"}</dd>
              <dt>UID</dt>
              <dd>
                <code style={{ fontSize: "12px", fontFamily: "monospace" }}>{user.uid}</code>
              </dd>
              <dt>Disabled</dt>
              <dd>{user.disabled ? "Yes" : "No"}</dd>
              <dt>Admin</dt>
              <dd>{isAdmin ? "Yes" : "No"}</dd>
              <dt>Created</dt>
              <dd>{user.metadata.creationTime}</dd>
              <dt>Last sign-in</dt>
              <dd>{user.metadata.lastSignInTime ?? "—"}</dd>
            </dl>
            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => setDisabled(!user.disabled)}
              >
                {user.disabled ? "Enable account" : "Disable account"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() => setAdmin(!isAdmin)}
              >
                {isAdmin ? "Remove admin" : "Set admin"}
              </button>
            </div>
          </div>
          {usage !== null && (
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h2 className="section-title">AI usage</h2>
              <dl className="key-value">
                <dt>Recommendations</dt>
                <dd>{usage.recommendationCount}</dd>
                <dt>Chat turns</dt>
                <dd>{usage.chatTurnCount}</dd>
                {usage.lastRecommendationAt && (
                  <>
                    <dt>Last recommendation</dt>
                    <dd>{new Date(usage.lastRecommendationAt).toLocaleString()}</dd>
                  </>
                )}
                {usage.lastChatAt && (
                  <>
                    <dt>Last chat</dt>
                    <dd>{new Date(usage.lastChatAt).toLocaleString()}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: "0.5rem" }}>Books ({books.length})</h2>
            {books.length === 0 ? (
              <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>No books.</p>
            ) : (
              <>
                <div className="status-tabs">
                  <button
                    type="button"
                    className={booksFilter === "all" ? "active" : ""}
                    onClick={() => setBooksFilter("all")}
                  >
                    All ({books.length})
                  </button>
                  <button
                    type="button"
                    className={booksFilter === "unread" ? "active" : ""}
                    onClick={() => setBooksFilter("unread")}
                  >
                    Unread ({countUnread})
                  </button>
                  <button
                    type="button"
                    className={booksFilter === "read" ? "active" : ""}
                    onClick={() => setBooksFilter("read")}
                  >
                    Read ({countRead})
                  </button>
                  <button
                    type="button"
                    className={booksFilter === "recommendation" ? "active" : ""}
                    onClick={() => setBooksFilter("recommendation")}
                  >
                    Recommendation ({countRecommendation})
                  </button>
                </div>
                {filteredBooks.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                    No books in this section.
                  </p>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Authors</th>
                          <th>Status</th>
                          <th style={{ width: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBooks.slice(0, 100).map((b) => (
                          <tr key={b.id}>
                            <td>{String(b.title ?? b.id)}</td>
                            <td style={{ color: "var(--color-text-secondary-alt)", fontSize: "14px" }}>
                              {formatAuthors(b)}
                            </td>
                            <td style={{ color: "var(--color-text-secondary-alt)" }}>
                              {String(b.status ?? "—")}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.35rem" }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "0.35rem 0.5rem", fontSize: "13px" }}
                                  onClick={() => openEdit(b)}
                                  title="Edit book"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  style={{ padding: "0.35rem 0.5rem", fontSize: "13px" }}
                                  onClick={() => openDelete(b)}
                                  title="Remove book"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredBooks.length > 100 && (
                      <p style={{ marginTop: "0.75rem", fontSize: "14px", color: "var(--color-text-secondary-alt)" }}>
                        Showing first 100.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {editBook && (
        <div style={modalOverlayStyle} onClick={closeEdit} role="dialog" aria-modal="true" aria-labelledby="edit-book-title">
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h2 id="edit-book-title" className="section-title" style={{ marginTop: 0 }}>Edit book</h2>
            <form className="modal-form" onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Authors (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.authors}
                  onChange={(e) => setEditForm((f) => ({ ...f, authors: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="unread">unread</option>
                  <option value="read">read</option>
                  <option value="recommendation">recommendation</option>
                </select>
              </div>
              <div className="form-group">
                <label>Read or listened</label>
                <select
                  value={editForm.readOrListened}
                  onChange={(e) => setEditForm((f) => ({ ...f, readOrListened: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="read">Read</option>
                  <option value="listened">Listened</option>
                </select>
              </div>
              <div className="form-group">
                <label>Review</label>
                <textarea
                  value={editForm.review}
                  onChange={(e) => setEditForm((f) => ({ ...f, review: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Rating (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editForm.rating}
                  onChange={(e) => setEditForm((f) => ({ ...f, rating: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Started reading</label>
                <input
                  type="date"
                  value={editForm.startedReading}
                  onChange={(e) => setEditForm((f) => ({ ...f, startedReading: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Finished reading</label>
                <input
                  type="date"
                  value={editForm.finishedReading}
                  onChange={(e) => setEditForm((f) => ({ ...f, finishedReading: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Recommendation reason</label>
                <input
                  type="text"
                  value={editForm.recommendationReason}
                  onChange={(e) => setEditForm((f) => ({ ...f, recommendationReason: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeEdit} disabled={editSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteBook && (
        <div style={modalOverlayStyle} onClick={closeDelete} role="dialog" aria-modal="true" aria-labelledby="delete-book-title">
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h2 id="delete-book-title" className="section-title" style={{ marginTop: 0 }}>Remove book</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
              Remove &quot;{String(deleteBook.title ?? deleteBook.id)}&quot; from this user&apos;s collection? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteConfirming}
                onClick={handleConfirmDelete}
              >
                {deleteConfirming ? "Removing…" : "Remove"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeDelete} disabled={deleteConfirming}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
