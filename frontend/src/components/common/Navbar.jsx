import logo from "../../assets/rio-logo.png";
import { UserRound, Search } from "lucide-react";
import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo">
          <Link to="/">
            <img src={logo} alt="RIO Cinema Logo" />
          </Link>
        </div>

        <div className="nav-links">
          <Link to="/movies">Films</Link>
          <Link to="/showtimes">Cinema Showtimes</Link>
          <Link to="/experience">Experience</Link>
        </div>
      </div>

      <div className="nav-actions">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            className="search-input"
          />
          <Search className="search-icon" size={20} />
        </div>

        <Link to="/login" className="account-link" aria-label="Account">
          <UserRound size={24} strokeWidth={1.8} />
        </Link>

      </div>
    </nav>
  );
}

export default Navbar;