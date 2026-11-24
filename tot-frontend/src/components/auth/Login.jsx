// src/components/auth/Login.jsx
import React, { useState } from "react";
import { getCsrfToken, login as authServiceLogin } from "../../api/authService";
import AuthPanel from "./AuthPanel.jsx";

export default function Login({
  onLogin,
  onSwitchToRegister,
  onSwitchToPasswordResetRequest,
}) {
  // Add onSwitchToPasswordResetRequest prop
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await getCsrfToken();
      const response = await authServiceLogin(email, password);
      onLogin(response.data.token, response.data.user);
    } catch (err) {
      const errorMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : "Login failed. Please check your credentials.";
      setError(errorMsg);
    }
  };

  return (
    <AuthPanel
      title="Welcome back"
      footer={<>New to ToT? <button type="button" onClick={onSwitchToRegister}>Create an account</button></>}
    >
      {error && <p className="auth-error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          ToT email
          <input className="auth-input" type="email" name="email" autoComplete="username" spellCheck={false} required
            value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input className="auth-input" type="password" name="password" autoComplete="current-password" required
            value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="button" className="auth-reset-link" onClick={onSwitchToPasswordResetRequest}>Reset password</button>
        <button type="submit" className="auth-submit glass-primary">Sign in</button>
      </form>
    </AuthPanel>
  );
}
