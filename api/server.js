import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { connectDB, getUsersCollection } from './config/db.js';

// Route Imports
import jobsRoutes from './routes/jobs.routes.js';
import logsRoutes from './routes/logs.routes.js';
import aiRoutes from './routes/ai.routes.js';
import emailRoutes from './routes/email.routes.js';
import companyRoutes from './routes/company.routes.js';
import userRoutes from './routes/user.routes.js';
import settingsRoutes from './routes/settings.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/api/jobs', jobsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', aiRoutes);
app.use('/api', emailRoutes);

// Seed Default Admin
const seedAdmin = async () => {
    try {
        const users = getUsersCollection();
        const admin = await users.findOne({ username: 'admin' });
        if (!admin) {
            console.log("Seeding default admin user...");
            await users.insertOne({
                id: 'admin-seed',
                username: 'admin',
                password: 'admin', // Plaintext for demo
                role: 'ADMIN',
                createdAt: Date.now()
            });
        }
    } catch (e) {
        console.warn("Seeding failed (DB might not be ready):", e.message);
    }
};

// Initialize DB (Vercel recommends running async code inside handler)
const initDB = async () => {
    try {
        await connectDB();
        await seedAdmin();
    } catch (err) {
        console.error("DB init failed:", err.message);
    }
};



// Run DB init immediately
initDB();

// Export serverless handler for Vercel
export const handler = serverless(app);
