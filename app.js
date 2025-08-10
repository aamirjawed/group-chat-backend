import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import fs from 'fs'
import db from './utils/db-connection.js'
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import groupRoutes from './routes/groupRoutes.js'

const app = express()
const port = process.env.PORT || 3000

// Create uploads directory if it doesn't exist
const createUploadDirs = () => {
    const uploadDirs = ['uploads', 'uploads/messages']
    
    uploadDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
            console.log(`✓ Created directory: ${dir}`)
        }
    })
}

// Create upload directories on startup
createUploadDirs()

// Add process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(1)
})

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))

// Serve static files for uploaded content
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

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
        
        // Check upload directory
        const uploadExists = fs.existsSync('uploads/messages')
        
        res.json({ 
            status: 'OK', 
            database: 'Connected',
            uploadDirectory: uploadExists ? 'Ready' : 'Missing'
        })
    } catch (error) {
        res.status(500).json({ 
            status: 'Error', 
            database: 'Disconnected', 
            error: error.message 
        })
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
    
    // Handle multer errors specifically
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            success: false,
            error: 'File too large',
            message: 'File size exceeds 50MB limit' 
        })
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid file field',
            message: 'Unexpected file upload field' 
        })
    }
    
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: 'Something went wrong'
    })
})

// Start server with better error handling
const startServer = async () => {
    try {
        // Test database connection before starting server
        await db.authenticate()
        console.log('✓ Database connection verified')
        
        // Sync database
        await db.sync()
        console.log('✓ Database synchronized')
        
        // Verify upload directory
        if (fs.existsSync('uploads/messages')) {
            console.log('✓ Upload directory ready')
        } else {
            console.log('⚠️ Upload directory not found, recreating...')
            createUploadDirs()
        }
        
        // Start server
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`)
            console.log(`Upload directory: ${path.join(process.cwd(), 'uploads')}`)
            console.log(`CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
        })
        
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${port} is already in use`)
                process.exit(1)
            } else {
                console.error('Server error:', error)
            }
        })
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message)
        process.exit(1)
    }
}

startServer()