import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';

const parseDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const validateRoomTypeOwnership = async (propertyId, roomTypeId) => {
  const rt = await RoomType.findById(roomTypeId);
  if (!rt || rt.propertyId.toString() !== String(propertyId)) {
    return null;
  }
  return rt;
};

export const checkAvailability = async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.query;

    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'propertyId, checkIn, and checkOut are required' });
    }

    const start = parseDate(checkIn);
    const end = parseDate(checkOut);
    if (!start || !end || end <= start) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const roomTypes = await RoomType.find({ propertyId, isActive: true });

    if (!roomTypes.length) {
      return res.json([]);
    }

    const ledgerEntries = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: property._id,
          startDate: { $lt: end },
          endDate: { $gt: start }
        }
      },
      {
        $group: {
          _id: '$roomTypeId',
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blockedMap = new Map();
    ledgerEntries.forEach(e => {
      blockedMap.set(String(e._id), e.blockedUnits);
    });

    const result = roomTypes.map(rt => {
      let total = Number(rt.totalInventory || 0);
      if (rt.inventoryType === 'bed') {
        total = total * Number(rt.bedsPerRoom || 1);
      }
      const blocked = blockedMap.get(String(rt._id)) || 0;
      const availableUnits = Math.max(0, total - blocked);
      return {
        roomTypeId: rt._id,
        name: rt.name,
        inventoryType: rt.inventoryType,
        roomCategory: rt.roomCategory,
        pricePerNight: rt.pricePerNight,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        totalInventory: total,
        availableUnits
      };
    }).filter(r => r.availableUnits > 0);

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createWalkIn = async (req, res) => {
  try {
    const { propertyId, roomTypeId, startDate, endDate, units } = req.body;

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!propertyId || !roomTypeId || !start || !end || end <= start || !units) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const rt = await validateRoomTypeOwnership(propertyId, roomTypeId);
    if (!rt) return res.status(400).json({ message: 'Invalid roomTypeId for property' });

    let total = Number(rt.totalInventory || 0);
    if (rt.inventoryType === 'bed') {
      total = total * Number(rt.bedsPerRoom || 1);
    }

    const overlapping = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: property._id,
          roomTypeId: rt._id,
          startDate: { $lt: end },
          endDate: { $gt: start }
        }
      },
      {
        $group: {
          _id: null,
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blocked = overlapping.length ? overlapping[0].blockedUnits : 0;
    const available = total - blocked;

    if (units > available) {
      return res.status(400).json({ message: 'Not enough units available for walk-in booking' });
    }

    const ledger = await AvailabilityLedger.create({
      propertyId,
      roomTypeId,
      inventoryType: rt.inventoryType,
      source: 'walk_in',
      startDate: start,
      endDate: end,
      units: Number(units),
      createdBy: 'partner'
    });

    res.status(201).json({ success: true, ledger });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createExternalBooking = async (req, res) => {
  try {
    const { propertyId, roomTypeId, startDate, endDate, units, platform, referenceNo } = req.body;

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!propertyId || !roomTypeId || !start || !end || end <= start || !units || !platform || !referenceNo) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const rt = await validateRoomTypeOwnership(propertyId, roomTypeId);
    if (!rt) return res.status(400).json({ message: 'Invalid roomTypeId for property' });

    let total = Number(rt.totalInventory || 0);
    if (rt.inventoryType === 'bed') {
      total = total * Number(rt.bedsPerRoom || 1);
    }

    const overlapping = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: property._id,
          roomTypeId: rt._id,
          startDate: { $lt: end },
          endDate: { $gt: start }
        }
      },
      {
        $group: {
          _id: null,
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blocked = overlapping.length ? overlapping[0].blockedUnits : 0;
    const available = total - blocked;

    if (units > available) {
      return res.status(400).json({ message: 'Not enough units available for external booking' });
    }

    const ledger = await AvailabilityLedger.create({
      propertyId,
      roomTypeId,
      inventoryType: rt.inventoryType,
      source: 'external',
      startDate: start,
      endDate: end,
      units: Number(units),
      externalPlatform: platform,
      externalReference: referenceNo,
      createdBy: 'partner'
    });

    res.status(201).json({ success: true, ledger });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createManualBlock = async (req, res) => {
  try {
    const { propertyId, roomTypeId, startDate, endDate, units, notes } = req.body;

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!propertyId || !roomTypeId || !start || !end || end <= start || !units) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const rt = await validateRoomTypeOwnership(propertyId, roomTypeId);
    if (!rt) return res.status(400).json({ message: 'Invalid roomTypeId for property' });

    let total = Number(rt.totalInventory || 0);
    if (rt.inventoryType === 'bed') {
      total = total * Number(rt.bedsPerRoom || 1);
    }

    const overlapping = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: property._id,
          roomTypeId: rt._id,
          startDate: { $lt: end },
          endDate: { $gt: start }
        }
      },
      {
        $group: {
          _id: null,
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blocked = overlapping.length ? overlapping[0].blockedUnits : 0;
    const available = total - blocked;

    if (units > available) {
      return res.status(400).json({ message: 'Not enough units available to block' });
    }

    const ledger = await AvailabilityLedger.create({
      propertyId,
      roomTypeId,
      inventoryType: rt.inventoryType,
      source: 'manual_block',
      startDate: start,
      endDate: end,
      units: Number(units),
      notes,
      createdBy: 'partner'
    });

    res.status(201).json({ success: true, ledger });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteLedgerEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const ledger = await AvailabilityLedger.findById(id);
    if (!ledger) return res.status(404).json({ message: 'Ledger entry not found' });

    if (ledger.source === 'platform' && ledger.referenceId) {
      const booking = await Booking.findById(ledger.referenceId);
      if (booking && booking.bookingStatus !== 'cancelled') {
        return res.status(400).json({ message: 'Cannot delete ledger for active booking' });
      }
    }

    const property = await Property.findById(ledger.propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await AvailabilityLedger.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerLedger = async (req, res) => {
  try {
    const { propertyId, roomTypeId, source, page = 1, limit = 20 } = req.query;

    const myProps = await Property.find({ partnerId: req.user._id }).select('_id');
    const propertyIds = myProps.map(p => p._id);

    if (!propertyIds.length) {
      return res.json({
        success: true,
        entries: [],
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: 0,
          pages: 0
        }
      });
    }

    const query = {};

    if (propertyId) {
      const allowed = propertyIds.some(id => String(id) === String(propertyId));
      if (!allowed) {
        return res.status(403).json({ message: 'Not allowed' });
      }
      query.propertyId = propertyId;
    } else {
      query.propertyId = { $in: propertyIds };
    }

    if (roomTypeId) {
      query.roomTypeId = roomTypeId;
    }

    if (source) {
      query.source = source;
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const total = await AvailabilityLedger.countDocuments(query);
    const entries = await AvailabilityLedger.find(query)
      .sort({ startDate: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
