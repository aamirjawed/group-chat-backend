// middleware/fileUpload.js
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Configure where to store files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'messages')
        
        // Create folder if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true })
        }
        
        cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
        // Create unique filename while preserving extension
        const ext = path.extname(file.originalname)
        const uniqueName = `${uuidv4()}-${Date.now()}${ext}`
        cb(null, uniqueName)
    }
})

// Check what files are allowed
const fileFilter = (req, file, cb) => {
    // Image files
    const imageTypes = [
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'image/bmp',
        'image/svg+xml'
    ]
    
    // Video files
    const videoTypes = [
        'video/mp4', 
        'video/avi', 
        'video/mov', 
        'video/wmv', 
        'video/webm',
        'video/quicktime',
        'video/x-msvideo'
    ]
    
    // Document files
    const docTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed',
        'application/rar',
        'application/x-rar-compressed'
    ]
    
    const audioTypes = [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/mp3'
    ]
    
    // All allowed types
    const allowedTypes = [...imageTypes, ...videoTypes, ...docTypes, ...audioTypes]
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: images, videos, documents, audio files.`), false)
    }
}

// Created multer upload with better error handling
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024, 
        files: 1 
    },
    fileFilter: fileFilter
})