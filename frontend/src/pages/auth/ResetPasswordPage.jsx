
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../../api.js";
import "./ResetPasswordPage.css";

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const otp = location.state?.otp;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(
        email,
        otp,
        newPassword,
        confirmPassword
      );

      navigate("/login", {
        replace: true,
        state: {
          message: "Password reset successfully. Please sign in.",
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!email || !otp) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <h1>Invalid Request</h1>
          <p className="reset-password-subtitle">
            Please verify your email again.
          </p>
          <Link to="/forgot-password">
            Back to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <h1>Reset Password</h1>

        <p className="reset-password-subtitle">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="reset-password-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={8}
              required
            />
          </div>

          <div className="reset-password-field">
            <label htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="reset-password-error">{error}</p>
          )}

          <button
            type="submit"
            className="reset-password-button"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <div className="reset-password-back">
            <Link to="/login">Back to Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
