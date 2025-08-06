import Express from 'express'
import { dashboardController } from '../controllers/dashboardController.js';
import { authUser } from '../middleware/authMiddleware.js';

const router = Express.Router();

router.get("/", authUser, dashboardController)




export default router