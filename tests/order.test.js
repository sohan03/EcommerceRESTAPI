import request from 'supertest';
import app from '../src/app.js';
import sequelize, { Product } from '../src/models/index.js';


describe('Order Tests', () => {
  let customerToken;
  let adminToken;
  let productId;
  let orderId;
  let categoryId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    console.log('✓ Database reset for order tests');

    // Create admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      });
    adminToken = adminRes.body.data.token;

    // Create customer
    const customerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'customer@test.com',
        password: 'customer123',
        firstName: 'Customer',
        lastName: 'User',
        role: 'customer'
      });
    customerToken = customerRes.body.data.token;

    // Create category
    const categoryRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics' });
    categoryId = categoryRes.body.data.id;

    // Create product
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tablet',
        description: 'Portable tablet device',
        price: 399.99,
        stock: 15,
        categoryId
      });
    productId = productRes.body.data.id;
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✓ Database connection closed');
  });

  describe('POST /api/orders', () => {
    
    it('should place order from cart', async () => {
      // Add items to cart
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 2 });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.items).toHaveLength(1);
      expect(parseFloat(response.body.data.totalAmount)).toBe(799.98); // 2 * 399.99
      
      orderId = response.body.data.id;
    });

    it('should maintain persistent pricing in order', async () => {
      // Get the order
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items[0].priceAtPurchase).toBe('399.99');
    });

    it('should decrease product stock after order', async () => {
      const product = await Product.findByPk(productId);
      expect(product.stock).toBe(13); // 15 - 2
    });

    it('should clear cart after order', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('should NOT place order with empty cart', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/empty/i);
    });

   it('should NOT place order if stock insufficient', async () => {
      // Add more items than available stock
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 50 }); // <-- THIS IS THE CRITICAL SETUP LINE

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/stock|available/i);
    });

    it('should NOT place order without authentication', async () => {
      const response = await request(app)
        .post('/api/orders');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/orders', () => {
    
    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('totalAmount');
      expect(response.body.data[0]).toHaveProperty('status');
      expect(response.body.data[0]).toHaveProperty('items');
    });

    it('should include order items with product details', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].items[0]).toHaveProperty('product');
      expect(response.body.data[0].items[0]).toHaveProperty('priceAtPurchase');
      expect(response.body.data[0].items[0]).toHaveProperty('quantity');
    });

    it('should NOT get orders without authentication', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
    });

    it('should return empty array for user with no orders', async () => {
      // Create new customer
      const newCustomerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newcustomer2@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'Customer',
          role: 'customer'
        });
      const newToken = newCustomerRes.body.data.token;

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/orders/:id', () => {
    
    it('should get order by id', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(orderId);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/9999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });

    it('should NOT get another user order', async () => {
      // Create another customer
      const otherCustomerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'othercustomer@test.com',
          password: 'password123',
          firstName: 'Other',
          lastName: 'Customer',
          role: 'customer'
        });
      const otherToken = otherCustomerRes.body.data.token;

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/orders/admin/all', () => {
    
    it('should get all orders as admin', async () => {
      const response = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should include user information in admin order view', async () => {
      const response = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('user');
      expect(response.body.data[0].user).toHaveProperty('email');
      expect(response.body.data[0].user).not.toHaveProperty('password');
    });

    it('should NOT get all orders as customer', async () => {
      const response = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    
    it('should update order status as admin', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });

    it('should update status to cancelled', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should update status back to pending', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('pending');
    });

    it('should NOT update with invalid status', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });

    it('should NOT update order status as customer', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .put('/api/orders/9999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
    });
  });

  describe('Persistent Pricing Integration Test', () => {
    
    it('should maintain price when product price changes after adding to cart', async () => {
      // 1. Add product to cart at original price
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      // 2. Admin changes product price
      await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Tablet',
          description: 'Portable tablet device',
          price: 499.99, // Changed from 399.99 to 499.99
          stock: 13,
          categoryId
        });

      // 3. Check cart still has original price
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cartRes.status).toBe(200);
      const cartItem = cartRes.body.data.items.find(item => item.productId === productId);
      expect(cartItem.priceAtAdd).toBe('399.99'); // Still original price

      // 4. Place order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.data.items[0].priceAtPurchase).toBe('399.99'); // Order has original price
      expect(parseFloat(orderRes.body.data.totalAmount)).toBe(399.99); // Total is original price

      // 5. Verify product has new price
      const productRes = await request(app)
        .get(`/api/products/${productId}`);
      
      expect(parseFloat(productRes.body.data.price)).toBe(499.99); // Product now has new price
    });
  });

  describe('Stock Management Integration Test', () => {
    
    it('should handle concurrent stock updates correctly', async () => {
      // Create product with limited stock
      const limitedProductRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Limited Edition Item',
          price: 99.99,
          stock: 5,
          categoryId
        });
      const limitedProductId = limitedProductRes.body.data.id;

      // Customer adds to cart
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: limitedProductId,
          quantity: 3
        });

      // Place order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(orderRes.status).toBe(201);

      // Verify stock decreased
      const productRes = await request(app)
        .get(`/api/products/${limitedProductId}`);
      
      expect(productRes.body.data.stock).toBe(2); // 5 - 3 = 2
    });

    it('should prevent order when stock runs out between cart and checkout', async () => {
      // Create product with 2 items
      const lowStockRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Almost Gone',
          price: 49.99,
          stock: 2,
          categoryId
        });
      const lowStockId = lowStockRes.body.data.id;

      // Customer adds 2 to cart
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: lowStockId,
          quantity: 2
        });

      // Admin updates stock to 1
      await request(app)
        .put(`/api/products/${lowStockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Almost Gone',
          price: 49.99,
          stock: 1, // Reduced stock
          categoryId
        });

      // Try to place order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(orderRes.status).toBe(400);
      expect(orderRes.body.message).toMatch(/insufficient stock/i);
    });
  });
});