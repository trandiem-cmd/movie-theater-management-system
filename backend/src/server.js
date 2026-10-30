import express from 'express'
import cors from 'cors'
const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api', (_req, res) => res.json("Hello from API"))
app.listen(PORT, () => {
  console.log(`Event API listening at http://localhost:${PORT}`)
})