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

    // Fetch user details again to get phone number if not already fetched for wallet
    // Alternatively, ensure user is always fetched before this point
    let userPhoneNumber = null;
    if (paymentMethod !== 'Wallet') {
        const user = await User.findById(userId);
        if (user) {
            userPhoneNumber = user.phoneNumber;
        }
    } else {
        // If wallet payment, user was already fetched
        const user = await User.findById(userId); // Re-fetch or ensure user var is in scope
        if (user) {
             userPhoneNumber = user.phoneNumber;
        }
    }
    
    if (!userPhoneNumber) {
        console.warn(`Could not find phone number for user ${userId} when creating order.`);
        // Decide if this is critical. Maybe throw an error or proceed without it?
        // return res.status(400).json({ success: false, error: 'User phone number not found' });
    }

    // Create the order object
    const order = new Order({
      user: userId,
      vendor: vendorId,
      userPhoneNumber: userPhoneNumber, // Include phone number
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

    // Populate user, vendor, and menu item details for the response
    const fullOrder = await Order.findById(createdOrder._id)
      .populate('user', 'username email phoneNumber')
      .populate('vendor', 'vendorDetails.restaurantName email phoneNumber')
      .populate('items.menuItemId', 'name price');

    // --- Emit notification to user --- 
    try {
        const io = req.io; // Get io instance from request
        const userSockets = req.userSockets; // Get user socket mapping
        const userSocketId = userSockets[userId]; // Find socket ID for this user

        if (userSocketId) {
          io.to(userSocketId).emit('notification', { 
              type: 'ORDER_CONFIRMATION', // Add a type for frontend handling
              message: 'Your order is confirmed. Thank you for ordering with us!', 
              orderId: createdOrder._id // Optionally send order ID
          });
          console.log(`🔔 Notification sent to user ${userId} (Socket: ${userSocketId})`);
        } else {
            console.log(`❔ User ${userId} not currently connected via socket.`);
        }
    } catch (socketError) {
        console.error("Socket.IO customer notification error:", socketError);
    }
    // --------------------------------
    
    // --- Emit notification to VENDOR --- 
    try {
        const io = req.io; // Get io instance from request
        const userSockets = req.userSockets; // Get user socket mapping
        const vendorSocketId = userSockets[vendorId]; // Find socket ID for the vendor of this order

        if (vendorSocketId) {
          io.to(vendorSocketId).emit('notification', { 
              type: 'NEW_ORDER', // Specific type for vendor
              message: `You have received a new order! Order ID: ${createdOrder._id.toString().slice(-6)}`, 
              orderId: createdOrder._id // Send the full order ID
          });
          console.log(`🔔 Vendor Notification sent to vendor ${vendorId} (Socket: ${vendorSocketId})`);
        } else {
            // Vendor is not online via socket, they will see the order when they check their dashboard
            console.log(`❔ Vendor ${vendorId} not currently connected via socket.`);
        }
    } catch (socketError) {
        console.error("Socket.IO vendor notification error:", socketError);
        // Don't fail the request if notification fails
    }
    // ----------------------------------

    res.status(201).json({ success: true, data: fullOrder });

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

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    // Find orders where the user field matches the logged-in user's ID
    // Filter for orders that are still considered 'in progress' or active
    const activeStatuses = ['pending', 'in progress', 'out for delivery']; 
    const orders = await Order.find({ 
        user: req.user.id, 
        orderStatus: { $in: activeStatuses } 
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .populate('vendor', 'vendorDetails.restaurantName')
    .populate('items.menuItemId', 'name price');

    res.json({ success: true, data: orders });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// TODO: Add other order controller functions as needed (getOrderById, getVendorOrders, updateOrderStatus etc.) 