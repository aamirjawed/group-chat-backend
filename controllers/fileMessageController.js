// controllers/fileMessageController.js
import { User, Message, Group, GroupMember } from '../model/index.js'
import { upload } from '../middleware/fileUpload.js'
import path from 'path'
import fs from 'fs'

// Helper function to get message type from file
const getMessageType = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'image'
    if (mimetype.startsWith('video/')) return 'video'
    if (mimetype.startsWith('audio/')) return 'audio'
    return 'file'
}

// Helper function to format file size
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const fileMessageController = async (req, res) => {
    // Handle file upload first
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.log('File upload error:', err.message)
            
            // Handle specific multer errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File too large',
                    message: 'File size must be less than 50MB'
                })
            }
            
            if (err.message && err.message.includes('not allowed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid file type',
                    message: err.message
                })
            }
            
            return res.status(400).json({
                success: false,
                error: 'File upload failed',
                message: err.message
            })
        }

        try {
            const { groupId } = req.body
            const userId = req.userId

            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                    message: 'Please select a file to send'
                })
            }

            // Check if groupId is provided
            if (!groupId) {
                // Clean up uploaded file
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path)
                }
                return res.status(400).json({
                    success: false,
                    error: 'Missing group ID',
                    message: 'Group ID is required to send a file'
                })
            }

            // Validate groupId
            const groupIdNum = parseInt(groupId)
            if (isNaN(groupIdNum) || groupIdNum <= 0) {
                // Clean up uploaded file
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path)
                }
                return res.status(400).json({
                    success: false,
                    error: 'Invalid group ID',
                    message: 'Group ID must be a valid number'
                })
            }

            // Check if user is member of the group
            const membership = await GroupMember.findOne({
                where: {
                    userId: userId,
                    groupId: groupIdNum
                },
                include: [{
                    model: Group,
                    as: 'group',
                    attributes: ['id', 'groupName']
                }]
            })

            if (!membership) {
                // Clean up uploaded file if user is not authorized
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path)
                }
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Group not found or you are not a member'
                })
            }

            // Verify file was actually saved
            if (!fs.existsSync(req.file.path)) {
                return res.status(500).json({
                    success: false,
                    error: 'File save failed',
                    message: 'File was not properly saved to server'
                })
            }
            
            // Prepare comprehensive file information
            const fileInfo = {
                id: Date.now(),
                fileName: req.file.originalname,
                storedFilename: req.file.filename,
                filePath: req.file.filename,
                fileSize: req.file.size,
                fileSizeFormatted: formatFileSize(req.file.size),
                mimeType: req.file.mimetype,
                encoding: req.file.encoding,
                uploadedAt: new Date().toISOString(),
                uploadedBy: userId,
               
                viewUrl: `/api/v1/file/${req.file.filename}`,
                downloadUrl: `/api/v1/download/${req.file.filename}`
            }

            console.log('File info being stored:', fileInfo)

            // Create message in database with complete file info
            const message = await Message.create({
                content: JSON.stringify(fileInfo),
                messageType: getMessageType(req.file.mimetype),
                userId: userId,
                groupId: groupIdNum
            })

            // Get message with sender info
            const messageWithSender = await Message.findByPk(message.id, {
                include: [{
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'fullName', 'email']
                }]
            })

            if (!messageWithSender) {
               
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path)
                }
                return res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve saved message',
                    message: 'Message was created but could not be retrieved'
                })
            }

            // Prepare response with all necessary info
            const responseMessage = {
                id: messageWithSender.id,
                content: messageWithSender.content,
                messageType: messageWithSender.messageType,
                userId: messageWithSender.userId,
                groupId: messageWithSender.groupId,
                createdAt: messageWithSender.createdAt,
                updatedAt: messageWithSender.updatedAt,
                sender: messageWithSender.sender,
                fileInfo: fileInfo,
                userMessage: `[${getMessageType(req.file.mimetype).toUpperCase()}] ${req.file.originalname}`,
                isOwn: true
            }

            console.log('File upload successful:', {
                messageId: message.id,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: formatFileSize(req.file.size),
                path: req.file.path
            })

            res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                data: responseMessage
            })

        } catch (error) {
            console.error('Error in file message controller:', error)
            
            // Clean up uploaded file on error
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path)
                    console.log('Cleaned up uploaded file after error')
                } catch (unlinkError) {
                    console.error('Failed to clean up file after error:', unlinkError)
                }
            }
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Something went wrong while uploading the file'
            })
        }
    })
}