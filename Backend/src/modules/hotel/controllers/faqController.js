import Faq from '../models/Faq.js';

// @desc    Create a new FAQ
// @route   POST /api/faqs
// @access  Private/Admin
export const createFaq = async (req, res) => {
  try {
    const { question, answer, audience, isActive, order } = req.body;

    if (!question || !answer || !audience) {
      return res.status(400).json({ message: 'Question, Answer, and Audience are required' });
    }

    const faq = await Faq.create({
      question,
      answer,
      audience,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all FAQs (Public - Active Only)
// @route   GET /api/faqs
// @access  Public
export const getFaqs = async (req, res) => {
  try {
    const { audience } = req.query;
    const filter = { isActive: true };

    if (audience) {
      filter.audience = audience;
    }

    const faqs = await Faq.find(filter).sort({ order: 1, createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all FAQs (Admin - All)
// @route   GET /api/faqs/admin
// @access  Private/Admin
export const getAllFaqsAdmin = async (req, res) => {
  try {
    const { audience } = req.query;
    const filter = {};

    if (audience) {
      filter.audience = audience;
    }

    const faqs = await Faq.find(filter).sort({ createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private/Admin
export const updateFaq = async (req, res) => {
  try {
    const faq = await Faq.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    faq.question = req.body.question || faq.question;
    faq.answer = req.body.answer || faq.answer;
    faq.audience = req.body.audience || faq.audience;
    if (req.body.isActive !== undefined) faq.isActive = req.body.isActive;
    if (req.body.order !== undefined) faq.order = req.body.order;

    const updatedFaq = await faq.save();
    res.json(updatedFaq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private/Admin
export const deleteFaq = async (req, res) => {
  try {
    const result = await Faq.deleteOne({ _id: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    res.json({ message: 'FAQ removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
