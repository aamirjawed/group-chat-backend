// messageModel.js
import {Sequelize, DataTypes} from 'sequelize'
import sequelize from '../utils/db-connection.js'

const Message = sequelize.define('Message', {
    id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    content:{
        type: DataTypes.TEXT,
        allowNull: false
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    groupId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Groups',
            key: 'id'
        }
    },
    messageType:{
        type: DataTypes.ENUM('text', 'image', 'file'),
        defaultValue: 'text'
    }
})

export default Message