import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoPassword = process.env.MONGODB_PASSWORD!;
    await mongoose.connect(`mongodb+srv://paul:${encodeURIComponent(mongoPassword)}@eth-cc.4o0hvn9.mongodb.net/defi-apy-db?retryWrites=true&w=majority&appName=eth-cc`);
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