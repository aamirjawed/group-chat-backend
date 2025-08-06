// groupMemberModel.js - Junction table for many-to-many relationship
import { DataTypes } from "sequelize";
import sequelize from "../utils/db-connection.js";

const GroupMember = sequelize.define('GroupMember', {
    id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    groupId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Groups',
            key: 'id'
        }
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    role:{
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
    },
    joinedAt:{
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['groupId', 'userId'] // Prevent duplicate memberships
        }
    ]
})

export default GroupMember;