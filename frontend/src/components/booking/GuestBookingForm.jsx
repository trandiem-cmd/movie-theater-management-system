import { useState } from "react";
import { Link } from "react-router-dom";
import { login } from "../../api";
import "./GuestBookingForm.css";

function GuestBookingForm({ onContinue }) {
  const [email, setEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("Please enter your email address to continue as a guest.");
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
      <h1>Sign in</h1>

      <p>
        Sign in to your RIO account or continue as a guest.
      </p>

      <form onSubmit={handleSignIn}>
        <div>
          <label htmlFor="booking-email">Email address</label>
          <input
            id="booking-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label htmlFor="booking-password">Password</label>
          <input
            id="booking-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="guest-booking-divider">
        <span>OR</span>
      </div>

      <div className="guest-email-field">
        <label htmlFor="guest-booking-email">
          Email address for guest booking
        </label>

        <input
          id="guest-booking-email"
          type="email"
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
          placeholder="Enter your email address"
          disabled={loading}
        />
      </div>

      <button
        type="button"
        onClick={handleGuestContinue}
        disabled={loading}
      >
        Continue as Guest
      </button>

      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

export default GuestBookingForm;
