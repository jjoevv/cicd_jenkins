//import 'dotenv/config';

//import express from 'express';
//import connectDB from './config/db.js'; 

const dotenv = require('dotenv'); // Import dotenv to manage environment variables
dotenv.config(); // Load environment variables from .env file   
const express = require('express'); // Import Express framework for building web applications
const connectDB = require('./config/db'); // Import the database connection function

const app = require('./app'); // Import the Express app configuration
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB(process.env.MONGODB_URI);

app.get('/', (req, res) => {
    res.send('✅ Server is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
