import  express from 'express';
const  router = express.Router();
import  {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController.js';
import  protect from '../middleware/auth.js';
import  authorize from '../middleware/roleAuth.js';
import  { addToCartValidation,itemIdValidation, idValidation, validate } from '../middleware/validation.js';

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's cart details
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Item added to cart
 *   delete:
 *     summary: Clear cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.route('/')
  .get(protect, authorize('customer'), getCart)
  .post(protect, authorize('customer'), addToCartValidation, validate, addToCart)
  .delete(protect, authorize('customer'), clearCart);

/**
 * @swagger
 * /cart/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.route('/:itemId')
  .put(protect, authorize('customer'), itemIdValidation, validate, updateCartItem)
  .delete(protect, authorize('customer'), itemIdValidation, validate, removeFromCart);

export default router;
