const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('src'));

const ADVISORIES_FILE = path.join(__dirname, 'data', 'advisories.txt');

// Ensure the data directory exists
async function ensureDataDir() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir);
    }
}

// Read advisories
app.get('/api/advisories', async (req, res) => {
    try {
        await ensureDataDir();
        const data = await fs.readFile(ADVISORIES_FILE, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            res.status(500).json({ error: 'Failed to read advisories' });
        }
    }
});

// Save advisories
app.post('/api/advisories', async (req, res) => {
    try {
        await ensureDataDir();
        await fs.writeFile(ADVISORIES_FILE, JSON.stringify(req.body, null, 2));
        res.json({ message: 'Advisories saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save advisories' });
    }
});

// Add this new endpoint
app.post('/save-advisory', async (req, res) => {
    try {
        const { fileName, content } = req.body;
        const filePath = path.join(__dirname, 'TextFiles', fileName);
        
        await fs.writeFile(filePath, content, 'utf8');
        
        res.json({ success: true, message: 'Advisory saved successfully' });
    } catch (error) {
        console.error('Error saving advisory:', error);
        res.status(500).json({ success: false, message: 'Error saving advisory' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 