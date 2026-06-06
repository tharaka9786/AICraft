const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
        db.run(`CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stars INTEGER NOT NULL,
            comment TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating ratings table " + err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            youtube_id TEXT NOT NULL,
            title TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating videos table " + err.message);
            }
        });
    }
});

// API Routes
app.post('/api/ratings', (req, res) => {
    const { stars, comment } = req.body;
    
    if (!stars || stars < 1 || stars > 5) {
        return res.status(400).json({ error: "Invalid rating. Must be between 1 and 5." });
    }

    const sql = `INSERT INTO ratings (stars, comment) VALUES (?, ?)`;
    db.run(sql, [stars, comment], function(err) {
        if (err) {
            console.error("Error inserting rating: " + err.message);
            return res.status(500).json({ error: "Failed to save rating." });
        }
        res.status(201).json({ 
            message: "Rating saved successfully!", 
            id: this.lastID 
        });
    });
});

app.get('/api/ratings', (req, res) => {
    const sql = `SELECT * FROM ratings ORDER BY timestamp DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching ratings: " + err.message);
            return res.status(500).json({ error: "Failed to fetch ratings." });
        }
        res.status(200).json(rows);
    });
});

// Middleware for basic admin auth
const checkAuth = (req, res, next) => {
    const pass = req.headers['authorization'];
    if (pass === 'aicraft_admin_secret') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized. Incorrect password." });
    }
};

// Video API Routes
app.get('/api/videos', (req, res) => {
    const sql = `SELECT * FROM videos ORDER BY timestamp DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching videos: " + err.message);
            return res.status(500).json({ error: "Failed to fetch videos." });
        }
        res.status(200).json(rows);
    });
});

app.post('/api/videos', checkAuth, (req, res) => {
    const { youtube_id, title } = req.body;
    
    if (!youtube_id) {
        return res.status(400).json({ error: "YouTube ID is required." });
    }

    const sql = `INSERT INTO videos (youtube_id, title) VALUES (?, ?)`;
    db.run(sql, [youtube_id, title || ''], function(err) {
        if (err) {
            console.error("Error inserting video: " + err.message);
            return res.status(500).json({ error: "Failed to save video." });
        }
        res.status(201).json({ 
            message: "Video added successfully!", 
            id: this.lastID 
        });
    });
});

app.delete('/api/videos/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM videos WHERE id = ?`;
    db.run(sql, id, function(err) {
        if (err) {
            console.error("Error deleting video: " + err.message);
            return res.status(500).json({ error: "Failed to delete video." });
        }
        res.status(200).json({ message: "Video deleted successfully!" });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
