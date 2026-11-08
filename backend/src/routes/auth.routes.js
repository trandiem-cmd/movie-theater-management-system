import express from 'express'
import { register,login,getMe,logout } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js';
const router = express.Router()

router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);
router.post('/logout', logout)
router.get(
  '/protected-test',
  requireAuth,
  (req, res) => {
    return res.status(200).json({
      success: true,
      status: "login ",
      user: req.session.user,
    });
  }
);

export default router