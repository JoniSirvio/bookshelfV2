import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, call } from "./firebase";
import Layout from "./Layout";
import Login from "./Login";
import Dashboard from "./Dashboard";
import UserList from "./UserList";
import UserDetail from "./UserDetail";

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAdmin(false);
        setLoading(false);
        return;
      }
      call("verifyAdmin")
        .then(() => setAdmin(true))
        .catch(() => setAdmin(false))
        .finally(() => setLoading(false));
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="loading">Checking access…</div>;
  if (admin !== true) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAdmin>
              <Dashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAdmin>
              <UserList />
            </RequireAdmin>
          }
        />
        <Route
          path="/users/:uid"
          element={
            <RequireAdmin>
              <UserDetail />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
