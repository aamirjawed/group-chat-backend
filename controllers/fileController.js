// controllers/fileController.js
import path from 'path'
import fs from 'fs'
import { Message } from '../model/index.js'

// Serve file for viewing/displaying
export const serveFile = async (req, res) => {
    try {
        const filename = req.params.filename
        
        // Basic security check
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            })
        }
        
        // Build file path
        const filePath = path.join(process.cwd(), 'uploads', 'messages', filename)
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            })
        }
        
        // Get file stats for proper headers
        const stats = fs.statSync(filePath)
        const ext = path.extname(filename).toLowerCase()
        
        // Set appropriate content type
        let contentType = 'application/octet-stream'
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
        
        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext]
        }
        
        // Set headers
        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Length', stats.size)
        res.setHeader('Cache-Control', 'public, max-age=86400') 
        
        // Send the file
        res.sendFile(filePath)
        
    } catch (error) {
        console.log('Error serving file:', error.message)
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
}

// Download file with original name
export const downloadFile = async (req, res) => {
    try {
        const filename = req.params.filename
        const messageId = req.query.messageId // Optional: to get original filename
        
        // Basic security check
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            })
        }
        
        // Build file path
        const filePath = path.join(process.cwd(), 'uploads', 'messages', filename)
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            })
        }
        
        let originalName = filename
        
        // Try to get original filename from message if messageId provided
        if (messageId) {
            try {
                const message = await Message.findByPk(messageId)
                if (message && message.content) {
                    const fileInfo = JSON.parse(message.content)
                    if (fileInfo.fileName) {
                        originalName = fileInfo.fileName
                    }
                }
            } catch (parseError) {
                console.log('Could not parse message content for original filename:', parseError.message)
            }
        }
        
        // Download the file with original name
        res.download(filePath, originalName, (err) => {
            if (err) {
                console.log('Download error:', err.message)
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Download failed'
                    })
                }
            }
        })
        
    } catch (error) {
        console.log('Error downloading file:', error.message)
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            })
        }
    }
}

// Get file info
export const getFileInfo = async (req, res) => {
    try {
        const filename = req.params.filename
        
       
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            })
        }
        
        const filePath = path.join(process.cwd(), 'uploads', 'messages', filename)
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            })
        }
        
        const stats = fs.statSync(filePath)
        const ext = path.extname(filename)
        
        res.json({
            success: true,
            data: {
                filename: filename,
                size: stats.size,
                extension: ext,
                created: stats.birthtime,
                modified: stats.mtime
            }
        })
        
    } catch (error) {
        console.log('Error getting file info:', error.message)
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
}