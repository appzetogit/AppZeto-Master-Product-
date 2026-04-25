import Review from '../models/Review.js';
import Property from '../models/Property.js';
import mongoose from 'mongoose';
import notificationService from '../services/notificationService.js';
import emailService from '../services/emailService.js';

export const getPropertyReviews = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await Review.find({ propertyId, status: 'approved' })
      .populate('userId', 'name') // Assuming User model has 'name' field
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createReview = async (req, res) => {
  try {
    const { propertyId, bookingId, rating, comment } = req.body;
    console.log(`Creating review for Property: ${propertyId}, Rating: ${rating}`);

    if (!propertyId || !rating) {
      return res.status(400).json({ message: 'Property ID and Rating are required' });
    }

    // Check if user already reviewed this property
    const existingReview = await Review.findOne({ userId: req.user._id, propertyId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already submitted a review for this property' });
    }

    const review = await Review.create({
      userId: req.user._id,
      propertyId,
      bookingId,
      rating,
      comment,
      status: 'approved'
    });
    console.log('Review created:', review._id);

    // Calculate new stats directly from Reviews collection
    const objectId = new mongoose.Types.ObjectId(propertyId);

    const stats = await Review.aggregate([
      {
        $match: {
          propertyId: objectId,
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$propertyId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    console.log('Aggregation Stats:', stats);

    let avgRating = rating;
    let totalReviews = 1;

    if (stats.length > 0) {
      avgRating = Math.round(stats[0].avgRating * 10) / 10;
      totalReviews = stats[0].totalReviews;
    }

    // Update Property with new stats
    const property = await Property.findByIdAndUpdate(propertyId, {
      avgRating,
      totalReviews
    });
    console.log(`Property ${propertyId} updated: Avg ${avgRating}, Count ${totalReviews}`);

    // NOTIFICATION: Notify Partner
    if (property && property.partnerId) {
      notificationService.sendToPartner(property.partnerId, {
        title: 'New Review Received! ⭐',
        body: `Your property "${property.propertyName}" just received a ${rating}-star review.`
      }, { type: 'new_review', propertyId: property._id, reviewId: review._id }).catch(e => console.error(e));
    }

    res.status(201).json(review);
  } catch (e) {
    console.error("Review Submission Error:", e);
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerReviewStats = async (req, res) => {
  try {
    // 1. Get all properties for this partner
    const properties = await Property.find({ partnerId: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    // 2. Count reviews that have no reply
    const pendingReviewsCount = await Review.countDocuments({
      propertyId: { $in: propertyIds },
      reply: { $exists: false }
    });

    // 3. Get Average Rating (Overall)
    const stats = await Review.aggregate([
      { $match: { propertyId: { $in: propertyIds } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);

    res.json({
      success: true,
      pendingReviews: pendingReviewsCount,
      avgRating: stats.length > 0 ? stats[0].avgRating.toFixed(1) : 0
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerReviews = async (req, res) => {
  try {
    const { status } = req.query; // optional filter: 'pending', 'replied'

    // Get all partner properties
    const properties = await Property.find({ partnerId: req.user._id }).select('_id propertyName');
    const propertyIds = properties.map(p => p._id);

    const query = { propertyId: { $in: propertyIds } };

    if (status === 'pending') {
      query.reply = { $exists: false };
    } else if (status === 'replied') {
      query.reply = { $exists: true };
    }

    const reviews = await Review.find(query)
      .populate('userId', 'name')
      .populate('propertyId', 'propertyName')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!reply) return res.status(400).json({ message: 'Reply content is required' });

    const review = await Review.findById(reviewId).populate('propertyId').populate('userId');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Verify ownership
    if (String(review.propertyId.partnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to reply to this review' });
    }

    review.reply = reply;
    review.replyAt = new Date();
    await review.save();

    // NOTIFICATION: Notify User (Push + Email)
    if (review.userId) {
      const user = review.userId;

      // Push
      notificationService.sendToUser(user._id, {
        title: 'New Reply to Your Review 💬',
        body: `The manager of "${review.propertyId.propertyName}" has replied to your review.`
      }, { type: 'review_reply', reviewId: review._id }, 'user').catch(e => console.error(e));

      // Email
      if (user.email) {
        emailService.sendReviewReplyEmail(user, review, review.propertyId, reply).catch(e => console.error(e));
      }
    }

    res.json({ success: true, review });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const toggleHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Ensure array exists
    if (!review.helpfulVotes) review.helpfulVotes = [];

    const index = review.helpfulVotes.indexOf(userId);
    let isHelpful = false;

    if (index === -1) {
      // Add vote
      review.helpfulVotes.push(userId);
      isHelpful = true;
    } else {
      // Remove vote
      review.helpfulVotes.splice(index, 1);
      isHelpful = false;
    }

    await review.save();

    res.json({
      success: true,
      helpfulCount: review.helpfulVotes.length,
      isHelpful
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
