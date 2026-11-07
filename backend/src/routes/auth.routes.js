import express from 'express'
import { register } from '../controllers/auth.controller.js'

const router = express.Router()

router.post('/register', register)

router.get('/register', (req, res) => {
  res.json({
    success: true,
    message: 'Register route is working'
  })
})

export default router