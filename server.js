const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// डॉक्यूमेंट सेव करने के लिए uploads फोल्डर बनाएं
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// स्टोरेज कॉन्फ़िगरेशन (फाइल का नाम यूनिक रखने के लिए टाइमस्टैम्प जोड़ा गया है)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// स्टैटिक फाइलों के लिए
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. फोन से फाइल अपलोड करने का रूट
app.post('/upload', upload.single('document'), (req, res) => {
    if (!req.file) return res.status(400).send('कोई फाइल सेलेक्ट नहीं की गई!');
    res.redirect('/');
});

// 2. अपलोड की गई सभी फाइलों की लिस्ट भेजने का रूट
app.get('/api/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});

app.listen(PORT, () => {
    console.log(`सर्वर इस पोर्ट पर चालू है: ${PORT}`);
});