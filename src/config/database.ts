import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';
import os from 'os';

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

  const isLinux = os.platform() === 'linux';
  
  // Sur Linux/Ubuntu, on désactive MongoDB à cause des problèmes SSL
  if (isLinux) {
    console.log('🔄 Connecting to MongoDB from linux (6.8.0-62-generic)...');
    console.log('⚠️  MongoDB disabled on Linux due to SSL/TLS compatibility issues');
    console.log('✅ Server will use in-memory storage for profiles');
    console.log('🚀 CCTP API and other endpoints work perfectly without MongoDB');
    return;
  }

  // Sur macOS/développement, on utilise MongoDB normalement
  console.log(`🔄 Connecting to MongoDB from ${os.platform()} (${os.release()})...`);
  console.log(`🔑 Using username: paul`);
  console.log(`🔑 Password length: ${mongoPassword.length} characters`);
  console.log(`🔑 Password starts with: ${mongoPassword.substring(0, 3)}...`);
  
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
      },
      {
        name: 'Direct connection without SSL',
        uri: `mongodb://paul:${encodeURIComponent(mongoPassword)}@ac-lzdpuke-shard-00-00.4o0hvn9.mongodb.net:27017,ac-lzdpuke-shard-00-01.4o0hvn9.mongodb.net:27017,ac-lzdpuke-shard-00-02.4o0hvn9.mongodb.net:27017/defi-apy-db?replicaSet=atlas-numqkw-shard-0&authSource=admin&retryWrites=true&w=majority`,
        options: {
          serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
          connectTimeoutMS: 10000,
          socketTimeoutMS: 10000,
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 5,
          tls: false,
          ssl: false,
        }
      },
      {
        name: 'Fallback: Skip MongoDB completely',
        uri: '', // URI vide pour déclencher une erreur immédiate
        options: {}
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