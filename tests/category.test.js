import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/models/index.js';

describe('Category Tests', () => {
  let adminToken;
  let customerToken;
  let categoryId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    console.log('✓ Database reset for category tests');

    // Register admin
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

    // Register customer
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
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✓ Database connection closed');
  });

  describe('POST /api/categories', () => {
    
    it('should create category as admin', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics',
          description: 'Electronic devices and accessories'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics');
      expect(response.body.data.description).toBe('Electronic devices and accessories');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
      
      categoryId = response.body.data.id;
    });

    it('should create category with only required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Books'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Books');
    });

    it('should NOT create category as customer', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Clothing',
          description: 'Fashion items'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not authorized/i);
    });

    it('should NOT create category without authentication', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({
          name: 'Home & Garden',
          description: 'Home items'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should NOT create duplicate category', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics',
          description: 'Duplicate category'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('should validate required name field', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name field'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate name length', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'A'.repeat(101), // Over 100 chars
          description: 'Too long name'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    
    it('should get all categories (public endpoint)', async () => {
      const response = await request(app)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
    });

    it('should include products in category response', async () => {
      const response = await request(app)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('products');
      expect(Array.isArray(response.body.data[0].products)).toBe(true);
    });
  });

  describe('GET /api/categories/:id', () => {
    
    it('should get category by id', async () => {
      const response = await request(app)
        .get(`/api/categories/${categoryId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.name).toBe('Electronics');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/9999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid category id format', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-id');

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/categories/:id', () => {
    
    it('should update category as admin', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics & Gadgets',
          description: 'Updated description for electronics'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics & Gadgets');
      expect(response.body.data.description).toBe('Updated description for electronics');
    });

    it('should NOT update category as customer', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'New Name'
        });

      expect(response.status).toBe(403);
    });

    it('should NOT update to duplicate category name', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Books' // Already exists
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 when updating non-existent category', async () => {
      const response = await request(app)
        .put('/api/categories/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Category'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    
    it('should delete category as admin', async () => {
      // Create a category to delete
      const createRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Temporary Category',
          description: 'To be deleted'
        });
      
      const tempCategoryId = createRes.body.data.id;

      // Delete it
      const response = await request(app)
        .delete(`/api/categories/${tempCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/deleted/i);
    });

    it('should NOT delete category as customer', async () => {
      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 when deleting non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});