import {Sequelize, DataTypes} from 'sequelize'
import sequelize from '../utils/db-connection.js'


const User = sequelize.define('Users', {
    id:{
        type:DataTypes.INTEGER,
        allowNull:false,
        autoIncrement:true,
        primaryKey:true
    },
    fullName:{
        type:DataTypes.STRING,
        allowNull:false
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true
    },
    phoneNumber:{
        type:DataTypes.DOUBLE,
        allowNull:false
    },
    password:{
        type:DataTypes.STRING,
        allowNull:false
    }
})

export default User