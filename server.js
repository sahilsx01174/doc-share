const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// uploads डायरेक्टरी सुनिश्चित करें
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// स्टोरेज सेटिंग्स
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// मिडिलवेयर
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// अपलोड रूट
app.post('/upload', upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('कोई फ़ाइल अपलोड नहीं हुई।');
    }
    res.redirect('/');
});

// फ़ाइलों की लिस्ट प्राप्त करने का रूट
app.get('/api/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json([]);
        res.json(files);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});