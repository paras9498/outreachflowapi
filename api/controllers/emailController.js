import { getLogsCollection } from '../config/db.js';

// Helper to save log securely on the backend
const saveLog = async (logData) => {
    try {
        const collection = getLogsCollection();
        await collection.insertOne(logData);
    } catch (e) {
        console.error("Failed to save log via helper", e);
    }
};

export const sendGmail = async (req, res) => {
    const { accessToken, to, subject, body, jobContext } = req.body;
    let logStatus = 'FAILED';
    let errorMessage = undefined;

    try {
        if (!accessToken) throw new Error("Missing Access Token");

        // Construct MIME message
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${to}`,
            "Content-Type: text/plain; charset=utf-8",
            "MIME-Version: 1.0",
            `Subject: ${utf8Subject}`,
            "",
            body
        ];
        const message = messageParts.join("\n");
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encodedMessage })
        });

        if (!gmailRes.ok) {
            const errText = await gmailRes.text();
            throw new Error(errText);
        }

        const data = await gmailRes.json();
        logStatus = 'SENT';
        res.json(data);

    } catch (error) {
        console.error("Gmail Send Error:", error);
        errorMessage = error.message;
        res.status(500).json({ error: error.message });
    } finally {
        if (jobContext) {
            await saveLog({
                id: Date.now().toString(),
                jobId: jobContext.id,
                jobTitle: jobContext.title,
                recipient: to,
                subject: subject,
                provider: 'GMAIL',
                status: logStatus,
                errorMessage,
                timestamp: Date.now()
            });
        }
    }
};

export const sendCustomEmail = async (req, res) => {
    const { to, subject, body, settings, jobContext } = req.body;
    const { url, authToken, fromName, fromEmail, replyTo } = settings;
    let logStatus = 'FAILED';
    let errorMessage = undefined;

    try {
        if (!url || !authToken) throw new Error("Missing custom email configuration");

        const formData = new FormData();
        formData.append("from", `${fromName} <${fromEmail}>`);
        formData.append("to", to);
        formData.append("replyTo", replyTo);
        formData.append("subject", subject);
        formData.append("text", body);

        const apiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': authToken },
            body: formData
        });

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            throw new Error(`Custom API Error (${apiRes.status}): ${errText}`);
        }

        const data = await apiRes.json();
        logStatus = 'SENT';
        res.json({ success: true, data });

    } catch (error) {
        console.error("Custom Email Send Error:", error);
        errorMessage = error.message;
        res.status(500).json({ error: error.message });
    } finally {
        if (jobContext) {
            await saveLog({
                id: Date.now().toString(),
                jobId: jobContext.id,
                jobTitle: jobContext.title,
                recipient: to,
                subject: subject,
                provider: 'CUSTOM',
                status: logStatus,
                errorMessage,
                timestamp: Date.now()
            });
        }
    }
};