import  { DataTypes } from 'sequelize';
import  sequelize from '../config/database.js';

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: 'Users',
    key: 'id'
  }
}

}, {
  timestamps: true
});

export default Cart;