// 📄 src/db.js


//import mongoose from 'mongoose'; // Import mongoose for MongoDB connection
const mongoose = require('mongoose'); // Import mongoose for MongoDB connection

async function connectDB(uri) {
    try {
        mongoose.set('strictQuery', false);     //Allow flexible querying
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

module.exports = connectDB; // Export the connectDB function for use in other files
