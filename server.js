const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Temporary folder for uploads
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.use(fileUpload({ createParentPath: true }));

// GET / - UI serve
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST /upload - File handle
app.post('/upload', (req, res) => {
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

// GET /api/files - List files
app.get('/api/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json([]);
        res.json(files);
    });
});

app.listen(PORT, () => console.log(`Server live on ${PORT}`));