import Order from '../models/Order.js'
import OrderItem from '../models/OrderItem.js'
import Cart from '../models/Cart.js'
import CartItem from '../models/CartItem.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import sequelize from '../config/database.js';

// @desc    Place order from cart
// @route   POST /api/orders
// @access  Private/Customer
export const placeOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;

    // Get cart with items
    const cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }],
      transaction: t, // Important: Use the transaction
      //  lock: true /
    });

    if (!cart || cart.items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate stock and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}. Only ${item.product.stock} available`
        });
      }

      // Use priceAtAdd for persistent pricing
      const itemTotal = parseFloat(item.priceAtAdd) * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtAdd // Maintain price from cart
      });

      // Update product stock
      await item.product.decrement('stock', { by: item.quantity, transaction: t });
    }

    // Create order
    const order = await Order.create({
      userId,
      totalAmount: totalAmount.toFixed(2),
      status: 'pending'
    }, { transaction: t });

    // Create order items
    for (const orderItem of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        ...orderItem
      }, { transaction: t });
    }

    // Clear cart
    await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

    await t.commit();

    // Fetch created order with details
    const createdOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: createdOrder
    });
  } catch (error) {
    await t.rollback();
    console.error('Order placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error placing order',
      error: error.message
    });
  }
};



// @desc    Get user's order history
// @route   GET /api/orders
// @access  Private/Customer
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.findAll({
      where: { userId },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private/Customer
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id, userId },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, completed, or cancelled'
      });
    }

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.update({ status });

    const updatedOrder = await Order.findByPk(id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};


