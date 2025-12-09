
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("WARNING: GEMINI_API_KEY not set. AI features will fail.");
}

const cleanAndParseJson = (text) => {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
    }
};

const extractSources = (response) => {
    const sources = new Set();
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach(chunk => { if (chunk.web?.uri) sources.add(chunk.web.uri); });
    }
    return Array.from(sources);
};

export const analyzeJob = async (req, res) => {
    try {
        const { job, settings } = req.body;
        if (!ai) throw new Error("Server misconfigured: Missing API Key");

        const model = "gemini-2.5-flash";
        const systemInstruction = `You are a Senior Technical Strategist for ${settings.companyName}.
        Your Company's Services: ${settings.services.map(s => `- ${s}`).join('\n')}`;

        const prompt = `Job Title: ${job.title}\nJob Description: ${job.description.substring(0, 1500)}\nAnalyze this job. Return JSON with score, recommendation, reasoning, painPoints, matchingSkills.`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        recommendation: { type: Type.STRING, enum: ["CONTACT", "SKIP"] },
                        reasoning: { type: Type.STRING },
                        painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["score", "recommendation", "reasoning", "painPoints", "matchingSkills"]
                }
            }
        });

        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const generateEmail = async (req, res) => {
    try {
        const { job, settings } = req.body;
        if (!ai) throw new Error("Server misconfigured: Missing API Key");

        const model = "gemini-2.5-flash";
        const analysisContext = job.analysis ? `Analysis Score: ${job.analysis.score}/10. Pain Points: ${job.analysis.painPoints.join(', ')}.` : '';
        const matchingSkills = job.analysis?.matchingSkills?.join(', ') || settings.services.slice(0,3).join(', ');
        
        // --- JOB SPECIFIC PROMPT ---
        const systemInstruction = `You are a Senior Engineering Partner at ${settings.companyName} with 15 years of experience.
        We specialize in: ${settings.services.join(', ')}.
        
        CONTEXT: You are contacting a hiring manager/founder about a specific open role ("${job.title}").
        
        GOAL: Position our agency/team as the immediate solution to the vacancy. Show we can start delivering value faster than a full-time hire.
        
        STRUCTURE:
        1. **Hook**: "I saw you're looking for a ${job.title}..."
        2. **The Problem**: Acknowledge the specific technical challenge mentioned in their job post (e.g. scaling, migrating, testing).
        3. **Our Value (Bulleted)**: List 3 specific ways we hit the ground running using our matching skills.
        4. **Soft CTA**: "Open to a brief chat to see if we're a fit?"
        
        FORMATTING RULES:
        - Use strict \\n\\n for paragraph breaks.
        - Use " - " for bullet points.
        - Keep it under 150 words.
        - Tone: Professional, Efficient, Helpful.
        `;

        const prompt = `
        JOB TITLE: ${job.title}
        COMPANY: ${job.company.name}
        JOB DESCRIPTION SNIPPET: ${job.description.substring(0, 500)}...
        
        ANALYSIS CONTEXT: ${analysisContext}
        MATCHING SKILLS: ${matchingSkills}
        
        Draft a concise, well-formatted email.
        
        SUBJECT LINE:
        - Internal style. Lowcase.
        - E.g. "re: ${job.title}", "candidate for ${job.title}", "question about ${job.title}"

        Return JSON: { "subject": "string", "body": "string" }
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.7, 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING },
                        body: { type: Type.STRING },
                    },
                    required: ["subject", "body"]
                }
            }
        });

        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Email Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const findEmail = async (req, res) => {
    try {
        const { job } = req.body;
        if (!ai) throw new Error("Server misconfigured: Missing API Key");

        const model = "gemini-2.5-flash";
        const prompt = `Find contact email for ${job.company.name}. Job: ${job.title}. Return EMAIL, NAME.`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        const text = response.text || '';
        const emailMatch = text.match(/EMAIL:\s*([^\s\n]+)/i);
        const nameMatch = text.match(/NAME:\s*([^\n]+)/i);

        let email = emailMatch ? emailMatch[1].trim() : undefined;
        let name = nameMatch ? nameMatch[1].trim() : undefined;

        if (email && (email.toLowerCase().includes("not found") || !email.includes("@"))) email = undefined;

        const sources = extractSources(response);

        res.json({ email, name, sources });
    } catch (error) {
        console.error("Find Email Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- COMPANY OUTREACH ENDPOINTS ---

export const analyzeCompany = async (req, res) => {
    try {
        const { company, settings } = req.body;
        if (!ai) throw new Error("Server misconfigured: Missing API Key");

        const model = "gemini-2.5-flash";
        
        const prompt = `
        Analyze the company "${company.name}" (Website: ${company.website}).
        
        MY COMPANY PROFILE:
        Name: ${settings.companyName}
        Description: ${settings.companyDescription}
        Services:
        ${settings.services.map(s => `- ${s}`).join('\n')}
        
        Task:
        1. Summarize their business operations (what they do).
        2. Identify 3 potential operational pain points or technical needs based on their industry/website.
        3. Find their social media links (LinkedIn, Twitter, Github, etc).
        4. **Service Mapping**: Explicitly select 2-3 of MY SERVICES (from the list above) that are best suited to solve their identified pain points.
        5. Recommend a sales approach strategy.

        CRITICAL: RETURN THE RESULT IN RAW JSON FORMAT ONLY. DO NOT USE MARKDOWN.
        Structure:
        {
            "summary": "string",
            "painPoints": ["string"],
            "socialLinks": [{"platform": "string", "url": "string"}],
            "matchingSkills": ["string"],
            "recommendedApproach": "string"
        }
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const json = cleanAndParseJson(response.text || '{}');
        const sources = extractSources(response);
        
        if (json) {
            json.sources = sources;
        }

        res.json(json);
    } catch (error) {
        console.error("Company Analysis Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const findDecisionMaker = async (req, res) => {
    try {
        const { company } = req.body;
        if (!ai) throw new Error("Server misconfigured: Missing API Key");

        const model = "gemini-2.5-flash";
        const prompt = `
        Find decision makers for "${company.name}" (Website: ${company.website}).
        Looking for up to 3 people in roles like: CTO, Founder, Head of Engineering, Product Manager, or IT Director.
        Also find a general company contact email (like contact@, hello@, jobs@).
        
        Task:
        1. Search for specific people in leadership.
        2. Search for their specific work emails if available.
        3. Search for their LinkedIn profile URLs.
        4. Search for a generic company email.

        CRITICAL: RETURN THE RESULT IN RAW JSON FORMAT ONLY. DO NOT USE MARKDOWN.
        Structure:
        {
            "contacts": [
                { "name": "string", "role": "string", "email": "string", "linkedin": "string (url)" }
            ],
            "generalEmail": "string"
        }
        If fields are not found, leave them as empty string.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }]
            }
        });

        const json = cleanAndParseJson(response.text || '{}');
        const sources = extractSources(response);
        
        if (json) {
            json.decisionMakerSources = sources;
        }
        
        // Return default structure even if empty
        res.json(json || { contacts: [], generalEmail: "" });

    } catch (error) {
        console.error("Find Decision Maker Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const generateCompanyEmail = async (req, res) => {
    try {
        const { company, settings, contactName, contactRole } = req.body;
        if (!ai) throw new Error("Server misconfigured: Missing API Key");

        const model = "gemini-2.5-flash";
        
        const recipientName = contactName || "Team";
        const recipientInfo = contactName ? `${contactName} (${contactRole})` : "Team";
        const matchingSkills = company.analysis?.matchingSkills?.join(', ') || "";
        const recommendedApproach = company.analysis?.recommendedApproach || "Consultative problem solving";
        
        // --- COMPANY OUTREACH SPECIFIC PROMPT ---
        const systemInstruction = `You are a Strategic Account Executive at ${settings.companyName}.
        
        ABOUT US: ${settings.companyDescription}
        OUR SERVICES: ${settings.services.join(', ')}.
        
        CONTEXT: You are sending a cold email to ${company.name}.
        
        GOAL: Pitch our services as a solution to their challenges using the analysis data.
        
        STRUCTURE:
        1. **Subject**: Intriguing, Short, Lowercase. (e.g. "thoughts on [topic]", "question").
        2. **Greeting**: "Hi ${recipientName},"
        3. **Observation**: Start with something specific about their company (Summary/News).
        4. **Insight**: Mention the "Recommended Approach": ${recommendedApproach}.
        5. **Solution (Bullet Points)**: 
           - Link their "Pain Points" directly to "Relevant Services to Pitch".
           - **CRITICAL**: You MUST mention "${settings.companyName}" in the body (e.g. "At ${settings.companyName}, we help...").
           - **CRITICAL**: You MUST explicitly mention our specific services that solve their pain.
        6. **The Ask**: "Worth a brief exchange?"
        7. **Signature**: "Best,\\n[Your Name]"
        
        FORMATTING RULES:
        - Use strict \\n\\n for paragraph breaks.
        - Use " - " for bullet points.
        - Short sentences.
        - NO fluff ("I hope this email finds you well").
        `;

        const prompt = `
        RECIPIENT: ${recipientInfo}
        COMPANY: ${company.name}
        WEBSITE: ${company.website}
        
        COMPANY SUMMARY: ${company.analysis?.summary || "Unknown"}
        IDENTIFIED PAIN POINTS: ${company.analysis?.painPoints?.join(', ') || "Scaling technical systems"}
        RELEVANT SERVICES TO PITCH: ${matchingSkills}
        RECOMMENDED STRATEGY: ${recommendedApproach}
        
        Draft a high-impact, easy-to-read email.
        Ensure you use the RECOMMENDED STRATEGY to frame the pitch.
        
        Output JSON: { "subject": "string", "body": "string" }
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING },
                        body: { type: Type.STRING },
                    },
                    required: ["subject", "body"]
                }
            }
        });

        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Company Email Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
};
