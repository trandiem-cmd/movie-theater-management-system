
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { verifyResetOtp } from "../../api.js";
import "./VerifyResetOtpPage.css";

function VerifyResetOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await verifyResetOtp(email, otp);

      navigate("/reset-password", {
        state: { email, otp },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="verify-otp-page">
        <div className="verify-otp-container">
          <h1>Invalid Request</h1>
          <p className="verify-otp-subtitle">
            Please request a new verification code.
          </p>
          <Link to="/forgot-password">
            Back to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-otp-page">
      <div className="verify-otp-container">
        <h1>Verify OTP</h1>

        <p className="verify-otp-subtitle">
          Enter the 6-digit verification code sent to your email.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="verify-otp-field">
            <label htmlFor="otp">Verification Code</label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter 6-digit code"
              required
            />
          </div>

          {error && (
            <p className="verify-otp-error">{error}</p>
          )}

          <button
            type="submit"
            className="verify-otp-button"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>

          <div className="verify-otp-back">
            <Link to="/forgot-password">
              Back to Forgot Password
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VerifyResetOtpPage;
