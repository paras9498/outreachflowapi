
import { getCompaniesCollection } from '../config/db.js';

// Helper to normalize URL for comparison (strips protocol, www, path)
const normalizeUrl = (url) => {
    if (!url) return '';
    try {
        // Remove protocol and www
        let clean = url.toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
        // Remove path/query params (keep just the domain)
        clean = clean.split('/')[0];
        return clean;
    } catch (e) {
        return url.toLowerCase();
    }
};

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
};

export const getCompanies = async (req, res) => {
    try {
        const collection = getCompaniesCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'ALL';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        
        const query = {};

        if (search) {
            const escapedSearch = escapeRegExp(search);
            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { website: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        if (status !== 'ALL') query.status = status;

        const total = await collection.countDocuments(query);
        const companies = await collection.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        res.json({
            companies,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Fetch Companies Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const createCompany = async (req, res) => {
    try {
        const collection = getCompaniesCollection();
        const company = req.body;
        
        // 1. Check for duplicate by Website (Primary) using Normalization
        let existing = null;
        if (company.website) {
             const normalizedInput = normalizeUrl(company.website);
             const escapedInput = escapeRegExp(normalizedInput);
             
             // We have to scan or use regex since stored values might differ slightly
             existing = await collection.findOne({ 
                website: { $regex: new RegExp(escapedInput, 'i') } 
             });
        }

        // 2. Check for duplicate by Name (Secondary)
        if (!existing && company.name) {
            const escapedName = escapeRegExp(company.name.trim());
            existing = await collection.findOne({ 
                name: { $regex: `^${escapedName}$`, $options: 'i' } 
            });
        }
        
        if(existing) {
             return res.json({ success: true, company: existing });
        }

        await collection.insertOne(company);
        res.json({ success: true, company });
    } catch (error) {
        console.error("Create Company Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateCompany = async (req, res) => {
    try {
        const collection = getCompaniesCollection();
        const { id } = req.params;
        const company = req.body;
        const { _id, ...updateData } = company;

        await collection.updateOne({ id: id }, { $set: updateData });
        res.json({ success: true, company });
    } catch (error) {
        console.error("Update Company Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteCompany = async (req, res) => {
    try {
        const collection = getCompaniesCollection();
        const { id } = req.params;
        await collection.deleteOne({ id: id });
        res.json({ success: true, id });
    } catch (error) {
        console.error("Delete Company Error:", error);
        res.status(500).json({ error: error.message });
    }
};
