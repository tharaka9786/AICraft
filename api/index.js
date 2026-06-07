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
    
    CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY,
        password TEXT NOT NULL,
        secret_question TEXT NOT NULL,
        secret_answer TEXT NOT NULL
    );
    INSERT INTO admin_settings (id, password, secret_question, secret_answer) 
    VALUES (1, 'aicraft_12@', 'What is the name of your first pet?', 'dog') 
    ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error("Error creating tables: ", err));

// Idempotently add platform and video_url columns to videos table
pool.query(`ALTER TABLE videos ADD COLUMN platform TEXT DEFAULT 'youtube';`).catch(() => {});
pool.query(`ALTER TABLE videos ADD COLUMN video_url TEXT;`).catch(() => {});

// Idempotently add price columns to admin_settings
pool.query(`ALTER TABLE admin_settings ADD COLUMN price_tuition TEXT DEFAULT '500';`).catch(() => {});
pool.query(`ALTER TABLE admin_settings ADD COLUMN price_smallbiz TEXT DEFAULT '500';`).catch(() => {});
pool.query(`ALTER TABLE admin_settings ADD COLUMN price_custom TEXT DEFAULT '500';`).catch(() => {});


// Middleware for basic admin auth
const checkAuth = async (req, res, next) => {
    const pass = req.headers['authorization'];
    try {
        const result = await pool.query('SELECT password FROM admin_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return res.status(500).json({ error: "Admin settings missing." });
        }
        const currentPassword = result.rows[0].password;
        if (pass === currentPassword) {
            next();
        } else {
            res.status(401).json({ error: "Unauthorized. Incorrect password." });
        }
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({ error: "Authentication failed." });
    }
};

// --- API Routes ---

app.get('/api/auth-check', checkAuth, (req, res) => {
    res.status(200).json({ valid: true });
});

app.post('/api/change-password', checkAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    try {
        await pool.query('UPDATE admin_settings SET password = $1 WHERE id = 1', [newPassword]);
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (err) {
        console.error("Error updating password:", err);
        res.status(500).json({ error: "Failed to update password." });
    }
});

app.get('/api/secret-question', async (req, res) => {
    try {
        const result = await pool.query('SELECT secret_question FROM admin_settings WHERE id = 1');
        res.status(200).json({ question: result.rows[0].secret_question });
    } catch (err) {
        console.error("Error fetching question:", err);
        res.status(500).json({ error: "Failed to fetch question." });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { answer, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    try {
        const result = await pool.query('SELECT secret_answer FROM admin_settings WHERE id = 1');
        const correctAnswer = result.rows[0].secret_answer;
        if (answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
            await pool.query('UPDATE admin_settings SET password = $1 WHERE id = 1', [newPassword]);
            res.status(200).json({ message: "Password reset successfully!" });
        } else {
            res.status(401).json({ error: "Incorrect answer to secret question." });
        }
    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).json({ error: "Failed to reset password." });
    }
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
    const { youtube_id, title, platform, video_url } = req.body;
    
    const platformVal = platform || 'youtube';
    const finalIdOrUrl = (platformVal === 'youtube') ? youtube_id : video_url;
    
    if (!finalIdOrUrl) {
        return res.status(400).json({ error: "Video ID or URL is required." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO videos (youtube_id, title, platform, video_url) VALUES ($1, $2, $3, $4) RETURNING id`, 
            [youtube_id || '', title || '', platformVal, video_url || '']
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

app.put('/api/videos/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const { youtube_id, title, platform, video_url } = req.body;
    
    const platformVal = platform || 'youtube';
    const finalIdOrUrl = (platformVal === 'youtube') ? youtube_id : video_url;
    
    if (!finalIdOrUrl) {
        return res.status(400).json({ error: "Video ID or URL is required." });
    }

    try {
        await pool.query(
            `UPDATE videos SET youtube_id = $1, title = $2, platform = $3, video_url = $4 WHERE id = $5`, 
            [youtube_id || '', title || '', platformVal, video_url || '', id]
        );
        res.status(200).json({ message: "Video updated successfully!" });
    } catch (err) {
        console.error("Error updating video: " + err.message);
        res.status(500).json({ error: "Failed to update video." });
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
// Idempotently add price columns to admin_settings
pool.query(`ALTER TABLE admin_settings ADD COLUMN price_tuition TEXT DEFAULT '500';`).catch(() => {});
pool.query(`ALTER TABLE admin_settings ADD COLUMN price_smallbiz TEXT DEFAULT '500';`).catch(() => {});
pool.query(`ALTER TABLE admin_settings ADD COLUMN price_custom TEXT DEFAULT '500';`).catch(() => {});


// Middleware for basic admin auth
const checkAuth = async (req, res, next) => {
    const pass = req.headers['authorization'];
    try {
        const result = await pool.query('SELECT password FROM admin_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return res.status(500).json({ error: "Admin settings missing." });
        }
        const currentPassword = result.rows[0].password;
        if (pass === currentPassword) {
            next();
        } else {
            res.status(401).json({ error: "Unauthorized. Incorrect password." });
        }
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({ error: "Authentication failed." });
    }
};

// --- API Routes ---

app.get('/api/auth-check', checkAuth, (req, res) => {
    res.status(200).json({ valid: true });
});

app.post('/api/change-password', checkAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    try {
        await pool.query('UPDATE admin_settings SET password = $1 WHERE id = 1', [newPassword]);
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (err) {
        console.error("Error updating password:", err);
        res.status(500).json({ error: "Failed to update password." });
    }
});

app.get('/api/secret-question', async (req, res) => {
    try {
        const result = await pool.query('SELECT secret_question FROM admin_settings WHERE id = 1');
        res.status(200).json({ question: result.rows[0].secret_question });
    } catch (err) {
        console.error("Error fetching question:", err);
        res.status(500).json({ error: "Failed to fetch question." });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { answer, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    try {
        const result = await pool.query('SELECT secret_answer FROM admin_settings WHERE id = 1');
        const correctAnswer = result.rows[0].secret_answer;
        if (answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
            await pool.query('UPDATE admin_settings SET password = $1 WHERE id = 1', [newPassword]);
            res.status(200).json({ message: "Password reset successfully!" });
        } else {
            res.status(401).json({ error: "Incorrect answer to secret question." });
        }
    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).json({ error: "Failed to reset password." });
    }
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
    const { youtube_id, title, platform, video_url } = req.body;
    
    const platformVal = platform || 'youtube';
    const finalIdOrUrl = (platformVal === 'youtube') ? youtube_id : video_url;
    
    if (!finalIdOrUrl) {
        return res.status(400).json({ error: "Video ID or URL is required." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO videos (youtube_id, title, platform, video_url) VALUES ($1, $2, $3, $4) RETURNING id`, 
            [youtube_id || '', title || '', platformVal, video_url || '']
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

app.put('/api/videos/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const { youtube_id, title, platform, video_url } = req.body;
    
    const platformVal = platform || 'youtube';
    const finalIdOrUrl = (platformVal === 'youtube') ? youtube_id : video_url;
    
    if (!finalIdOrUrl) {
        return res.status(400).json({ error: "Video ID or URL is required." });
    }

    try {
        await pool.query(
            `UPDATE videos SET youtube_id = $1, title = $2, platform = $3, video_url = $4 WHERE id = $5`, 
            [youtube_id || '', title || '', platformVal, video_url || '', id]
        );
        res.status(200).json({ message: "Video updated successfully!" });
    } catch (err) {
        console.error("Error updating video: " + err.message);
        res.status(500).json({ error: "Failed to update video." });
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
// --- Dynamic Pricing Endpoints ---

// Get prices (publicly accessible)
app.get('/api/settings/prices', async (req, res) => {
    try {
        const result = await pool.query('SELECT price_tuition, price_smallbiz, price_custom FROM admin_settings WHERE id = 1');
        if (result.rows.length === 0) return res.status(404).json({ error: "Settings not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching prices: " + err.message);
        res.status(500).json({ error: "Failed to fetch prices." });
    }
});

// Update prices (admin only)
app.put('/api/settings/prices', checkAuth, async (req, res) => {
    const { price_tuition, price_smallbiz, price_custom } = req.body;
    try {
        await pool.query(
            'UPDATE admin_settings SET price_tuition = $1, price_smallbiz = $2, price_custom = $3 WHERE id = 1',
            [price_tuition || '500', price_smallbiz || '500', price_custom || '500']
        );
        res.json({ message: "Prices updated successfully" });
    } catch (err) {
        console.error("Error updating prices: " + err.message);
        res.status(500).json({ error: "Failed to update prices." });
    }
});

module.exports = app;

// For local testing: run the server if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Local development server is running on http://localhost:${PORT}`);
    });
}
