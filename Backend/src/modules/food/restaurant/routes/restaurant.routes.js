import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import { registerRestaurantController } from '../controllers/restaurant.controller.js';

const router = express.Router();

const uploadFields = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'panImage', maxCount: 1 },
    { name: 'gstImage', maxCount: 1 },
    { name: 'fssaiImage', maxCount: 1 },
    { name: 'menuImages', maxCount: 10 }
]);

router.post('/register', uploadFields, registerRestaurantController);

export default router;

