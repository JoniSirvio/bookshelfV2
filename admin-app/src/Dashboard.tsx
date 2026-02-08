import { useState, useEffect } from "react";
import { Users, BookOpen, Sparkles, MessageCircle } from "lucide-react";
import { call } from "./firebase";

interface Stats {
  totalUsers: number;
  totalBooks: number;
  totalRecommendations: number;
  totalChatTurns: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = () => {
    setLoading(true);
    setError("");
    call<unknown, Stats>("getDashboardStats")
      .then((data) => setStats(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">Dashboard</h1>
      {loading && (
        <div className="loading">
          <div className="spinner" aria-hidden />
          <p style={{ margin: 0 }}>Loading stats…</p>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: "1rem" }}>
          <p className="error">{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchStats}>
            Retry
          </button>
        </div>
      )}
      {!loading && stats && (
        <div className="stats">
          <div className="stat-card">
            <Users size={24} className="stat-icon" />
            <p className="stat-value">{stats.totalUsers}</p>
            <p className="stat-label">Users</p>
          </div>
          <div className="stat-card">
            <BookOpen size={24} className="stat-icon" />
            <p className="stat-value">{stats.totalBooks}</p>
            <p className="stat-label">Books</p>
          </div>
          <div className="stat-card">
            <Sparkles size={24} className="stat-icon" />
            <p className="stat-value">{stats.totalRecommendations}</p>
            <p className="stat-label">AI recommendations</p>
          </div>
          <div className="stat-card">
            <MessageCircle size={24} className="stat-icon" />
            <p className="stat-value">{stats.totalChatTurns}</p>
            <p className="stat-label">AI chat turns</p>
          </div>
        </div>
      )}
    </div>
  );
}
