import mongoose from 'mongoose';
import { FoodUser } from '../../../../core/users/user.model.js';

const User = mongoose.models.HotelUser || mongoose.model(
  'HotelUser',
  FoodUser.schema,
  FoodUser.collection.name
);

export default User;
