import  { DataTypes } from 'sequelize';
import  sequelize from '../config/database.js';

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cartId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Carts',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  priceAtAdd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Price when product was added to cart (persistent pricing)'
  }
}, {
  timestamps: true
});

export default CartItem;