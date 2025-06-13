// =================================================================
// --- Requires ---
// =================================================================

// Core Node.js Modules
const path = require('path');

// Third-Party Packages
require('dotenv').config(); // Loads environment variables from a .env file
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const ejsLayouts = require('express-ejs-layouts'); // For master layouts

// Custom Modules
const { initializeDatabase } = require('./database.js');
const { isAuth } = require('./middleware/authMiddleware');


// =================================================================
// --- Database Initialization ---
// =================================================================

// This block ensures the database and its tables are created before the app starts.
try {
    initializeDatabase();
    console.log("Database initialization successful.");
} catch (error) {
    console.error("FATAL: Could not initialize database. Exiting.", error);
    process.exit(1); // Exit the application if the database fails to start
}


// =================================================================
// --- App Initialization & Configuration ---
// =================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// --- View Engine and Layouts Setup ---
app.use(ejsLayouts);
app.set('layout', './layouts/main-layout'); // Sets the default layout file
app.set('view engine', 'ejs');              // Sets EJS as the template engine
app.set('views', path.join(__dirname, 'views')); // Specifies the directory for view files


// =================================================================
// --- Middleware ---
// =================================================================

// Serve static files (CSS, images, videos, client-side JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers for decoding request bodies
app.use(express.json()); // Decodes JSON-formatted request bodies
app.use(express.urlencoded({ extended: true })); // Decodes URL-encoded request bodies

// Allows HTML forms to use HTTP verbs like PUT or DELETE via a `_method` query parameter
app.use(methodOverride('_method'));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_super_secret_key_for_development',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // Prevents client-side JS from reading the cookie
        secure: app.get('env') === 'production', // Use secure cookies in production (requires HTTPS)
        maxAge: 1000 * 60 * 60 * 24 // Cookie expiry: 1 day
    }
}));

// Custom Global Middleware: Makes data available to all templates for the duration of a request
app.use((req, res, next) => {
    // res.locals are variables available in every EJS file we render
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || { items: {}, totalQty: 0, totalPrice: 0, discount: 0, finalPrice: 0 };
    res.locals.currentPath = req.path;
    res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    next(); // Pass control to the next middleware or route handler
});


// =================================================================
// --- Routes ---
// =================================================================

// Import route handlers from the 'routes' directory
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Mount the route handlers on their respective paths
app.use('/', shopRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);


// =================================================================
// --- Error Handling ---
// =================================================================

// 404 Not Found Handler
// This middleware runs if no other route has matched the request
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// General Error Handler (optional but good practice)
app.use((err, req, res, next) => {
    console.error("An unexpected error occurred:", err);
    res.status(500).render('500', { title: 'Server Error' });
});


// =================================================================
// --- Server Initialization ---
// =================================================================

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("Application is now using a persistent SQLite database.");
    console.log("Press Ctrl+C to stop the server.");
});