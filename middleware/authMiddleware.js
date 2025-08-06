import jwt from 'jsonwebtoken'
import User from '../model/userModel.js'

export const authUser = async (req, res, next) => {
    try {
        console.log("All cookies:", req.cookies) // Add this line
        const { token } = req.cookies

        if (!token) {
            // Clear any invalid cookie
            res.clearCookie('token')
            return res.status(401).json({
                success: false,
                error: "No token provided",
                message: "Please login"
            })
        }

        const decodedMessage = jwt.verify(token, process.env.JWT_SECRET)
        const { id } = decodedMessage

        const user = await User.findByPk(id)

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
                message: "Token not valid"
            })
        }

        req.user = user
        req.userId = user.id
        next()

    } catch (error) {
        console.log("Error in auth middleware:", error.message)

        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: "Token expired",
                message: "Please login again"
            })
        }

        return res.status(401).json({
            success: false,
            error: "Invalid token",
            message: "Token not valid"
        })
    }
}