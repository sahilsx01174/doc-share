const express = require('express');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔒 Railway Variables se Password lega (Fallback: '1234')
const SECRET_PASSWORD = process.env.APP_PASSWORD || "1234";

const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 🛡️ Security 1: Rate Limiter (Brute-Force Protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP
    message: { error: 'Bahut zyada requests! Kripya 15 minute baad try karein.' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Max 10 login attempts per 15 mins
    message: { error: 'Bahut galat password dale gaye hain. 15 minute baad try karein.' }
});

app.use(express.json());
app.use(limiter);
app.use(express.static(path.join(__dirname, 'public')));

// 🛡️ Security 2: Upload Limits (Max 10MB)
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Max
    abortOnLimit: true,
    createParentPath: true
}));

// Auth Middleware
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['x-app-password'];
    if (authHeader && authHeader === SECRET_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Galat Password!' });
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify Password
app.post('/api/verify', loginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === SECRET_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Galat Password!' });
    }
});

// Protected Upload
app.post('/upload', checkAuth, (req, res) => {
    if (!req.files || !req.files.document) {
        return res.status(400).json({ error: 'Koi file nahi chuni gayi' });
    }

    const sampleFile = req.files.document;
    const ext = path.extname(sampleFile.name).toLowerCase();

    // 🛡️ Security 3: Allowed File Extensions
    const allowedTypes = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.doc', '.docx', '.zip'];
    if (!allowedTypes.includes(ext)) {
        return res.status(400).json({ error: 'Ye file type allowed nahi hai!' });
    }

    // 🛡️ Security 4: Safe Random Filename Generation
    const safeName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
    const savePath = path.join(uploadDir, safeName);

    sampleFile.mv(savePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, fileName: safeName });
    });
});

// Protected File List
app.get('/api/files', checkAuth, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json([]);
        res.json(files);
    });
});

// 🛡️ Security 5: Protected Download Route (Direct Access Restricted)
app.get('/api/download/:filename', checkAuth, (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File nahi mili' });
    }
});

// Protected Delete
app.delete('/api/files/:filename', checkAuth, (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, safeFilename);

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: 'File delete nahi ho payi' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Secure Server running on port ${PORT}`));