
import express from 'express'
import { userMessageController } from '../controllers/userMessageController.js'
import { fileMessageController } from '../controllers/fileMessageController.js'
import { authUser } from '../middleware/authMiddleware.js'
import getUserMessage from '../controllers/getUserMessage.js'
import { serveFile, downloadFile, getFileInfo } from '../controllers/fileController.js'

const router = express.Router()

router.post('/user-message', authUser, userMessageController)
router.post('/user-message/file', authUser, fileMessageController)
router.get('/:groupId/user-message', authUser, getUserMessage)


router.get('/file/:filename', authUser, serveFile)
router.get('/download/:filename', authUser, downloadFile)
router.get('/file-info/:filename', authUser, getFileInfo)

export default router