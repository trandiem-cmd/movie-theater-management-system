
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./adminSidebar";
import { formatDate } from "../../utils/date";
import "./ShowtimeManagementPage.css";

const SHOWTIMES_API = "/api/admin/showtimes";
const PAGE_SIZE = 5;

export default function ShowtimeManagementPage() {
  const navigate = useNavigate();

  const [showtimes, setShowtimes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadShowtimes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(SHOWTIMES_API, {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to view showtimes.");
        return;
      }

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load showtimes.");
      }

      setShowtimes(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading showtimes.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadShowtimes();
  }, [loadShowtimes]);

  const filteredShowtimes = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return showtimes.filter((showtime) => {
      const matchesSearch =
        !searchText ||
        [
          showtime.movie_title,
          showtime.theater_name,
          showtime.room_name,
          showtime.city,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchText));

      const matchesStatus =
        statusFilter === "all" || showtime.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [showtimes, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredShowtimes.length / PAGE_SIZE)
  );

  const paginatedShowtimes = filteredShowtimes.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const scheduledCount = showtimes.filter(
    (item) => item.status === "scheduled"
  ).length;

  const cancelledCount = showtimes.filter(
    (item) => item.status === "cancelled"
  ).length;

  const completedCount = showtimes.filter(
    (item) => item.status === "completed"
  ).length;

  function getDateTime(value) {
    if (!value) return "—";

    try {
      return formatDate(value) || "—";
    } catch {
      return "—";
    }
  }

  async function handleCancel(showtime) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the showtime for "${showtime.movie_title}"?`
    );

    if (!confirmed) return;

    try {
      setCancellingId(showtime.showtime_id);
      setError("");
      setMessage("");

      const response = await fetch(
        `${SHOWTIMES_API}/${showtime.showtime_id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("You do not have permission to cancel showtimes.");
      }

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not cancel the showtime.");
      }

      setMessage("Showtime cancelled successfully.");
      await loadShowtimes();
    } catch (err) {
      setError(err.message || "Could not cancel the showtime.");
    } finally {
      setCancellingId(null);
    }
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  return (
    <div className="admin-page showtime-management-page">

      <div className="admin-layout">
        <AdminSidebar />

        <main className="admin-main showtime-management-main">
          <div className="showtime-page-heading">
            <div>
              <h1>Showtime Management</h1>
            </div>

            <button
              type="button"
              className="showtime-add-button"
              onClick={() => navigate("/admin/showtimes/new")}
            >
              + Add Showtime
            </button>
          </div>

          <div className="showtime-summary">
            <div className="showtime-summary-card">
              <span>Total Showtimes</span>
              <strong>{showtimes.length}</strong>
            </div>

            <div className="showtime-summary-card">
              <span>Scheduled</span>
              <strong>{scheduledCount}</strong>
            </div>

            <div className="showtime-summary-card">
              <span>Cancelled</span>
              <strong>{cancelledCount}</strong>
            </div>

            <div className="showtime-summary-card">
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>

          {error && (
            <div className="showtime-alert showtime-alert-error">
              {error}
            </div>
          )}

          {message && (
            <div className="showtime-alert showtime-alert-success">
              {message}
            </div>
          )}

          <section className="showtime-list-section">
            <div className="showtime-list-heading">
              <h2>All Showtimes</h2>
            </div>

            <div className="showtime-filters">
              <input
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search movie, cinema, auditorium or city..."
                aria-label="Search showtimes"
              />

              <select
                value={statusFilter}
                onChange={handleStatusChange}
                aria-label="Filter showtimes by status"
              >
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {loading ? (
              <p className="showtime-empty-message">Loading showtimes...</p>
            ) : filteredShowtimes.length === 0 ? (
              <p className="showtime-empty-message">
                No showtimes found.
              </p>
            ) : (
              <>
                <div className="showtime-table-wrapper">
                  <table className="showtime-table">
                    <thead>
                      <tr>
                        <th>Movie</th>
                        <th>Date &amp; Time</th>
                        <th>Cinema</th>
                        <th>Auditorium</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedShowtimes.map((showtime) => (
                        <tr key={showtime.showtime_id}>
                          <td>
                            <strong>{showtime.movie_title || "—"}</strong>
                            {showtime.movie_duration && (
                              <small>{showtime.movie_duration} minutes</small>
                            )}
                          </td>

                          <td>{getDateTime(showtime.start_time)}</td>

                          <td>
                            {showtime.theater_name || "—"}
                            {showtime.city && (
                              <small>{showtime.city}</small>
                            )}
                          </td>

                          <td>{showtime.room_name || "—"}</td>

                          <td>
                            €{Number(showtime.base_price || 0).toFixed(2)}
                          </td>

                          <td>
                            <span
                              className={`showtime-status showtime-status-${showtime.status}`}
                            >
                              {showtime.status}
                            </span>
                          </td>

                          <td>
                            {showtime.status === "scheduled" ? (
                              <button
                                type="button"
                                className="showtime-cancel-action"
                                onClick={() => handleCancel(showtime)}
                                disabled={
                                  cancellingId === showtime.showtime_id
                                }
                              >
                                {cancellingId === showtime.showtime_id
                                  ? "Cancelling..."
                                  : "Cancel"}
                              </button>
                            ) : (
                              <span className="showtime-no-action">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="showtime-pagination">
                  <span>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredShowtimes.length
                    )}{" "}
                    of {filteredShowtimes.length}
                  </span>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
