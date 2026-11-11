/**
 * Formats a number into a currency string.
 * @param {number|string} amount - The amount to format.
 * @param {string} [currency='USD'] - The currency code or symbol.
 * @returns {string} - The formatted currency string.
 */
function formatCurrency(amount, currency = 'USD') {
    const num = Number(amount);
    if (isNaN(num)) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(num);
}

module.exports = { formatCurrency };
