import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/models/index.js';

describe('Product Tests', () => {
  let adminToken;
  let customerToken;
  let categoryId;
  let productId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    console.log('✓ Database reset for product tests');

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
      .send({
        name: 'Electronics',
        description: 'Electronic devices'
      });
    categoryId = categoryRes.body.data.id;
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✓ Database connection closed');
  });

  describe('POST /api/products', () => {
    
    it('should create product as admin', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Laptop',
          description: 'High-performance laptop for professionals',
          price: 999.99,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Laptop');
      expect(parseFloat(response.body.data.price)).toBe(999.99);
      expect(response.body.data.stock).toBe(10);
      expect(response.body.data.categoryId).toBe(categoryId);
      
      productId = response.body.data.id;
    });

    it('should include category in product response', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Smartphone',
          description: 'Latest smartphone model',
          price: 599.99,
          stock: 25,
          categoryId
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data.category.name).toBe('Electronics');
    });

    it('should create product without description', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Tablet',
          price: 299.99,
          stock: 15,
          categoryId
        });

      expect(response.status).toBe(201);
      expect(response.body.data.description).toBeNull();
    });

    it('should NOT create product as customer', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Product',
          price: 100,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Product'
          // Missing: price, stock, categoryId
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate price is positive number', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          price: -10,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(400);
    });

    it('should validate stock is non-negative integer', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          price: 100,
          stock: -5,
          categoryId
        });

      expect(response.status).toBe(400);
    });

    it('should validate category exists', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          price: 100,
          stock: 10,
          categoryId: 9999
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/category not found/i);
    });
  });

  describe('GET /api/products', () => {
    
    beforeAll(async () => {
      // Create more products for testing filters
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Headphones',
          description: 'Wireless headphones',
          price: 149.99,
          stock: 50,
          categoryId
        });

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mouse',
          description: 'Gaming mouse',
          price: 49.99,
          stock: 100,
          categoryId
        });
    });

    it('should get all products (public endpoint)', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('currentPage');
    });

    it('should filter products by minimum price', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=500');

      expect(response.status).toBe(200);
      response.body.data.forEach(product => {
        expect(parseFloat(product.price)).toBeGreaterThanOrEqual(500);
      });
    });

    it('should filter products by maximum price', async () => {
      const response = await request(app)
        .get('/api/products?maxPrice=200');

      expect(response.status).toBe(200);
      response.body.data.forEach(product => {
        expect(parseFloat(product.price)).toBeLessThanOrEqual(200);
      });
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=100&maxPrice=600');

      expect(response.status).toBe(200);
      response.body.data.forEach(product => {
        const price = parseFloat(product.price);
        expect(price).toBeGreaterThanOrEqual(100);
        expect(price).toBeLessThanOrEqual(600);
      });
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get(`/api/products?categoryId=${categoryId}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(product => {
        expect(product.categoryId).toBe(categoryId);
      });
    });

    it('should search products by name', async () => {
      const response = await request(app)
        .get('/api/products?search=laptop');

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].name.toLowerCase()).toContain('laptop');
      }
    });

    it('should search products case-insensitively', async () => {
      const response = await request(app)
        .get('/api/products?search=LAPTOP');

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].name.toLowerCase()).toContain('laptop');
      }
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should handle page 2 of pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=2&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.currentPage).toBe(2);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get(`/api/products?minPrice=50&maxPrice=1000&categoryId=${categoryId}&search=phone&page=1&limit=10`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/products?search=nonexistentproduct12345');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    
    it('should get product by id', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(productId);
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data.category.id).toBe(categoryId);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/9999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid product id', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id');

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/products/:id', () => {
    
    it('should update product as admin', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Gaming Laptop',
          description: 'High-end gaming laptop with RTX graphics',
          price: 1499.99,
          stock: 5,
          categoryId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Gaming Laptop');
      expect(parseFloat(response.body.data.price)).toBe(1499.99);
      expect(response.body.data.stock).toBe(5);
    });

    it('should update only specific fields', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Gaming Laptop',
          price: 1299.99,
          stock: 5,
          categoryId
        });

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.data.price)).toBe(1299.99);
    });

    it('should NOT update product as customer', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Updated Name',
          price: 2000,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(403);
    });

    it('should NOT update product without authentication', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send({
          name: 'Updated Name',
          price: 2000,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when updating non-existent product', async () => {
      const response = await request(app)
        .put('/api/products/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          price: 100,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(404);
    });

    it('should validate price when updating', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          price: -50,
          stock: 10,
          categoryId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    
    it('should delete product as admin', async () => {
      // Create a product to delete
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Temporary Product',
          description: 'To be deleted',
          price: 50,
          stock: 5,
          categoryId
        });
      
      const tempProductId = createRes.body.data.id;

      const response = await request(app)
        .delete(`/api/products/${tempProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/deleted/i);
    });

    it('should NOT delete product as customer', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 when deleting non-existent product', async () => {
      const response = await request(app)
        .delete('/api/products/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});