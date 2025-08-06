import express from 'express'
import { userMessageController } from '../controllers/userMessageController.js';
import { authUser } from '../middleware/authMiddleware.js';
import getUserMessage from '../controllers/getUserMessage.js';



const router = express.Router();

router.post('/user-message', authUser,userMessageController)

router.get('/:groupId/user-message', authUser, getUserMessage)



export default router