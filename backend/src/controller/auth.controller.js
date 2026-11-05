import bcrypt from 'bcrypt'
import pool from '../config/database.js'
import { validateRegister } from '../validators/auth.validator.js'

export async function register(req, res) {
  const validation = validateRegister(req.body)

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    })
  }

  try {
    const {
      full_name,
      email,
      password,
      phone,
      date_of_birth,
    } = validation.value

    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (
        full_name,
        email,
        password_hash,
        phone,
        date_of_birth
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        user_id,
        full_name,
        email,
        phone,
        date_of_birth,
        role,
        created_at`,
      [full_name, email, passwordHash, phone, date_of_birth]
    )

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: result.rows[0],
    })
  } catch (error) {
    console.error('Register error:', error)

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}
