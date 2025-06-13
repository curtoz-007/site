// routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Import the getDb function to interact with the database
const { getDb } = require('../database');

// GET: Login Page
router.get('/login', (req, res) => {
    // If user is already logged in, redirect them
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/login', { title: 'Login', error: null });
});

// POST: Handle Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const db = getDb();
        // Admins log in with the `admins` table.
        // A real app might unify this or have a separate admin login page.
        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(email);

        if (admin) {
            // This is a simplified password check for the admin.
            // For production, admin passwords should also be hashed.
            if (password === admin.password) {
                req.session.user = { id: admin.id, name: admin.username, role: 'admin' };
                return res.redirect('/admin/dashboard');
            }
        }
        
        // Check for regular users in the `users` table
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (user && bcrypt.compareSync(password, user.password_hash)) {
            req.session.user = { id: user.id, name: user.name, role: 'user' };
            return res.redirect(req.query.redirect || '/');
        }

        // If neither admin nor user login is successful
        res.render('auth/login', { title: 'Login', error: 'Invalid email or password.' });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("An error occurred during login.");
    }
});

// GET: Register Page
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/register', { title: 'Register', error: null });
});

// POST: Handle Registration
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.render('auth/register', { title: 'Register', error: 'All fields are required.' });
    }

    try {
        const db = getDb();
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.render('auth/register', { title: 'Register', error: 'A user with this email already exists.' });
        }

        // Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const sql = 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)';
        const info = db.prepare(sql).run(name, email, password_hash);
        
        // Log the new user in immediately
        req.session.user = { id: info.lastInsertRowid, name: name, role: 'user' };
        res.redirect('/');

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).send("An error occurred during registration.");
    }
});

// GET: Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout Error:", err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid'); // Default session cookie name
        res.redirect('/');
    });
});

module.exports = router;