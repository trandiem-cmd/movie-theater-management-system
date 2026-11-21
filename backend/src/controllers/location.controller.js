import pool from '../config/database.js';

// Get all cities that have active theaters
export const getCities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT city
      FROM theaters
      WHERE status = 'active'
      ORDER BY city ASC
    `);

    const cities = result.rows.map((row) => row.city);

    return res.status(200).json({
      success: true,
      cities,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
    });
  }
};

// Get theaters by city
export const getTheatersByCity = async (req, res) => {
  try {
    const { city } = req.query;

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City is required',
      });
    }

    const result = await pool.query(
      `SELECT theater_id, name, address, city, phone, email,
              description, image_url
       FROM theaters
       WHERE LOWER(city) = LOWER($1)
         AND status = 'active'
       ORDER BY name ASC`,
      [city.trim()]
    );

    return res.status(200).json({
      success: true,
      theaters: result.rows,
    });
  } catch (error) {
    console.error('Error fetching theaters:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch theaters',
    });
  }
};

// Get theater details
export const getTheaterDetails = async (req, res) => {
  try {
    const { theaterId } = req.params;

    if (!/^\d+$/.test(theaterId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theater ID',
      });
    }

    const result = await pool.query(
      `SELECT theater_id, name, address, city, phone, email,
              description, image_url
       FROM theaters
       WHERE theater_id = $1
         AND status = 'active'`,
      [Number(theaterId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Theater not found',
      });
    }

    return res.status(200).json({
      success: true,
      theater: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching theater details:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch theater details',
    });
  }
};

// Get rooms by theater
export const getRoomsByTheater = async (req, res) => {
  try {
    const { theaterId } = req.params;

    if (!/^\d+$/.test(theaterId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theater ID',
      });
    }

    const result = await pool.query(
      `SELECT r.room_id, r.theater_id, r.name, r.capacity
       FROM rooms r
       JOIN theaters t ON t.theater_id = r.theater_id
       WHERE r.theater_id = $1
         AND r.status = 'active'
         AND t.status = 'active'
       ORDER BY r.name ASC`,
      [Number(theaterId)]
    );

    return res.status(200).json({
      success: true,
      rooms: result.rows,
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
    });
  }
};

// Get all rooms for Admin Showtime Management
export const getAdminRooms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.room_id,
        r.theater_id,
        r.name,
        r.capacity,
        r.status,
        t.name AS theater_name,
        t.city
      FROM rooms r
      JOIN theaters t ON t.theater_id = r.theater_id
      WHERE t.status = 'active'
      ORDER BY t.city ASC, t.name ASC, r.name ASC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching admin rooms:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
    });
  }
};
