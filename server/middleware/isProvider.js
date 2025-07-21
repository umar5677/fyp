// This middleware checks if the authenticated user is a provider.
// It should run AFTER authenticateToken.
const isProvider = (req, res, next) => {
    // req.user is attached by the authenticateToken middleware
    if (req.user && req.user.isProvider) {
        // User is a provider, allow them to proceed
        next();
    } else {
        // User is not a provider, send a "Forbidden" status
        res.status(403).json({ message: 'Forbidden: Access restricted to healthcare providers.' });
    }
};

// You only need to export it once
module.exports = isProvider;