import mongoose from 'mongoose';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import PropertyDocument from '../models/PropertyDocument.js';
import Partner from '../partner/models/Partner.js';
import { PROPERTY_DOCUMENTS } from '../config/propertyDocumentRules.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import User from '../user/models/User.js';
import Admin from '../admin/models/Admin.js';

const notifySubmission = async (property) => {
  try {
    // 1. Notify Admin (Email & Push)
    const admin = await Admin.findOne({ role: { $in: ['admin', 'superadmin'] } });
    if (admin && admin.email) {
      emailService.sendAdminNewPropertyEmail(admin.email, property).catch(e => console.error('Admin Property Email Error:', e));
    }

    notificationService.sendToAdmins({
      title: 'New Property for Review 🏨',
      body: `${property.propertyName} (${property.propertyType}) has been submitted by a partner.`
    }, { type: 'new_property_submission', propertyId: property._id }).catch(e => console.error('Admin Property Push Error:', e));

    // 2. Notify Partner (Email Confirmation)
    const partner = await Partner.findById(property.partnerId);
    if (partner && partner.email) {
      emailService.sendPartnerPropertyAddedEmail(partner, property).catch(e => console.error('Partner Property Email Error:', e));
    }

  } catch (err) {
    console.warn('Could not notify about property submission:', err.message);
  }
};

export const createProperty = async (req, res) => {
  try {
    const { propertyName, contactNumber, propertyType, description, shortDescription, coverImage, propertyImages, amenities, address, location, nearbyPlaces, checkInTime, checkOutTime, cancellationPolicy, houseRules, documents, roomTypes, pgType, hostelType, hostLivesOnProperty, resortType, activities, hotelCategory, starRating } = req.body;
    if (!propertyName || !propertyType || !coverImage) return res.status(400).json({ message: 'Missing required fields' });
    
    // Validate contact number if provided (Indian mobile: 10 digits, starts with 6-9)
    if (contactNumber && contactNumber.trim() !== '') {
      const digitsOnly = contactNumber.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        return res.status(400).json({ message: 'Contact number must be exactly 10 digits' });
      }
      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        return res.status(400).json({ message: 'Contact number must be a valid Indian mobile number (starts with 6, 7, 8, or 9)' });
      }
      // Store only digits (remove +91, spaces, dashes if any)
      req.body.contactNumber = digitsOnly;
    }
    const lowerType = propertyType.toLowerCase();
    const requiredDocs = PROPERTY_DOCUMENTS[lowerType] || [];
    const nearbyPlacesArray = Array.isArray(nearbyPlaces) ? nearbyPlaces : [];
    const propertyImagesArray = Array.isArray(propertyImages) ? propertyImages : [];
    const docsArray = Array.isArray(documents) ? documents : [];
    const doc = new Property({
      propertyName,
      contactNumber,
      propertyType: lowerType,
      propertyType: lowerType,
      shortDescription,
      partnerId: req.user._id,
      address,
      location,
      nearbyPlaces: nearbyPlacesArray,
      amenities,
      coverImage,
      propertyImages: propertyImagesArray,
      checkInTime,
      checkOutTime,
      cancellationPolicy,
      houseRules,
      pgType: lowerType === 'pg' ? pgType : undefined,
      hostelType: lowerType === 'hostel' ? hostelType : undefined,
      hostLivesOnProperty: lowerType === 'homestay' ? hostLivesOnProperty : undefined,
      resortType: lowerType === 'resort' ? resortType : undefined,
      activities: lowerType === 'resort' ? activities : undefined,
      hotelCategory: lowerType === 'hotel' ? hotelCategory : undefined,
      starRating: lowerType === 'hotel' ? starRating : undefined,
      suitability: req.body.suitability || 'none'
    });
    // Pricing is now handled in RoomType for ALL types
    await doc.save();
    // Inline RoomTypes if provided
    if (Array.isArray(roomTypes) && roomTypes.length > 0) {
      await RoomType.insertMany(
        roomTypes.map(rt => ({
          ...rt,
          propertyId: doc._id,
          isActive: true
        }))
      );
    }

    // Inline documents upsert on create
    if (docsArray.length) {
      await PropertyDocument.findOneAndUpdate(
        { propertyId: doc._id },
        {
          propertyType: lowerType,
          documents: docsArray.map(d => ({
            type: d.type,
            name: d.name || d.type,
            fileUrl: d.fileUrl,
            isRequired: requiredDocs.includes(d.name || d.type),
          })),
          verificationStatus: 'pending',
          adminRemark: undefined,
          verifiedAt: undefined
        },
        { new: true, upsert: true }
      );
      // Move property to pending for admin verification
      doc.status = 'pending';
      doc.isLive = false;
      await doc.save();
    }

    // AUTO-SUBMIT: If room types are provided, we consider it a full submission
    if (Array.isArray(roomTypes) && roomTypes.length > 0 && doc.status === 'draft') {
      doc.status = 'pending';
      await doc.save();
    }

    // NOTIFICATION: Notify Admin only if pending
    if (doc.status === 'pending') {
      notifySubmission(doc).catch(e => console.error(e));
    }

    res.status(201).json({ success: true, property: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    
    // Validate contact number if provided (Indian mobile: 10 digits, starts with 6-9)
    if (payload.contactNumber !== undefined && payload.contactNumber !== null && String(payload.contactNumber).trim() !== '') {
      const digitsOnly = String(payload.contactNumber).replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        return res.status(400).json({ message: 'Contact number must be exactly 10 digits' });
      }
      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        return res.status(400).json({ message: 'Contact number must be a valid Indian mobile number (starts with 6, 7, 8, or 9)' });
      }
      // Store only digits (remove +91, spaces, dashes if any)
      payload.contactNumber = digitsOnly;
    }

    const updatableFields = [
      'propertyName',
      'shortDescription',
      'address',
      'location',
      'nearbyPlaces',
      'amenities',
      'coverImage',
      'propertyImages',
      'checkInTime',
      'checkOutTime',
      'cancellationPolicy',
      'houseRules',
      'pgType',
      'hostLivesOnProperty',
      'resortType',
      'activities',
      'hotelCategory',
      'starRating',
      'contactNumber',
      'suitability',
      'isLive',
      'fakePrice'
    ];

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        property[field] = payload[field];
      }
    });

    await property.save();

    // documents update if provided
    if (payload.documents && Array.isArray(payload.documents)) {
      const lowerType = property.propertyType.toLowerCase();
      const requiredDocs = PROPERTY_DOCUMENTS[lowerType] || [];
      await PropertyDocument.findOneAndUpdate(
        { propertyId: property._id },
        {
          propertyType: lowerType,
          documents: payload.documents.map(d => ({
            type: d.type,
            name: d.name || d.type,
            fileUrl: d.fileUrl,
            isRequired: requiredDocs.includes(d.name || d.type),
          })),
          verificationStatus: 'pending',
          adminRemark: undefined,
          verifiedAt: undefined
        },
        { new: true, upsert: true }
      );
      property.status = 'pending';
      await property.save();

      // Notify Admin of update
      notificationService.sendToAdmins({
        title: 'Property Updated 📝',
        body: `${property.propertyName} has updated documents/details and is pending re-verification.`
      }, { type: 'property_updated', propertyId: property._id }).catch(e => console.error('Admin Update Push Error:', e));
    }

    res.json({ success: true, property });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const addRoomType = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { name, inventoryType, roomCategory, maxAdults, maxChildren, bedsPerRoom, totalInventory, pricePerNight, extraAdultPrice, extraChildPrice, images, amenities } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (!pricePerNight) return res.status(400).json({ message: 'pricePerNight required' });

    // For Villa, inventoryType must be 'entire'
    if (property.propertyType === 'villa' && inventoryType !== 'entire') {
      return res.status(400).json({ message: 'Villa must have inventoryType="entire"' });
    }

    if (property.propertyType === 'hotel' && inventoryType !== 'room') {
      return res.status(400).json({ message: 'Hotel must have inventoryType="room"' });
    }

    if (property.propertyType === 'resort' && inventoryType !== 'room') {
      return res.status(400).json({ message: 'Resort must have inventoryType="room"' });
    }

    // For Hostel, inventoryType must be 'bed'
    if (property.propertyType === 'hostel' && inventoryType !== 'bed') {
      return res.status(400).json({ message: 'Hostel must have inventoryType="bed"' });
    }

    // For PG, inventoryType must be 'bed'
    if (property.propertyType === 'pg' && inventoryType !== 'bed') {
      return res.status(400).json({ message: 'PG must have inventoryType="bed"' });
    }

    // For Homestay, inventoryType can be 'room' or 'entire'
    if (property.propertyType === 'homestay' && !['room', 'entire'].includes(inventoryType)) {
      return res.status(400).json({ message: 'Homestay must have inventoryType="room" or "entire"' });
    }

    const normalizedImages = Array.isArray(images)
      ? images.filter(Boolean)
      : typeof images === 'string'
        ? images.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const rt = await RoomType.create({
      propertyId,
      name,
      inventoryType,
      roomCategory,
      maxAdults,
      maxChildren,
      bedsPerRoom,
      totalInventory,
      pricePerNight,
      extraAdultPrice,
      extraChildPrice,
      images: normalizedImages,
      amenities
    });
    res.status(201).json({ success: true, roomType: rt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;
    const payload = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const roomType = await RoomType.findOne({ _id: roomTypeId, propertyId });
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    const updatableFields = [
      'name',
      'inventoryType',
      'roomCategory',
      'maxAdults',
      'maxChildren',
      'bedsPerRoom',
      'totalInventory',
      'pricePerNight',
      'extraAdultPrice',
      'extraChildPrice',
      'images',
      'amenities',
      'isActive'
    ];

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        roomType[field] = payload[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(payload, 'images')) {
      if (Array.isArray(payload.images)) {
        roomType.images = payload.images.filter(Boolean);
      } else if (typeof payload.images === 'string') {
        roomType.images = payload.images.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        roomType.images = [];
      }
    }

    if (payload.inventoryType) {
      if (property.propertyType === 'villa' && roomType.inventoryType !== 'entire') {
        return res.status(400).json({ message: 'Villa must have inventoryType="entire"' });
      }
      if (property.propertyType === 'hotel' && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: 'Hotel must have inventoryType="room"' });
      }
      if (property.propertyType === 'resort' && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: 'Resort must have inventoryType="room"' });
      }
      if (property.propertyType === 'hostel' && roomType.inventoryType !== 'bed') {
        return res.status(400).json({ message: 'Hostel must have inventoryType="bed"' });
      }
      if (property.propertyType === 'pg' && roomType.inventoryType !== 'bed') {
        return res.status(400).json({ message: 'PG must have inventoryType="bed"' });
      }
      if (property.propertyType === 'homestay' && !['room', 'entire'].includes(roomType.inventoryType)) {
        return res.status(400).json({ message: 'Homestay must have inventoryType="room" or "entire"' });
      }
    }

    await roomType.save();

    res.json({ success: true, roomType });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const roomType = await RoomType.findOneAndDelete({ _id: roomTypeId, propertyId });
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const upsertDocuments = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const required = PROPERTY_DOCUMENTS[property.propertyType] || [];
    const payloadDocs = Array.isArray(req.body.documents) ? req.body.documents : [];
    const doc = await PropertyDocument.findOneAndUpdate(
      { propertyId },
      {
        propertyType: property.propertyType,
        documents: payloadDocs.map(d => ({
          type: d.type,
          name: d.name || d.type,
          fileUrl: d.fileUrl,
          isRequired: required.includes(d.name || d.type)
        })),
        verificationStatus: 'pending',
        adminRemark: undefined,
        verifiedAt: undefined
      },
      { new: true, upsert: true }
    );
    const wasDraft = property.status === 'draft';
    property.status = 'pending';
    property.isLive = false;
    await property.save();

    if (wasDraft) {
      notifySubmission(property).catch(e => console.error(e));
    } else {
      // Notify Admin of document update
      notificationService.sendToAdmins({
        title: 'Property Docs Updated 📁',
        body: `Partner has updated documents for "${property.propertyName}". Review needed.`
      }, { type: 'property_docs_updated', propertyId: property._id }).catch(e => console.error('Admin Docs Update Push Error:', e));
    }

    res.json({ success: true, property, propertyDocument: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json([]);

    const regex = new RegExp(query, 'i');
    const suggestions = [];

    // 1. Search Cities
    const cities = await Property.distinct("address.city", { 
      "address.city": regex, 
      status: 'approved', 
      isLive: true 
    });
    cities.forEach(city => {
      suggestions.push({
        name: city,
        subtitle: "City in " + (query.length > 3 ? "India" : "suggestions"),
        icon: "🏙️",
        type: 'city'
      });
    });

    // 2. Search Properties (Hotels)
    const properties = await Property.find({
      propertyName: regex,
      status: 'approved',
      isLive: true
    }).limit(5).select('propertyName address.city propertyType');

    properties.forEach(p => {
      suggestions.push({
        name: p.propertyName,
        subtitle: `${p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1)} in ${p.address.city}`,
        icon: "🏨",
        type: 'hotel',
        id: p._id
      });
    });

    // 3. Category/Suitability Suggestions
    const suitabilityOptions = ["Couple Friendly", "Family Friendly"];
    suitabilityOptions.forEach(opt => {
      if (opt.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          name: opt,
          subtitle: "Property Category",
          icon: "✨",
          type: 'category'
        });
      }
    });

    // 4. Property Type Suggestions
    const types = ["Hotel", "Villa", "Resort", "Hostel", "PG", "Homestay"];
    types.forEach(t => {
      if (t.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          name: t,
          subtitle: "Accommodation Type",
          icon: "🏠",
          type: 'propertyType'
        });
      }
    });

    res.json(suggestions.slice(0, 10));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPublicProperties = async (req, res) => {
  try {
    const {
      search,
      type,
      minPrice,
      maxPrice,
      amenities,
      lat,
      lng,
      radius = 50, // default 50km
      guests,
      sort,
      suitability
    } = req.query;

    const pipeline = [];

    // 1. Geospatial Search (Must be first if used)
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          maxDistance: parseFloat(radius) * 1000, // convert km to meters
          spherical: true,
          query: { status: 'approved', isLive: true }
        }
      });
    } else {
      // Basic match if no geo
      pipeline.push({ $match: { status: 'approved', isLive: true } });
    }

    // 2. Text/Filter Match
    const matchConditions = {};

    if (type && type !== 'all') {
      const typesList = type.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (typesList.length > 0) {
        matchConditions.propertyType = { $in: typesList };
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      matchConditions.$or = [
        { propertyName: regex },
        { "address.city": regex },
        { "address.area": regex },
        { "address.fullAddress": regex },
        { "suitability": regex },
        { "propertyType": regex }
      ];
    }

    if (amenities) {
      const amList = Array.isArray(amenities) ? amenities : amenities.split(',');
      if (amList.length > 0) {
        matchConditions.amenities = { $all: amList };
      }
    }

    // Suitability filter: Couple Friendly / Family Friendly also match "Both"
    if (suitability && suitability !== 'all') {
      if (suitability === 'Couple Friendly') {
        matchConditions.suitability = { $in: ['Couple Friendly', 'Both'] };
      } else if (suitability === 'Family Friendly') {
        matchConditions.suitability = { $in: ['Family Friendly', 'Both'] };
      } else if (suitability === 'Both') {
        matchConditions.suitability = 'Both';
      }
    }


    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // 3. Lookup Room Types (For Price & Guest Capacity)
    // Use dynamic collection name for robustness
    const roomTypeCollection = RoomType.collection.name;

    pipeline.push({
      $lookup: {
        from: roomTypeCollection,
        localField: '_id',
        foreignField: 'propertyId',
        as: 'roomTypes'
      }
    });

    // 4. Filter Active Room Types & Guest Capacity
    let roomFilter = { $eq: ['$$rt.isActive', true] };

    if (guests) {
      const guestCount = parseInt(guests);
      // Room must accommodate guests (base adults + children? simplified to maxAdults for now)
      // Usually users search by "2 adults", so check maxAdults
      roomFilter = {
        $and: [
          { $eq: ['$$rt.isActive', true] },
          { $gte: ['$$rt.maxAdults', guestCount] }
        ]
      };
    }

    pipeline.push({
      $addFields: {
        roomTypes: {
          $filter: {
            input: '$roomTypes',
            as: 'rt',
            cond: roomFilter
          }
        }
      }
    });

    // 5. Calculate Starting Price (Min Price of valid rooms)
    pipeline.push({
      $addFields: {
        startingPrice: {
          $cond: {
            if: { $gt: [{ $size: "$roomTypes" }, 0] },
            then: { $min: "$roomTypes.pricePerNight" },
            else: null // Will filter out properties with no matching rooms later if strictly needed
          }
        },
        hasMatchingRooms: { $gt: [{ $size: "$roomTypes" }, 0] }
      }
    });

    // 6. Filter by Price Range
    const priceMatch = {};
    // Only show properties that actually have available room types matching criteria
    priceMatch.hasMatchingRooms = true;

    if (minPrice) {
      priceMatch.startingPrice = { ...priceMatch.startingPrice, $gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      priceMatch.startingPrice = { ...priceMatch.startingPrice, ...(priceMatch.startingPrice || {}), $lte: parseInt(maxPrice) };
    }

    if (Object.keys(priceMatch).length > 0) {
      pipeline.push({ $match: priceMatch });
    }

    // 7. Sorting
    let sortStage = { isVerified: -1, createdAt: -1 }; // Default new + Verified first
    if (sort) {
      if (sort === 'newest') sortStage = { isVerified: -1, createdAt: -1 };
      if (sort === 'price_low') sortStage = { isVerified: -1, startingPrice: 1 };
      if (sort === 'price_high') sortStage = { isVerified: -1, startingPrice: -1 };
      if (sort === 'rating') sortStage = { isVerified: -1, avgRating: -1 };
      if (sort === 'distance' && lat && lng) sortStage = { isVerified: -1, distance: 1 };
    }

    pipeline.push({ $sort: sortStage });

    // Execute
    const list = await Property.aggregate(pipeline);
    res.json(list);

  } catch (e) {
    console.error("Error in getPublicProperties:", e);
    res.status(500).json({ message: e.message });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const query = { partnerId: req.user._id, status: { $ne: 'draft' } };
    if (req.query.type) {
      query.propertyType = String(req.query.type).toLowerCase();
    }
    const properties = await Property.find(query).sort({ createdAt: -1 });
    res.json({ success: true, properties });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const roomTypes = await RoomType.find({ propertyId: id, isActive: true });
    const documents = await PropertyDocument.findOne({ propertyId: id });
    res.json({ property, roomTypes, documents });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    // Ensure the property belongs to the logged-in partner
    const property = await Property.findOne({ _id: propertyId, partnerId: req.user._id });

    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    // Delete associated room types
    await RoomType.deleteMany({ propertyId });

    // Delete associated documents
    await PropertyDocument.deleteMany({ propertyId });

    // Delete the property
    const deletedPropName = property.propertyName;
    await Property.findByIdAndDelete(propertyId);

    // NOTIFICATION: Notify Admin of deletion
    notificationService.sendToAdmins({
      title: 'Property Deleted 🗑️',
      body: `Property "${deletedPropName}" has been deleted by the partner.`
    }, { type: 'property_deleted', propertyId }).catch(e => console.error('Admin Delete Push Error:', e));

    // NOTIFICATION: Notify Partner of deletion
    Partner.findById(req.user._id).then(partner => {
      if (partner && partner.email) {
        emailService.sendPartnerPropertyDeletedEmail(partner, property, 'Partner (Self)').catch(e => console.error(e));
      }
    });

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
};
