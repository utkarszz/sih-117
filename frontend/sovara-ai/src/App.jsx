import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/static/Header";
import Sidebar from "./components/static/Sidebar";
import { useAuth } from "./context/AuthContext";

// Auth
import Login from "./pages/Login";

// Dashboard
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/AI_Workspace";
import Tasks from "./pages/Tasks";
import Knowledge from "./pages/Knowlegde_Hub";

// Other Pages
import Approvals from "./pages/Approvals";
import Deliverables from "./pages/Deliverables";
import Documents from "./pages/Documents";
import SecurityCenter from "./pages/Security_Center";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";

function App() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#171310",
        color: "#eae1db",
        fontFamily: "Inter, sans-serif"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #2e2926",
          borderTopColor: "#ffb784",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px"
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: "14px", letterSpacing: "0.05em", color: "#dbc2b2" }}>Initializing secure local enclave...</span>
      </div>
    );
  }

  // If user is not logged in, show Login view
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <Routes>
          {/* Unauthenticated redirect if already logged in */}
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />

          {/* =========================
              DASHBOARD
          ========================= */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/dashboard/workspace"
            element={<Workspace />}
          />

          <Route
            path="/dashboard/tasks"
            element={<Tasks />}
          />

          <Route
            path="/dashboard/knowledge"
            element={<Knowledge />}
          />

          {/* =========================
              OTHER PAGES
          ========================= */}

          <Route
            path="/approvals"
            element={<Approvals />}
          />

          <Route
            path="/deliverables"
            element={<Deliverables />}
          />

          <Route
            path="/documents"
            element={<Documents />}
          />

          <Route
            path="/security"
            element={<SecurityCenter />}
          />

          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* =========================
              DEFAULT ROUTE
          ========================= */}

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* =========================
              404 / UNKNOWN ROUTE
          ========================= */}

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;