const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: 'user'
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVendor: {
      type: Boolean,
      default: false,
    },
    // Vendor specific fields
    vendorDetails: {
      restaurantName: {
        type: String,
        required: function() { return this.role === 'vendor' }
      },
      restaurantAddress: {
        type: String,
        required: function() { return this.role === 'vendor' }
      },
      cuisine: {
        type: String,
        required: function() { return this.role === 'vendor' }
      },
      description: {
        type: String,
        required: function() { return this.role === 'vendor' }
      },
      photo: {
        type: String,
        required: function() { return this.role === 'vendor' }
      },
      // Add rating fields for vendors
      rating: {
        type: Number,
        required: true,
        default: 0
      },
      numReviews: {
        type: Number,
        required: true,
        default: 0
      }
    }
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;