const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createMenuItem,
  getMenuItems,
  updateMenuItem,
  deleteMenuItem
} = require('../controllers/menuController');

// Middleware to check if user is a vendor (for specific actions)
const isVendor = (req, res, next) => {
  if (!req.user || req.user.role !== 'vendor') {
    return res.status(403).json({ 
      success: false, 
      error: 'Not authorized to access this route. Vendor access required.' 
    });
  }
  // Check if the vendor ID in the param matches the logged-in user
  if (req.user._id.toString() !== req.params.vendorId) {
     return res.status(403).json({ 
      success: false, 
      error: 'You are not authorized to modify this menu.' 
    });
  }
  next();
};

// --- Public Route --- 
// Get menu items for a specific vendor (accessible to anyone)
router.get('/:vendorId/menu', getMenuItems);

// --- Protected Vendor Routes --- 
// Routes below require authentication and vendor status

// Create a new menu item
router.post('/:vendorId/menu', protect, isVendor, createMenuItem);

// Update a specific menu item
router.put('/:vendorId/menu/:itemId', protect, isVendor, updateMenuItem);

// Delete a specific menu item
router.delete('/:vendorId/menu/:itemId', protect, isVendor, deleteMenuItem);

module.exports = router; 