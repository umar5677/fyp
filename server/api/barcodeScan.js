const express = require('express');
const axios = require('axios');

// The public API endpoint for looking up products by barcode
const OPEN_FOOD_FACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product';

function createBarcodeRouter(dbPool) {
    const router = express.Router();

    // Middleware to check for premium status (copied from your ai.js)
    router.use(async (req, res, next) => {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const userId = req.user.userId;
        
        try {
            const [users] = await dbPool.query('SELECT setPremium FROM users WHERE userID = ?', [userId]);
            if (users.length === 0 || !users[0].setPremium) {
                return res.status(403).json({ 
                    success: false, 
                    code: 'UPGRADE_REQUIRED',
                    message: 'This barcode scanning feature requires a Premium subscription.' 
                });
            }
            next();
        } catch (error) {
            console.error('Barcode scanner premium check error:', error);
            res.status(500).json({ success: false, message: 'Error verifying user status.' });
        }
    });

    // Endpoint to get product info from a barcode
    router.post('/lookupBarcode', async (req, res) => {
        const { barcode } = req.body;
        if (!barcode) {
            return res.status(400).json({ success: false, message: 'Barcode is required.' });
        }

        try {
            // Construct the request URL for the Open Food Facts API
            const apiUrl = `${OPEN_FOOD_FACTS_API_URL}/${barcode}.json`;
            const response = await axios.get(apiUrl);

            // Check if the product was found
            if (response.data.status !== 1 || !response.data.product) {
                return res.status(404).json({ success: false, message: 'Product not found.' });
            }

            const product = response.data.product;
            const nutriments = product.nutriments || {}; // Use empty object as default to prevent errors

            // Extract the required information
            const productInfo = {
                productName: product.product_name || 'N/A',
                // Calories are often stored per 100g
                calories: nutriments['energy-kcal_100g'] || 0,
                // Sugar content is also per 100g
                sugar: nutriments.sugars_100g || 0,
                servingSize: product.serving_size || 'N/A'
            };

            res.json({ success: true, product: productInfo });

        } catch (err) {
            // Handle cases where the API call itself fails (e.g., network error)
            // or if the barcode is invalid, which might result in a 404 from the API
            if (err.response && err.response.status === 404) {
                 return res.status(404).json({ success: false, message: 'Product not found.' });
            }
            console.error('Open Food Facts API error:', err.message);
            res.status(500).json({ success: false, message: 'Could not retrieve product information from the external API.' });
        }
    });
    
    return router;
}

module.exports = createBarcodeRouter;