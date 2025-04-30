const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem', // Reference to the MenuItem model
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming vendors are also Users with role 'vendor'
    required: true,
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  userPhoneNumber: {
    type: String,
    required: false,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash on Delivery', 'Wallet'], // Example payment methods
  },
  amountPaidStatus: {
    type: String,
    required: true,
    enum: ['paid', 'unpaid'],
    default: 'unpaid',
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['pending', 'in progress', 'out for delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
  // Optional: deliveryAddress, specialInstructions, etc.
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` field before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


module.exports = mongoose.model('Order', orderSchema); 