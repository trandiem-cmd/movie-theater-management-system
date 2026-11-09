
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { forgotPassword } from "../../api.js";

import "./ForgotPasswordPage.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);

      // Navigate to OTP verification page
      navigate("/verify-reset-otp", {
        state: { email },
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">

        <h1>Forgot Password?</h1>

        <p className="forgot-password-subtitle">
          Enter your email address and we'll send you
          a verification code to reset your password.
        </p>

        <form onSubmit={handleSubmit}>

          <div className="forgot-password-field">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {error && (
            <p className="forgot-password-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="forgot-password-button"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send verification code"}
          </button>

          <div className="forgot-password-back">
            <Link to="/login">
              ← Back to Sign in
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
