
// import dotenv from 'dotenv'
// dotenv.config({ path: './.env' })


// import cors from 'cors'
// import express from 'express'
// import cookieParser from 'cookie-parser'
// import db from './utils/db-connection.js'
// import authRoutes from './routes/authRoutes.js'
// import dashboardRoutes from './routes/dashboardRoutes.js'
// import messageRoutes from './routes/messageRoutes.js'
// import groupRoutes from './routes/groupRoutes.js'




// const app = express()

// const port = process.env.PORT

// // CORS must come BEFORE other middleware
// app.use(cors({
//   origin: 'http://localhost:5173',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // Other middleware after CORS
// app.use(cookieParser())
// app.use(express.json())

// app.get('/test', (req, res) => {
//   res.json({ message: 'Backend server is working!' });
// });

// app.get('/', (req, res) => {
//   res.json({ message: 'Server is running' });
// });

// // Auth Routes 
// app.use('/user', authRoutes)

// // Dashboard Routes
// app.use('/api/v1/dashboard', dashboardRoutes)

// // message routes
// app.use('/api/v1', messageRoutes) 


// // group routes
// app.use('/api/v1', groupRoutes)


// db.sync().then((result) => {
//   app.listen(port, () => {
//     console.log(`Server is running on ${port}`)
//   })
// }).catch((err) => {
//   console.log("Error in syncing with database in app.js", err.message)
// });



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
const port = process.env.PORT || 3000 // Added fallback

// Add process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    // Log the error but don't exit in development
    process.exit(1) // Uncomment in production
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    // Log the error but don't exit in development
    process.exit(1) // Uncomment in production
})

// CORS configuration
app.use(cors({
    origin: "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(cookieParser())
app.use(express.json({ limit: '10mb' })) // Added size limit

// Health check routes
app.get('/test', (req, res) => {
    res.json({ message: 'Backend server is working!' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.get('/health', async (req, res) => {
    try {
        await db.authenticate()
        res.json({ status: 'OK', database: 'Connected' })
    } catch (error) {
        res.status(500).json({ status: 'Error', database: 'Disconnected', error: error.message })
    }
});

// Routes
app.use('/user', authRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1', messageRoutes) 
app.use('/api/v1', groupRoutes)

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error)
    res.status(500).json({ message: 'Internal server error' })
})

// Start server with better error handling
const startServer = async () => {
    try {
        // Test database connection before starting server
        await db.authenticate()
        console.log('Database connection verified')
        
        // Sync database
        await db.sync()
        console.log('Database synchronized')
        
        // Start server
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`)
        })
        
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use`)
                process.exit(1)
            } else {
                console.error('Server error:', error)
            }
        })
        
    } catch (error) {
        console.error('Failed to start server:', error.message)
        process.exit(1)
    }
}

startServer()
