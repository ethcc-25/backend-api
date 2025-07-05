import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';
import os from 'os';

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

    // Détecter si on est sur Ubuntu/Linux vs macOS
    const isLinux = os.platform() === 'linux';
    const isUbuntu = isLinux && os.release().includes('Ubuntu');
    
    console.log(`🔄 Connecting to MongoDB from ${os.platform()} (${os.release()})...`);

    let uri: string;
    let clientOptions: any;

    if (isLinux) {
      // Configuration spécifique pour Ubuntu/Linux
      uri = `mongodb+srv://paul:${mongoPassword}@eth-cc.4o0hvn9.mongodb.net/defi-apy-db?retryWrites=true&w=majority&appName=eth-cc&ssl=true&sslValidate=false&authSource=admin&tlsInsecure=true`;
      
      clientOptions = {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        // Timeouts plus longs pour Ubuntu
        connectTimeoutMS: 60000,
        socketTimeoutMS: 60000,
        serverSelectionTimeoutMS: 60000,
        maxPoolSize: 5,
        retryWrites: true,
        retryReads: true,
        // SSL/TLS options pour Ubuntu - plus permissives
        tls: true,
        tlsInsecure: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        // Désactiver complètement la vérification SSL pour Ubuntu
        checkServerIdentity: false,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 30000
      };
    } else {
      // Configuration pour macOS/développement local
      uri = `mongodb+srv://paul:${mongoPassword}@eth-cc.4o0hvn9.mongodb.net/?retryWrites=true&w=majority&appName=eth-cc&ssl=true&tlsAllowInvalidCertificates=true`;
      
      clientOptions = {
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
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true
      };
    }

    // Create a MongoClient with environment-specific options
    client = new MongoClient(uri, clientOptions);
    
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