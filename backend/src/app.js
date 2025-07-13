// 📄 src/app.js
const express = require('express'); //
const cors = require('cors'); // Import necessary modules
const dotenv = require('dotenv'); // Import dotenv for environment variable management
const postRoutes = require('./routes/post.routes'); // Import post routes

dotenv.config(); // Load environment variables from .env file

const app = express(); // Create an Express application
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests
app.use('/api/posts', postRoutes); // Use post routes for handling /api/posts requests

module.exports = app; // Export the Express app instance
// This allows the server to import and use this app configuration