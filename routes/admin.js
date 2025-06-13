// routes/admin.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { isAdmin } = require('../middleware/authMiddleware');
const { getDb } = require('../database');

// --- Multer Configuration ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Protect all routes in this file
router.use(isAdmin);

// --- Main Admin Routes ---

router.get('/dashboard', (req, res) => {
    try {
        const db = getDb();
        const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalRevenueResult = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE status = 'Delivered'").get();
        const totalRevenue = totalRevenueResult.total || 0;
        
        // Dummy data for chart, as real data would require more complex queries
        const salesData = { labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'], data: [1500, 2300, 1800, 2100, 2900, 3500] };

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            productCount,
            userCount,
            orderCount,
            totalRevenue,
            salesData
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Error loading dashboard data.");
    }
});

router.get('/orders', (req, res) => {
    try {
        const db = getDb();
        const orders = db.prepare('SELECT * FROM orders ORDER BY ordered_at DESC').all();
        res.render('admin/manage-orders', { title: 'Manage Orders', orders });
    } catch (error) {
        console.error("Orders Fetch Error:", error);
        res.status(500).send("Error loading orders.");
    }
});

router.get('/users', (req, res) => {
    try {
        const db = getDb();
        const users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC').all();
        res.render('admin/manage-users', { title: 'Manage Users', users });
    } catch (error) {
        console.error("Users Fetch Error:", error);
        res.status(500).send("Error loading user data.");
    }
});


// --- Product Management Routes ---

router.get('/products', (req, res) => {
    try {
        const db = getDb();
        const products = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
        res.render('admin/manage-products', { title: 'Manage Products', products });
    } catch (error) {
        console.error("Products Fetch Error:", error);
        res.status(500).send("Error fetching products");
    }
});

router.post('/products/add', upload.single('productImage'), (req, res) => {
    const { name, description, price, isDigital, digitalFilePath } = req.body;
    if (!name || !description || !price || !req.file) {
        return res.status(400).send("Missing required product information.");
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const isDigitalBool = isDigital === 'on' ? 1 : 0;
    try {
        const db = getDb();
        const sql = `INSERT INTO products (name, description, price, imageUrl, isDigital, digitalFilePath) VALUES (?, ?, ?, ?, ?, ?)`;
        db.prepare(sql).run(name, description, parseFloat(price), imageUrl, isDigitalBool, digitalFilePath || null);
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Add Product Error:", error);
        res.status(500).send("Error adding product");
    }
});

router.delete('/products/delete/:id', (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Delete Product Error:", error);
        res.status(500).send("Error deleting product");
    }
});


// --- Coupon Management Routes ---

router.get('/coupons', (req, res) => {
    try {
        const db = getDb();
        const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
        res.render('admin/manage-coupons', { title: 'Manage Coupons', coupons });
    } catch (error)
    {
        console.error("Coupons Fetch Error:", error);
        res.status(500).send("Error loading coupons.");
    }
});

router.post('/coupons/add', (req, res) => {
    const { code, discount_type, discount_value, expiry_date } = req.body;
    if (!code || !discount_type || !discount_value || !expiry_date) {
        return res.status(400).send("Missing coupon information.");
    }
    try {
        const db = getDb();
        const sql = `INSERT INTO coupons (code, discount_type, discount_value, expiry_date) VALUES (?, ?, ?, ?)`;
        db.prepare(sql).run(code.toUpperCase(), discount_type, parseFloat(discount_value), expiry_date);
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error("Add Coupon Error:", error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).send("Error: A coupon with that code already exists.");
        }
        res.status(500).send("Error adding coupon");
    }
});

// GET: Display the change credentials form
router.get('/change-credentials', (req, res) => {
    res.render('admin/change-credentials', {
        title: 'Change Credentials',
        error: null,
        success: null
    });
});

// POST: Process the change credentials form
router.post('/change-credentials', (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const adminId = req.session.user.id; // Get the current admin's ID from the session

    try {
        const db = getDb();
        const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);

        // 1. Verify the current password is correct
        if (admin.password !== currentPassword) {
            return res.render('admin/change-credentials', {
                title: 'Change Credentials',
                error: 'Incorrect current password.',
                success: null
            });
        }
        
        // 2. Determine the new password. If a new one is provided, use it. Otherwise, keep the old one.
        const finalPassword = newPassword ? newPassword : admin.password;
        
        // 3. Update the database
        const sql = `UPDATE admins SET username = ?, password = ? WHERE id = ?`;
        db.prepare(sql).run(newUsername, finalPassword, adminId);
        
        // 4. Update the session with the new username
        req.session.user.name = newUsername;

        // 5. Render the page again with a success message
        res.render('admin/change-credentials', {
            title: 'Change Credentials',
            error: null,
            success: 'Credentials updated successfully!'
        });
        
    } catch (error) {
        console.error("Error changing credentials:", error);
        res.render('admin/change-credentials', {
            title: 'Change Credentials',
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
});

router.get('/user-uploads', (req, res) => {
    try {
        const db = getDb();
        const uploads = db.prepare('SELECT * FROM user_uploads ORDER BY uploaded_at DESC').all();
        res.render('admin/manage-uploads', { title: 'User Uploads', uploads });
    } catch (error) {
        console.error("User Uploads Fetch Error:", error);
        res.status(500).send("Error loading user uploads.");
    }
});

// Add a route to update the status
router.post('/user-uploads/update-status/:id', (req, res) => {
    const { status } = req.body;
    try {
        const db = getDb();
        db.prepare('UPDATE user_uploads SET status = ? WHERE id = ?').run(status, req.params.id);
        res.redirect('/admin/user-uploads');
    } catch (error) {
        console.error("Update Upload Status Error:", error);
        res.status(500).send("Error updating status.");
    }
});

// POST route to take an approved upload and create a product from it
router.post('/uploads/add-to-shop/:id', (req, res) => {
    const uploadId = req.params.id;
    try {
        const db = getDb();
        const upload = db.prepare('SELECT * FROM user_uploads WHERE id = ?').get(uploadId);

        if (!upload || upload.status !== 'Approved') {
            return res.status(400).send("This resource is not approved or does not exist.");
        }

        // Check if a product with a similar name already exists to avoid duplicates
        const existingProduct = db.prepare('SELECT * FROM products WHERE name = ?').get(upload.resource_name);
        if (existingProduct) {
            // Optional: Redirect back with an error message
            return res.redirect('/admin/user-uploads');
        }

        // Create a new product using the details from the upload
        const sql = `
            INSERT INTO products (name, description, price, imageUrl, isDigital, digitalFilePath)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        // For this example, we set a default price of 0.00. You could have a form for this.
        const price = 0.00; 
        const isDigital = 1; // All user uploads are digital
        // We use a generic placeholder image for the shop listing.
        const placeholderImage = '/images/user-resource-placeholder.jpg'; 

        db.prepare(sql).run(
            upload.resource_name,
            upload.description || 'A resource uploaded by a user.',
            price,
            placeholderImage,
            isDigital,
            upload.file_path
        );

        // Optional: You could update the upload status to 'Listed' or similar
        // db.prepare('UPDATE user_uploads SET status = ? WHERE id = ?').run('Listed', uploadId);

        res.redirect('/admin/products');

    } catch (error) {
        console.error("Add to Shop Error:", error);
        res.status(500).send("Error adding resource to shop.");
    }
});

module.exports = router;