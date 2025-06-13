// routes/shop.js

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Import custom modules
const { getDb } = require('../database');
const { isAuth } = require('../middleware/authMiddleware');
const { calculateJazzCashHash } = require('../utils/hashHelper');
const { sendContactFormEmail, sendResourceRequestEmail, sendUserReportEmail, sendProductReportEmail } = require('../utils/mailer');


// =================================================================
// --- MULTER CONFIGURATION ---
// =================================================================
const userUploadsStorage = multer.diskStorage({
    destination: './public/user_uploads/',
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, (req.session.user.id || 'user') + '-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const userUpload = multer({ storage: userUploadsStorage });
const uploadFields = userUpload.fields([
    { name: 'resourceImage', maxCount: 1 },
    { name: 'resourceFile', maxCount: 1 }
]);


// =================================================================
// --- PRIMARY SHOP & INFO ROUTES ---
// =================================================================

// GET: Homepage
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const products = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
        res.render('shop/index', { title: 'Modern E-Shop', products });
    } catch (error) {
        console.error("Homepage Error:", error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// GET: All Products Page (with search & sort)
router.get('/products', (req, res) => {
    try {
        const db = getDb();
        const { search = '', sort = 'newest' } = req.query;
        let sql = 'SELECT * FROM products';
        const params = [];

        if (search) {
            sql += ' WHERE name LIKE ?';
            params.push(`%${search}%`);
        }

        switch (sort) {
            case 'price_asc': sql += ' ORDER BY price ASC'; break;
            case 'price_desc': sql += ' ORDER BY price DESC'; break;
            case 'name_asc': sql += ' ORDER BY name ASC'; break;
            default: sql += ' ORDER BY createdAt DESC';
        }
        const products = db.prepare(sql).all(params);
        res.render('shop/all-products', { title: 'All Products', products, searchQuery: search, sortBy: sort });
    } catch (error) {
        console.error("All Products Page Error:", error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// GET: Product Detail Page (with Reviews & Purchase Check)
router.get('/product/:id', (req, res) => {
    try {
        const db = getDb();
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) {
            return res.status(404).render('404', { title: 'Product Not Found' });
        }

        const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC').all(req.params.id);
        const ratingData = db.prepare('SELECT AVG(rating) as avg, COUNT(rating) as count FROM reviews WHERE product_id = ?').get(req.params.id);
        
        let hasPurchased = false;
        if (req.session.user && req.session.user.role === 'user') {
            const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.user.id);
            if (user) {
                const userOrders = db.prepare("SELECT products_ordered FROM orders WHERE customer_email = ? AND (status = 'Delivered' OR status = 'Completed')").all(user.email);
                hasPurchased = userOrders.some(order => JSON.parse(order.products_ordered).some(p => p.id == product.id));
            }
        }
        
        res.render('shop/product-detail', {
            title: product.name, product, reviews,
            avgRating: ratingData.avg, ratingCount: ratingData.count, hasPurchased
        });
    } catch (error) {
        console.error("Product Detail Error:", error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});


// --- Static Info Pages ---
router.get('/faq', (req, res) => res.render('shop/faq', { title: 'Frequently Asked Questions' }));
router.get('/privacy-policy', (req, res) => res.render('shop/privacy-policy', { title: 'Privacy Policy' }));
router.get('/terms-of-service', (req, res) => res.render('shop/terms-of-service', { title: 'Terms of Service' }));
router.get('/shipping-and-returns', (req, res) => res.render('shop/shipping-and-returns', { title: 'Shipping & Returns' }));


// =================================================================
// --- INTERACTIVE FORM ROUTES (CONTACT, REQUEST, UPLOADS) ---
// =================================================================

// GET & POST: Contact Us
router.get('/contact', (req, res) => res.render('shop/contact', { title: 'Contact Us', success: req.query.success }));
router.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await sendContactFormEmail(name, email, message);
        res.redirect('/contact?success=true');
    } catch (error) {
        console.error("Contact form processing error:", error);
        res.redirect('/contact?success=false');
    }
});

// GET & POST: Request a Resource
router.get('/request', (req, res) => res.render('shop/request', { title: 'Request a Resource', success: req.query.success }));
router.post('/request', async (req, res) => {
    const { requesterName, requesterEmail, resourceName, resourceLink, details } = req.body;
    try {
        await sendResourceRequestEmail(requesterName, requesterEmail, resourceName, resourceLink, details);
        res.redirect('/request?success=true');
    } catch (error) {
        console.error("Resource request processing error:", error);
        res.redirect('/request?success=false');
    }
});

// GET: User's Uploads Page
router.get('/my-uploads', isAuth, (req, res) => {
    try {
        const db = getDb();
        const uploads = db.prepare('SELECT * FROM user_uploads WHERE user_id = ? ORDER BY uploaded_at DESC').all(req.session.user.id);
        res.render('shop/my-uploads', { title: 'My Uploads', uploads, success: req.query.success });
    } catch (error) {
        console.error("My Uploads page error:", error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// POST: Handle New Resource Upload
router.post('/upload-resource', isAuth, uploadFields, (req, res) => {
    // --- START OF CORRECTED CODE BLOCK ---
    const { resourceName, description } = req.body;
    const { id: userId } = req.session.user;

    // FIX: Get the uploader's name safely, checking for 'name' (for users) or 'username' (for admins)
    const uploaderName = req.session.user.name || req.session.user.username;
    
    const imageFile = req.files?.resourceImage?.[0];
    const resourceFile = req.files?.resourceFile?.[0];

    if (!resourceName || !imageFile || !resourceFile || !uploaderName) {
        return res.status(400).redirect('/my-uploads?success=false&error=MissingFields');
    }

    const imagePath = `/user_uploads/${imageFile.filename}`; 
    const filePath = `/user_uploads/${resourceFile.filename}`;

    try {
        const db = getDb();
        const stmt = db.prepare(`
            INSERT INTO user_uploads (user_id, username, resource_name, description, file_path, image_path) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        // FIX: Use the 'uploaderName' variable which is guaranteed to have a value.
        stmt.run(userId, uploaderName, resourceName, description, filePath, imagePath);

        console.log(`User ${uploaderName} (ID: ${userId}) uploaded resource: ${resourceName}`);
        res.redirect('/my-uploads?success=true');
    } catch (err) {
        // When you see a 500 error, ALWAYS check the console for this message.
        console.error("Database error while saving user upload:", err);
        res.status(500).render('500', { title: 'Server Error', message: 'Could not save your upload to the database.' });
    }
    // --- END OF CORRECTED CODE BLOCK ---
});

// GET: User's Orders and Downloads Page
router.get('/my-orders', isAuth, (req, res) => {
    try {
        const db = getDb();
        const userId = req.session.user.id;
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }

        const orders = db.prepare("SELECT products_ordered FROM orders WHERE customer_email = ? AND (status = 'Delivered' OR status = 'Completed')").all(user.email);
        if (orders.length === 0) {
            return res.render('shop/my-orders', { title: 'My Orders', purchasedProducts: [] });
        }
        
        const productIds = orders
            .flatMap(order => JSON.parse(order.products_ordered))
            .map(product => product.id);
        const uniqueProductIds = [...new Set(productIds)];

        if (uniqueProductIds.length === 0) {
             return res.render('shop/my-orders', { title: 'My Orders', purchasedProducts: [] });
        }

        const placeholders = uniqueProductIds.map(() => '?').join(',');
        const sql = `SELECT * FROM products WHERE id IN (${placeholders}) ORDER BY name ASC`;
        const purchasedProducts = db.prepare(sql).all(uniqueProductIds);

        res.render('shop/my-orders', {
            title: 'My Orders',
            purchasedProducts: purchasedProducts
        });
    } catch (error) {
        console.error("Error fetching user orders/downloads:", error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});


// =================================================================
// --- CART, REVIEW, & REPORT ROUTES ---
// =================================================================

router.get('/cart', (req, res) => res.render('shop/cart', { title: 'Your Cart' }));
router.post('/cart/add/:id', (req, res) => { /* ... */ });
router.post('/cart/apply-coupon', (req, res) => { /* ... */ });
router.post('/product/:id/review', isAuth, (req, res) => { /* ... */ });
router.post('/report/product/:id', isAuth, async (req, res) => { /* ... */ });
router.post('/report/user/:id', isAuth, async (req, res) => { /* ... */ });


// =================================================================
// --- PAYMENT GATEWAY ROUTES ---
// =================================================================
router.post('/create-checkout-session', isAuth, async (req, res) => { /* ... */ });
router.get('/order/success', isAuth, async (req, res) => { /* ... */ });
router.post('/payment/initiate/jazzcash', isAuth, (req, res) => { /* ... */ });
router.post('/payment/jazzcash/status', (req, res) => { /* ... */ });
router.post('/payment/initiate/easypaisa', isAuth, (req, res) => { /* ... */ });
router.post('/payment/easypaisa/status', (req, res) => { /* ... */ });


// --- FINAL EXPORT ---
module.exports = router;