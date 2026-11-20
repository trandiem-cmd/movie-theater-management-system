
import {
  LayoutDashboard,
  Clapperboard,
  Building2,
  CalendarDays,
  Ticket,
  ChartColumn,
  Users,
  LogOut,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import "./adminSidebar.css";

function AdminSidebar({ onLogout }) {
  return (
    <aside className="admin-sidebar">
      <h2>Main Menu</h2>

      <nav className="sidebar-links">
        <NavLink to="/admin/dashboard">
          <LayoutDashboard />
          Dashboard
        </NavLink>

        <NavLink to="/admin/movies">
          <Clapperboard />
          Movies
        </NavLink>

        <NavLink to="/admin/theaters">
          <Building2 />
          Theaters
        </NavLink>

        <NavLink to="/admin/showtimes">
          <CalendarDays />
          Showtimes
        </NavLink>

        <NavLink to="/admin/bookings">
          <Ticket />
          Bookings
        </NavLink>

        <NavLink to="/admin/reports">
          <ChartColumn />
          Reports
        </NavLink>

        <NavLink to="/admin/users">
          <Users />
          Users
        </NavLink>
      </nav>

      <button
        className="logout-button"
        onClick={onLogout}
      >
        <LogOut />
        Log out
      </button>
    </aside>
  );
}

export default AdminSidebar;
