const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Link to the user who wrote the review
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Link to the vendor being reviewed (assuming vendors are Users)
    },
    name: { // Store the user's name at the time of review
      type: String,
      required: true,
    },
    rating: { // Star rating (e.g., 1-5)
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 