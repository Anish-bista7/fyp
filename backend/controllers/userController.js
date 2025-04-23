const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require('multer');
const path = require('path');

// Generate JWT Token
const generateToken = (id) => {
  console.log("Generating token for user ID:", id);
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

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
});

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  try {
    console.log('Received registration request:', {
      contentType: req.headers['content-type'],
      body: req.body,
      file: req.file
    });
    
    let userData;
    
    // Check if it's multipart form data (vendor) or JSON (regular user)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // For vendor registration
      try {
        userData = JSON.parse(req.body.userData);
      } catch (error) {
        console.error('Error parsing userData:', error);
        res.status(400);
        throw new Error('Invalid user data format');
      }
    } else {
      // For regular user registration
      userData = req.body;
    }

    const { username, email, phoneNumber, password, role, vendorDetails } = userData;

    // Validate required fields
    const missingFields = [];
    if (!username) missingFields.push('username');
    if (!email) missingFields.push('email');
    if (!phoneNumber) missingFields.push('phoneNumber');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      res.status(400);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    // Create user object
    const userObj = {
      username: username.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      password,
      role: role || 'user',
      isVendor: role === 'vendor',
      isAdmin: role === 'admin'
    };

    // Add vendor details if role is vendor
    if (role === 'vendor') {
      if (!vendorDetails) {
        res.status(400);
        throw new Error("Vendor details are required");
      }

      const vendorFields = ['restaurantName', 'restaurantAddress', 'cuisine', 'description'];
      const missingVendorFields = vendorFields.filter(field => !vendorDetails[field]);

      if (missingVendorFields.length > 0) {
        res.status(400);
        throw new Error(`Missing required vendor fields: ${missingVendorFields.join(', ')}`);
      }

      // Check for photo
      if (!req.file) {
        res.status(400);
        throw new Error("Restaurant photo is required for vendors");
      }

      userObj.vendorDetails = {
        restaurantName: vendorDetails.restaurantName.trim(),
        restaurantAddress: vendorDetails.restaurantAddress.trim(),
        cuisine: vendorDetails.cuisine.trim(),
        description: vendorDetails.description.trim(),
        photo: req.file.path // Save the file path
      };
    }

    // Create user
    const user = await User.create(userObj);

    if (user) {
      // Generate token
      const token = generateToken(user._id);

      const responseData = {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVendor: user.isVendor,
        isAdmin: user.isAdmin,
        vendorDetails: user.vendorDetails,
        token: token
      };

      console.log('Registration successful:', { ...responseData, token: '[REDACTED]' });
      res.status(201).json(responseData);
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400);
    throw new Error(error.message || "Registration failed");
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = generateToken(user._id);

    // Send response
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVendor: user.isVendor,
      isAdmin: user.isAdmin,
      vendorDetails: user.vendorDetails,
      token: token
    });
  } catch (error) {
    res.status(res.statusCode || 400);
    throw new Error(error.message);
  }
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (user) {
    // await user.removeSession(req.token); // Commented out: removeSession method not defined on User model
    console.log(`User ${user.username} logged out.`); // Added log
    res.json({ message: "Logged out successfully" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVendor: user.isVendor,
        isAdmin: user.isAdmin,
        vendorDetails: user.vendorDetails
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    res.status(res.statusCode || 400);
    throw new Error(error.message);
  }
});

module.exports = { registerUser, loginUser, logoutUser, getUserProfile, upload };
