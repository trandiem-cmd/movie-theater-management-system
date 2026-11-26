
import pool from "../config/database.js";

// Helpers
const isValidId = (value) =>
  Number.isSafeInteger(value) && value > 0;

const isValidRow = (value) =>
  isValidId(value) && value !== 13;

const isValidSeatNumber = (value) =>
  isValidId(value) && value !== 13;

const isValidDisplayOrder = (value) =>
  Number.isSafeInteger(value) && value >= 1 && value <= 10;

const isValidStatus = (value) =>
  ["active", "inactive"].includes(value);

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// GET /api/rooms/:id/seats
export async function getRoomSeats(req, res) {
  const roomId = Number(req.params.id);

  if (!isValidId(roomId)) {
    return sendError(res, 400, "Invalid room ID");
  }

  try {
    const roomResult = await pool.query(
      "SELECT room_id, name, capacity FROM rooms WHERE room_id = $1",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return sendError(res, 404, "Room not found");
    }

    const seatsResult = await pool.query(
      `SELECT
         seat_id,
         room_id,
         row_number,
         seat_number,
         display_order,
         status
       FROM seats
       WHERE room_id = $1
       ORDER BY row_number, display_order`,
      [roomId]
    );

    const wheelchairResult = await pool.query(
      `SELECT
         wheelchair_space_id,
         room_id,
         space_number,
         status
       FROM wheelchair_spaces
       WHERE room_id = $1
       ORDER BY space_number`,
      [roomId]
    );

    return res.status(200).json({
      success: true,
      data: {
        room: roomResult.rows[0],
        seats: seatsResult.rows,
        wheelchairSpaces: wheelchairResult.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching room seats:", error);
    return sendError(res, 500, "Failed to fetch room seats");
  }
}

// POST /api/admin/rooms/:id/seats
export async function addRoomSeats(req, res) {
  const roomId = Number(req.params.id);
  const { seats } = req.body || {};

  if (!isValidId(roomId)) {
    return sendError(res, 400, "Invalid room ID");
  }

  if (!Array.isArray(seats) || seats.length === 0) {
    return sendError(res, 400, "Provide at least one seat");
  }

  for (const seat of seats) {
    if (
      !seat ||
      !isValidRow(seat.rowNumber) ||
      !isValidSeatNumber(seat.seatNumber) ||
      !isValidDisplayOrder(seat.displayOrder)
    ) {
      return sendError(res, 400, "Invalid seat information");
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      "SELECT room_id, capacity FROM rooms WHERE room_id = $1 FOR UPDATE",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Room not found");
    }

  // Only regular seats count towards room capacity.
    const countResult = await client.query(
      `SELECT COUNT(*) AS total
      FROM seats
      WHERE room_id = $1`,
      [roomId]
    );

    const currentTotal = Number(countResult.rows[0].total);
    const capacity = Number(roomResult.rows[0].capacity);

    if (currentTotal + seats.length > capacity) {
      await client.query("ROLLBACK");
      return sendError(res, 400, "Room capacity would be exceeded");
    }

    const addedSeats = [];

    for (const seat of seats) {
      const result = await client.query(
        `INSERT INTO seats
           (room_id, row_number, seat_number, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING
           seat_id AS "seatId",
           room_id AS "roomId",
           row_number AS "rowNumber",
           seat_number AS "seatNumber",
           display_order AS "displayOrder",
           status`,
        [
          roomId,
          seat.rowNumber,
          seat.seatNumber,
          seat.displayOrder,
        ]
      );

      addedSeats.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Seats added successfully",
      data: { seats: addedSeats },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding seats:", error);

    if (error.code === "23505") {
      return sendError(
        res,
        409,
        "Seat number or position already exists"
      );
    }

    return sendError(res, 500, "Failed to add seats");
  } finally {
    client.release();
  }
}

// PUT /api/admin/seats/:id
export async function updateSeat(req, res) {
  const seatId = Number(req.params.id);
  const { rowNumber, seatNumber, displayOrder, status } =
    req.body || {};

  if (!isValidId(seatId)) {
    return sendError(res, 400, "Invalid seat ID");
  }

  const updates = {};

  if (rowNumber !== undefined) {
    if (!isValidRow(rowNumber)) {
      return sendError(res, 400, "Invalid row number");
    }
    updates.row_number = rowNumber;
  }

  if (seatNumber !== undefined) {
    if (!isValidSeatNumber(seatNumber)) {
      return sendError(res, 400, "Invalid seat number");
    }
    updates.seat_number = seatNumber;
  }

  if (displayOrder !== undefined) {
    if (!isValidDisplayOrder(displayOrder)) {
      return sendError(
        res,
        400,
        "Display order must be between 1 and 10"
      );
    }
    updates.display_order = displayOrder;
  }

  if (status !== undefined) {
    if (!isValidStatus(status)) {
      return sendError(
        res,
        400,
        "Status must be active or inactive"
      );
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, "No valid seat fields provided");
  }

  try {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClauses = fields.map(
      (field, index) => `${field} = $${index + 1}`
    );

    values.push(seatId);

    const result = await pool.query(
      `UPDATE seats
       SET ${setClauses.join(", ")}
       WHERE seat_id = $${values.length}
       RETURNING
         seat_id AS "seatId",
         room_id AS "roomId",
         row_number AS "rowNumber",
         seat_number AS "seatNumber",
         display_order AS "displayOrder",
         status`,
      values
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Seat not found");
    }

    return res.status(200).json({
      success: true,
      message: "Seat updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating seat:", error);

    if (error.code === "23505") {
      return sendError(
        res,
        409,
        "Seat number or position already exists"
      );
    }

    if (error.code === "23514") {
      return sendError(
        res,
        400,
        "Seat update violates room rules"
      );
    }

    return sendError(res, 500, "Failed to update seat");
  }
}

// GET /api/showtimes/:id/seats
export async function getShowtimeSeats(req, res) {
  const showtimeId = Number(req.params.id);

  if (!isValidId(showtimeId)) {
    return sendError(res, 400, "Invalid showtime ID");
  }

  try {
    const showtimeResult = await pool.query(
      `SELECT showtime_id, room_id
       FROM showtimes
       WHERE showtime_id = $1`,
      [showtimeId]
    );

    if (showtimeResult.rows.length === 0) {
      return sendError(res, 404, "Showtime not found");
    }

    const roomId = showtimeResult.rows[0].room_id;

    const seatsResult = await pool.query(
      `SELECT
         s.seat_id AS "seatId",
         s.row_number AS "rowNumber",
         s.seat_number AS "seatNumber",
         s.display_order AS "displayOrder",
         CASE
           WHEN s.status = 'inactive' THEN 'unavailable'
           WHEN a.status = 'booked' THEN 'booked'
           WHEN a.status = 'held'
             AND a.expires_at > NOW()
             AND r.status = 'active'
             AND r.expires_at > NOW()
             THEN 'held'
           ELSE 'available'
         END AS status
       FROM seats s
       LEFT JOIN showtime_seat_allocations a
         ON a.seat_id = s.seat_id
         AND a.showtime_id = $1
       LEFT JOIN reservations r
         ON r.reservation_id = a.reservation_id
       WHERE s.room_id = $2
       ORDER BY s.row_number, s.display_order`,
      [showtimeId, roomId]
    );

    const wheelchairResult = await pool.query(
      `SELECT
         w.wheelchair_space_id AS "wheelchairSpaceId",
         w.space_number AS "spaceNumber",
         CASE
           WHEN w.status = 'inactive' THEN 'unavailable'
           WHEN a.status = 'booked' THEN 'booked'
           WHEN a.status = 'held'
             AND a.expires_at > NOW()
             AND r.status = 'active'
             AND r.expires_at > NOW()
             THEN 'held'
           ELSE 'available'
         END AS status
       FROM wheelchair_spaces w
       LEFT JOIN showtime_seat_allocations a
         ON a.wheelchair_space_id = w.wheelchair_space_id
         AND a.showtime_id = $1
       LEFT JOIN reservations r
         ON r.reservation_id = a.reservation_id
       WHERE w.room_id = $2
       ORDER BY w.space_number`,
      [showtimeId, roomId]
    );

    return res.status(200).json({
      success: true,
      data: {
        showtimeId,
        roomId,
        seats: seatsResult.rows,
        wheelchairSpaces: wheelchairResult.rows,
      },
    });
  } catch (error) {
    console.error("Error getting showtime seats:", error);
    return sendError(res, 500, "Failed to get showtime seats");
  }
}

// DELETE /api/admin/seats/:id
export async function deleteSeat(req, res) {
  const seatId = Number(req.params.id);

  if (!isValidId(seatId)) {
    return sendError(res, 400, "Invalid seat ID");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const seatResult = await client.query(
      "SELECT seat_id FROM seats WHERE seat_id = $1 FOR UPDATE",
      [seatId]
    );

    if (seatResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Seat not found");
    }

    // Keep seats with reservation history.
    const allocationResult = await client.query(
      `SELECT 1
       FROM showtime_seat_allocations
       WHERE seat_id = $1
       LIMIT 1`,
      [seatId]
    );

    if (allocationResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        409,
        "This seat has reservation history. Deactivate it instead."
      );
    }

    await client.query(
      "DELETE FROM seats WHERE seat_id = $1",
      [seatId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Seat deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting seat:", error);

    if (error.code === "23503") {
      return sendError(
        res,
        409,
        "This seat is referenced by another record and cannot be deleted."
      );
    }

    return sendError(res, 500, "Failed to delete seat");
  } finally {
    client.release();
  }
}

export async function deleteWheelchairSpace(req, res) {
  const spaceId = Number(req.params.id);

  if (!isValidId(spaceId)) {
    return sendError(res, 400, "Invalid wheelchair space ID");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const spaceResult = await client.query(
      "SELECT wheelchair_space_id FROM wheelchair_spaces WHERE wheelchair_space_id = $1 FOR UPDATE",
      [spaceId]
    );

    if (spaceResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Wheelchair space not found");
    }

    // Keep wheelchair spaces with reservation history.
    const allocationResult = await client.query(
      `SELECT 1
       FROM showtime_seat_allocations
       WHERE wheelchair_space_id = $1
       LIMIT 1`,
      [spaceId]
    );

    if (allocationResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        409,
        "This wheelchair space has reservation history. Deactivate it instead."
      );
    }

    await client.query(
      "DELETE FROM wheelchair_spaces WHERE wheelchair_space_id = $1",
      [spaceId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Wheelchair space deleted successfully",
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete wheelchair space error:", error);
    return sendError(res, 500, "Failed to delete wheelchair space");
  } finally {
    client.release();
  }
}

// DELETE /api/admin/rooms/:id/rows/:rowNumber/seats
export async function deleteSeatRow(req, res) {
  const roomId = Number(req.params.id);
  const rowNumber = Number(req.params.rowNumber);

  if (!isValidId(roomId) || !isValidRow(rowNumber)) {
    return sendError(res, 400, "Invalid room ID or row number");
  }

  return deleteRowsFromRoom(res, roomId, [rowNumber]);
}

// DELETE /api/admin/rooms/:id/rows/seats
// Body: { "rowNumbers": [1, 2, 3] }
export async function deleteSeatRows(req, res) {
  const roomId = Number(req.params.id);
  const { rowNumbers } = req.body || {};

  if (!isValidId(roomId)) {
    return sendError(res, 400, "Invalid room ID");
  }

  if (
    !Array.isArray(rowNumbers) ||
    rowNumbers.length === 0 ||
    rowNumbers.some((row) => !isValidRow(row))
  ) {
    return sendError(
      res,
      400,
      "Provide an array of valid row numbers"
    );
  }

  const uniqueRows = [...new Set(rowNumbers)];
  return deleteRowsFromRoom(res, roomId, uniqueRows);
}

// Shared logic for deleting selected rows.
async function deleteRowsFromRoom(res, roomId, rowNumbers) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      "SELECT room_id FROM rooms WHERE room_id = $1 FOR UPDATE",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Room not found");
    }

    const seatsResult = await client.query(
      `SELECT seat_id, row_number
       FROM seats
       WHERE room_id = $1
         AND row_number = ANY($2::int[])
       ORDER BY seat_id
       FOR UPDATE`,
      [roomId, rowNumbers]
    );

    const foundRows = new Set(
      seatsResult.rows.map((seat) => Number(seat.row_number))
    );

    const missingRows = rowNumbers.filter(
      (row) => !foundRows.has(row)
    );

    if (missingRows.length > 0) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        404,
        `Row(s) not found: ${missingRows.join(", ")}`
      );
    }

    const seatIds = seatsResult.rows.map(
      (seat) => seat.seat_id
    );

    // Reject the entire deletion if any seat has history.
    const allocationResult = await client.query(
      `SELECT 1
       FROM showtime_seat_allocations
       WHERE seat_id = ANY($1::int[])
       LIMIT 1`,
      [seatIds]
    );

    if (allocationResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        409,
        "Selected rows contain seats with reservation history. Deactivate those seats instead."
      );
    }

    const deleteResult = await client.query(
      `DELETE FROM seats
       WHERE room_id = $1
         AND row_number = ANY($2::int[])
       RETURNING seat_id`,
      [roomId, rowNumbers]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        rowNumbers.length === 1
          ? "Row deleted successfully"
          : "Rows deleted successfully",
      data: {
        deletedCount: deleteResult.rowCount,
        deletedRows: [...rowNumbers].sort((a, b) => a - b),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting seat rows:", error);

    if (error.code === "23503") {
      return sendError(
        res,
        409,
        "Selected rows contain seats referenced by another record and cannot be deleted."
      );
    }

    return sendError(res, 500, "Failed to delete rows");
  } finally {
    client.release();
  }
}

// PUT /api/admin/wheelchair-spaces/:id
export async function updateWheelchairSpace(req, res) {
  const spaceId = Number(req.params.id);
  const { status } = req.body || {};

  if (!isValidId(spaceId)) {
    return sendError(res, 400, "Invalid wheelchair space ID");
  }

  if (!isValidStatus(status)) {
    return sendError(
      res,
      400,
      "Status must be active or inactive"
    );
  }

  try {
    const result = await pool.query(
      `UPDATE wheelchair_spaces
       SET status = $1
       WHERE wheelchair_space_id = $2
       RETURNING
         wheelchair_space_id AS "wheelchairSpaceId",
         room_id AS "roomId",
         space_number AS "spaceNumber",
         status`,
      [status, spaceId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Wheelchair space not found");
    }

    return res.status(200).json({
      success: true,
      message: "Wheelchair space updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating wheelchair space:", error);
    return sendError(
      res,
      500,
      "Failed to update wheelchair space"
    );
  }
}

// POST /api/admin/rooms/:id/wheelchair-spaces
export async function addWheelchairSpace(req, res) {
  const roomId = Number(req.params.id);
  const { spaceNumber } = req.body || {};

  if (!isValidId(roomId)) {
    return sendError(res, 400, "Invalid room ID");
  }

  if (!isValidId(spaceNumber)) {
    return sendError(
      res,
      400,
      "Invalid wheelchair space number"
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      "SELECT room_id, capacity FROM rooms WHERE room_id = $1 FOR UPDATE",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Room not found");
    }

    const capacity = Number(roomResult.rows[0].capacity);
    const wheelchairLimit =
      capacity === 100 ? 2 : capacity === 200 ? 4 : null;

    if (wheelchairLimit === null) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "Wheelchair layout supports 100 or 200 seat rooms"
      );
    }

    const existing = await client.query(
      `SELECT wheelchair_space_id
       FROM wheelchair_spaces
       WHERE room_id = $1 AND space_number = $2`,
      [roomId, spaceNumber]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        409,
        "Wheelchair space already exists"
      );
    }

    // Inactive spaces also count towards the limit.
    const wheelchairCountResult = await client.query(
      `SELECT COUNT(*) AS total
       FROM wheelchair_spaces
       WHERE room_id = $1`,
      [roomId]
    );

    if (
      Number(wheelchairCountResult.rows[0].total) >=
      wheelchairLimit
    ) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        409,
        `This room supports a maximum of ${wheelchairLimit} wheelchair spaces`
      );
    }

    const result = await client.query(
      `INSERT INTO wheelchair_spaces
         (room_id, space_number, status)
       VALUES ($1, $2, 'active')
       RETURNING
         wheelchair_space_id AS "wheelchairSpaceId",
         room_id AS "roomId",
         space_number AS "spaceNumber",
         status`,
      [roomId, spaceNumber]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Wheelchair space added successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding wheelchair space:", error);

    if (error.code === "23505") {
      return sendError(
        res,
        409,
        "Wheelchair space already exists"
      );
    }

    return sendError(
      res,
      500,
      "Failed to add wheelchair space"
    );
  } finally {
    client.release();
  }
}

// POST /api/admin/rooms/:id/generate-seats
export async function generateSeatLayout(req, res) {
  const roomId = Number(req.params.id);

  if (!isValidId(roomId)) {
    return sendError(res, 400, "Invalid room ID");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      "SELECT room_id, capacity FROM rooms WHERE room_id = $1 FOR UPDATE",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Room not found");
    }

    const capacity = Number(roomResult.rows[0].capacity);

    if (capacity !== 100 && capacity !== 200) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        400,
        "Automatic layout supports 100 or 200 seats"
      );
    }

    const wheelchairCount = capacity === 100 ? 2 : 4;

    const existingSpacesResult = await client.query(
      `SELECT space_number
       FROM wheelchair_spaces
       WHERE room_id = $1`,
      [roomId]
    );

    const existingSpaces = existingSpacesResult.rows;

    // Do not allow more wheelchair spaces than the room limit.
    if (existingSpaces.length > wheelchairCount) {
      await client.query("ROLLBACK");

      return sendError(
        res,
        409,
        `This room supports a maximum of ${wheelchairCount} wheelchair spaces`
      );
    }

    // Keep existing wheelchair spaces, including inactive ones.
    const finalWheelchairCount = wheelchairCount;
    const regularCount = capacity;

    const expectedSeats = [];
    let nextSeatNumber = 1;

    for (let index = 0; index < regularCount; index++) {
      const logicalRow = Math.floor(index / 10);

      // Skip row 13.
      const rowNumber =
        logicalRow >= 12 ? logicalRow + 2 : logicalRow + 1;

      const position = (index % 10) + 1;

      const seatsInRow = Math.min(
        10,
        regularCount - logicalRow * 10
      );

      // Skip seat number 13.
      if (nextSeatNumber === 13) {
        nextSeatNumber++;
      }

      // Alternate seat display direction between rows.
      const displayOrder =
        logicalRow % 2 === 0
          ? position
          : seatsInRow - position + 1;

      expectedSeats.push({
        rowNumber,
        seatNumber: nextSeatNumber,
        displayOrder,
      });

      nextSeatNumber++;
    }

    const existingSeatsResult = await client.query(
      `SELECT row_number, seat_number, display_order
       FROM seats
       WHERE room_id = $1`,
      [roomId]
    );

    const existingSeats = existingSeatsResult.rows;

    // Do not overwrite a different existing layout.
    const expectedByNumber = new Map(
      expectedSeats.map((seat) => [
        seat.seatNumber,
        seat,
      ])
    );

    const expectedByPosition = new Map(
      expectedSeats.map((seat) => [
        `${seat.rowNumber}-${seat.displayOrder}`,
        seat,
      ])
    );

    for (const seat of existingSeats) {
      const expectedNumber = expectedByNumber.get(
        Number(seat.seat_number)
      );

      const expectedPosition = expectedByPosition.get(
        `${seat.row_number}-${seat.display_order}`
      );

      if (
        !expectedNumber ||
        expectedNumber.rowNumber !== Number(seat.row_number) ||
        expectedNumber.displayOrder !==
          Number(seat.display_order) ||
        expectedPosition?.seatNumber !==
          Number(seat.seat_number)
      ) {
        await client.query("ROLLBACK");

        return sendError(
          res,
          409,
          "Existing seats use a different numbering layout. No changes were made."
        );
      }
    }

    const existingNumbers = new Set(
      existingSeats.map((seat) => Number(seat.seat_number))
    );

    const missingSeats = expectedSeats.filter(
      (seat) => !existingNumbers.has(seat.seatNumber)
    );

    const existingSpaceNumbers = new Set(
      existingSpaces.map((space) => Number(space.space_number))
    );

    const missingSpaces = [];
    let nextSpaceNumber = 1;

    while (
      existingSpaces.length + missingSpaces.length <
      wheelchairCount
    ) {
      if (!existingSpaceNumbers.has(nextSpaceNumber)) {
        missingSpaces.push(nextSpaceNumber);
        existingSpaceNumbers.add(nextSpaceNumber);
      }

      nextSpaceNumber++;
    }

    // Add missing regular seats.
    if (missingSeats.length > 0) {
      await client.query(
        `INSERT INTO seats
           (room_id, row_number, seat_number, display_order)
         SELECT $1, row_number, seat_number, display_order
         FROM jsonb_to_recordset($2::jsonb)
         AS seat_data(
           row_number integer,
           seat_number integer,
           display_order integer
         )`,
        [
          roomId,
          JSON.stringify(
            missingSeats.map((seat) => ({
              row_number: seat.rowNumber,
              seat_number: seat.seatNumber,
              display_order: seat.displayOrder,
            }))
          ),
        ]
      );
    }

    // Add missing wheelchair spaces.
    if (missingSpaces.length > 0) {
      await client.query(
        `INSERT INTO wheelchair_spaces
           (room_id, space_number, status)
         SELECT $1, unnest($2::int[]), 'active'`,
        [roomId, missingSpaces]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Seat layout completed successfully",
      data: {
        roomId,
        capacity,
        addedSeats: missingSeats.length,
        addedWheelchairSpaces: missingSpaces.length,
        totalRegularSeats: regularCount,
        totalWheelchairSpaces: finalWheelchairCount,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error generating seat layout:", error);

    return sendError(
      res,
      500,
      "Failed to generate seat layout"
    );
  } finally {
    client.release();
  }
}
