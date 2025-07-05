import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient | null = null;
let database: Db | null = null;

const connectDB = async (): Promise<void> => {
  const mongoPassword = process.env.MONGODB_PASSWORD;
  
  if (!mongoPassword) {
    console.error('MONGODB_PASSWORD environment variable is required');
    console.log('Server will continue without MongoDB. Profile endpoints will use in-memory storage.');
    return;
  }  
  
  try {
    const connections = [
      {
        name: 'MongoDB Atlas without SSL validation',
        uri: `mongodb+srv://paul:${encodeURIComponent(mongoPassword)}@eth-cc.4o0hvn9.mongodb.net/?retryWrites=true&w=majority&appName=eth-cc`,
        options: {
          serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
          connectTimeoutMS: 10000,
          socketTimeoutMS: 10000,
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 5,
          tls: true,
          tlsInsecure: true,
        }
      }
    ];
    
    for (const connection of connections) {
      try {
        client = new MongoClient(connection.uri, connection.options);
        
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        database = client.db("defi-apy-db");
        
        console.log(`✅ Successfully connected to MongoDB using ${connection.name}!`);
        break;
      } catch (error) {
        console.error(`❌ MongoDB connection error using ${connection.name}: ${error}`);
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
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ MongoDB connection error: ${errorMessage}`);
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

// Export functions to get client and database
export const getMongoClient = (): MongoClient | null => client;
export const getDatabase = (): Db | null => database;

// Graceful shutdown
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