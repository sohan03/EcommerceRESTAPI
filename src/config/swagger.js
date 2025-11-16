import  swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce REST API',
      version: '1.0.0',
      description: 'A comprehensive e-commerce REST API with user authentication, product management, categories, shopping cart, and order processing',
      contact: {
        name: 'API Support',
        email: 'support@ecommerce.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            stock: { type: 'integer' },
            categoryId: { type: 'integer' },
            imageUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CartItem' }
            }
          }
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' },
            priceAtAdd: { type: 'number', format: 'float' },
            product: { $ref: '#/components/schemas/Product' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            totalAmount: { type: 'number', format: 'float' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' },
            priceAtPurchase: { type: 'number', format: 'float' },
            product: { $ref: '#/components/schemas/Product' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js']       // Read docs from route files-
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;