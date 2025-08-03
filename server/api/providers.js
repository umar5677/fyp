const express = require('express');
const router = express.Router();

module.exports = function createProvidersRouter(dbPool) {
  router.get('/', async (req, res) => {
    try {
      const query = `
        SELECT 
          u.userID, 
          u.first_name, 
          u.last_name, 
          u.email,
          CASE
            WHEN v.provType LIKE '%Doctor%' THEN 'Doctor'
            WHEN v.provType LIKE '%Nutritionist%' OR v.provType LIKE '%Dietitian%' THEN 'Nutritionist/Dietitian'
            WHEN v.provType LIKE '%Exercise%' OR v.provType LIKE '%Physiologist%' THEN 'Exercise Physiologist'
            ELSE v.provType
          END AS provType
        FROM users u
        JOIN verifyHP v ON u.userID = v.userID
        WHERE u.setProvider = 1 AND v.isVerified = 1;
      `;

      const [providers] = await dbPool.query(query);

      if (providers.length === 0) {
        return res.json({});
      }

      const providersByCategory = providers.reduce((acc, provider) => {
        const category = provider.provType;
        const providerInfo = {
          userID: provider.userID,
          name: `${provider.first_name} ${provider.last_name}`,
          email: provider.email,
        };
        
        if (!acc[category]) {
          acc[category] = [];
        }
        
        acc[category].push(providerInfo);
        return acc;
      }, {});

      res.status(200).json(providersByCategory);

    } catch (err) {
      console.error('Error fetching healthcare providers:', err);
      res.status(500).json({ message: 'Failed to get healthcare providers.' });
    }
  });

  return router;
};