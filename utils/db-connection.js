import dotenv from 'dotenv'
dotenv.config({ path: './.env' }) // .env is in same folder
import { Sequelize } from "sequelize";
import fs from 'fs'

const sequelize =  new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD,
    {
    host:process.env.DB_HOST,
    port:process.env.DB_PORT || 3000,
    dialect:"mysql",
    dialectOptions: {
      ssl: {
        
        rejectUnauthorized: false
      },
    },
});


(async () => {
    try {
        await sequelize.authenticate()
        console.log("Database connected")
    } catch (error) {
        console.log("Error in db-connection in utils", error.message)
    }
})()


export default sequelize