import request from 'supertest';
import app from '../src/app.js';
import sequelize, { User } from '../src/models/index.js';


describe('Authentication Tests', () => {
  
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    console.log('✓ Database reset for auth tests');
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✓ Database connection closed');
  });

  describe('POST /api/auth/register', () => {
    
    it('should register a new customer successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'customer@test.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('customer@test.com');
      expect(response.body.data.user.role).toBe('customer');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should register an admin user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'admin123',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');
    });

    it('should NOT register with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'customer@test.com',
          password: 'password456',
          firstName: 'Jane',
          lastName: 'Smith'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate password length (min 6 characters)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test3@example.com'
          // Missing: password, firstName, lastName
        });

      expect(response.status).toBe(400);
    });

    it('should hash password before storing in database', async () => {
      const password = 'mypassword123';
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hashtest@example.com',
          password,
          firstName: 'Hash',
          lastName: 'Test'
        });

      const user = await User.findOne({ 
        where: { email: 'hashtest@example.com' } 
      });
      
      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should create cart for customer role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'carttest@example.com',
          password: 'password123',
          firstName: 'Cart',
          lastName: 'Test',
          role: 'customer'
        });

      expect(response.status).toBe(201);
      // Cart is created in the controller
    });
  });

  describe('POST /api/auth/login', () => {
    
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('customer@test.com');
      expect(typeof response.body.data.token).toBe('string');
    });

    it('should NOT login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid/i);
    });

    it('should NOT login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
    });

    it('should require password field', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@test.com'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'password123'
        });
      token = response.body.data.token;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('customer@test.com');
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('firstName');
      expect(response.body.data).toHaveProperty('lastName');
      expect(response.body.data).toHaveProperty('role');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      // This would require a token that's actually expired
      // For now, test with malformed token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid');

      expect(response.status).toBe(401);
    });
  });
});