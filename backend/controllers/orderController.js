const Order = require('../models/Order');
const User = require('../models/userModel'); // Corrected path
const MenuItem = require('../models/MenuItem'); // To validate menu items

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
exports.createOrder = async (req, res) => {
  try {
    const { 
      items, 
      totalAmount, 
      vendorId, 
      paymentMethod, 
      // deliveryAddress // Optional: Add if needed
    } = req.body;
    
    const userId = req.user.id; // Get user ID from auth middleware

    if (!items || items.length === 0 || !totalAmount || !vendorId || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Missing required order details' });
    }

    // --- Data Validation (Optional but Recommended) ---
    // 1. Validate Vendor ID
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    // 2. Validate Menu Items (ensure they exist and belong to the vendor)
    for (const item of items) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        if (!menuItem || menuItem.vendor.toString() !== vendorId) {
            return res.status(400).json({ success: false, error: `Invalid menu item: ${item.name || item.menuItemId}` });
        }
        // Optional: Check price consistency? item.price === menuItem.price
    }
    // --------------------------------------------------

    let amountPaidStatus = 'unpaid';
    let orderStatus = 'in progress'; // Start as in progress

    // Handle Payment Logic
    if (paymentMethod === 'Wallet') {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      // Deduct from user wallet (implement this logic carefully)
      user.walletBalance -= totalAmount;
      await user.save(); 
      // TODO: Potentially add to vendor's wallet or transaction log
      amountPaidStatus = 'paid';
    } else if (paymentMethod === 'Cash on Delivery') {
      amountPaidStatus = 'unpaid';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    // Create the order object
    const order = new Order({
      user: userId,
      vendor: vendorId,
      items: items.map(item => ({ // Ensure items match the OrderItem schema
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
      })),
      totalAmount,
      paymentMethod,
      amountPaidStatus,
      orderStatus,
      // deliveryAddress, // Add if needed
    });

    const createdOrder = await order.save();

    // TODO: Add notification logic for user and vendor

    res.status(201).json({ success: true, data: createdOrder });

  } catch (error) {
    console.error('Error creating order:', error);
    // Check for specific Mongoose validation errors
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// TODO: Add other order controller functions as needed (getOrderById, getUserOrders, getVendorOrders, updateOrderStatus etc.) 