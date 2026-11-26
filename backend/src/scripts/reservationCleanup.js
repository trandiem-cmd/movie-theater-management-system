import pool from "../config/database.js";

export async function cleanupExpiredReservations() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock showtimes with expired reservations
    const lockedShowtimes = await client.query(`
      SELECT showtime_id
      FROM showtimes
      WHERE showtime_id IN (
        SELECT showtime_id
        FROM reservations
        WHERE status = 'active'
          AND expires_at <= NOW()
      )
      ORDER BY showtime_id
      FOR UPDATE
    `);

    const showtimeIds = lockedShowtimes.rows.map(
      (row) => row.showtime_id
    );

    // Stop if there are no expired reservations
    if (showtimeIds.length === 0) {
      await client.query("COMMIT");
      return;
    }

    // Mark expired reservations
    const result = await client.query(
      `
        UPDATE reservations
        SET status = 'expired'
        WHERE status = 'active'
          AND expires_at <= clock_timestamp()
          AND showtime_id = ANY($1::int[])
        RETURNING reservation_id
      `,
      [showtimeIds]
    );

    // Release seats belonging to expired reservations
    await client.query(
      `
        UPDATE showtime_seat_allocations AS a
        SET status = 'released',
            reservation_id = NULL,
            booking_id = NULL,
            expires_at = NULL
        FROM reservations AS r
        WHERE a.reservation_id = r.reservation_id
          AND a.status = 'held'
          AND r.status = 'expired'
          AND a.showtime_id = ANY($1::int[])
      `,
      [showtimeIds]
    );

    await client.query("COMMIT");

    if (result.rowCount > 0) {
      console.log(
        `Expired reservations cleaned up: ${result.rowCount}`
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reservation cleanup error:", error);
  } finally {
    client.release();
  }
}