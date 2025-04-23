const asyncHandler = require('express-async-handler');
const Review = require('../models/reviewModel.js');
const User = require('../models/userModel.js');
const mongoose = require('mongoose');

// @desc    Fetch all reviews for a vendor
// @route   GET /api/reviews/:vendorId
// @access  Public
const getVendorReviews = asyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId;
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      res.status(400);
      throw new Error('Invalid Vendor ID');
  }
  const reviews = await Review.find({ vendor: vendorId }).sort({ createdAt: -1 }).populate('user', 'username'); // Populate user name
  res.json(reviews);
});


// @desc    Create a new review for a vendor
// @route   POST /api/reviews/:vendorId
// @access  Private (User must be logged in)
const createVendorReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const vendorId = req.params.vendorId;
  const userId = req.user._id; // From protect middleware

  if (!rating || !comment) {
    res.status(400);
    throw new Error('Rating and comment are required');
  }

  // Find the vendor
  const vendor = await User.findById(vendorId);

  if (!vendor || vendor.role !== 'vendor') {
    res.status(404);
    throw new Error('Vendor not found');
  }

  // Create the review
  const review = new Review({
    user: userId,
    vendor: vendorId,
    name: req.user.username, // Get username from logged-in user info
    rating: Number(rating),
    comment,
  });

  const createdReview = await review.save();

  // Update the vendor's rating details
  const reviews = await Review.find({ vendor: vendorId });
  vendor.vendorDetails.numReviews = reviews.length;
  vendor.vendorDetails.rating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

  await vendor.save();

  res.status(201).json({ message: 'Review added successfully', review: createdReview });
});

module.exports = {
  getVendorReviews,
  createVendorReview,
}; 