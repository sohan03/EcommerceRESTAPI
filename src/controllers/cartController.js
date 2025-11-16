import  Cart from '../models/Cart.js';
   import  CartItem  from '../models/CartItem.js';
    import Product  from '../models/Product.js';
    

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private/Customer
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // Check if product exists and has enough stock
    const product = await Product.findByPk(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

  

    // Get or create cart for user
    let cart = await Cart.findOne({ where: { userId } });
    
    if (!cart) {
      cart = await Cart.create({ userId });
    }

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, productId }
    });

    if (cartItem) {
  const newQuantity = cartItem.quantity + quantity;

  if (product.stock < newQuantity) {
    return res.status(400).json({
      success: false,
      message: `Cannot add more items. Only ${product.stock} items available`
    });
  }

  // 🔥 FIX HERE: ensure persistent pricing exists
  if (!cartItem.priceAtAdd) {
    cartItem.priceAtAdd = product.price;  
  }

  cartItem.quantity = newQuantity;
  await cartItem.save();

    } else {
      // Create new cart item with current price (persistent pricing)
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId,
        quantity,
        priceAtAdd: product.price // Store current price
      });
    }

    // Fetch updated cart with products
    const updatedCart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private/Customer
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!cart) {
      cart = await Cart.create({ userId });
      cart.items = [];
    }

    // Calculate total
    const total = cart.items.reduce((sum, item) => {
      return sum + (parseFloat(item.priceAtAdd) * item.quantity);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        ...cart.toJSON(),
        total: total.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private/Customer
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id },
      include: [{ model: Product, as: 'product' }]
    });
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    // <-- Add this validation
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    if (cartItem.product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${cartItem.product.stock} available`
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    const updatedCart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }]
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: updatedCart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating cart item',
      error: error.message
    });
  }
};


// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private/Customer
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ where: { userId } });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cartItem.destroy();

    const updatedCart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private/Customer
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ where: { userId } });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await CartItem.destroy({ where: { cartId: cart.id } });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
};
export default  {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
