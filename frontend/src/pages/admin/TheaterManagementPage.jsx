
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Building2, DoorOpen, ArrowLeft, MapPin, Users,
} from "lucide-react";

import {getTheaters,getTheaterCities,createTheater,updateTheater,deleteTheaterAPI,getTheaterRooms,createRoom,updateRoom,deleteRoomAPI,
} from "../../api.js";
import AdminSidebar from "../../pages/admin/adminSidebar";
import "./TheaterManagementPage.css";

const PAGE_SIZE = 4;

const emptyTheaterForm = {
  name: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  description: "",
  image_url: "",
  status: "active",
};

const emptyRoomForm = {
  name: "",
  capacity: "",
  status: "active",
};

function getTheaterFormData(theater) {
  return {
    name: theater.name || "",
    address: theater.address || "",
    city: theater.city || "",
    phone: theater.phone || "",
    email: theater.email || "",
    description: theater.description || "",
    image_url: theater.image_url || "",
    status: theater.status || "active",
  };
}

function getRoomFormData(room) {
  return {
    name: room.name || "",
    capacity: room.capacity ?? "",
    status: room.status || "active",
  };
}

function getStatusLabel(status) {
  return status === "active" ? "Active" : "Inactive";
}

function TheaterManagementPage() {
  const navigate = useNavigate();

  const [theaters, setTheaters] = useState([]);
  const [cities, setCities] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [page, setPage] = useState(1);

  const [selectedTheater, setSelectedTheater] = useState(null);

  const [showTheaterForm, setShowTheaterForm] = useState(false);
  const [editingTheater, setEditingTheater] = useState(null);
  const [theaterForm, setTheaterForm] = useState({
    ...emptyTheaterForm,
  });

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    ...emptyRoomForm,
  });

  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // Load theaters.
async function loadTheaters() {
  setLoading(true);
  setError("");

  try {
    const [theaterData, cityData] = await Promise.all([
      getTheaters(),
      getTheaterCities(),
    ]);

    setTheaters(theaterData.data || []);
    setCities(cityData.data || []);
  } catch (err) {
    if (err.message === "Authentication required.") {
      navigate("/login");
      return;
    }

    setError(err.message || "Could not load theaters.");
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadTheaters();
  }, []);

  // Search and filter theaters.
  const filteredTheaters = useMemo(() => {
    return theaters.filter((theater) => {
      const matchesSearch =
        theater.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        theater.address.toLowerCase().includes(search.toLowerCase().trim());

      const matchesCity =
        !selectedCity ||
        theater.city.toLowerCase() === selectedCity.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [theaters, search, selectedCity]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTheaters.length / PAGE_SIZE)
  );

  const visibleTheaters = filteredTheaters.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Theater statistics.
  const activeTheaters = theaters.filter(
    (theater) => theater.status === "active"
  ).length;

  const inactiveTheaters = theaters.filter(
    (theater) => theater.status === "inactive"
  ).length;

  // Open Add Theater form.
  function openAddTheaterForm() {
    setError("");
    setSuccess("");
    setEditingTheater(null);
    setTheaterForm({ ...emptyTheaterForm });
    setShowTheaterForm(true);
  }

  // Open Edit Theater form.
  function openEditTheaterForm(theater) {
    setError("");
    setSuccess("");
    setEditingTheater(theater);
    setTheaterForm(getTheaterFormData(theater));
    setShowTheaterForm(true);
  }

  function handleTheaterFormChange(event) {
    const { name, value } = event.target;

    setTheaterForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Save Theater.
  async function saveTheater(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !theaterForm.name.trim() ||
      !theaterForm.address.trim() ||
      !theaterForm.city.trim()
    ) {
      setError("Please fill in theater name, address and city.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingTheater);

      const theaterData = {
      name: theaterForm.name.trim(),
      address: theaterForm.address.trim(),
      city: theaterForm.city.trim(),
      phone: theaterForm.phone.trim() || null,
      email: theaterForm.email.trim() || null,
      description: theaterForm.description.trim() || null,
      image_url: theaterForm.image_url.trim() || null,
      status: theaterForm.status,
      };

      if (isEditing) {
        await updateTheater(editingTheater.theater_id, theaterData);
      } else {
        await createTheater(theaterData);
      }

      await loadTheaters();

      setShowTheaterForm(false);
      setEditingTheater(null);
      setTheaterForm({ ...emptyTheaterForm });

      setSuccess(
        isEditing
          ? "Theater updated successfully."
          : "Theater added successfully."
      );
    } catch (err) {
      if (err.message === "Authentication required.") {
        navigate("/login");
        return;
      }

      setError(err.message || "Could not save the theater.");
    } finally {
      setSaving(false);
    }
}

  function cancelTheaterForm() {
    setShowTheaterForm(false);
    setEditingTheater(null);
    setTheaterForm({ ...emptyTheaterForm });
    setError("");
  }

  // Delete Theater.
async function deleteTheater(theater) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${theater.name}"?`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");
  setDeletingId(theater.theater_id);

  try {
    await deleteTheaterAPI(theater.theater_id);

    setTheaters((current) =>
      current.filter(
        (item) => item.theater_id !== theater.theater_id
      )
    );

    setSuccess("Theater deleted successfully.");
  } catch (err) {
    if (err.message === "Authentication required.") {
      navigate("/login");
      return;
    }

    setError(err.message || "Could not delete the theater.");
  } finally {
    setDeletingId(null);
  }
}


  // Load rooms for a selected theater.

async function openRooms(theater) {
  setSelectedTheater(theater);
  setShowRoomForm(false);
  setEditingRoom(null);
  setError("");
  setSuccess("");
  setRooms([]);
  setRoomsLoading(true);

  try {
    const data = await getTheaterRooms(theater.theater_id);
    setRooms(data.data || []);
  } catch (err) {
    if (err.message === "Authentication required.") {
      navigate("/login");
      return;
    }

    setError(err.message || "Could not load rooms.");
  } finally {
    setRoomsLoading(false);
  }
}


  function backToTheaters() {
    setSelectedTheater(null);
    setRooms([]);
    setShowRoomForm(false);
    setEditingRoom(null);
    setError("");
    setSuccess("");
  }

  // Open Add Room form.
  function openAddRoomForm() {
    setError("");
    setSuccess("");
    setEditingRoom(null);
    setRoomForm({ ...emptyRoomForm });
    setShowRoomForm(true);
  }

  // Open Edit Room form.
  function openEditRoomForm(room) {
    setError("");
    setSuccess("");
    setEditingRoom(room);
    setRoomForm(getRoomFormData(room));
    setShowRoomForm(true);
  }

  function handleRoomFormChange(event) {
    const { name, value } = event.target;

    setRoomForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Save Room.
async function saveRoom(event) {
  event.preventDefault();

  setError("");
  setSuccess("");

  if (!roomForm.name.trim()) {
    setError("Please enter a room name.");
    return;
  }

  if (
    !roomForm.capacity ||
    !Number.isSafeInteger(Number(roomForm.capacity)) ||
    Number(roomForm.capacity) <= 0
  ) {
    setError("Please enter a valid room capacity.");
    return;
  }

  setSaving(true);

  try {
    const isEditing = Boolean(editingRoom);

    const roomData = {
      name: roomForm.name.trim(),
      capacity: Number(roomForm.capacity),
      status: roomForm.status,
    };

    if (isEditing) {
      await updateRoom(editingRoom.room_id, roomData);
    } else {
      await createRoom(selectedTheater.theater_id, roomData);
    }

    const data = await getTheaterRooms(selectedTheater.theater_id);
    setRooms(data.data || []);

    setShowRoomForm(false);
    setEditingRoom(null);
    setRoomForm({ ...emptyRoomForm });

    setSuccess(
      isEditing
        ? "Room updated successfully."
        : "Room added successfully."
    );
  } catch (err) {
    if (err.message === "Authentication required.") {
      navigate("/login");
      return;
    }

    setError(err.message || "Could not save the room.");
  } finally {
    setSaving(false);
  }
}

  function cancelRoomForm() {
    setShowRoomForm(false);
    setEditingRoom(null);
    setRoomForm({ ...emptyRoomForm });
    setError("");
  }

  // Delete Room.
async function deleteRoom(room) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${room.name}"?`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");
  setDeletingId(room.room_id);

  try {
    await deleteRoomAPI(room.room_id);

    setRooms((current) =>
      current.filter((item) => item.room_id !== room.room_id)
    );

    setSuccess("Room deleted successfully.");
  } catch (err) {
    if (err.message === "Authentication required.") {
      navigate("/login");
      return;
    }

    setError(err.message || "Could not delete the room.");
  } finally {
    setDeletingId(null);
  }
}


  // Logout.
  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Could not log out.");
      }

      navigate("/login");
    } catch (err) {
      setError(err.message || "Could not log out.");
    }
  }

  return (
    <div className="admin-page">
    <div className="page-container">
      <div className="header-title">
        Theater management
      </div>

      <div className="admin-layout">
        <AdminSidebar onLogout={handleLogout} />

        <main className="admin-main">
          {error && (
            <p className="empty-message admin-feedback error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="empty-message admin-feedback success" role="status">
              {success}
            </p>
          )}

          {/* Theater form */}
          {showTheaterForm ? (
            <section className="add-location-form-container">
              <h2>
                {editingTheater ? "Edit Theater" : "Add New Theater"}
              </h2>

              <form onSubmit={saveTheater}>
                <div className="location-form-grid">
                  <div className="form-column">
                    <div className="form-group">
                      <label>Theater Name<span>*</span></label>
                      <input
                        type="text"
                        name="name"
                        maxLength="150"
                        value={theaterForm.name}
                        onChange={handleTheaterFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Address<span>*</span></label>
                      <input
                        type="text"
                        name="address"
                        value={theaterForm.address}
                        onChange={handleTheaterFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>City<span>*</span></label>
                      <input
                        type="text"
                        name="city"
                        maxLength="100"
                        value={theaterForm.city}
                        onChange={handleTheaterFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        maxLength="20"
                        value={theaterForm.phone}
                        onChange={handleTheaterFormChange}
                      />
                    </div>
                  </div>

                  <div className="form-column">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        maxLength="255"
                        value={theaterForm.email}
                        onChange={handleTheaterFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="url"
                        name="image_url"
                        value={theaterForm.image_url}
                        onChange={handleTheaterFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        value={theaterForm.status}
                        onChange={handleTheaterFormChange}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        name="description"
                        value={theaterForm.description}
                        onChange={handleTheaterFormChange}
                        rows="4"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-buttons">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={cancelTheaterForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingTheater
                        ? "Update Theater"
                        : "Save Theater"}
                  </button>
                </div>
              </form>
            </section>
          ) : selectedTheater ? (
            /* Room management */
            <>
              <div className="location-page-heading">
                <button
                  className="back-button"
                  onClick={backToTheaters}
                >
                  <ArrowLeft size={17} />
                  Back to Theaters
                </button>

                <h2>{selectedTheater.name} - Room Management</h2>
                <p>
                  <MapPin size={15} />
                  {selectedTheater.address}, {selectedTheater.city}
                </p>
              </div>

              {showRoomForm ? (
                <section className="add-location-form-container room-form-container">
                  <h2>
                    {editingRoom ? "Edit Room" : "Add New Room"}
                  </h2>

                  <form onSubmit={saveRoom}>
                    <div className="form-column">
                      <div className="form-group">
                        <label>Room Name<span>*</span></label>
                        <input
                          type="text"
                          name="name"
                          maxLength="100"
                          value={roomForm.name}
                          onChange={handleRoomFormChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Capacity<span>*</span></label>
                        <input
                          type="number"
                          name="capacity"
                          min="1"
                          step="1"
                          value={roomForm.capacity}
                          onChange={handleRoomFormChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Status</label>
                        <select
                          name="status"
                          value={roomForm.status}
                          onChange={handleRoomFormChange}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-buttons">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={cancelRoomForm}
                        disabled={saving}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="save-button"
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : editingRoom
                            ? "Update Room"
                            : "Save Room"}
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <>
                  <div className="page-actions">
                    <button
                      className="add-location-button"
                      onClick={openAddRoomForm}
                    >
                      <Plus size={18} />
                      Add Room
                    </button>
                  </div>

                  <section className="summary-cards">
                    <div className="summary-card">
                      <strong>{rooms.length}</strong>
                      <span>Total Rooms</span>
                    </div>

                    <div className="summary-card">
                      <strong>
                        {rooms.filter((room) => room.status === "active").length}
                      </strong>
                      <span>Active Rooms</span>
                    </div>

                    <div className="summary-card">
                      <strong>
                        {rooms.reduce(
                          (total, room) => total + Number(room.capacity),
                          0
                        )}
                      </strong>
                      <span>Total Capacity</span>
                    </div>
                  </section>

                  <section className="location-list">
                    <h2>Room List</h2>

                    {roomsLoading ? (
                      <p className="empty-message">Loading rooms...</p>
                    ) : rooms.length === 0 ? (
                      <p className="empty-message">
                        No rooms found for this theater.
                      </p>
                    ) : (
                      rooms.map((room) => (
                        <div className="location-row" key={room.room_id}>
                          <div className="location-name">
                            <DoorOpen size={23} />
                            <span>{room.name}</span>
                          </div>

                          <span className="room-capacity">
                            <Users size={15} />
                            {room.capacity} seats
                          </span>

                          <span
                            className={`location-status ${
                              room.status === "inactive" ? "inactive" : ""
                            }`}
                          >
                            {getStatusLabel(room.status)}
                          </span>

                          <div className="location-actions">
                            <button
                              onClick={() => openEditRoomForm(room)}
                              aria-label={`Edit ${room.name}`}
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              onClick={() => deleteRoom(room)}
                              aria-label={`Delete ${room.name}`}
                              disabled={deletingId === room.room_id}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                </>
              )}
            </>
          ) : (
            /* Theater management list */
            <>
              <div className="page-actions">
                <button
                  className="add-location-button"
                  onClick={openAddTheaterForm}
                >
                  <Plus size={18} />
                  Add Theater
                </button>
              </div>

              <section className="summary-cards">
                <div className="summary-card">
                  <strong>{theaters.length}</strong>
                  <span>Total Theaters</span>
                </div>

                <div className="summary-card">
                  <strong>{activeTheaters}</strong>
                  <span>Active Theaters</span>
                </div>

                <div className="summary-card">
                  <strong>{inactiveTheaters}</strong>
                  <span>Inactive Theaters</span>
                </div>
              </section>

              <div className="location-filters">
                <div className="location-search">
                  <Search size={21} />
                  <input
                    type="text"
                    placeholder="Search theaters"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <select
                  className="city-filter"
                  value={selectedCity}
                  onChange={(event) => {
                    setSelectedCity(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="location-pagination">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </button>

                <span>{page} / {totalPages}</span>

                <button
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </button>
              </div>

              <section className="location-list">
                <h2>Theater List</h2>

                {loading ? (
                  <p className="empty-message">Loading theaters...</p>
                ) : visibleTheaters.length === 0 ? (
                  <p className="empty-message">No theaters found.</p>
                ) : (
                  visibleTheaters.map((theater) => (
                    <div className="location-row" key={theater.theater_id}>
                      <div className="location-name">
                        <Building2 size={23} />
                        <div>
                          <span>{theater.name}</span>
                          <small>
                            {theater.address}, {theater.city}
                          </small>
                        </div>
                      </div>

                      <span
                        className={`location-status ${
                          theater.status === "inactive" ? "inactive" : ""
                        }`}
                      >
                        {getStatusLabel(theater.status)}
                      </span>

                      <div className="location-actions">
                        <button
                          className="manage-rooms-button"
                          onClick={() => openRooms(theater)}
                        >
                          <DoorOpen size={16} />
                          Manage Rooms
                        </button>

                        <button
                          onClick={() => openEditTheaterForm(theater)}
                          aria-label={`Edit ${theater.name}`}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteTheater(theater)}
                          aria-label={`Delete ${theater.name}`}
                          disabled={deletingId === theater.theater_id}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
    </div>
  );
}

export default TheaterManagementPage;