import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { notificationsAPI } from "../../services/api";

function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const pageNames = {
    "/dashboard": "Dashboard",
    "/dashboard/workspace": "AI Workspace",
    "/dashboard/tasks": "Tasks",
    "/dashboard/knowledge": "Knowledge Hub",
    "/documents": "Documents",
    "/deliverables": "Deliverables",
    "/approvals": "Approvals",
    "/security": "Security Center",
    "/settings": "Settings",
    "/profile": "Profile",
    "/notifications": "Notifications",
  };

  // Fetch unread notification count
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await notificationsAPI.list();
        const notifications = res.data?.notifications || res.data || [];
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
      } catch { /* silent */ }
    }
    fetchUnread();
  }, [location.pathname]); // re-fetch when navigating

  const currentPage = pageNames[location.pathname] || "Sovara AI";
  return (
    <header className="app-header">

      {/* Breadcrumb */}
      <div className="header-breadcrumb">
        <div>

          <Link
            to="/dashboard"
            className="hover:text-primary transition-colors"
          >
            Home
          </Link>

          <span className="breadcrumb-divider">/</span>

          <span className="breadcrumb-current">{currentPage}</span>

        </div>
      </div>

      {/* Right Side */}
      <div className="header-actions">

        {/* Divider */}
        <div className="header-divider"></div>

        {/* Actions */}
        <div className="header-icon-actions">

          {/* Notifications */}
          <Link className="header-icon-button" to="/notifications" aria-label="Notifications" style={{ position: "relative" }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2, width: 8, height: 8,
                borderRadius: "50%", background: "#d97a2c",
              }} />
            )}
          </Link>

          {/* Profile */}
          <Link className="profile-button" to="/profile" aria-label="Profile" title={user?.name ? `${user.name} (${user.role})` : "Profile"}>
            <UserRound size={17} />
          </Link>

          {/* Logout */}
          <button
            className="header-icon-button"
            onClick={logout}
            aria-label="Logout"
            title="Log Out"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef8e84" }}
          >
            <LogOut size={17} />
          </button>

        </div>
      </div>

    </header>
  );
}

export default Header;