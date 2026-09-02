import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import "./Login.css";

const PRESET_ACCOUNTS = [
  {
    role: "System Admin",
    email: "admin@example.com",
    password: "SystemAdmin@2026",
    color: "#ffb784",
  },
  {
    role: "Supervisor",
    email: "supervisor@example.com",
    password: "BobSupervisor@2026",
    color: "#a1c4fd",
  },
  {
    role: "Employee",
    email: "employee@example.com",
    password: "JaneEmployee@2026",
    color: "#c2e9fb",
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillPreset = (preset) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setErrorMessage("");
  };

  return (
    <div className="login-container">
      {/* Background glow graphics */}
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>

      <div className="login-card-wrapper">
        <div className="login-card">
          {/* Header section */}
          <div className="login-header">
            <div className="login-brand">
              <div className="brand-logo-glow">
                <img src={logo} alt="SOVARA AI Logo" className="login-logo-img" />
              </div>
              <div className="brand-text-block">
                <span className="brand-title">SOVARA AI</span>
                <span className="brand-subtitle">Sovereign Intelligence Platform</span>
              </div>
            </div>
            <div className="security-tag">
              <ShieldCheck size={14} className="security-icon" />
              <span>PS117 Enclave Protected</span>
            </div>
          </div>

          <div className="login-welcome">
            <h2>Welcome back</h2>
            <p>Sign in to access your secure sovereign workspace and AI agents.</p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="login-error-banner">
              <AlertCircle size={18} className="error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-field-wrap">
                <Mail size={18} className="field-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
              </div>
              <div className="input-field-wrap">
                <Lock size={18} className="field-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="btn-spinner-wrap">
                  <div className="btn-spinner"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Preset Quick Login options */}
          <div className="preset-login-section">
            <div className="preset-title">
              <KeyRound size={14} />
              <span>Quick Test Accounts</span>
            </div>
            <div className="preset-chips-grid">
              {PRESET_ACCOUNTS.map((preset) => (
                <button
                  key={preset.role}
                  type="button"
                  className="preset-chip"
                  onClick={() => fillPreset(preset)}
                >
                  <Sparkles size={13} style={{ color: preset.color }} />
                  <span>{preset.role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer information */}
          <div className="login-footer">
            <p>Protected by end-to-end local encryption & zero-trust compliance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
