// utils/hashHelper.js

const crypto = require('crypto');

/**
 * Calculates the Secure Hash for JazzCash transactions.
 * The order of fields is critical for the hash to be correct.
 * @param {object} fields - The object containing all fields to be hashed.
 * @param {string} salt - The JazzCash Integrity Salt provided in your merchant portal.
 * @returns {string} The calculated SHA256 hash.
 */
function calculateJazzCashHash(fields, salt) {
    // 1. Get all keys from the fields object that are NOT empty and NOT the hash itself.
    const sortedKeys = Object.keys(fields)
        .filter(key => key !== 'pp_SecureHash' && fields[key] !== '')
        .sort();

    // 2. Create the string to be hashed by concatenating the salt and then the field values.
    // The format is: salt&field1&field2&field3...
    let stringToHash = salt;
    sortedKeys.forEach(key => {
        stringToHash += `&${fields[key]}`;
    });

    // 3. Create the SHA256 hash using the Integrity Salt as the key.
    const hash = crypto.createHmac('sha256', salt)
        .update(stringToHash)
        .digest('hex');
    
    return hash;
}

module.exports = { calculateJazzCashHash };