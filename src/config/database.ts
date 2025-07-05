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


    const uri = `mongodb+srv://paul:${mongoPassword}@eth-cc.4o0hvn9.mongodb.net/?retryWrites=true&w=majority&appName=eth-cc&ssl=true&tlsAllowInvalidCertificates=true`;

    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      // Simplified connection options
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      // TLS options
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true
    });
    
    // Connect the client to the server
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    
    // Set the database
    database = client.db("defi-apy-db");
    
    console.log("✅ Successfully connected to MongoDB!");
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Server will continue without MongoDB. Profile endpoints will use in-memory storage.');
    
    // Clean up on error
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