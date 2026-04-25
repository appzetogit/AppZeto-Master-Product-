import express from 'express';
import { getAllBlogs, createBlog, updateBlog, deleteBlog } from '../controllers/blogController.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Public route to get all blogs
router.get('/', getAllBlogs);

// Management routes
router.post('/', upload.single('image'), createBlog);
router.put('/:id', upload.single('image'), updateBlog);
router.delete('/:id', deleteBlog);

export default router;
