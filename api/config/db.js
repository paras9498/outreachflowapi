
import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://chirag:chirag123@cluster0.69eqjo5.mongodb.net/';
const client = new MongoClient(mongoUrl);

let db = null;
let jobsCollection = null;
let logsCollection = null;
let companiesCollection = null;
let usersCollection = null;
let settingsCollection = null;

export const connectDB = async () => {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        db = client.db('outreach_app');
        jobsCollection = db.collection('jobs');
        logsCollection = db.collection('logs');
        companiesCollection = db.collection('companies');
        usersCollection = db.collection('users');
        settingsCollection = db.collection('settings');
        
        // Create indexes
        await jobsCollection.createIndex({ id: 1 }, { unique: true });
        await jobsCollection.createIndex({ title: "text", "company.name": "text" });
        
        await logsCollection.createIndex({ id: 1 }, { unique: true });
        await logsCollection.createIndex({ timestamp: -1 });
        await logsCollection.createIndex({ jobId: 1 });

        await companiesCollection.createIndex({ id: 1 }, { unique: true });
        await companiesCollection.createIndex({ name: "text" });
        
        await usersCollection.createIndex({ id: 1 }, { unique: true });
        await usersCollection.createIndex({ username: 1 }, { unique: true });

        await settingsCollection.createIndex({ id: 1 }, { unique: true });

    } catch (e) {
        console.error("Failed to connect to MongoDB", e);
        process.exit(1);
    }
};

export const getJobsCollection = () => {
    if (!jobsCollection) throw new Error("Database not initialized");
    return jobsCollection;
};

export const getLogsCollection = () => {
    if (!logsCollection) throw new Error("Database not initialized");
    return logsCollection;
};

export const getCompaniesCollection = () => {
    if (!companiesCollection) throw new Error("Database not initialized");
    return companiesCollection;
};

export const getUsersCollection = () => {
    if (!usersCollection) throw new Error("Database not initialized");
    return usersCollection;
};

export const getSettingsCollection = () => {
    if (!settingsCollection) throw new Error("Database not initialized");
    return settingsCollection;
};
