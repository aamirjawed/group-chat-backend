
import User from './userModel.js'
import Message from './messageModel.js'
import Group from './groupModel.js'
import GroupMember from './groupMemberModel.js'

console.log("Setting up associations...");


User.hasMany(Message, {
    foreignKey: 'userId', 
    onDelete: 'CASCADE',
    as: 'messages'
});
Message.belongsTo(User, {
    foreignKey: 'userId',
    as: 'sender'
});

 
Group.hasMany(Message, {
    foreignKey: 'groupId', 
    onDelete: 'CASCADE',
    as: 'messages'
});
Message.belongsTo(Group, {
    foreignKey: 'groupId',
    as: 'group'
});

// 3. User-Group many-to-many through GroupMember
User.belongsToMany(Group, {
    through: GroupMember,
    foreignKey: 'userId',
    otherKey: 'groupId',
    as: 'groups'
});

Group.belongsToMany(User, {
    through: GroupMember, 
    foreignKey: 'groupId',
    otherKey: 'userId',
    as: 'members'
});

// 4. Direct GroupMember associations for easier querying
User.hasMany(GroupMember, {
    foreignKey: 'userId',
    as: 'memberships'
});
GroupMember.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Group.hasMany(GroupMember, {
    foreignKey: 'groupId', 
    as: 'memberships'
});
GroupMember.belongsTo(Group, {
    foreignKey: 'groupId',
    as: 'group'
});

// 5. Group creator relationship
User.hasMany(Group, {
    foreignKey: 'createdBy',
    as: 'createdGroups'
});
Group.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

console.log("All associations set up successfully");


export { User, Message, Group, GroupMember };