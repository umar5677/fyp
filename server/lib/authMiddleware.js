// authMiddleware.js
const jwt = require('jsonwebtoken');
function authenticateToken(req, res, next) {
    // Get the Authorization header from the incoming request.
    const authHeader = req.headers['authorization'];

    // If the header exists, split it by the space and get the second element.
    const token = authHeader && authHeader.split(' ')[1];

    // If there is no token, the request is unauthorized.
    if (token == null) {
        return res.sendStatus(401); 
    }

    // Verify the token's signature and expiration date.
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Send 403 Forbidden status and stop processing the request.
            return res.sendStatus(403);
        }

        // If the token is valid, the `user` object contains the payload we signed
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;