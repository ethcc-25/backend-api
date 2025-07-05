import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient | null = null;
let database: Db | null = null;

const connectDB = async (): Promise<void> => {
  try {
    const mongoPassword = process.env.MONGODB_PASSWORD;
    
    if (!mongoPassword) {
      console.error('MONGODB_PASSWORD environment variable is required');
      console.log('Server will continue without MongoDB. Profile endpoints will use in-memory storage.');
      return;
    }

    // Configuration de fallback pour Ubuntu - connexion directe
    const uri = `mongodb://paul:${mongoPassword}@ac-lzdpuke-shard-00-00.4o0hvn9.mongodb.net:27017,ac-lzdpuke-shard-00-01.4o0hvn9.mongodb.net:27017,ac-lzdpuke-shard-00-02.4o0hvn9.mongodb.net:27017/defi-apy-db?ssl=false&replicaSet=atlas-numqkw-shard-0&authSource=admin&retryWrites=true&w=majority`;

    console.log('🔄 Connecting to MongoDB with fallback configuration...');

    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      // Pas de SSL
      tls: false,
      ssl: false
    });
    
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    database = client.db("defi-apy-db");
    
    console.log("✅ Successfully connected to MongoDB with fallback!");
    
  } catch (error) {
    console.error('MongoDB fallback connection error:', error);
    console.log('Server will continue without MongoDB. Profile endpoints will use in-memory storage.');
    
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing MongoDB client:', closeError);
      }
      client = null;
      database = null;
    }
  }
};

export const getMongoClient = (): MongoClient | null => client;
export const getDatabase = (): Db | null => database;

export const closeConnection = async (): Promise<void> => {
  if (client) {
    try {
      await client.close();
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }
};

export default connectDB; 