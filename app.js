
import dotenv from 'dotenv'
dotenv.config({ path: './.env' })


import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'
import db from './utils/db-connection.js'
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import groupRoutes from './routes/groupRoutes.js'




const app = express()

const port = process.env.PORT

// CORS must come BEFORE other middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Other middleware after CORS
app.use(cookieParser())
app.use(express.json())

app.get('/test', (req, res) => {
  res.json({ message: 'Backend server is working!' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Auth Routes 
app.use('/user', authRoutes)

// Dashboard Routes
app.use('/api/v1/dashboard', dashboardRoutes)

// message routes
app.use('/api/v1', messageRoutes) 


// group routes
app.use('/api/v1', groupRoutes)


db.sync().then((result) => {
  app.listen(port, () => {
    console.log(`Server is running on ${port}`)
  })
}).catch((err) => {
  console.log("Error in syncing with database in app.js", err.message)
});