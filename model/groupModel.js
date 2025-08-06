
import { DataTypes } from "sequelize";
import sequelize from "../utils/db-connection.js";

const Group = sequelize.define('Group', {
    id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    groupName:{
        type: DataTypes.STRING,
        allowNull: false
    },
    description:{
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdBy:{ 
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    isActive:{
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    
    inviteToken:{
        type: DataTypes.STRING,
        allowNull: true,
        unique: true 
    },
    inviteTokenExpires:{
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['inviteToken'] 
        },
        {
            fields: ['inviteTokenExpires'] 
        },
        {
            fields: ['createdBy'] 
        }
    ]
})

export default Group;