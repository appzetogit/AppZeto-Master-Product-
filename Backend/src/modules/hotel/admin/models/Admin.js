import mongoose from 'mongoose';
import { FoodAdmin } from '../../../../core/admin/admin.model.js';

const Admin = mongoose.models.HotelAdmin || mongoose.model(
  'HotelAdmin',
  FoodAdmin.schema,
  FoodAdmin.collection.name
);

export default Admin;
