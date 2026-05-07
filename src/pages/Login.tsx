import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { type Role, setSession } from "../app/auth";
import { getRoles } from "../api/auth/get-roles";
import type { Role as ApiRole } from "../api/auth/get-roles";
import { login } from "../api/auth/login";
import logo from "../assets/oyci-logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Admin");
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (err) {
        console.error("Failed to load roles:", err);
      } finally {
        setLoadingRoles(false);
      }
    }
    fetchRoles();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const response = await login({
        username,
        password,
        role,
      });

      // Store session with response data
      setSession({
        username: response.email,
        role: response.role as Role,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginWrap">
      <form
        className="loginCard"
        onSubmit={onSubmit}
        aria-label="Sign in to OYCI"
        noValidate
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src={logo}
            alt="Ochil Youths Community Improvement logo"
            style={{ maxWidth: 200 }}
          />
        </div>

        <h1 className="loginTitle" style={{ textAlign: "center", marginBottom: 20 }}>
          Sign In
        </h1>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 12px",
              marginBottom: 14,
              background: "#fee",
              color: "var(--error, #b91c1c)",
              borderRadius: 6,
              fontSize: 13,
              border: "1px solid #fca5a5",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Username */}
        <label className="field" htmlFor="login-username">
          <span>Username</span>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your email"
            aria-required="true"
          />
        </label>

        {/* Password */}
        <label className="field" htmlFor="login-password">
          <span>Password</span>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            aria-required="true"
          />
        </label>

        {/* Role */}
        <label className="field" htmlFor="login-role">
          <span>Profile</span>
          <select
            id="login-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={loadingRoles}
          >
            {loadingRoles ? (
              <option>Loading roles...</option>
            ) : (
              roles.map((r) => (
                <option key={r.roleId} value={r.name}>
                  {r.name}
                </option>
              ))
            )}
          </select>
        </label>

        <button
          className="btn btnPrimary btnFull"
          type="submit"
          disabled={loading || loadingRoles}
          style={{ marginTop: 8 }}
        >
          {loading ? "⏳ Signing in..." : "Log in"}
        </button>

        <button
          className="linkBtn"
          type="button"
          style={{ marginTop: 10, width: "100%", textAlign: "center" }}
        >
          Forgot password?
        </button>

        <p
          className="muted"
          style={{ textAlign: "center", fontSize: 12, marginTop: 20 }}
        >
          © {new Date().getFullYear()} Ochil Youths Community Improvement
        </p>
      </form>
    </div>
  );
}