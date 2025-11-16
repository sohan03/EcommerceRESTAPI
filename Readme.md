

🛒 E-Commerce REST API

A scalable, secure, and production-ready RESTful API for e-commerce applications, built with Node.js, Express, and PostgreSQL.
Includes authentication, product management, cart functionality, order processing, persistent pricing, Cloudinary image uploads, and complete API documentation.


---

✨ Features

User Authentication

- JWT-based authentication

- Role-based access (Admin / Customer)


Product & Category Management

- Full CRUD operations

- Image upload via Cloudinary

- Search, filter & pagination support


Shopping Cart

- Add/Update/Remove items

- Persistent pricing (price stored at time of cart add)


Order Management

- Create orders from cart

- Transaction-based stock management

- Order history & admin controls


Security

- Helmet, CORS, rate limiting

- Input validation with express-validator


Developer Tools

- Swagger API documentation

- Jest + Supertest test suite




---

🛠️ Tech Stack

Node.js, Express.js

PostgreSQL, Sequelize ORM

Cloudinary, Multer

JWT, bcrypt

Jest, Supertest



---

📦 Installation

git clone https://github.com/sohan03/EcommerceRESTAPI.git
cd EcommerceRESTAPI
npm install

Environment Setup

Create .env file:

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=

JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:3000


---

▶️ Running the Application

Development

npm run dev

Production

npm start

API Base URL:

http://localhost:5000

Swagger Docs (if enabled):

http://localhost:5000/api-docs


---

🧪 Testing

npm test


---

📁 Project Structure

src/
 ├── config/
 ├── controllers/
 ├── middleware/
 ├── models/
 ├── routes/
 ├── utils/
 └── app.js


