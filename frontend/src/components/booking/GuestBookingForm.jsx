import { useState } from "react";
import { Link } from "react-router-dom";
import { login } from "../../api";
import { useAuth } from "../../context/AuthContext";
import "./GuestBookingForm.css";

function GuestBookingForm({ onContinue }) {
  const [email, setEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { refreshUser } = useAuth();

  async function handleSignIn(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await login(email.trim(), password);

      const currentUser = await refreshUser();

      if (!currentUser) {
        throw new Error(
          "Your session could not be loaded. Please try again."
        );
      }

      onContinue("registered");
    } catch (err) {
      setError(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGuestContinue() {
    setError("");

    const trimmedEmail = guestEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    onContinue("guest", trimmedEmail);
  }

  return (
    <section className="guest-booking-form">
      <form onSubmit={handleSignIn} className="signin-form">

        <div className="booking-input-row">
          <label htmlFor="booking-email">Email</label>
          <input
            id="booking-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="booking-input-row">
          <label htmlFor="booking-password">Password</label>
          <input
            id="booking-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="signin-button"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

      </form>

      <div className="booking-register">
        <span>New to RIO ?</span>
        <Link to="/register">Create an account</Link>
      </div>

      <div className="guest-booking-divider">
        OR
      </div>

      <div className="booking-input-row guest-email-field">
        <label htmlFor="guest-booking-email">Email</label>
        <input
          id="guest-booking-email"
          type="email"
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="booking-form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="guest-continue-button"
        onClick={handleGuestContinue}
        disabled={loading}
      >
        Continue as guest
      </button>
    </section>
  );
}

export default GuestBookingForm;
