
import { getUsersCollection } from '../config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const collection = getUsersCollection();
        const user = await collection.findOne({ username });

        if (!user || user.password !== password) {
            // Note: In production, use bcrypt for password comparison
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ success: true, user: userWithoutPassword, token });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const verifySession = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>
        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const collection = getUsersCollection();
        
        // Fetch fresh user data (excluding password)
        const user = await collection.findOne({ id: decoded.id }, { projection: { password: 0 } });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ success: true, user });

    } catch (error) {
        // Token expired or invalid
        res.status(401).json({ error: "Invalid or expired session" });
    }
};

export const getUsers = async (req, res) => {
    try {
        const collection = getUsersCollection();
        const users = await collection.find({}).project({ password: 0 }).toArray();
        res.json({ users });
    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const collection = getUsersCollection();
        const { username, password, role } = req.body;
        
        if (!username || !password || !role) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const existing = await collection.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            password, // Note: Hash this in production
            role,
            createdAt: Date.now()
        };

        await collection.insertOne(newUser);
        const { password: _, ...userWithoutPassword } = newUser;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const collection = getUsersCollection();
        const { id } = req.params;
        await collection.deleteOne({ id });
        res.json({ success: true, id });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ error: error.message });
    }
};