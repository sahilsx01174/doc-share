const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/docshare';

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Connection Error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const FileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const File = mongoose.model('File', FileSchema);

// Upload Directory
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }, abortOnLimit: true }));

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Access denied. Please login.' });

    try {
        const verified = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// 1. Sign Up API
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: 'Allready Username exist' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.json({ success: true, message: 'Account create successfull.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error during signup' });
    }
});

// 2. Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Wrong username and password' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Wrong username and password' });

        const token = jwt.sign({ _id: user._id, username: user.username }, JWT_SECRET);
        res.json({ success: true, token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// 3. User Upload File
app.post('/upload', authMiddleware, async (req, res) => {
    if (!req.files || !req.files.document) return res.status(400).json({ error: 'File nahi chuni gayi' });

    const sampleFile = req.files.document;
    const ext = path.extname(sampleFile.name).toLowerCase();
    const safeName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
    const savePath = path.join(uploadDir, safeName);

    sampleFile.mv(savePath, async (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const newFile = new File({
            userId: req.user._id,
            filename: safeName,
            originalName: sampleFile.name
        });
        await newFile.save();

        res.json({ success: true });
    });
});

// 4. Get User Specific Files
app.get('/api/files', authMiddleware, async (req, res) => {
    const files = await File.find({ userId: req.user._id }).sort({ uploadDate: -1 });
    res.json(files);
});

// 5. Download User File
app.get('/api/download/:id', authMiddleware, async (req, res) => {
    const fileDoc = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!fileDoc) return res.status(404).json({ error: 'File nahi mili' });

    const filePath = path.join(uploadDir, fileDoc.filename);
    res.download(filePath, fileDoc.originalName);
});

// 6. Delete User File
app.delete('/api/files/:id', authMiddleware, async (req, res) => {
    const fileDoc = await File.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!fileDoc) return res.status(404).json({ error: 'File delete nahi ho sakti' });

    const filePath = path.join(uploadDir, fileDoc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));