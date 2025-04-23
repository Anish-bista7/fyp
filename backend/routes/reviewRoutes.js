// backend/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const {
  getVendorReviews,
  createVendorReview,
} = require('../controllers/reviewController.js');
const { protect } = require('../middleware/authMiddleware.js');

// Matches GET /api/reviews/:vendorId
router.route('/:vendorId').get(getVendorReviews);

// Matches POST /api/reviews/:vendorId
router.route('/:vendorId').post(protect, createVendorReview);

module.exports = router; 