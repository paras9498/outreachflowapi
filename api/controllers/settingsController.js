
import { getSettingsCollection } from '../config/db.js';

export const getSettings = async (req, res) => {
    try {
        const collection = getSettingsCollection();
        // Fetch the global settings document
        const settings = await collection.findOne({ id: 'global' });
        
        if (!settings) {
            // Return empty object if not set, frontend will handle defaults
            return res.json({ settings: null });
        }

        const { _id, id, ...cleanSettings } = settings;
        res.json({ settings: cleanSettings });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const collection = getSettingsCollection();
        const newSettings = req.body;

        // Ensure we store it as the 'global' document
        await collection.updateOne(
            { id: 'global' },
            { $set: { ...newSettings, id: 'global', updatedAt: Date.now() } },
            { upsert: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ error: error.message });
    }
};
