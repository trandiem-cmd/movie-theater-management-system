import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Armchair,
  Accessibility,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  getRoomSeats,
  getAdminRooms,
  getAdminShowtimes,
  getShowtimeSeats,
  addRoomSeats,
  updateSeat,
  deleteSeat,
  deleteSeatRows,
  updateWheelchairSpace,
  addWheelchairSpace,
  generateSeatLayout,
  logout,
} from "../../api";

import SeatLegend from "../../components/seat/SeatLegend";
import AdminSidebar from "./adminSidebar";
import "./SeatManagementPage.css";

// Required room rules
const requiredRoomRules = [
  "10 seats per standard row.",
  "Row 13 is skipped where applicable.",
  "Wheelchair spaces are clearly marked.",
];

// Convert backend data into frontend seat objects
const formatSeats = (items = []) =>
  items.map((seat) => ({
    id: seat.seat_id ?? seat.seatId,
    row: seat.row_number ?? seat.rowNumber,
    number: seat.seat_number ?? seat.seatNumber,
    displayOrder: seat.display_order ?? seat.displayOrder,
    type: "standard",
    status: seat.status,
  }));

const formatWheelchairSpaces = (items = []) =>
  items.map((space) => ({
    id: space.wheelchair_space_id ?? space.wheelchairSpaceId,
    spaceNumber: space.space_number ?? space.spaceNumber,
    status: space.status,
  }));

function SeatManagementPage() {
  const navigate = useNavigate();

  // Auditorium and showtime data
  const [rooms, setRooms] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [auditorium, setAuditorium] = useState("");
  const [showtime, setShowtime] = useState("");

  // Seat data and selection
  const [seats, setSeats] = useState([]);
  const [wheelchairSpaces, setWheelchairSpaces] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [selectedWheelchairId, setSelectedWheelchairId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [seatError, setSeatError] = useState("");

  // Form visibility
  const [showAddSeat, setShowAddSeat] = useState(false);
  const [showAddWheelchair, setShowAddWheelchair] = useState(false);
  const [showDeleteRow, setShowDeleteRow] = useState(false);
  const [showRoomRules, setShowRoomRules] = useState(false);

  // Add seat form
  const [newSeatRow, setNewSeatRow] = useState("11");
  const [newRowCount, setNewRowCount] = useState("1");
  const [newSeatCount, setNewSeatCount] = useState("10");
  const [addSeatError, setAddSeatError] = useState("");

  // Wheelchair form
  const [newWheelchairNumber, setNewWheelchairNumber] = useState("1");
  const [addWheelchairError, setAddWheelchairError] = useState("");

  // Delete rows form
  const [rowsToDelete, setRowsToDelete] = useState([]);
  const [deleteRowError, setDeleteRowError] = useState("");

  // Room rules
  const [newRule, setNewRule] = useState("");
  const [customRoomRules, setCustomRoomRules] = useState([]);

  // Derived data
  const roomRules = [...requiredRoomRules, ...customRoomRules];

  const selectedSeat =
    seats.find((seat) => seat.id === selectedSeatId) || null;

  const selectedWheelchair =
    wheelchairSpaces.find(
      (space) => space.id === selectedWheelchairId
    ) || null;

  const rows = [...new Set(seats.map((seat) => seat.row))].sort(
    (a, b) => a - b
  );

  const selectedRowSeatCount = seats.filter((seat) =>
    rowsToDelete.includes(seat.row)
  ).length;

  const canManageSeats = Boolean(auditorium && !showtime && !loading);

  // Load auditoriums and showtimes
  useEffect(() => {
    async function loadAdminData() {
      try {
        const [roomsResult, showtimesResult] = await Promise.all([
          getAdminRooms(),
          getAdminShowtimes(),
        ]);

        setRooms(roomsResult.data || []);
        setShowtimes(showtimesResult.data || []);
      } catch (error) {
        setSeatError(error.message);
      }
    }

    loadAdminData();
  }, []);

  // Load seats when auditorium or showtime changes
  useEffect(() => {
    if (!auditorium) {
      setSeats([]);
      setWheelchairSpaces([]);
      return;
    }

    let cancelled = false;

    async function loadSeats() {
      setLoading(true);
      setSeatError("");

      try {
        const result = showtime
          ? await getShowtimeSeats(showtime)
          : await getRoomSeats(auditorium);

        if (!cancelled) {
          setSeats(formatSeats(result.data?.seats || []));
          setWheelchairSpaces(
            formatWheelchairSpaces(
              result.data?.wheelchairSpaces || []
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSeatError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSeats();

    return () => {
      cancelled = true;
    };
  }, [auditorium, showtime]);

  // Refresh physical room layout after changes
  async function refreshRoomSeats() {
    const result = await getRoomSeats(auditorium);

    setSeats(formatSeats(result.data?.seats || []));
    setWheelchairSpaces(
      formatWheelchairSpaces(
        result.data?.wheelchairSpaces || []
      )
    );
  }

  function clearSelection() {
    setSelectedSeatId(null);
    setSelectedWheelchairId(null);
  }

  function closeForms() {
    setShowAddSeat(false);
    setShowAddWheelchair(false);
    setShowDeleteRow(false);
    setShowRoomRules(false);
  }

  function handleAuditoriumChange(event) {
    setAuditorium(event.target.value);
    setShowtime("");
    setSeats([]);
    setWheelchairSpaces([]);
    setRowsToDelete([]);
    setDeleteRowError("");
    setSeatError("");
    clearSelection();
    closeForms();
  }

  function handleShowtimeChange(event) {
    setShowtime(event.target.value);
    setRowsToDelete([]);
    clearSelection();
    closeForms();
  }

  function openAddSeatForm(isRow) {
    closeForms();
    setAddSeatError("");
    setNewRowCount("1");
    setNewSeatCount(isRow ? "10" : "1");
    setShowAddSeat(true);
  }

  function openWheelchairForm() {
    closeForms();
    setAddWheelchairError("");
    setShowAddWheelchair(true);
  }

  function toggleDeleteRowForm() {
    const shouldOpen = !showDeleteRow;

    closeForms();
    setRowsToDelete([]);
    setDeleteRowError("");
    setShowDeleteRow(shouldOpen);
  }

  // Generate or complete the seat layout
  async function handleGenerateLayout() {
    if (!canManageSeats) return;

    const confirmed = window.confirm(
      "Generate the complete seating layout for this auditorium?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setSeatError("");

      await generateSeatLayout(auditorium);
      await refreshRoomSeats();

      clearSelection();
      setRowsToDelete([]);
    } catch (error) {
      setSeatError(
        error.message || "Failed to generate seat layout."
      );
    } finally {
      setLoading(false);
    }
  }

  // Add seats or rows
  async function handleAddSeat(event) {
    event.preventDefault();
    setAddSeatError("");

    if (!auditorium || showtime || loading) {
      setAddSeatError(
        "Select an auditorium without a showtime first."
      );
      return;
    }

    const startRow = Number(newSeatRow);
    const rowCount = Number(newRowCount);
    const seatsPerRow = Number(newSeatCount);

    if (!Number.isSafeInteger(startRow) || startRow < 1) {
      setAddSeatError("Enter a valid starting row.");
      return;
    }

    if (
      !Number.isSafeInteger(rowCount) ||
      rowCount < 1 ||
      rowCount > 20
    ) {
      setAddSeatError("Enter between 1 and 20 rows.");
      return;
    }

    if (
      !Number.isSafeInteger(seatsPerRow) ||
      seatsPerRow < 1 ||
      seatsPerRow > 10
    ) {
      setAddSeatError("Enter between 1 and 10 seats per row.");
      return;
    }

    try {
      setLoading(true);

      const currentResult = await getRoomSeats(auditorium);
      const currentSeats = currentResult.data?.seats || [];

      const existingNumbers = new Set(
        currentSeats.map((seat) => Number(seat.seat_number))
      );

      const newSeats = [];
      let row = startRow;

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        // Skip row 13
        if (row === 13) {
          row = 14;
        }

        const existingRowSeats = currentSeats.filter(
          (seat) => Number(seat.row_number) === row
        );

        const occupiedPositions = new Set(
          existingRowSeats.map((seat) =>
            Number(seat.display_order)
          )
        );

        const availablePositions = Array.from(
          { length: 10 },
          (_, index) => index + 1
        ).filter(
          (position) => !occupiedPositions.has(position)
        );

        if (availablePositions.length < seatsPerRow) {
          setAddSeatError(
            `Row ${row} does not have ${seatsPerRow} empty positions.`
          );
          return;
        }

        // Keep the existing row-based numbering pattern
        const logicalRowIndex =
          row > 13 ? row - 2 : row - 1;

        const firstNumber = logicalRowIndex * 10 + 1;
        const nextLogicalRowStart =
          (logicalRowIndex + 1) * 10 + 1;

        const maximumNumber =
          row === 2
            ? nextLogicalRowStart
            : nextLogicalRowStart - 1;

        let nextNumber = firstNumber;

        for (const position of availablePositions.slice(
          0,
          seatsPerRow
        )) {
          while (
            nextNumber === 13 ||
            existingNumbers.has(nextNumber)
          ) {
            nextNumber++;
          }

          if (nextNumber > maximumNumber) {
            setAddSeatError(
              `Cannot generate valid seat numbers for Row ${row}.`
            );
            return;
          }

          newSeats.push({
            rowNumber: row,
            seatNumber: nextNumber,
            displayOrder: position,
          });

          existingNumbers.add(nextNumber);
          nextNumber++;
        }

        row++;
      }

      await addRoomSeats(auditorium, newSeats);
      await refreshRoomSeats();

      setShowAddSeat(false);
      setNewSeatRow(String(row === 13 ? 14 : row));
      setNewRowCount("1");
      clearSelection();
    } catch (error) {
      setAddSeatError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Change regular seat status
  async function handleEditSeat() {
    if (!selectedSeat || !canManageSeats) return;

    const newStatus =
      selectedSeat.status === "inactive"
        ? "active"
        : "inactive";

    try {
      setLoading(true);
      setSeatError("");

      await updateSeat(selectedSeat.id, {
        status: newStatus,
      });

      await refreshRoomSeats();
    } catch (error) {
      setSeatError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Change wheelchair space status
  async function handleWheelchairStatus() {
    if (!selectedWheelchair || !canManageSeats) return;

    const newStatus =
      selectedWheelchair.status === "active"
        ? "inactive"
        : "active";

    try {
      setLoading(true);
      setSeatError("");

      await updateWheelchairSpace(
        selectedWheelchair.id,
        newStatus
      );

      await refreshRoomSeats();
    } catch (error) {
      setSeatError(
        error.message || "Failed to update wheelchair space."
      );
    } finally {
      setLoading(false);
    }
  }

  // Add wheelchair space
  async function handleAddWheelchair(event) {
    event.preventDefault();
    setAddWheelchairError("");

    if (!canManageSeats) {
      setAddWheelchairError(
        "Select an auditorium without a showtime first."
      );
      return;
    }

    const spaceNumber = Number(newWheelchairNumber);

    if (
      !Number.isSafeInteger(spaceNumber) ||
      spaceNumber <= 0
    ) {
      setAddWheelchairError(
        "Enter a valid wheelchair space number."
      );
      return;
    }

    try {
      setLoading(true);

      await addWheelchairSpace(auditorium, spaceNumber);
      await refreshRoomSeats();

      setShowAddWheelchair(false);
      setNewWheelchairNumber(String(spaceNumber + 1));
      clearSelection();
    } catch (error) {
      setAddWheelchairError(
        error.message || "Failed to add wheelchair space."
      );
    } finally {
      setLoading(false);
    }
  }

  // Delete selected rows
  async function handleDeleteRow(event) {
    event.preventDefault();
    setDeleteRowError("");

    if (!canManageSeats) {
      setDeleteRowError(
        "Select an auditorium without a showtime first."
      );
      return;
    }

    if (
      rowsToDelete.length === 0 ||
      rowsToDelete.some((row) => !rows.includes(row))
    ) {
      setDeleteRowError(
        "Please select at least one valid row."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${rowsToDelete.length} row(s) and all ${selectedRowSeatCount} seats inside them?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await deleteSeatRows(auditorium, rowsToDelete);
      await refreshRoomSeats();

      clearSelection();
      setRowsToDelete([]);
      setShowDeleteRow(false);
    } catch (error) {
      setDeleteRowError(
        error.message || "Failed to delete selected rows."
      );
    } finally {
      setLoading(false);
    }
  }

  // Delete one seat
  async function handleDeleteSeat() {
    if (!selectedSeat || !canManageSeats) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete Row ${selectedSeat.row}, Seat ${selectedSeat.number}?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setSeatError("");

      await deleteSeat(selectedSeat.id);
      await refreshRoomSeats();

      setSelectedSeatId(null);
    } catch (error) {
      setSeatError(
        error.message || "Failed to delete seat."
      );
    } finally {
      setLoading(false);
    }
  }

  // Manage custom room rules
  function handleAddRule(event) {
    event.preventDefault();

    const rule = newRule.trim();
    if (!rule) return;

    const alreadyExists = roomRules.some(
      (existingRule) =>
        existingRule.toLowerCase() === rule.toLowerCase()
    );

    if (alreadyExists) {
      window.alert("This room rule already exists.");
      return;
    }

    setCustomRoomRules((current) => [...current, rule]);
    setNewRule("");
  }

  function handleDeleteRule(index) {
    setCustomRoomRules((current) =>
      current.filter((_, ruleIndex) => ruleIndex !== index)
    );
  }

  // Log out using the shared API function
  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      window.alert(error.message);
    }
  }

  return (
    <div className="seat-admin-page">
      <div className="seat-admin-layout">
        <AdminSidebar onLogout={handleLogout} />

        <main className="seat-admin-content">
          {/* Header */}
          <div className="seat-admin-header">
            <div>
              <h1>
                <Armchair /> Seat Management
              </h1>

              <p className="seat-admin-subtitle">
                Manage auditorium seating layouts, seat numbers,
                and wheelchair spaces.
              </p>
            </div>

            <div className="seat-admin-header-actions">
              <button
                type="button"
                onClick={() => openAddSeatForm(false)}
              >
                <Plus size={18} /> Add Seat
              </button>

              <button
                type="button"
                onClick={() => openAddSeatForm(true)}
              >
                <Plus size={18} /> Add Row
              </button>

              <button
                type="button"
                onClick={openWheelchairForm}
              >
                <Accessibility size={18} />
                Add Wheelchair
              </button>
            </div>
          </div>

          {loading && <p>Loading room seats...</p>}

          {seatError && (
            <p className="seat-admin-form-error" role="alert">
              {seatError}
            </p>
          )}

          {/* Seat statistics */}
          <div className="seat-admin-stats">
            <div className="seat-admin-stat-card">
              <p>Regular Seats</p>
              <h2>{seats.length}</h2>
            </div>

            <div className="seat-admin-stat-card">
              <p>Wheelchair Spaces</p>
              <h2>{wheelchairSpaces.length}</h2>
            </div>

            <div className="seat-admin-stat-card">
              <p>Total Places</p>
              <h2>
                {seats.length + wheelchairSpaces.length}
              </h2>
            </div>
          </div>

          <section className="seat-admin-main-section">
            <h2 className="seat-admin-section-title">
              Auditorium Seating
            </h2>

            {/* Auditorium toolbar */}
            <section className="seat-admin-toolbar">
              <label>
                Select Auditorium

                <div className="seat-admin-select">
                  <select
                    value={auditorium}
                    onChange={handleAuditoriumChange}
                  >
                    <option value="">
                      Select an auditorium
                    </option>

                    {rooms.map((room) => (
                      <option
                        key={room.room_id}
                        value={room.room_id}
                      >
                        {room.city} - {room.theater_name} -{" "}
                        {room.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={18}
                    className="seat-admin-select-arrow"
                  />
                </div>
              </label>

              <label>
                Select Showtime (optional)

                <div className="seat-admin-select">
                  <select
                    value={showtime}
                    onChange={handleShowtimeChange}
                    disabled={!auditorium}
                  >
                    <option value="">
                      No showtime selected
                    </option>

                    {showtimes
                      .filter(
                        (item) =>
                          String(item.room_id) ===
                          String(auditorium)
                      )
                      .map((item) => (
                        <option
                          key={item.showtime_id}
                          value={item.showtime_id}
                        >
                          {item.movie_title} -{" "}
                          {new Date(
                            item.start_time
                          ).toLocaleString("en-GB", {
                            timeZone: "Europe/Helsinki",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          ({item.status})
                        </option>
                      ))}
                  </select>

                  <ChevronDown
                    size={18}
                    className="seat-admin-select-arrow"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={handleGenerateLayout}
                disabled={!canManageSeats}
              >
                <Armchair size={18} />
                {seats.length > 0 ||
                wheelchairSpaces.length > 0
                  ? "Complete Layout"
                  : "Generate Layout"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddSeatError(
                    "Seat numbering preview is not ready yet. No seats have been saved."
                  );
                  closeForms();
                  setShowAddSeat(true);
                }}
              >
                Preview Seats
              </button>

              <button
                type="button"
                className="seat-admin-delete-row-button"
                onClick={toggleDeleteRowForm}
              >
                <Trash2 size={18} />
                Delete Row
              </button>
            </section>

            {/* Add wheelchair space form */}
            {showAddWheelchair && (
              <section className="seat-admin-add-form">
                <h2>Add Wheelchair Space</h2>

                <form onSubmit={handleAddWheelchair}>
                  <label>
                    Wheelchair Space Number

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newWheelchairNumber}
                      onChange={(event) =>
                        setNewWheelchairNumber(
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>

                  {addWheelchairError && (
                    <p
                      className="seat-admin-form-error"
                      role="alert"
                    >
                      {addWheelchairError}
                    </p>
                  )}

                  <div className="seat-admin-form-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddWheelchair(false);
                        setAddWheelchairError("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                    >
                      <Plus size={17} />
                      Add Wheelchair Space
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Add seat or row form */}
            {showAddSeat && (
              <section className="seat-admin-add-form">
                <h2>Add New Seat</h2>

                <form onSubmit={handleAddSeat}>
                  <label>
                    Row Number

                    <input
                      type="number"
                      min="1"
                      value={newSeatRow}
                      onChange={(event) =>
                        setNewSeatRow(event.target.value)
                      }
                      required
                    />
                  </label>

                  <div>
                    <label htmlFor="new-row-count">
                      Number of Rows
                    </label>

                    <input
                      id="new-row-count"
                      type="number"
                      min="1"
                      max="20"
                      value={newRowCount}
                      onChange={(event) =>
                        setNewRowCount(event.target.value)
                      }
                      required
                    />
                  </div>

                  <label>
                    Number of Seats

                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSeatCount}
                      onChange={(event) =>
                        setNewSeatCount(event.target.value)
                      }
                      required
                    />
                  </label>

                  {addSeatError && (
                    <p
                      role="alert"
                      className="seat-admin-form-error"
                    >
                      {addSeatError}
                    </p>
                  )}

                  <div className="seat-admin-form-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSeat(false);
                        setAddSeatError("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                    >
                      Add Seat
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Delete rows form */}
            {showDeleteRow && (
              <section className="seat-admin-add-form">
                <h2>Delete Rows</h2>

                <p className="seat-admin-rules-description">
                  Select one, multiple, or all rows to remove.
                  All regular seats in the selected rows will
                  be deleted. Wheelchair spaces will not be
                  affected.
                </p>

                <form onSubmit={handleDeleteRow}>
                  <div className="seat-admin-delete-row-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          rows.length > 0 &&
                          rowsToDelete.length === rows.length
                        }
                        disabled={
                          rows.length === 0 || loading
                        }
                        onChange={(event) => {
                          setRowsToDelete(
                            event.target.checked
                              ? [...rows]
                              : []
                          );
                          setDeleteRowError("");
                        }}
                      />
                      Select All Rows
                    </label>

                    {rows.map((row) => {
                      const count = seats.filter(
                        (seat) => seat.row === row
                      ).length;

                      return (
                        <label key={row}>
                          <input
                            type="checkbox"
                            checked={rowsToDelete.includes(
                              row
                            )}
                            disabled={loading}
                            onChange={(event) => {
                              setRowsToDelete((current) =>
                                event.target.checked
                                  ? [...current, row]
                                  : current.filter(
                                      (item) => item !== row
                                    )
                              );
                              setDeleteRowError("");
                            }}
                          />
                          Row {row} ({count} seats)
                        </label>
                      );
                    })}
                  </div>

                  <p className="seat-admin-rules-description">
                    Selected: {rowsToDelete.length} row(s),{" "}
                    {selectedRowSeatCount} seat(s)
                  </p>

                  {deleteRowError && (
                    <p
                      className="seat-admin-form-error"
                      role="alert"
                    >
                      {deleteRowError}
                    </p>
                  )}

                  <div className="seat-admin-form-buttons">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setShowDeleteRow(false);
                        setRowsToDelete([]);
                        setDeleteRowError("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="seat-admin-confirm-delete"
                      disabled={
                        !canManageSeats ||
                        rowsToDelete.length === 0
                      }
                    >
                      <Trash2 size={17} />
                      Delete Selected Rows
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Seat map and side panels */}
            <div className="seat-admin-grid">
              <section className="seat-admin-map">
                <div className="seat-admin-screen">
                  SCREEN
                </div>

                {/* Wheelchair spaces */}
                <div className="seat-admin-wheelchair-area">
                  <span className="seat-admin-wheelchair-label">
                    Accessible spaces
                  </span>

                  <div className="seat-admin-wheelchair-spaces">
                    {wheelchairSpaces.map((space) => (
                      <button
                        key={space.id}
                        type="button"
                        title={`Wheelchair Space ${space.spaceNumber} (${space.status})`}
                        aria-label={`Wheelchair Space ${space.spaceNumber}, ${space.status}`}
                        aria-pressed={
                          selectedWheelchairId === space.id
                        }
                        className={[
                          "seat-admin-seat",
                          "seat-admin-seat--wheelchair",
                          space.status === "inactive"
                            ? "seat-admin-seat--inactive"
                            : "",
                          selectedWheelchairId === space.id
                            ? "seat-admin-seat--selected"
                            : "",
                        ].join(" ")}
                        onClick={() => {
                          setSelectedWheelchairId(space.id);
                          setSelectedSeatId(null);
                        }}
                      >
                        <Accessibility size={20} />
                        <small>
                          W{space.spaceNumber}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Regular seat rows */}
                {rows.map((row) => {
                  const rowSeats = seats
                    .filter((seat) => seat.row === row)
                    .sort(
                      (a, b) =>
                        a.displayOrder - b.displayOrder
                    );

                  return (
                    <div
                      className="seat-admin-row"
                      key={row}
                    >
                      <span className="seat-admin-row-number">
                        {row}
                      </span>

                      <div className="seat-admin-row-seats">
                        {rowSeats.map((seat) => (
                          <button
                            key={seat.id}
                            type="button"
                            title={`Row ${seat.row}, Seat ${seat.number}`}
                            aria-label={`Row ${seat.row}, seat ${seat.number}, ${seat.type}, ${seat.status}`}
                            aria-pressed={
                              selectedSeatId === seat.id
                            }
                            className={[
                              "seat-admin-seat",
                              `seat-admin-seat--${seat.status}`,
                              selectedSeatId === seat.id
                                ? "seat-admin-seat--selected"
                                : "",
                            ].join(" ")}
                            onClick={() => {
                              setSelectedSeatId(seat.id);
                              setSelectedWheelchairId(null);
                            }}
                          >
                            <Armchair size={22} />
                            <small>{seat.number}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>

              <div className="seat-admin-side-panels">
                {/* Seat details */}
                <section className="seat-admin-panel">
                  <h2>Seat Details</h2>

                  {selectedWheelchair ? (
                    <>
                      <p>
                        Wheelchair Space: W
                        {selectedWheelchair.spaceNumber}
                      </p>
                      <p>Type: Wheelchair space</p>
                      <p>
                        Status: {selectedWheelchair.status}
                      </p>
                    </>
                  ) : selectedSeat ? (
                    <>
                      <p>Row: {selectedSeat.row}</p>
                      <p>
                        Seat no.: {selectedSeat.number}
                      </p>
                      <p>Seat type: Regular</p>
                      <p>
                        Status: {selectedSeat.status}
                      </p>
                    </>
                  ) : (
                    <p>
                      Select a seat or wheelchair space
                      to view its details.
                    </p>
                  )}
                </section>

                {/* Seat actions */}
                <section className="seat-admin-panel">
                  <h2>Seat Actions</h2>

                  <div className="seat-admin-actions">
                    <button
                      type="button"
                      disabled={
                        !canManageSeats ||
                        (!selectedSeat &&
                          !selectedWheelchair)
                      }
                      onClick={
                        selectedWheelchair
                          ? handleWheelchairStatus
                          : handleEditSeat
                      }
                    >
                      <Pencil size={17} />
                      Change Status
                    </button>

                    <button
                      type="button"
                      disabled={
                        !canManageSeats || !selectedSeat
                      }
                      className="seat-admin-delete-row-button"
                      onClick={handleDeleteSeat}
                    >
                      <Trash2 size={18} />
                      Delete Seat
                    </button>

                    <button
                      type="button"
                      disabled={!canManageSeats}
                      onClick={() => {
                        if (showAddWheelchair) {
                          setShowAddWheelchair(false);
                        } else {
                          openWheelchairForm();
                        }
                      }}
                    >
                      <Accessibility size={18} />
                      Add Wheelchair Space
                    </button>
                  </div>
                </section>

                {/* Seat legend */}
                <div className="seat-admin-legend-wrapper">
                  <SeatLegend
                    roomRules={roomRules}
                    onEditRules={() => {
                      const shouldOpen = !showRoomRules;
                      closeForms();
                      setShowRoomRules(shouldOpen);
                    }}
                  />
                </div>

                {/* Edit room rules */}
                {showRoomRules && (
                  <section className="seat-admin-add-form">
                    <h2>Edit Room Rules</h2>

                    <p className="seat-admin-rules-description">
                      Add or remove custom rules for this
                      auditorium.
                    </p>

                    <div className="seat-admin-rules-list">
                      {requiredRoomRules.map((rule) => (
                        <div
                          className="seat-admin-rule-item"
                          key={rule}
                        >
                          <span>{rule}</span>

                          <button
                            type="button"
                            disabled
                            title="Required seating rule"
                            aria-label="Required rule cannot be deleted"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}

                      {customRoomRules.map((rule, index) => (
                        <div
                          className="seat-admin-rule-item"
                          key={`${rule}-${index}`}
                        >
                          <span>{rule}</span>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteRule(index)
                            }
                            title="Delete custom rule"
                            aria-label={`Delete rule: ${rule}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddRule}>
                      <label>
                        Add New Rule

                        <input
                          type="text"
                          value={newRule}
                          onChange={(event) =>
                            setNewRule(event.target.value)
                          }
                          placeholder="e.g. Keep the aisle clear"
                          maxLength={200}
                          required
                        />
                      </label>

                      <div className="seat-admin-form-buttons">
                        <button
                          type="button"
                          onClick={() =>
                            setShowRoomRules(false)
                          }
                        >
                          Close
                        </button>

                        <button type="submit">
                          <Plus size={17} />
                          Add Rule
                        </button>
                      </div>
                    </form>
                  </section>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default SeatManagementPage;
