
import pool from "../config/database.js";

// GET /api/rooms/:id/seats
export async function getRoomSeats(req, res) {
  try {
    const roomId = Number(req.params.id);

    // Validate room ID
    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    // Find the room
    const roomResult = await pool.query(
      "SELECT room_id, name, capacity FROM rooms WHERE room_id = $1",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Get regular seats
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

    // Get wheelchair spaces
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

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room seats",
    });
  }
}
