import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterPage.css";
import { register } from "../../api.js";

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    // Validate password
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Validate date of birth
    if (new Date(dateOfBirth) > new Date()) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    setLoading(true);

    try {
      await register(
        fullName,
        email,
        phone,
        dateOfBirth,
        password
      );

      // Registration successful
      navigate("/login");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">

        <h1>Create Account</h1>

        <p className="register-subtitle">
          Join RIO Theater today
        </p>

        <form onSubmit={handleSubmit}>

          {/* Full Name */}
          <div className="register-field">
            <label htmlFor="fullName">Full Name</label>

            <input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          {/* Email */}
          <div className="register-field">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Phone */}
          <div className="register-field">
            <label htmlFor="phone">Phone Number</label>

            <input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="register-field">
            <label htmlFor="dateOfBirth">Date of Birth</label>

            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          {/* Password */}
          <div className="register-field">
            <label htmlFor="password">Password</label>

            <div className="register-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="register-error">{error}</p>
          )}

          {/* Login Prompt */}
          <div className="login-prompt">
            <span>Already have an account?</span>

            <Link to="/login">
              Sign in
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default RegisterPage;