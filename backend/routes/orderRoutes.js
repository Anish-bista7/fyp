const express = require('express');
const { createOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // Middleware to protect routes

const router = express.Router();

// POST /api/orders - Create a new order
// Protect middleware ensures only logged-in users can create orders
router.route('/').post(protect, createOrder);

// TODO: Add other routes as needed (e.g., GET /api/orders/myorders, GET /api/orders/:id)

module.exports = router; 