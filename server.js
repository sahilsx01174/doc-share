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

// Security 1: Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests! Please try again in 15 minutes.' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many incorrect passwords have been entered. Please try again in 15 minutes.' }
});

app.use(express.json());
app.use(limiter);
app.use(express.static(path.join(__dirname, 'public')));

// Security 2: Upload Limits
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
    abortOnLimit: true,
    createParentPath: true
}));

// Auth Middleware
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['x-app-password'];
    if (authHeader && authHeader === SECRET_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Wrong Password!' });
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
        res.status(401).json({ success: false, error: 'Wrong Password!' });
    }
});

// Upload File Route
app.post('/upload', checkAuth, (req, res) => {
    if (!req.files || !req.files.document) {
        return res.status(400).json({ error: 'No selected any file' });
    }

    const sampleFile = req.files.document;
    const ext = path.extname(sampleFile.name).toLowerCase();

    const allowedTypes = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.doc', '.docx', '.zip'];
    if (!allowedTypes.includes(ext)) {
        return res.status(400).json({ error: 'Ye file type allowed nahi hai!' });
    }

    const safeName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
    const savePath = path.join(uploadDir, safeName);

    sampleFile.mv(savePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, fileName: safeName });
    });
});

// File List Route
app.get('/api/files', checkAuth, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json([]);
        res.json(files);
    });
});

// File Download Route
app.get('/api/download/:filename', checkAuth, (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File can Not find' });
    }
});

// File Delete Route
app.delete('/api/files/:filename', checkAuth, (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, safeFilename);

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: 'File Not delete' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));