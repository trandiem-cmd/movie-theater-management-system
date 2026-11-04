import logo from "../../assets/rio-logo.png";
import { UserRound, Search } from "lucide-react";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
    <div className="navbar-left">
        <div className="navbar-logo">
        <img src={logo} alt="RIO Cinema Logo" />
        </div>
      <div className="nav-links">
        <a href="/movies">Films</a>
        <a href="/showtimes">Cinema Showtimes</a>
        <a href="/experience">Experience</a>
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
        <a href="/login" className="account-link" aria-label="Account">
            <UserRound size={24} strokeWidth={1.8} />
        </a>
      </div>
    </nav>
  );
}

export default Navbar;
