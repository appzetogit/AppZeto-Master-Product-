import Blog from '../models/Blog.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const generateSlug = (text) => {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '') // remove special chars
    .replace(/[\s\-_]+/g, '-') // spaces to dashes
    .replace(/^-+|-+$/g, ''); // trim dashes
};

// Get all blogs
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: blogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new blog
export const createBlog = async (req, res) => {
  try {
    const { title, category, readTime, badge, excerpt, content, seoTitle, seoDescription, seoKeywords } = req.body;
    let imageUrl = req.body.image; // Fallback to URL if provided

    // If a file is uploaded, use Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'blogs');
      imageUrl = uploadResult.url;
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }
    
    // Generate unique slug
    let slug = generateSlug(title);
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const newBlog = new Blog({
      title,
      category,
      readTime,
      badge,
      image: imageUrl,
      excerpt,
      content,
      slug,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      seoKeywords: seoKeywords || ''
    });

    await newBlog.save();

    res.status(201).json({
      success: true,
      data: newBlog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a blog
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If a new file is uploaded, update image on Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'blogs');
      updateData.image = uploadResult.url;
    }

    // Generate slug for legacy nodes that didn't have one
    const currentBlog = await Blog.findById(id);
    if (currentBlog && !currentBlog.slug && req.body.title) {
       updateData.slug = generateSlug(req.body.title);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedBlog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a blog
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
