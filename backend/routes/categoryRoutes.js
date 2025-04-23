const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCategories,
  createCategory,
  deleteCategory
} = require('../controllers/categoryController');

// Middleware to check if user is a vendor
const isVendor = (req, res, next) => {
  if (!req.user.isVendor) {
    return res.status(403).json({ 
      success: false, 
      error: 'Not authorized to access this route. Vendor access required.' 
    });
  }
  next();
};

// Apply middleware to all routes
router.all('*', protect, isVendor);

// Mount routes under /api/vendors/:vendorId/categories
router.route('/:vendorId/categories')
  .get(getCategories)
  .post(createCategory);

router.route('/:vendorId/categories/:categoryId')
  .delete(deleteCategory);

module.exports = router; 