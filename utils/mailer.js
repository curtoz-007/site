// utils/mailer.js

const nodemailer = require('nodemailer');

// Create a reusable transporter object using your email service credentials
const transporter = nodemailer.createTransport({
    service: 'gmail', // Using Gmail as an example
    auth: {
        user: process.env.EMAIL_USER, // Your full Gmail address from .env
        pass: process.env.EMAIL_PASS   // The 16-character App Password from .env
    }
});

/**
 * Sends an email notification for a new contact form submission.
 * @param {string} name - The name of the person who submitted the form.
 * @param {string} email - The email address of the person.
 * @param {string} message - The message content.
 */
async function sendContactFormEmail(name, email, message) {
    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: process.env.SUPPORT_EMAIL,
        subject: `New Contact Form Message from ${name}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h2>New Message from Your Website Contact Form</h2>
                <hr>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Message:</strong></p>
                <p style="padding: 10px; border-left: 3px solid #ccc; background-color: #f8f8f8;">
                    ${message.replace(/\n/g, '<br>')}
                </p>
                <hr>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Contact form email sent successfully!');
    } catch (error) {
        console.error('Error sending contact form email:', error);
        throw error; // Re-throw the error to be handled by the route
    }
}

/**
 * Sends an email notification for a new resource request.
 * @param {string} requesterName
 * @param {string} requesterEmail
 * @param {string} resourceName
 * @param {string} resourceLink
 * @param {string} details
 */
async function sendResourceRequestEmail(requesterName, requesterEmail, resourceName, resourceLink, details) {
    const mailOptions = {
        from: `"Resource Request" <${process.env.EMAIL_USER}>`,
        to: process.env.SUPPORT_EMAIL,
        subject: `New Resource Request: ${resourceName}`,
        replyTo: requesterEmail,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #0d6efd;">New Resource Request Received</h2>
                <hr>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background-color: #f8f9fa;"><td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Requested By:</strong></td><td style="padding: 10px; border: 1px solid #dee2e6;">${requesterName} (<a href="mailto:${requesterEmail}">${requesterEmail}</a>)</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Resource Name:</strong></td><td style="padding: 10px; border: 1px solid #dee2e6;">${resourceName}</td></tr>
                    <tr style="background-color: #f8f9fa;"><td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Example Link:</strong></td><td style="padding: 10px; border: 1px solid #dee2e6;">${resourceLink ? `<a href="${resourceLink}">${resourceLink}</a>` : 'Not provided'}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Additional Details:</strong></td><td style="padding: 10px; border: 1px solid #dee2e6;">${details || 'No details provided.'}</td></tr>
                </table>
                <hr>
            </div>
        `
    };

    async function sendUserReportEmail(reporter, reportedUser, reason) {
    const mailOptions = {
        from: `"Site Report" <${process.env.EMAIL_USER}>`,
        to: process.env.SUPPORT_EMAIL,
        subject: `New User Report Submitted: ${reportedUser.name}`,
        html: `
            <h2>New User Report</h2><hr>
            <p><strong>Reporter:</strong> ${reporter.name} (ID: ${reporter.id})</p>
            <p><strong>Reported User:</strong> ${reportedUser.name} (ID: ${reportedUser.id})</p>
            <p><strong>Reason for Report:</strong></p>
            <p style="padding: 10px; background-color: #f8f8f8;">${reason}</p>
        `
    };
    await transporter.sendMail(mailOptions);
    console.log('User report email sent.');
}

/**
 * Sends an email notification for a new product report.
 */
async function sendProductReportEmail(reporter, product, reason) {
    const mailOptions = {
        from: `"Site Report" <${process.env.EMAIL_USER}>`,
        to: process.env.SUPPORT_EMAIL,
        subject: `New Product Report Submitted: ${product.name}`,
        html: `
            <h2>New Product Report</h2><hr>
            <p><strong>Reporter:</strong> ${reporter.name} (ID: ${reporter.id})</p>
            <p><strong>Reported Product:</strong> ${product.name} (ID: ${product.id})</p>
            <p><strong>Product Page:</strong> <a href="YOUR_WEBSITE_URL/product/${product.id}">View Product</a></p>
            <p><strong>Reason for Report:</strong></p>
            <p style="padding: 10px; background-color: #f8f8f8;">${reason}</p>
        `
    };
    await transporter.sendMail(mailOptions);
    console.log('Product report email sent.');
}

module.exports = { 
    sendContactFormEmail, 
    sendResourceRequestEmail,
    sendUserReportEmail,      // <-- Add this
    sendProductReportEmail    // <-- And this
};



    try {
        await transporter.sendMail(mailOptions);
        console.log('Resource request email sent successfully!');
    } catch (error) {
        console.error('Error sending resource request email:', error);
        throw error;
    }
}

// Export both functions so they can be used in other files
module.exports = { sendContactFormEmail, sendResourceRequestEmail };