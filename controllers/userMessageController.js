import { User, Message, Group } from '../model/index.js'

export const userMessageController = async (req, res) => {
    const { userMessage, groupId } = req.body

    try {
        // Validate required fields
        if (!userMessage) {
            return res.status(400).json({
                success: false,
                error: "Empty input, no message",
                message: "Input must contain a message"
            })
        }

        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: "Missing group ID",
                message: "Group ID is required to send a message"
            })
        }

        // Optional: Verify the group exists and user is a member
        const group = await Group.findByPk(groupId, {
            include: [{
                model: User,
                as: 'members',
                where: { id: req.userId },
                required: true
            }]
        })

        if (!group) {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: "Group not found or you're not a member"
            })
        }

        // Create the message with correct field name
        const message = await Message.create({
            content: userMessage, // Fixed: use 'content' instead of 'userMessage'
            userId: req.userId,
            groupId: groupId // Fixed: include required groupId
        })

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "No message found",
                message: "Unable to send message"
            })
        }

        // Include sender info in response
        const messageWithSender = await Message.findByPk(message.id, {
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'fullName', 'email'] // Don't include sensitive data
            }]
        })

        res.status(201).json({ 
            success: true,
            message: messageWithSender 
        })

    } catch (error) {
        console.log("Error in user message controller", error.message);
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Server error"
        })
    }
}