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
