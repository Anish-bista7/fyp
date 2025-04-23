const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// @desc    Get all categories for a vendor
// @route   GET /api/vendors/:vendorId/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ vendor: req.params.vendorId });
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a new category
// @route   POST /api/vendors/:vendorId/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if category already exists for this vendor
    const existingCategory = await Category.findOne({ 
      vendor: req.params.vendorId,
      name: name.toLowerCase()
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category already exists'
      });
    }

    const category = await Category.create({
      name: name.toLowerCase(),
      vendor: req.params.vendorId
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete a category
// @route   DELETE /api/vendors/:vendorId/categories/:categoryId
// @access  Private
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category belongs to the vendor
    if (category.vendor.toString() !== req.params.vendorId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this category'
      });
    }

    // Delete all menu items in this category
    await MenuItem.deleteMany({ 
      vendor: req.params.vendorId,
      category: category.name
    });

    await category.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 