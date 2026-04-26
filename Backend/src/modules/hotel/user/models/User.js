import mongoose from 'mongoose';
import { FoodUser } from '../../../../core/users/user.model.js';

const User = mongoose.models.HotelUser || mongoose.model('HotelUser', FoodUser.schema, 'common_users');

export default User;
