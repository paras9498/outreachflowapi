
// import express from 'express';
// import cors from 'cors';
// import { connectDB, getUsersCollection } from './config/db.js';

// // Route Imports
// import jobsRoutes from './routes/jobs.routes.js';
// import logsRoutes from './routes/logs.routes.js';
// import aiRoutes from './routes/ai.routes.js';
// import emailRoutes from './routes/email.routes.js';
// import companyRoutes from './routes/company.routes.js';
// import userRoutes from './routes/user.routes.js';
// import settingsRoutes from './routes/settings.routes.js';

// const app = express();
// const port = process.env.PORT || 3000;

// app.use(cors());
// app.use(express.json());

// // Mount Routes
// app.use('/api/jobs', jobsRoutes);
// app.use('/api/logs', logsRoutes);
// app.use('/api/companies', companyRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api', aiRoutes);    
// app.use('/api', emailRoutes); 

// // Seed Default Admin
// const seedAdmin = async () => {
//     try {
//         const users = getUsersCollection();
//         const admin = await users.findOne({ username: 'admin' });
//         if (!admin) {
//             console.log("Seeding default admin user...");
//             await users.insertOne({
//                 id: 'admin-seed',
//                 username: 'admin',
//                 password: 'admin', // Plaintext for demo as requested
//                 role: 'ADMIN',
//                 createdAt: Date.now()
//             });
//         }
//     } catch (e) {
//         console.warn("Seeding failed (DB might not be ready):", e.message);
//     }
// };

// // Initialize Database and Start Server
// const startServer = async () => {
//     try {
//         await connectDB();
//         await seedAdmin();
//         app.listen(port, () => {
//              console.log(`Server running on port ${port}`);
//         });
//     } catch (error) {
//         console.error("Failed to start server:", error);
//         process.exit(1);
//     }
// };

// startServer();

import express from 'express';
import cors from 'cors';
import { connectDB, getUsersCollection } from './config/db.js';

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
                password: 'admin',
                role: 'ADMIN',
                createdAt: Date.now()
            });
        }
    } catch (e) {
        console.warn("Seeding failed (DB might not be ready):", e.message);
    }
};

// Connect to DB once before any request
await connectDB();
await seedAdmin();

export default app;
