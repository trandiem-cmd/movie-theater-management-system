import logo from "../../assets/rio-logo.png";
import "./Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
  <img src={logo} alt="RIO Cinema Logo" />
</div>

      <div className="footer-column">
        <h4>QUICK LINKS</h4>
        <a href="/movies">Movies</a>
        <a href="/showtimes">Cinema Showtime</a>
        <a href="/experience">Experience</a>
      </div>

      <div className="footer-column">
        <h4>EXPLORE</h4>
        <a href="/movies">Now Showing</a>
        <a href="/coming-soon">All Movies</a>
        <a href="/trailer">Movie Trailer</a>
      </div>

      <div className="footer-column">
        <h4>OUR CINEMA</h4>
        <a href="/locations">Oulu</a>
        <a href="/locations">Tampere</a>
      </div>

      <div className="footer-column">
        <h4>CUSTOMER SERVICE</h4>
        <a href="/contact">Contact Us</a>
        <a href="/booking-info">Booking Info</a>
        <a href="/help">Help & Support</a>
      </div>

      <div className="footer-column">
        <h4>BUSINESS</h4>
        <a href="/private-screening">Private Screening</a>
        <a href="/corporate">Company Inquiries</a>
        <a href="/contact">Contact Our Team</a>
      </div>
    </footer>
  );
}

export default Footer;