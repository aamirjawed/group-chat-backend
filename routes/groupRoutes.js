import express from 'express'
import {authUser} from '../middleware/authMiddleware.js'
import { 
    addUserToGroup, 
    createGroup, 
    editGroup, 
    generateInviteLink, 
    getGroupMembers, 
    getUserGroups, 
    joinGroupViaInvite, 
    leaveGroup, 
    removeMemberFromGroup, 
    sendMessageToGroup, 
    updateMemberRole
} from '../controllers/createGroupController.js'


const router = express.Router()

router.use(authUser)

router.post('/create-group', createGroup)
router.post('/edit-group',  editGroup);
router.get('/get-groups', getUserGroups);

router.post('/:groupId/members',authUser, addUserToGroup);
router.get('/:groupId/members', getGroupMembers);


router.post('/:groupId/messages', sendMessageToGroup);

router.post('/:groupId/invite/generate', generateInviteLink);
router.post('/join/:token', joinGroupViaInvite);
router.delete('/:groupId/members/:userId', removeMemberFromGroup);
router.put('/:groupId/members/:userId/role', updateMemberRole);

router.delete('/:groupId/leave', leaveGroup);


export default router