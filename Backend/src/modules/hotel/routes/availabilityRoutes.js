import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  checkAvailability,
  createWalkIn,
  createExternalBooking,
  createManualBlock,
  deleteLedgerEntry,
  getPartnerLedger
} from '../controllers/availabilityController.js';

const router = express.Router();

router.get('/check', checkAvailability);

router.get('/partner/ledger', protect, authorizedRoles('partner'), getPartnerLedger);
router.post('/partner/walkin', protect, authorizedRoles('partner'), createWalkIn);
router.post('/partner/external-booking', protect, authorizedRoles('partner'), createExternalBooking);
router.post('/partner/block-inventory', protect, authorizedRoles('partner'), createManualBlock);
router.delete('/partner/ledger/:id', protect, authorizedRoles('partner'), deleteLedgerEntry);

export default router;
