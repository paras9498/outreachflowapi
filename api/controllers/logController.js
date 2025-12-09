import { getLogsCollection } from '../config/db.js';

export const getLogs = async (req, res) => {
    try {
        const collection = getLogsCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'ALL';
        const provider = req.query.provider || 'ALL';

        const query = {};

        if (search) {
             query.$or = [
                { recipient: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { jobTitle: { $regex: search, $options: 'i' } }
            ];
        }
        if (status !== 'ALL') query.status = status;
        if (provider !== 'ALL') query.provider = provider;

        const total = await collection.countDocuments(query);
        const logs = await collection.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        res.json({
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Fetch Logs Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const createLog = async (req, res) => {
    try {
        const collection = getLogsCollection();
        const log = req.body;
        await collection.insertOne(log);
        res.json({ success: true, log });
    } catch (error) {
        console.error("Create Log Error:", error);
        res.status(500).json({ error: error.message });
    }
};