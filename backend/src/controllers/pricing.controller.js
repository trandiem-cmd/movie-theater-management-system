
import pool from "../config/database.js";

// Get active pricing policies
export const getPricing = async (req, res) => {
  try {
    const theaterId = req.query.theaterId
      ? Number(req.query.theaterId)
      : null;

    if (
      theaterId !== null &&
      (!Number.isInteger(theaterId) || theaterId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater ID.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          policy_id,
          name,
          description,
          adjustment_type,
          adjustment_percentage,
          scope,
          theater_id,
          conditions,
          priority,
          start_date,
          end_date
        FROM pricing_policies
        WHERE is_active = TRUE
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date > NOW())
          AND (
            scope = 'all_theaters'
            OR (scope = 'specific_theater' AND theater_id = $1)
          )
        ORDER BY priority ASC, policy_id ASC;
      `,
      [theaterId]
    );

    return res.json({
      success: true,
      policies: result.rows,
    });
  } catch (error) {
    console.error("Get pricing error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve pricing policies.",
    });
  }
};

// Calculate an individual ticket price
export const calculatePricing = async (req, res) => {
  try {
    const { showtimeId, ticketType, age } = req.body;

    const validTicketTypes = ["regular", "child", "wheelchair"];

    const id = Number(showtimeId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid showtime ID is required.",
      });
    }

    if (!validTicketTypes.includes(ticketType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket type.",
      });
    }

    if (
      ticketType === "child" &&
      (!Number.isInteger(age) || age < 0 || age > 12)
    ) {
      return res.status(400).json({
        success: false,
        message: "Child tickets are available for ages 0–12.",
      });
    }

    const result = await pool.query(
      `
        SELECT base_price
        FROM showtimes
        WHERE showtime_id = $1
          AND status = 'scheduled';
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Showtime not found or unavailable.",
      });
    }

    const basePrice = Number(result.rows[0].base_price);

    let finalPrice = basePrice;
    const appliedPolicies = [];

    if (ticketType === "child") {
      finalPrice = basePrice * 0.5;

      appliedPolicies.push({
        name: "Child discount",
        adjustment_type: "discount",
        adjustment_percentage: 50,
      });
    }

    // Wheelchair tickets have the same price as regular tickets.

    return res.json({
      success: true,
      pricing: {
        showtimeId: id,
        ticketType,
        basePrice: Number(basePrice.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
        appliedPolicies,
      },
    });
  } catch (error) {
    console.error("Calculate pricing error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not calculate ticket price.",
    });
  }
};
