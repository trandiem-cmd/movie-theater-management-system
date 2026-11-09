import express from 'express'
import { register,login, getMe, logout, updateProfile, changePassword} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js';
const router = express.Router()

router.post('/register', register);
router.post('/login', login);
router.get('/me',requireAuth, getMe);
router.post('/logout', logout)
router.put('/profile', requireAuth, updateProfile)
router.put('/change-password', requireAuth, changePassword)

export default router