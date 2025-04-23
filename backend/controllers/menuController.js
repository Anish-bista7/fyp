const MenuItem = require('../models/MenuItem');
const { ErrorResponse } = require('../utils/errorResponse');
const multer = require('multer');
const path = require('path');

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Setup upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).single('image');

// Create a new menu item
exports.createMenuItem = async (req, res, next) => {
  console.log("--- createMenuItem START ---");
  console.log("Request Params:", req.params); 
  console.log("Request User ID:", req.user?._id); 
  console.log("Raw Request Body:", req.body);
  
  // Check if file upload middleware (multer) is involved for this route
  // If createMenuItem doesn't handle file uploads itself, req.file might be undefined here
  // If it DOES handle uploads, log the file info
  if (req.file) {
    console.log("Request File:", req.file);
  } else {
    console.log("No file uploaded for this request.");
  }

  // Handle file upload if your setup requires it within createMenuItem
  // If you use upload middleware directly on the route, this part might be different
  // upload(req, res, async function(err) { // Example if using multer directly here
    // if (err) {
    //   console.error("Multer upload error:", err);
    //   return next(new ErrorResponse(err.message, 400));
    // }

    try {
      const { name, description, price, category, type, ingredients } = req.body;
      const vendorId = req.params.vendorId;
      
      console.log("Extracted Data:", { name, description, price, category, type, ingredients });
      console.log("Vendor ID from params:", vendorId);

      // Check if user is authenticated (added by protect middleware)
      if (!req.user || !req.user._id) {
        console.error("Authorization Error: User not found in request.");
        return next(new ErrorResponse('Not authorized', 401));
      }
      
      // Verify vendor ownership
      if (vendorId !== req.user._id.toString()) {
        console.error(`Authorization Error: Route vendorId (${vendorId}) does not match user ID (${req.user._id.toString()}).`);
        return next(new ErrorResponse('Not authorized to create menu items for this vendor', 403));
      }
      console.log("Authorization check passed.");
      
      // Validate required fields
      if (!name || !price || !category) { // Removed description from required validation based on your code
        console.error("Validation Error: Missing required fields.", { name, price, category });
        return next(new ErrorResponse('Please provide all required fields: name, price, and category', 400));
      }
      console.log("Required field validation passed.");

      // Parse price as number if it's a string
      let parsedPrice;
      try {
        parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
          throw new Error('Invalid price format');
        }
        console.log("Price parsed successfully:", parsedPrice);
      } catch (priceError) {
        console.error("Validation Error: Invalid price format.", { price });
        return next(new ErrorResponse('Invalid price format. Please enter a number.', 400));
      }
      
      // Get image path if uploaded (assuming multer middleware adds req.file)
      let imagePath = req.file ? req.file.path : null; 
      if (imagePath) {
          // Optional: Replace backslashes for consistency if needed, though path module usually handles this
          imagePath = imagePath.replace(/\\/g, '/');
          console.log("Image path determined:", imagePath);
      }
      
      // Create the menu item data object
      const menuItemData = {
        name: name.trim(),
        description: description ? description.trim() : '', // Handle optional description
        price: parsedPrice,
        category: category.trim(),
        vendor: vendorId, // This is req.user._id confirmed by auth check
        type: type || 'Veg', // Default type if not provided
        ingredients: ingredients ? ingredients.trim() : '' // Handle optional ingredients
      };
      if (imagePath) {
          menuItemData.image = imagePath;
      }

      console.log('Attempting to create menu item with data:', menuItemData);
      
      // Save to database
      const menuItem = await MenuItem.create(menuItemData);
      console.log('MenuItem successfully created in DB:', menuItem);

      res.status(201).json({
        success: true,
        data: menuItem
      });
      console.log("--- createMenuItem SUCCESS ---");

    } catch (dbError) {
      console.error('Database or other error during item creation:', dbError);
      // Check for Mongoose validation errors
      if (dbError.name === 'ValidationError') {
          return next(new ErrorResponse(dbError.message, 400));
      }
      next(dbError); // Pass other errors to the default error handler
      console.log("--- createMenuItem FAILED ---");
    }
  // }); // End of upload callback if using multer directly here
};

// Get all menu items for a vendor
exports.getMenuItems = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    console.log(`Fetching menu items for vendor ID: ${vendorId}`); // Added log
    
    // Removed authorization check: This route is public
    // if (vendorId !== req.user._id.toString()) { 
    //   return next(new ErrorResponse('Not authorized to view menu items for this vendor', 403));
    // }
    
    const menuItems = await MenuItem.find({ vendor: vendorId });
    console.log(`Found ${menuItems.length} menu items for vendor ${vendorId}`); // Added log
    
    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    console.error(`Error in getMenuItems for vendor ${req.params.vendorId}:`, error); // Improved error log
    next(error);
  }
};

// Update a menu item
exports.updateMenuItem = async (req, res, next) => {
  // Handle file upload
  upload(req, res, async function(err) {
    if (err) {
      return next(new ErrorResponse(err.message, 400));
    }

    try {
      const { name, description, price, category, type, ingredients, available } = req.body;
      const vendorId = req.params.vendorId;
      const itemId = req.params.itemId;
      
      // Verify vendor ownership
      if (vendorId !== req.user._id.toString()) {
        return next(new ErrorResponse('Not authorized to update menu items for this vendor', 403));
      }
      
      // Get image path if uploaded
      let updateData = { name, description, price, category, type, ingredients, available };
      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }
      
      const menuItem = await MenuItem.findOneAndUpdate(
        { _id: itemId, vendor: vendorId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!menuItem) {
        return next(new ErrorResponse('Menu item not found', 404));
      }

      res.status(200).json({
        success: true,
        data: menuItem
      });
    } catch (error) {
      next(error);
    }
  });
};

// Delete a menu item
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const itemId = req.params.itemId;
    
    // Verify vendor ownership
    if (vendorId !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to delete menu items for this vendor', 403));
    }
    
    const menuItem = await MenuItem.findOneAndDelete({
      _id: itemId,
      vendor: vendorId
    });

    if (!menuItem) {
      return next(new ErrorResponse('Menu item not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
}; 