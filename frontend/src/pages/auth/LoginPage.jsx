
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../../api.js";
import { useAuth } from "../../context/AuthContext";

import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // 1. Gửi thông tin đăng nhập đến Backend
      await login(email, password);

      // 2. Cập nhật user trong AuthContext
      const currentUser = await refreshUser();

      // 3. Kiểm tra session
      if (!currentUser) {
        throw new Error(
          "Login successful, but session could not be verified."
        );
      }

      // 4. Chuyển về trang chủ
      navigate("/", { replace: true });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">

        <h1>Welcome back!</h1>

        <p className="login-subtitle">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit}>

          <div className="login-field">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <div className="password-label">
              <label htmlFor="password">Password</label>

              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="login-error">{error}</p>
          )}

          <div className="register-prompt">
            <span>New to RIO?</span>

            <Link to="/register">
              Create an account
            </Link>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default LoginPage;
