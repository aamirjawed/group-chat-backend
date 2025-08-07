import dotenv from 'dotenv'
dotenv.config({ path: './.env' })
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306, 
        dialect: "mysql",
        dialectOptions: {
            ssl: {
                rejectUnauthorized: false
            },
        },
       
        retry: {
            match: [
                /ETIMEDOUT/,
                /EHOSTUNREACH/,
                /ECONNRESET/,
                /ECONNREFUSED/,
                /ETIMEDOUT/,
                /ESOCKETTIMEDOUT/,
                /EHOSTUNREACH/,
                /EPIPE/,
                /EAI_AGAIN/,
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            max: 3
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);


(async () => {
    try {
        await sequelize.authenticate()
        console.log("Database connected successfully")
    } catch (error) {
        console.error("Database connection failed:", error.message)
        
    }
})()

export default sequelize