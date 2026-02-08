import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LayoutDashboard, Users, LogOut } from "lucide-react";
import { auth } from "./firebase";

const navStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "var(--color-white)",
  padding: "0.75rem 1.5rem",
  marginBottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "0.75rem",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "0.25rem",
  textDecoration: "none",
  color: "var(--color-white)",
  fontWeight: 700,
  fontSize: "1.25rem",
};

const linksStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.25rem",
};

const linkBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.4rem 0.75rem",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-white)",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  transition: "background 150ms ease",
};

export function AppTitle() {
  return (
    <>
      <em style={{ fontStyle: "italic", fontWeight: 600 }}>Book</em>
      <span>Shelf</span>
      <span style={{ fontSize: "0.85rem", fontWeight: 400, opacity: 0.9, marginLeft: "0.35rem" }}>
        Admin
      </span>
    </>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <>
      <nav style={navStyle}>
        <Link to="/" style={brandStyle}>
          <AppTitle />
        </Link>
        <div style={linksStyle}>
          <Link
            to="/"
            style={{
              ...linkBaseStyle,
              background: location.pathname === "/" ? "rgba(255,255,255,0.2)" : "transparent",
            }}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link
            to="/users"
            style={{
              ...linkBaseStyle,
              background: location.pathname.startsWith("/users") ? "rgba(255,255,255,0.2)" : "transparent",
            }}
          >
            <Users size={18} />
            Users
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: "14px", padding: "0.4rem 0.75rem" }}
            onClick={() => signOut(auth)}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </nav>
      <main>{children}</main>
    </>
  );
}
