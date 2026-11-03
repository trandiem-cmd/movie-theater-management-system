import pool from "./database.js";

const testDatabase = async () => {
  try {
    console.log("Node.js time:", new Date().toString());

    console.log(
      "Node.js Helsinki time:",
      new Date().toLocaleString("en-GB", {
        timeZone: "Europe/Helsinki",
      })
    );

    const result = await pool.query(`
      SELECT
        NOW() AS database_time,
        CURRENT_SETTING('TIMEZONE') AS database_timezone
    `);

    console.log("Database time:", result.rows[0].database_time);
    console.log("Database timezone:", result.rows[0].database_timezone);

  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
};

testDatabase();