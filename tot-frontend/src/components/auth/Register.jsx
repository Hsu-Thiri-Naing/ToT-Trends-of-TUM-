// src/components/auth/Register.jsx
import React, { useState } from "react";
import {
  getCsrfToken,
  register as authServiceRegister,
} from "../../api/authService";
import AuthPanel from "./AuthPanel.jsx";

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // This will be the @tot.com email
  const [recovery_email, setRecoveryEmail] = useState(""); // Add state for recovery email
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }

    try {
      await getCsrfToken();
      // Pass the recovery_email to the API call
      const response = await authServiceRegister(
        name,
        email,
        recovery_email, // Include recovery_email
        password,
        passwordConfirmation,
      );
      onRegister(response.data.token, response.data.user);
    } catch (err) {
      const errorMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : "Registration failed. Please try again.";
      setError(errorMsg);
    }
  };

  return (
    <AuthPanel
      title="Create an account"
      footer={<>Already a Trendmate? <button type="button" onClick={onSwitchToLogin}>Sign in</button></>}
    >
      {error && <p className="auth-error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input className="auth-input" type="text" name="name" autoComplete="name" required
            value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          ToT email
          <input className="auth-input" type="email" name="email" autoComplete="username" spellCheck={false} required
            value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Recovery email
          <input className="auth-input" type="email" name="recovery_email" autoComplete="email" spellCheck={false} required
            value={recovery_email} onChange={(event) => setRecoveryEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input className="auth-input" type="password" name="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          Confirm password
          <input className="auth-input" type="password" name="password_confirmation" autoComplete="new-password" required
            value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
        </label>
        <button type="submit" className="auth-submit glass-primary">Register</button>
      </form>
    </AuthPanel>
  );
}
