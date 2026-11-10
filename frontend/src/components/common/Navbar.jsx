
import { useEffect, useRef, useState } from "react";
import logo from "../../assets/rio-logo.png";
import { UserRound, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout, authLoading } = useAuth();

  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const accountRef = useRef(null);

  // Detect whether an Admin is viewing an admin page
  const isAdminPage =
    user?.role === "admin" &&
    location.pathname.startsWith("/admin");

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    try {
      await logout();

      setShowMenu(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  }

  return (
    <nav className={`navbar ${isAdminPage ? "admin-navbar" : ""}`}>
      <div className="navbar-inner">

        <div className="navbar-left">
          <div className="navbar-logo">
            <Link to={isAdminPage ? "/admin/movies" : "/"}>
              <img src={logo} alt="RIO Cinema Logo" />
            </Link>
          </div>

          {!isAdminPage && (
            <div className="nav-links">
              <Link to="/movies">Films</Link>
              <Link to="/showtimes">Cinema Showtimes</Link>
              <Link to="/experience">Experience</Link>
            </div>
          )}
        </div>

        <div className="nav-actions">

          {!isAdminPage && (
            <div className="search-container">
              <input
                type="text"
                placeholder="Search"
                className="search-input"
              />
              <Search className="search-icon" size={20} />
            </div>
          )}

          {!authLoading && (
            <div className="account-container" ref={accountRef}>

              <button
                type="button"
                className="account-link"
                aria-label="Account"
                aria-expanded={showMenu}
                onClick={() => {
                  if (!user) {
                    navigate("/login");
                  } else {
                    setShowMenu((previous) => !previous);
                  }
                }}
              >
                <UserRound size={24} strokeWidth={1.8} />
              </button>

              {user && showMenu && (
                <div className="account-dropdown">

                  <div className="account-user">
                    {user.full_name}
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setShowMenu(false)}
                  >
                    My Profile
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>

                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;
