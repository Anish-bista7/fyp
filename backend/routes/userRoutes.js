const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getUserProfile, upload, getAllVendors } = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   POST /api/users/register
// @desc    Register a new user or vendor
// @access  Public
router.post('/register', upload.single('photo'), registerUser);

// @route   POST /api/users/login
// @desc    Authenticate user/vendor & get token
// @access  Public
router.post('/login', loginUser);

// Protected routes
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);

// @route   GET /api/users/vendors
// @desc    Get all vendors
// @access  Public
router.route('/vendors').get(getAllVendors);

// @route   GET /api/users/vendors/:id
// @desc    Get a single vendor by ID (Keep Public for now? Or protect?)
// @access  Public 
// This route can remain public if needed for displaying vendor details to users
router.get('/vendors/:id', async (req, res) => {
  try {
    const User = require('../models/userModel');
    const vendorId = req.params.id;
    
    console.log(`Fetching vendor with ID: ${vendorId}`);
    
    // Find the vendor by ID
    const vendor = await User.findOne({ 
      _id: vendorId,
      $or: [
        { role: 'vendor' }, 
        { isVendor: true }
      ]
    }).select('username email phoneNumber vendorDetails');
    
    if (!vendor) {
      console.log(`No vendor found with ID: ${vendorId}`);
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }
    
    console.log(`Found vendor: ${vendor.username}, Restaurant: ${vendor.vendorDetails?.restaurantName || 'N/A'}`);
    
    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Error fetching vendor by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router;
