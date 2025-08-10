import Message from '../model/messageModel.js';
import User from '../model/userModel.js';
import Group from '../model/groupModel.js';
import GroupMember from '../model/groupMemberModel.js';

const getUserMessage = async (req, res) => {
  try {
    // get user id from middleware
    const userId = req.userId;
    
    // check if user is logged in
    if (!userId) {
      return res.status(400).json({ error: "User not found" });
    }

    // get groupId from params  or query
    let groupId = req.params.groupId || req.query.groupId;
    
    // check if groupId is provided
    if (!groupId) {
      return res.status(400).json({ 
        success: false,
        error: "Group ID is required",
        message: "Please provide a group ID in URL or query parameter" 
      });
    }

    // make sure groupId is a number
    groupId = parseInt(groupId);
    if (isNaN(groupId) || groupId <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid group ID",
        message: "Group ID must be a valid positive number" 
      });
    }

    // check if group exists
    const groupExists = await Group.findOne({
      where: { id: groupId }
    });

    if (!groupExists) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
        message: "The specified group does not exist"
      });
    }

    // check if user is member of group
    const checkMembership = await GroupMember.findOne({
      where: {
        userId: userId,
        groupId: groupId
      }
    });

    if (!checkMembership) {
      return res.status(403).json({ 
        success: false,
        error: "Access denied",
        message: "You are not a member of this group" 
      });
    }

    // get current user details
    const currentUser = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'fullName', 'email']
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "Current user data not found"
      });
    }

    // get group details
    const groupDetails = await Group.findOne({
      where: { id: groupId },
      attributes: ['id', 'groupName', 'description', 'createdBy']
    });

    if (!groupDetails) {
      return res.status(404).json({
        success: false,
        error: "Group details not found",
        message: "Could not retrieve group information"
      });
    }

    // get all group members
    const allMembers = await GroupMember.findAll({
      where: { groupId: groupId },
      attributes: ['userId', 'role', 'joinedAt']
    });

    if (allMembers.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No members found",
        message: "This group has no members"
      });
    }

    // get user details for all members
    const memberIds = allMembers.map(member => member.userId);
    const usersData = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'fullName', 'email']
    });

    if (usersData.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Member data not found",
        message: "Could not retrieve member information"
      });
    }

    // combine member data with user data
    const groupMembers = [];
    for (let i = 0; i < allMembers.length; i++) {
      const memberRecord = allMembers[i];
      const userData = usersData.find(user => user.id === memberRecord.userId);
      
      if (userData) {
        groupMembers.push({
          id: userData.id,
          fullName: userData.fullName,
          email: userData.email,
          role: memberRecord.role,
          joinedAt: memberRecord.joinedAt
        });
      }
    }

    // get all messages from group
    const allMessages = await Message.findAll({
      where: { groupId: groupId },
      attributes: ['id', 'content', 'messageType', 'userId', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    // add sender info to each message and handle file messages
    const messagesWithSender = [];
    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];
      const senderInfo = usersData.find(user => user.id === message.userId);
      
      // handle content field based on message type
      const messageContent = message.content || '';
      let userMessage = messageContent; // default for text messages
      let fileInfo = null;
      
      
      if (message.messageType && message.messageType !== 'text') {
        try {
          fileInfo = JSON.parse(messageContent);
         
          const fileTypeUpper = message.messageType.toUpperCase();
          userMessage = `[${fileTypeUpper}] ${fileInfo.fileName || 'File'}`;
        } catch (error) {
          console.error('Error parsing file info for message', message.id, ':', error);
          userMessage = `[${message.messageType.toUpperCase()}] File`;
        }
      }
      
      const messageObj = {
        id: message.id,
        content: messageContent,
        userMessage: userMessage,
        messageType: message.messageType || 'text',
        userId: message.userId,
        createdAt: message.createdAt,
        sender: senderInfo ? {
          id: senderInfo.id,
          fullName: senderInfo.fullName,
          email: senderInfo.email
        } : null,
        isOwn: message.userId === userId
      };
      
    
      if (fileInfo) {
        messageObj.fileInfo = fileInfo;
      }
      
      messagesWithSender.push(messageObj);
    }

   
    const onlineUserIds = [];
    if (groupMembers.length > 0) {
      
      for (let i = 0; i < Math.min(3, groupMembers.length); i++) {
        onlineUserIds.push(groupMembers[i].id);
      }
    }

    // prepare response data
    const responseData = {
      success: true,
      currentUser: {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email
      },
      group: {
        id: groupDetails.id,
        name: groupDetails.groupName,
        groupName: groupDetails.groupName,
        description: groupDetails.description,
        createdBy: groupDetails.createdBy
      },
      id: userId,
      messages: messagesWithSender,
      users: groupMembers,
      members: groupMembers,
      onlineUsers: onlineUserIds,
      onlineCount: onlineUserIds.length,
      totalMessages: messagesWithSender.length,
      groupId: parseInt(groupId)
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.log('Error in getUserMessage controller:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'Something went wrong while fetching group messages'
    });
  }
};

export default getUserMessage;