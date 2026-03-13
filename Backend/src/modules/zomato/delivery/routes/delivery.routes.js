import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import { registerDeliveryPartnerController } from '../controllers/delivery.controller.js';

const router = express.Router();

const uploadFields = upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadharPhoto', maxCount: 1 },
    { name: 'panPhoto', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 }
]);

router.post('/register', uploadFields, registerDeliveryPartnerController);

export default router;

