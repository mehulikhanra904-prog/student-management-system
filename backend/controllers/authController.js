const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const login = async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const token = jwt.sign(
        { sub: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    return res.json({
        token,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email
        }
    });
};

module.exports = { login };
