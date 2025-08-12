const express = require('express');
const axios = require('axios');

// API endpoint for Open Food Facts
const OPEN_FOOD_FACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product';

// Nutritionix API credentials and endpoint
const NUTRITIONIX_API_URL = 'https://trackapi.nutritionix.com/v2/search/item';
const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

function createBarcodeRouter(dbPool) {
    const router = express.Router();

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

    router.post('/lookupBarcode', async (req, res) => {
        const { barcode } = req.body;
        if (!barcode) {
            return res.status(400).json({ success: false, message: 'Barcode is required.' });
        }

        try {
            const apiUrl = `${OPEN_FOOD_FACTS_API_URL}/${barcode}.json`;
            const response = await axios.get(apiUrl);

            if (response.data.status === 1 && response.data.product) {
                const product = response.data.product;
                const nutriments = product.nutriments || {};

                const productInfo = {
                    productName: product.product_name || 'N/A',
                    calories: nutriments['energy-kcal_100g'] || 0,
                    sugar: nutriments.sugars_100g || 0,
                    servingSize: product.serving_size || 'N/A'
                };
                
                console.log(`Barcode ${barcode} found in Open Food Facts.`);
                return res.json({ success: true, product: productInfo });
            }
        } catch (err) {
            console.log(`Barcode ${barcode} not found in Open Food Facts. Trying Nutritionix...`);
        }

        try {
            if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_APP_KEY) {
                throw new Error("Nutritionix API credentials are not configured on the server.");
            }

            const response = await axios.get(NUTRITIONIX_API_URL, {
                headers: {
                    'x-app-id': NUTRITIONIX_APP_ID,
                    'x-app-key': NUTRITIONIX_APP_KEY,
                },
                params: {
                    upc: barcode,
                },
            });

            if (response.data.foods && response.data.foods.length > 0) {
                const food = response.data.foods[0];
                
                const productInfo = {
                    productName: food.food_name || 'N/A',
                    calories: food.nf_calories || 0,
                    sugar: food.nf_sugars || 0,
                    servingSize: `${food.serving_qty || 1} ${food.serving_unit || 'serving'}`
                };

                console.log(`Barcode ${barcode} found in Nutritionix.`);
                return res.json({ success: true, product: productInfo });
            } else {
                return res.status(404).json({ success: false, message: 'Product not found in any database.' });
            }
        } catch (err) {
            console.error('Nutritionix API error:', err.message);
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
    });
    
    return router;
}

module.exports = createBarcodeRouter;