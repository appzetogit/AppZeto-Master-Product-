import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import {
    listAddressesController,
    addAddressController,
    updateAddressController,
    deleteAddressController,
    setDefaultAddressController
} from '../controllers/userAddress.controller.js';
import {
    getCurrentUserProfileController,
    updateCurrentUserProfileController,
    uploadCurrentUserProfileImageController
} from '../controllers/userProfile.controller.js';
import {
    getUserWalletController,
    createWalletTopupOrderController,
    verifyWalletTopupPaymentController
} from '../controllers/userWallet.controller.js';

const router = express.Router();

router.get('/profile', getCurrentUserProfileController);
router.patch('/profile', updateCurrentUserProfileController);
router.post('/profile/profile-image', upload.single('file'), uploadCurrentUserProfileImageController);

// Wallet (Bearer USER)
router.get('/wallet', getUserWalletController);
router.post('/wallet/topup/order', createWalletTopupOrderController);
router.post('/wallet/topup/verify', verifyWalletTopupPaymentController);

router.get('/addresses', listAddressesController);
router.post('/addresses', addAddressController);
router.patch('/addresses/:addressId', updateAddressController);
router.delete('/addresses/:addressId', deleteAddressController);
router.patch('/addresses/:addressId/default', setDefaultAddressController);

export default router;

