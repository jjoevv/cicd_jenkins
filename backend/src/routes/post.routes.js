// This file sets up the Express application and connects to MongoDB
// It also defines the routes for handling blog post operations.    
// This file defines the routes for handling blog post operations.
// It includes routes to get all posts, create a new post, get a post by ID, update a post, and delete a post. Each route is linked to a corresponding controller function


const express = require('express'); // Import necessary modules
const router = express.Router(); // Create a new router instance
const postController = require('../controllers/post.controller'); // Import the post controller

router.get('/', postController.getAllPosts); // Route to get all posts
router.post('/', postController.createPost); // Route to create a new post
router.get('/:id', postController.getPostById); // Route to get a post by ID
router.put('/:id', postController.updatePost); // Route to update a post by ID
router.delete('/:id', postController.deletePost); // Route to delete a post by ID

module.exports = router; // Export the router for use in other parts of the application
// This allows the server to import and use these routes for handling blog post operations