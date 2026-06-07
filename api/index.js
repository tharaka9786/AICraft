require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve public dir (for local testing, Vercel does this automatically)
app.use(express.static(path.join(__dirname, '../public')));

// Database Setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Initialize tables
pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        stars INTEGER NOT NULL,
        comment TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        youtube_id TEXT NOT NULL,
        title TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS site_stats (
        id INTEGER PRIMARY KEY,
        total_visits INTEGER DEFAULT 0
    );
    INSERT INTO site_stats (id, total_visits) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error("Error creating tables: ", err));

// Middleware for basic admin auth
const checkAuth = (req, res, next) => {
    const pass = req.headers['authorization'];
    if (pass === 'aicraft_12@') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized. Incorrect password." });
    }
};

// --- API Routes ---

app.get('/api/auth-check', checkAuth, (req, res) => {
    res.status(200).json({ valid: true });
});

app.get('/api/ratings', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ratings ORDER BY timestamp DESC`);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching ratings: " + err.message);
        res.status(500).json({ error: "Failed to fetch ratings." });
    }
});

app.post('/api/ratings', async (req, res) => {
    const { stars, comment } = req.body;
    
    if (!stars || stars < 1 || stars > 5) {
        return res.status(400).json({ error: "Invalid rating. Must be between 1 and 5." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO ratings (stars, comment) VALUES ($1, $2) RETURNING id`, 
            [stars, comment]
        );
        res.status(201).json({ 
            message: "Rating saved successfully!", 
            id: result.rows[0].id 
        });
    } catch (err) {
        console.error("Error inserting rating: " + err.message);
        res.status(500).json({ error: "Failed to save rating." });
    }
});

app.get('/api/videos', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM videos ORDER BY timestamp DESC`);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching videos: " + err.message);
        res.status(500).json({ error: "Failed to fetch videos." });
    }
});

app.post('/api/videos', checkAuth, async (req, res) => {
    const { youtube_id, title } = req.body;
    
    if (!youtube_id) {
        return res.status(400).json({ error: "YouTube ID is required." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO videos (youtube_id, title) VALUES ($1, $2) RETURNING id`, 
            [youtube_id, title || '']
        );
        res.status(201).json({ 
            message: "Video added successfully!", 
            id: result.rows[0].id 
        });
    } catch (err) {
        console.error("Error inserting video: " + err.message);
        res.status(500).json({ error: "Failed to save video." });
    }
});

app.delete('/api/videos/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query(`DELETE FROM videos WHERE id = $1`, [id]);
        res.status(200).json({ message: "Video deleted successfully!" });
    } catch (err) {
        console.error("Error deleting video: " + err.message);
        res.status(500).json({ error: "Failed to delete video." });
    }
});

app.get('/api/visits', async (req, res) => {
    try {
        const result = await pool.query(`SELECT total_visits FROM site_stats WHERE id = 1`);
        res.status(200).json({ total_visits: result.rows[0].total_visits });
    } catch (err) {
        console.error("Error fetching visits: " + err.message);
        res.status(500).json({ error: "Failed to fetch visits." });
    }
});

app.post('/api/visits', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE site_stats SET total_visits = total_visits + 1 WHERE id = 1 RETURNING total_visits`
        );
        res.status(200).json({ total_visits: result.rows[0].total_visits });
    } catch (err) {
        console.error("Error updating visits: " + err.message);
        res.status(500).json({ error: "Failed to update visits." });
    }
});

// Export the Express API for Vercel
module.exports = app;

// For local testing: run the server if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Local development server is running on http://localhost:${PORT}`);
    });
}
