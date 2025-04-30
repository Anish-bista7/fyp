const express = require('express');
const { createOrder, getMyOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // Middleware to protect routes

const router = express.Router();

// POST /api/orders - Create a new order
// Protect middleware ensures only logged-in users can create orders
router.route('/').post(protect, createOrder);

// GET /api/orders/myorders - Get logged in user's orders
router.route('/myorders').get(protect, getMyOrders);

// TODO: Add other routes as needed (e.g., GET /api/orders/:id)

module.exports = router; 