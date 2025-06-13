// database.js
const Database = require('better-sqlite3');
// This variable will hold the single, shared database connection for the entire application.
let db;

/**
 * Initializes the database connection and creates all necessary tables if they don't exist.
 * This function should be called once when the application starts.
 */
function initializeDatabase() {
    // Creates or opens the database file named 'data.db' in the project's root folder.
    // The 'verbose' option can be uncommented during debugging to see every SQL statement executed.
    db = new Database('data.db', { /* verbose: console.log */ });
    console.log('Database connected successfully.');

    // --- Create All Application Tables using 'CREATE TABLE IF NOT EXISTS' ---
    // FIX: All SQL commands must be wrapped in strings. Using backticks (`) is best for multi-line commands.

    // Admins table: For users who can log into the /admin panel.
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    // Users table: For customers who register on the public-facing site.
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL, -- Storing hashed passwords for security
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Products table: For all items available for sale in the shop.
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            imageUrl TEXT NOT NULL,
            isDigital BOOLEAN NOT NULL DEFAULT 0, -- 0 (false) for physical, 1 (true) for digital
            digitalFilePath TEXT,                 -- Path for downloadable files
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Orders table: Tracks customer purchases.
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stripe_session_id TEXT UNIQUE, -- Can be null for other payment methods
            customer_email TEXT NOT NULL,
            products_ordered TEXT NOT NULL, -- Storing as a JSON string for simplicity
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending', -- e.g., 'Pending', 'Shipped', 'Delivered'
            ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Coupons table: For promotional discounts.
    db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
            discount_value REAL NOT NULL,
            expiry_date TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1 -- 1 for true, 0 for false
        )
    `);

    // Reviews table: For customer feedback on products.
    db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // User Uploads table: For resources submitted by users.
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            resource_name TEXT NOT NULL,
            description TEXT,
            file_path TEXT NOT NULL,
            image_path TEXT, -- The path for the preview image
            status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    console.log('All database tables verified/created successfully.');

    // --- Seed Default Admin User ---
    try {
        const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
        if (adminCount === 0) {
            const username = 'admin@example.com';
            // IMPORTANT: Never store plain text passwords in production. Use a library like bcrypt.
            const password = 'admin123'; 
            db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)')
              .run(username, password);
           
            console.log('--- Default admin user created! ---');
            console.log(`Username: ${username}`);
            console.log(`Password: ${password}`);
            console.log('------------------------------------');
        }
    } catch (error) {
        console.error("Error seeding admin user:", error);
    }
}

/**
 * Singleton pattern to get the database connection.
 * This ensures the entire application shares a single database connection.
 * @returns The database instance.
 */
function getDb() {
    if (!db) {
        throw new Error("Database has not been initialized! Call initializeDatabase() at the start of your application.");
    }
    return db;
}

// Export the necessary functions to be used elsewhere in the application.
module.exports = { initializeDatabase, getDb };