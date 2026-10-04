const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔒 अपना पासवर्ड यहाँ सेट करें:
const SECRET_PASSWORD = "1234"; 

const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.use(fileUpload({ createParentPath: true }));

// Password Check Middleware
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['x-app-password'];
    if (authHeader === SECRET_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'गलत पासवर्ड!' });
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify Password API
app.post('/api/verify', (req, res) => {
    const { password } = req.body;
    if (password === SECRET_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'गलत पासवर्ड' });
    }
});

// Protected File Upload
app.post('/upload', checkAuth, (req, res) => {
    if (!req.files || !req.files.document) {
        return res.status(400).json({ error: 'Koi file nahi chuni gayi' });
    }

    const sampleFile = req.files.document;
    const fileName = Date.now() + '-' + sampleFile.name;
    const savePath = path.join(uploadDir, fileName);

    sampleFile.mv(savePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, fileName });
    });
});

// Protected File List
app.get('/api/files', checkAuth, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json([]);
        res.json(files);
    });
});

// Protected File Delete
app.delete('/api/files/:filename', checkAuth, (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: 'File delete nahi ho payi' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Server live on ${PORT}`));