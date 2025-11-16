import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/models/index.js';

describe('Cart Tests', () => {
  let customerToken;
  let adminToken;
  let productId;
  let product2Id;
  let cartItemId;
  let categoryId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    console.log('✓ Database reset for cart tests');

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

    // Create products
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Smartphone',
        price: 599.99,
        stock: 20,
        categoryId
      });
    productId = productRes.body.data.id;

    const product2Res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tablet',
        price: 299.99,
        stock: 10,
        categoryId
      });
    product2Id = product2Res.body.data.id;
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✓ Database connection closed');
  });

  describe('POST /api/cart', () => {
    
    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].priceAtAdd).toBe('599.99');
      expect(response.body.data.items[0]).toHaveProperty('product');
      
      cartItemId = response.body.data.items[0].id;
    });

    it('should add another product to cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
    });

    it('should update quantity if item already in cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 3
        });

      expect(response.status).toBe(200);
      const item = response.body.data.items.find(i => i.productId === productId);
      expect(item.quantity).toBe(5); // 2 + 3
    });

    it('should store price at time of adding (persistent pricing)', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1
        });

      expect(response.status).toBe(200);
      const item = response.body.data.items.find(i => i.productId === productId);
      expect(item.priceAtAdd).toBe('599.99');
    });

    it('should NOT add out-of-stock item', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 100
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/stock|available/i);
    });

    it('should NOT add item without authentication', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({
          productId,
          quantity: 1
        });

      expect(response.status).toBe(401);
    });

    it('should validate quantity is positive', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 0
        });

      expect(response.status).toBe(400);
    });

    it('should validate quantity is integer', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1.5
        });

      expect(response.status).toBe(400);
    });

    it('should validate product exists', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: 9999,
          quantity: 1
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId
          // Missing quantity
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/cart', () => {
    
    it('should get cart with items', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should calculate total correctly', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      const total = parseFloat(response.body.data.total);
      expect(total).toBeGreaterThan(0);
      
      // Verify calculation
      let calculatedTotal = 0;
      response.body.data.items.forEach(item => {
        calculatedTotal += parseFloat(item.priceAtAdd) * item.quantity;
      });
      expect(total).toBeCloseTo(calculatedTotal, 2);
    });

    it('should include product details in cart items', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items[0]).toHaveProperty('product');
      expect(response.body.data.items[0].product).toHaveProperty('name');
      expect(response.body.data.items[0].product).toHaveProperty('price');
    });

    it('should NOT get cart without authentication', async () => {
      const response = await request(app)
        .get('/api/cart');

      expect(response.status).toBe(401);
    });

    it('should return empty cart for new user', async () => {
      // Create new customer
      const newCustomerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newcustomer@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'Customer',
          role: 'customer'
        });
      const newCustomerToken = newCustomerRes.body.data.token;

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${newCustomerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.total).toBe('0.00');
    });
  });

  describe('PUT /api/cart/:itemId', () => {
    
    it('should update cart item quantity', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const item = response.body.data.items.find(i => i.id === cartItemId);
      expect(item.quantity).toBe(3);
    });

    it('should validate stock when updating quantity', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 100 });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/stock|available/i);
    });

    it('should NOT update cart item without authentication', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .send({ quantity: 2 });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent cart item', async () => {
      const response = await request(app)
        .put('/api/cart/9999')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 });

      expect(response.status).toBe(404);
    });

    it('should validate quantity field', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 0 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/cart/:itemId', () => {
    
    it('should remove item from cart', async () => {
      // First, get current cart to verify item exists
      const cartBefore = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);
      
      const itemCount = cartBefore.body.data.items.length;

      const response = await request(app)
        .delete(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify item was removed
      const cartAfter = response.body.data;
      expect(cartAfter.items.length).toBe(itemCount - 1);
    });

    it('should NOT remove item without authentication', async () => {
      const response = await request(app)
        .delete(`/api/cart/${cartItemId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent cart item', async () => {
      const response = await request(app)
        .delete('/api/cart/9999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/cart', () => {
    
    it('should clear entire cart', async () => {
      // Add items to cart first
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify cart is empty
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(cartRes.body.data.items).toHaveLength(0);
    });
  });
});