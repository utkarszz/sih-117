import { useState } from "react";
import { Mail, ShieldCheck, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);

  const profile = {
    name: user?.name || "Unknown",
    role: user?.role || "Unknown",
    email: user?.email || "Unknown",
    organization: user?.department || "Sovara Industrial Systems",
  };

  return (
    <main className="account-page">
      <header className="account-header"><div><p className="workspace-label">Account / Identity</p><h1>Profile</h1><p>Manage the identity attached to your local workspace.</p></div></header>
      <section className="account-grid">
        <article className="account-panel profile-summary">
          <div className="profile-avatar"><UserRound size={32} /></div>
          <h2>{profile.name}</h2>
          <p>{profile.role}</p>
          <span className="account-badge"><ShieldCheck size={14} /> Local identity</span>
          <button className="button button-secondary" onClick={logout} style={{ marginTop: "16px", color: "#ef8e84", border: "1px solid rgba(239, 142, 132, 0.3)", background: "rgba(239, 142, 132, 0.1)", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <LogOut size={16} /> Sign Out
          </button>
        </article>
        <section className="account-panel profile-details">
          <div className="security-panel-heading"><h2>Personal details</h2><span className="audit-badge">{editing ? "EDITING" : "READ ONLY"}</span></div>
          <div className="detail-fields">{editing ? <><label><span>Full name</span><input defaultValue={profile.name} /></label><label><span>Email address</span><input defaultValue={profile.email} /></label><label><span>Organization</span><input defaultValue={profile.organization} /></label></> : <><div><span>Full name</span><strong>{profile.name}</strong></div><div><span>Email address</span><strong><Mail size={15} /> {profile.email}</strong></div><div><span>Organization</span><strong>{profile.organization}</strong></div></>}</div>
          <button className="button button-primary" type="button" onClick={() => setEditing(!editing)}>{editing ? "Save profile" : "Edit profile"}</button>
        </section>
      </section>
    </main>
  );
}

export default Profile;

