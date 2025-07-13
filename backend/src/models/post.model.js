// This file defines the Mongoose schema for blog posts in a blogging application.
// It includes fields for title, content, author, tags, creation date, and views.
// The schema is then exported as a Mongoose model for use in other parts of the application

const mongoose = require('mongoose'); // Import Mongoose for MongoDB object modeling

// Define the schema for a blog post
// This schema includes fields for title, content, author, tags, creation date, and views   
const postSchema = new mongoose.Schema({
  title: { type: String },
  content: { type: String },
  author: { type: String },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 }
}, {collection: 'posts'});

// Export the Post model based on the postSchema
// This allows other parts of the application to interact with the posts collection in MongoDB
module.exports = mongoose.model('Post', postSchema);