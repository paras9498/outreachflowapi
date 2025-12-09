
import { getJobsCollection, getCompaniesCollection } from '../config/db.js';

// Helper to normalize URL
const normalizeUrl = (url) => {
    if (!url) return '';
    try {
        let clean = url.toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
        clean = clean.split('/')[0];
        return clean;
    } catch (e) {
        return url.toLowerCase();
    }
};

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
};

export const getJobs = async (req, res) => {
    try {
        const collection = getJobsCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'ALL';
        const days = req.query.days || 'ALL';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const query = {};

        if (search) {
            const escapedSearch = escapeRegExp(search);
            query.$or = [
                { title: { $regex: escapedSearch, $options: 'i' } },
                { "company.name": { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        if (status !== 'ALL') query.status = status;

        if (days !== 'ALL') {
            const daysAgo = parseInt(days);
            if (!isNaN(daysAgo)) {
                const cutoff = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
                query.createdAt = { $gte: cutoff };
            }
        }

        const total = await collection.countDocuments(query);
        const jobs = await collection.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        res.json({
            jobs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Fetch Jobs Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const createJob = async (req, res) => {
    try {
        const jobsCollection = getJobsCollection();
        const companiesCollection = getCompaniesCollection();
        
        const job = req.body;
        
        // 1. Insert Job
        await jobsCollection.insertOne(job);
        
        // 2. Sync to Companies Collection (Unified Logic)
        if (job.company && (job.company.name || job.company.website)) {
            const normalizedName = job.company.name ? job.company.name.trim() : '';
            const website = job.company.website ? job.company.website.trim() : '';
            const normalizedWebsite = normalizeUrl(website);

            // Unique Key Logic: Try Website first, then Name
            let existingCompany = null;
            
            if (normalizedWebsite) {
                const escapedWebsite = escapeRegExp(normalizedWebsite);
                existingCompany = await companiesCollection.findOne({ 
                    website: { $regex: new RegExp(escapedWebsite, 'i') } 
                });
            }

            if (!existingCompany && normalizedName) {
                const escapedName = escapeRegExp(normalizedName);
                existingCompany = await companiesCollection.findOne({ 
                    name: { $regex: `^${escapedName}$`, $options: 'i' } 
                });
            }

            if (!existingCompany) {
                console.log(`[Sync] Auto-creating company: ${normalizedName || website}`);
                
                const newContacts = [];
                if (job.company.contactName && job.company.contactEmail) {
                    newContacts.push({
                        name: job.company.contactName,
                        email: job.company.contactEmail,
                        role: 'Unknown'
                    });
                }

                const newCompany = {
                    id: Date.now().toString() + "-sync",
                    name: normalizedName || "Unknown",
                    website: website || '',
                    skillsToPitch: [],
                    status: 'New', // CompanyStatus.NEW
                    createdAt: Date.now(),
                    contacts: newContacts,
                    generalContactEmail: job.company.contactEmail || '', // Use as fallback
                    analysis: null
                };
                
                await companiesCollection.insertOne(newCompany);
            }
        }

        res.json({ success: true, job });
    } catch (error) {
        console.error("Create Job Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateJob = async (req, res) => {
    try {
        const collection = getJobsCollection();
        const { id } = req.params;
        const job = req.body;
        const { _id, ...updateData } = job;

        await collection.updateOne({ id: id }, { $set: updateData });
        res.json({ success: true, job });
    } catch (error) {
        console.error("Update Job Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const collection = getJobsCollection();
        const { id } = req.params;
        await collection.deleteOne({ id: id });
        res.json({ success: true, id });
    } catch (error) {
        console.error("Delete Job Error:", error);
        res.status(500).json({ error: error.message });
    }
};
