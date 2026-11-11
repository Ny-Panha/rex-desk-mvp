/**
 * Validates an email address format.
 * @param {string} email - The email string to validate.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

module.exports = { validateEmail };
