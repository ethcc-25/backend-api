import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI as string);
    console.log('✅ Connected to MongoDB via Mongoose');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.log('⚠️  Continuing without MongoDB - using in-memory storage');
  }
};

export const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

export default connectDB;