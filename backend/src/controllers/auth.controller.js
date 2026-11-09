import bcrypt from 'bcrypt'
import pool from '../config/database.js'
import { validateRegister,  validateLogin, validateUpdateProfile, validateChangePassword } from '../validators/auth.validator.js'
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

export async function login(req, res) {
  try {
    // 1. Validate input
    const validation = validateLogin(req.body)

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      })
    }

    const { email, password } = validation.value

    // 2. Find user by email
    const result = await pool.query(
      `SELECT
        user_id,
        full_name,
        email,
        password_hash,
        role,
        phone,
        date_of_birth
      FROM users
      WHERE email = $1`,
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const user = result.rows[0]

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }
    // 4. Generate a new session ID
    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    // 5. Create session
    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      date_of_birth: user.date_of_birth
    }
    // 6. Save session before responding
    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    // 7. Return response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: req.session.user,
    })

  } catch (error) {
    console.error('Login error:', error)

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}


export function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.session.user ?? null,
  });
}

export function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      console.error('Logout error:', error);

      return res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }

    // Delete cookie session client
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });
}
export async function updateProfile(req, res) {
  // 1. Validate request body
  const validation = validateUpdateProfile(req.body)

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    })
  }

  try {
    // 2. Get user ID from session
    const userId = req.session.user.user_id

    const {
      full_name,
      phone,
      date_of_birth,
    } = validation.value

    // 3. Update user profile
    const result = await pool.query(
      `UPDATE users
       SET
         full_name = $1,
         phone = $2,
         date_of_birth = $3,
         updated_at = NOW()
       WHERE user_id = $4
       RETURNING
         user_id,
         full_name,
         email,
         phone,
         date_of_birth,
         role,
         created_at,
         updated_at`,
      [
        full_name,
        phone,
        date_of_birth,
        userId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const updatedUser = result.rows[0]

    // 4. Update session user
    req.session.user = {
      ...req.session.user,
      full_name: updatedUser.full_name,
      phone: updatedUser.phone,
      date_of_birth: updatedUser.date_of_birth,
    }

    // 5. Save updated session
    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    // 6. Return response
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    })

  } catch (error) {
    console.error('Update profile error:', error)

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}

export async function changePassword(req, res) {
  const validation = validateChangePassword(req.body)

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    })
  }

  try {
    const userId = req.session.user.user_id
    const { current_password, new_password } = validation.value

    // Get current password hash
    const result = await pool.query(
      `SELECT password_hash
       FROM users
       WHERE user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 12)

    // Update password in database
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newPasswordHash, userId]
    )

    // Destroy current session
    req.session.destroy((error) => {
      if (error) {
        console.error('Session destroy error:', error)

        return res.status(500).json({
          success: false,
          message: 'Password changed, but logout failed. Please log out again.',
        })
      }

      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      })
    })
  } catch (error) {
    console.error('Change password error:', error)

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}