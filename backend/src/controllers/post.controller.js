// File: blog-be/src/controllers/post.controller.js
// This file contains the controller functions for handling blog post operations.   
// It includes functions to get all posts, create a new post, get a post by ID, update a post, and delete a post.
// Each function interacts with the Post model to perform the necessary database operations and returns appropriate responses.

const Post = require('../models/post.model');

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }); // Fetch all posts sorted by creation date in descending order
    // Check if posts are found, if not return a 404 status code with an error message
    // This ensures that the client receives a meaningful response when no posts are available
    if (!posts.length) return res.status(404).json({ message: 'No posts found' }); // Check if no posts are found
    // Return the list of posts as a JSON response  
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, author, tags } = req.body; // Destructure the request body to get the post details
    // Create a new Post instance with the provided details
    const newPost = new Post({ title, content, author, tags });
    await newPost.save(); // Save the new post to the database
    // Return the newly created post as a JSON response with a 201 status code
    // This indicates that a new resource has been successfully created
    if (!newPost) return res.status(400).json({ message: 'Error creating post' });
    
    // This ensures that the client receives the created post data in a structured format
    res.status(201).json(newPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id); // Fetch a post by its ID from the request parameters
    // Check if the post exists, if not return a 404 status code with an error
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true }); // Update a post by its ID with the new data from the request body
    // Check if the post was found and updated, if not return a 404 status code
    if (!updatedPost) return res.status(404).json({ message: 'Post not found' });
    res.json(updatedPost); // Return the updated post as a JSON response
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id); // Delete a post by its ID from the request parameters
    // Check if the post was found and deleted, if not return a 404 status code
    if (!deletedPost) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted' }); // Return a success message indicating the post was deleted
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};