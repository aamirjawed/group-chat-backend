// import GroupMember from "../model/groupMemberModel.js"
// import Group from "../model/groupModel.js"
// import User from "../model/userModel.js"

import { GroupMember, Group, User, Message } from '../model/index.js'
import crypto from 'crypto';
import {Op} from 'sequelize'


export const createGroup = async (req, res) => {
    try {

        const { groupName, description } = req.body

        if (!groupName) {
            return res.status(400).json({
                success: false,
                error: "No group name is given",
                message: "Group name cannot be empty"
            })
        }

        const userId = req.userId;

        // check to ensure userId exists
        if (!userId) {
            console.log("ERROR: req.userId is undefined!");
            console.log("req.user exists:", !!req.user);
            console.log("req.user.id:", req.user?.id);

            return res.status(401).json({
                success: false,
                error: "Authentication failed",
                message: "User ID not found. Auth middleware may not have run."
            });
        }

        console.log("Using userId:", userId);

        // Debug user data
        const user = await User.findByPk(userId);
        console.log("User lookup result:", user ? `Found: ${user.fullName} (${user.email})` : "Not found");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
                message: "User does not exist in database"
            });
        }


        // Create the group with userId as createdBy (for database relationships)
        const group = await Group.create({
            groupName,
            description: description || null,
            createdBy: userId
        });


        // Create GroupMember entry (make the creator an admin)
        console.log("Creating group membership...");
        const groupMember = await GroupMember.create({
            groupId: group.id,
            userId: userId,
            role: 'admin'
        });


        // Send response with both ID and creator name
        res.status(201).json({
            success: true,
            message: "Group created successfully",
            data: {
                id: group.id,
                groupName: group.groupName,
                description: group.description,
                createdBy: {
                    id: userId,
                    name: user.fullName,
                    email: user.email
                },
                createdAt: group.createdAt,
                role: 'admin'
            }
        });

    } catch (error) {
        console.log("ERROR in create group controller:", error.message);

        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while creating group",
        });
    }
}

export const editGroup = async (req, res) => {
    try {
        const { groupId, groupName, description } = req.body;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required",
                message: "Group ID cannot be empty"
            });
        }

        if (!groupName) {
            return res.status(400).json({
                success: false,
                error: "Group name is required",
                message: "Group name cannot be empty"
            });
        }

        const userId = req.userId;

        // Check if userId exists
        if (!userId) {
            console.log("ERROR: req.userId is undefined!");
            return res.status(401).json({
                success: false,
                error: "Authentication failed",
                message: "User ID not found. Auth middleware may not have run."
            });
        }

        console.log("Editing group with ID:", groupId, "by user:", userId);

        // Find the group
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: "Group not found",
                message: "The specified group does not exist"
            });
        }

        // Check if user is a member of the group and has admin rights
        const groupMember = await GroupMember.findOne({
            where: {
                groupId: groupId,
                userId: userId
            }
        });

        if (!groupMember) {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: "You are not a member of this group"
            });
        }

        if (groupMember.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Permission denied",
                message: "Only group admins can edit group details"
            });
        }

        // Update the group
        await group.update({
            groupName: groupName.trim(),
            description: description ? description.trim() : null
        });

        // Get updated group data with creator info
        const updatedGroup = await Group.findByPk(groupId, {
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'fullName', 'email']
            }]
        });

        res.status(200).json({
            success: true,
            message: "Group updated successfully",
            data: {
                id: updatedGroup.id,
                groupName: updatedGroup.groupName,
                description: updatedGroup.description,
                createdBy: updatedGroup.creator ? {
                    id: updatedGroup.creator.id,
                    name: updatedGroup.creator.fullName,
                    email: updatedGroup.creator.email
                } : null,
                updatedAt: updatedGroup.updatedAt,
                userRole: groupMember.role
            }
        });

    } catch (error) {
        console.log("ERROR in edit group controller:", error.message);

        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while updating group"
        });
    }
};



export const addUserToGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userIds } = req.body;
        const requesterId = req.userId;

        const requesterMembership = await GroupMember.findOne({
            where: {
                groupId,
                userId: requesterId,
                role: 'admin'
            }
        });

        if (!requesterMembership) {
            return res.status(403).json({
                success: false,
                message: "Only group admins can add members"
            })
        }


        const group = await Group.findByPk(groupId)

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            })
        }

        const addedUsers = [];
        const failedUsers = [];


        for (const userId of userIds) {
            try {
                const user = User.findByPk(userId)
                if (!user) {
                    failedUsers.push({ userId, reason: "User not found" })
                    continue;
                }

                const existingMembership = await GroupMember.findOne({
                    where: { groupId, userId }
                });

                if (existingMembership) {
                    failedUsers.push({ userId, reason: "User already a member" });
                    continue;
                }

                await GroupMember.create({
                    groupId,
                    userId,
                    role: "member"
                })

                addedUsers.push({
                    userId,
                    fullName: user.fullName,
                    email: user.email
                })
            } catch (error) {
                failedUsers.push({ userId, reason: error.message })
            }
        }

        res.status(200).json({
            success: true,
            message: "Users processed",
            data: {
                addedUsers,
                failedUsers
            }
        })
    } catch (error) {
        console.log("Error in add user to group controller", error.message)
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while adding users to group"
        })
    }
}


export const getUserGroups = async (req, res) => {
    try {
        const userId = req.userId;

        // Better validation
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Authentication failed",
                message: "User ID not found. Please login again."
            });
        }

        console.log(`Fetching groups for user ID: ${userId}`);

        // Using the many-to-many association with better error handling
        const userGroups = await Group.findAll({
            include: [
                {
                    model: User,
                    as: 'members',
                    where: { id: userId },
                    attributes: [], // Don't select user attributes in main query
                    through: {
                        attributes: ['role', 'joinedAt']
                    }
                },
                {
                    // Include creator information
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'fullName', 'email'],
                    required: false
                }
            ],
            attributes: ['id', 'groupName', 'description', 'createdBy', 'createdAt'],
            order: [['createdAt', 'DESC']] // Most recent groups first
        });

        console.log(`Found ${userGroups.length} groups for user ${userId}`);

        // Enhanced formatting with better error handling
        const formattedGroups = userGroups.map(group => {
            try {
                const groupData = group.toJSON();

                // Extract role from the through table with fallback
                const membership = groupData.members && groupData.members.length > 0
                    ? groupData.members[0].GroupMember
                    : { role: 'member', joinedAt: null };

                return {
                    id: groupData.id,
                    name: groupData.groupName, // Added for JSX compatibility
                    groupName: groupData.groupName,
                    description: groupData.description || '',
                    createdBy: {
                        id: groupData.createdBy,
                        name: groupData.creator?.fullName || 'Unknown',
                        email: groupData.creator?.email || null
                    },
                    createdAt: groupData.createdAt,
                    userRole: membership.role || 'member',
                    joinedAt: membership.joinedAt,
                    isCreator: groupData.createdBy === userId
                };
            } catch (formatError) {
                console.error(`Error formatting group ${group.id}:`, formatError);
                // Return a basic version if formatting fails
                return {
                    id: group.id,
                    name: group.groupName || `Group ${group.id}`,
                    groupName: group.groupName || `Group ${group.id}`,
                    description: group.description || '',
                    createdBy: { id: group.createdBy, name: 'Unknown', email: null },
                    createdAt: group.createdAt,
                    userRole: 'member',
                    joinedAt: null,
                    isCreator: group.createdBy === userId
                };
            }
        });

        // Fixed response structure to match JSX expectations
        return res.status(200).json({
            success: true,
            message: "Groups retrieved successfully",
            groups: formattedGroups, // JSX expects data.groups directly
            totalGroups: formattedGroups.length,
            userId: userId // Helpful for debugging
        });

    } catch (error) {
        console.error("Error in getUserGroups controller:", error);
        
        // Better error handling based on error type
        if (error.name === 'SequelizeConnectionError') {
            return res.status(503).json({
                success: false,
                error: "Database connection error",
                message: "Unable to connect to database. Please try again later."
            });
        }
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: "Validation error",
                message: "Invalid data provided."
            });
        }

        // Generic error response
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Something went wrong while fetching user groups. Please try again.",
            ...(process.env.NODE_ENV === 'development' && { 
                debug: error.message 
            }) // Only show error details in development
        });
    }
}

// // Alternative method if the above doesn't work well
// export const getUserGroupsAlternative = async (req, res) => {
//     try {
//         const userId = req.userId;

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 error: "Authentication failed",
//                 message: "User ID not found"
//             });
//         }

//         // Alternative approach: Get user first, then their groups
//         const user = await User.findByPk(userId, {
//             include: [
//                 {
//                     model: Group,
//                     as: 'groups', // Make sure this matches your association alias
//                     through: {
//                         attributes: ['role', 'joinedAt']
//                     },
//                     include: [
//                         {
//                             model: User,
//                             as: 'creator',
//                             attributes: ['id', 'fullName', 'email']
//                         }
//                     ]
//                 }
//             ]
//         });

//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 error: "User not found",
//                 message: "User account not found"
//             });
//         }

//         const formattedGroups = user.groups.map(group => {
//             const membership = group.GroupMember || { role: 'member', joinedAt: null };
            
//             return {
//                 id: group.id,
//                 name: group.groupName,
//                 groupName: group.groupName,
//                 description: group.description || '',
//                 createdBy: {
//                     id: group.createdBy,
//                     name: group.creator?.fullName || 'Unknown',
//                     email: group.creator?.email || null
//                 },
//                 createdAt: group.createdAt,
//                 userRole: membership.role || 'member',
//                 joinedAt: membership.joinedAt,
//                 isCreator: group.createdBy === userId
//             };
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Groups retrieved successfully",
//             groups: formattedGroups,
//             totalGroups: formattedGroups.length,
//             userId: userId
//         });

//     } catch (error) {
//         console.error("Error in getUserGroupsAlternative:", error);
//         return res.status(500).json({
//             success: false,
//             error: "Internal server error",
//             message: "Something went wrong while fetching user groups"
//         });
//     }
// }



export const getGroupMembers = async (req, res) => {

    try {
        const { groupId } = req.params
        const userId = req.userId

        const membership = await GroupMember.findOne({
            where: { groupId, userId }
        })

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            })
        }

        const groupMembers = await User.findAll({
            include: [
                {
                    model: Group,
                    as: 'groups',
                    where: { id: groupId },
                    attributes: [],
                    through: {
                        attributes: ['role', 'joinedAt']
                    }
                }
            ],
            attributes: ['id', 'fullName', 'email']

        })

        res.status(200).json({
            success: true,
            message: "Group members retrieved successfully",
            data: groupMembers
        })
    } catch (error) {
        console.log("Error in get group members controller", error.message);
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while fetching group members"
        });
    }

}


export const sendMessageToGroup = async (req, res) => {
    try {
        const { groupId } = req.params
        const { content, messageType = "text" } = req.body
        const userId = req.userId


        if (!content) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot be empty"
            })
        }

        const membership = await GroupMember.findOne({
            where: { groupId, userId }
        })

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            })
        }

        const message = await Message.create({
            content,
            userId,
            groupId,
            messageType
        })

        const messageWithUser = await Message.findByPk(message.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'fullName']
                }
            ]
        })

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: messageWithUser
        });
    } catch (error) {
        console.log("Error in send message to group controller", error.message);
        console.log("full error", error)
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while sending message"
        });
    }

}



export const generateInviteLink = async (req, res) => {
    try {
        const { groupId } = req.params;
        const requesterId = req.userId;

        // Check if requester is admin of the group
        const requesterMembership = await GroupMember.findOne({
            where: {
                groupId,
                userId: requesterId,
                role: 'admin'
            }
        });

        if (!requesterMembership) {
            return res.status(403).json({
                success: false,
                error: "Permission denied",
                message: "Only group admins can generate invite links"
            });
        }

        // Check if group exists
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: "Group not found",
                message: "The specified group does not exist"
            });
        }

        // Generate unique invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        
        // Set expiration time (e.g., 7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Update group with invite token and expiration
        await group.update({
            inviteToken,
            inviteTokenExpires: expiresAt
        });

        // Create invite URL (adjust base URL according to your frontend)
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/groups/join/${inviteToken}`;

        res.status(200).json({
            success: true,
            message: "Invite link generated successfully",
            data: {
                inviteUrl,
                inviteToken,
                expiresAt,
                groupName: group.groupName,
                validFor: '7 days'
            }
        });

    } catch (error) {
        console.log("Error in generate invite link controller:", error.message);
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while generating invite link"
        });
    }
};



export const joinGroupViaInvite = async (req, res) => {
    try {
        const { token } = req.params;
        const userId = req.userId;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: "Invalid invite link",
                message: "Invite token is required"
            });
        }

        // Find group by invite token
        const group = await Group.findOne({
            where: {
                inviteToken: token,
                inviteTokenExpires: {
                    [Op.gt]: new Date() // Token should not be expired
                }
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'fullName', 'email']
            }]
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                error: "Invalid or expired invite link",
                message: "The invite link is invalid or has expired"
            });
        }

        // Check if user is already a member
        const existingMembership = await GroupMember.findOne({
            where: {
                groupId: group.id,
                userId
            }
        });

        if (existingMembership) {
            return res.status(400).json({
                success: false,
                error: "Already a member",
                message: "You are already a member of this group",
                data: {
                    groupId: group.id,
                    groupName: group.groupName,
                    role: existingMembership.role
                }
            });
        }

        // Get user info
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
                message: "Your user account was not found"
            });
        }

        // Add user to group
        const newMembership = await GroupMember.create({
            groupId: group.id,
            userId,
            role: 'member'
        });

        res.status(201).json({
            success: true,
            message: "Successfully joined the group",
            data: {
                group: {
                    id: group.id,
                    name: group.groupName,
                    groupName: group.groupName,
                    description: group.description,
                    createdBy: {
                        id: group.creator?.id,
                        name: group.creator?.fullName,
                        email: group.creator?.email
                    },
                    createdAt: group.createdAt
                },
                membership: {
                    role: newMembership.role,
                    joinedAt: newMembership.createdAt
                },
                user: {
                    id: user.id,
                    name: user.fullName,
                    email: user.email
                }
            }
        });

    } catch (error) {
        console.log("Error in join group via invite controller:", error.message);
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while joining the group"
        });
    }
};


// Fixed Remove Member Controller - Replace your existing one

export const removeMemberFromGroup = async (req, res) => {
    try {
        const { groupId, userId: memberToRemoveId } = req.params;
        const requesterId = req.userId;

        // Validate input
        if (!groupId || !memberToRemoveId) {
            return res.status(400).json({
                success: false,
                error: "Missing required parameters",
                message: "Group ID and User ID are required"
            });
        }

        console.log(`Admin ${requesterId} attempting to remove user ${memberToRemoveId} from group ${groupId}`);

        // Check if requester is admin of the group
        const requesterMembership = await GroupMember.findOne({
            where: {
                groupId,
                userId: requesterId,
                role: 'admin'
            }
        });

        if (!requesterMembership) {
            return res.status(403).json({
                success: false,
                error: "Permission denied",
                message: "Only group admins can remove members"
            });
        }

        // Check if group exists
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: "Group not found",
                message: "The specified group does not exist"
            });
        }

        // Prevent admin from removing themselves if they're the only admin
        if (requesterId.toString() === memberToRemoveId.toString()) {
            const adminCount = await GroupMember.count({
                where: {
                    groupId,
                    role: 'admin'
                }
            });

            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot remove self",
                    message: "You cannot remove yourself as you're the only admin. Transfer admin rights first or delete the group."
                });
            }
        }

        // Find the member to remove (without include to avoid association issues)
        const memberToRemove = await GroupMember.findOne({
            where: {
                groupId,
                userId: memberToRemoveId
            }
        });

        if (!memberToRemove) {
            return res.status(404).json({
                success: false,
                error: "Member not found",
                message: "User is not a member of this group"
            });
        }

        // Get user details separately
        const userDetails = await User.findByPk(memberToRemoveId, {
            attributes: ['id', 'fullName', 'email']
        });

        // Store member role before deletion
        const memberRole = memberToRemove.role;

        // Remove the member
        await memberToRemove.destroy();

        console.log(`Successfully removed user ${memberToRemoveId} from group ${groupId}`);

        res.status(200).json({
            success: true,
            message: "Member removed successfully",
            data: {
                removedUser: {
                    id: memberToRemoveId,
                    name: userDetails?.fullName || 'Unknown',
                    email: userDetails?.email || null,
                    role: memberRole
                },
                groupId: groupId,
                groupName: group.groupName
            }
        });

    } catch (error) {
        console.log("Error in remove member from group controller:", error.message);
        console.log("Full error:", error);
        
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while removing member from group"
        });
    }
};



// Add this to your existing groupController.js file
// Place it after your generateInviteLink function
// REMOVE THE DUPLICATE - Keep only this version

export const updateMemberRole = async (req, res) => {
    try {
        const { groupId, userId: memberUserId } = req.params;
        const { role } = req.body;
        const requesterId = req.userId;

        console.log(`Admin ${requesterId} updating role of user ${memberUserId} to ${role} in group ${groupId}`);

        // Validate role
        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "Invalid role",
                message: "Role must be either 'admin' or 'member'"
            });
        }

        // Check if requester is admin of the group
        const requesterMembership = await GroupMember.findOne({
            where: {
                groupId,
                userId: requesterId,
                role: 'admin'
            }
        });

        if (!requesterMembership) {
            return res.status(403).json({
                success: false,
                error: "Permission denied",
                message: "Only group admins can update member roles"
            });
        }

        // Find the member to update (without include to avoid association issues)
        const memberToUpdate = await GroupMember.findOne({
            where: {
                groupId,
                userId: memberUserId
            }
        });

        if (!memberToUpdate) {
            return res.status(404).json({
                success: false,
                error: "Member not found",
                message: "User is not a member of this group"
            });
        }

        // Store old role before update
        const oldRole = memberToUpdate.role;

        // Check if role is already the same
        if (oldRole === role) {
            return res.status(400).json({
                success: false,
                error: "No change needed",
                message: `User is already a ${role}`
            });
        }

        // If demoting an admin, ensure there's at least one other admin
        if (oldRole === 'admin' && role === 'member') {
            const adminCount = await GroupMember.count({
                where: {
                    groupId,
                    role: 'admin'
                }
            });

            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot demote last admin",
                    message: "Cannot demote the last admin. Promote another member to admin first."
                });
            }
        }

        // Get user details separately
        const userDetails = await User.findByPk(memberUserId, {
            attributes: ['id', 'fullName', 'email']
        });

        // Update the role
        await memberToUpdate.update({ role });

        console.log(`Successfully updated user ${memberUserId} role from ${oldRole} to ${role} in group ${groupId}`);

        res.status(200).json({
            success: true,
            message: `Member role updated to ${role} successfully`,
            data: {
                user: {
                    id: memberUserId,
                    name: userDetails?.fullName || 'Unknown',
                    email: userDetails?.email || null
                },
                oldRole: oldRole,
                newRole: role,
                groupId: groupId,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        console.log("Error in update member role controller:", error.message);
        console.log("Full error:", error);
        
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while updating member role"
        });
    }
};


export const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Find user's membership
        const membership = await GroupMember.findOne({
            where: {
                groupId,
                userId
            }
        });

        if (!membership) {
            return res.status(404).json({
                success: false,
                error: "Not a member",
                message: "You are not a member of this group"
            });
        }

        // If user is admin, check if they're the only admin
        if (membership.role === 'admin') {
            const adminCount = await GroupMember.count({
                where: {
                    groupId,
                    role: 'admin'
                }
            });

            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot leave as only admin",
                    message: "You cannot leave the group as you're the only admin. Transfer admin rights to another member first or delete the group."
                });
            }
        }

        // Get group info for response
        const group = await Group.findByPk(groupId, {
            attributes: ['id', 'groupName']
        });

        // Remove membership
        await membership.destroy();

        res.status(200).json({
            success: true,
            message: "Successfully left the group",
            data: {
                groupId: groupId,
                groupName: group?.groupName || 'Unknown',
                userId: userId
            }
        });

    } catch (error) {
        console.log("Error in leave group controller:", error.message);
        res.status(500).json({
            success: false,
            error: "Internal Server error",
            message: "Something went wrong while leaving the group"
        });
    }
};