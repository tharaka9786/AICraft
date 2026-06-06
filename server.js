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
                console.error("Error creating table " + err.message);
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

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
