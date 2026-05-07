import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth/register";
import type { RegisterRequest } from "../api/auth/register";
import { getRoles } from "../api/auth/get-roles";
import type { Role as ApiRole } from "../api/auth/get-roles";
import logo from "../assets/oyci-logo.png";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [email, setEmail]             = useState("");
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [role, setRole]               = useState<string>("Staff");
  const [roles, setRoles]             = useState<ApiRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

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

  // Client-side validation
  function validate(): string | null {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim())  return "Last name is required.";
    if (!email.trim() || !email.includes("@")) return "A valid email is required.";
    if (!username.trim() || username.length < 3) return "Username must be at least 3 characters.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      const body: RegisterRequest = { firstName, lastName, email, username, password, role };
      await register(body);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="loginWrap">
        <div className="loginCard" style={{ textAlign: "center" }}>
          <img src={logo} alt="OYCI" style={{ maxWidth: 160, marginBottom: 20 }} />
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ margin: "0 0 8px", fontWeight: 800 }}>Account Created!</h2>
          <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
            Your account has been registered successfully. You can now sign in.
          </p>
          <button
            className="btn btnPrimary btnFull"
            onClick={() => navigate("/login")}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loginWrap">
      <form
        className="loginCard"
        onSubmit={handleSubmit}
        aria-label="Create a new account"
        noValidate
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <img src={logo} alt="Ochil Youths Community Improvement logo" style={{ maxWidth: 160 }} />
        </div>

        <h1 className="loginTitle" style={{ textAlign: "center", marginBottom: 4 }}>
          Create Account
        </h1>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
          Join the OYCI Staff Management System
        </p>

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

        {/* First + Last Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field" htmlFor="reg-firstName">
            <span>First Name</span>
            <input
              id="reg-firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              aria-required="true"
              style={{ width: "100%" }}
            />
          </label>

          <label className="field" htmlFor="reg-lastName">
            <span>Last Name</span>
            <input
              id="reg-lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              aria-required="true"
              style={{ width: "100%" }}
            />
          </label>
        </div>

        {/* Email */}
        <label className="field" htmlFor="reg-email">
          <span>✉️ Email</span>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john.doe@oyci.scot"
            aria-required="true"
          />
        </label>

        {/* Username */}
        <label className="field" htmlFor="reg-username">
          <span>👤 Username</span>
          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
            aria-required="true"
          />
        </label>

        {/* Password + Confirm */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field" htmlFor="reg-password">
            <span>🔒 Password</span>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-required="true"
              style={{ width: "100%" }}
            />
          </label>

          <label className="field" htmlFor="reg-confirm">
            <span>🔒 Confirm</span>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              aria-required="true"
              aria-describedby={confirm && confirm !== password ? "pwd-mismatch" : undefined}
              style={{
                width: "100%",
                borderColor: confirm && confirm !== password ? "var(--error)" : undefined,
              }}
            />
            {confirm && confirm !== password && (
              <span id="pwd-mismatch" style={{ fontSize: 11, color: "var(--error)" }}>
                Passwords do not match
              </span>
            )}
          </label>
        </div>

        {/* Password strength hint */}
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "-6px 0 10px" }}>
          Password must be at least 8 characters.
        </p>

        {/* Role */}
        <label className="field" htmlFor="reg-role">
          <span>Profile</span>
          <select
            id="reg-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
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

        {/* Submit */}
        <button
          className="btn btnPrimary btnFull"
          type="submit"
          disabled={loading}
          style={{ marginTop: 4 }}
        >
          {loading ? "⏳ Creating Account..." : "Create Account"}
        </button>

        {/* Back to login */}
        <p style={{ textAlign: "center", fontSize: 13, marginTop: 14, color: "var(--muted)" }}>
          Already have an account?{" "}
          <button
            type="button"
            className="linkBtn"
            onClick={() => navigate("/login")}
            style={{ fontWeight: 700, color: "var(--teal)" }}
          >
            Sign in
          </button>
        </p>

        <p className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 16 }}>
          © {new Date().getFullYear()} Ochil Youths Community Improvement
        </p>
      </form>
    </div>
  );
}
