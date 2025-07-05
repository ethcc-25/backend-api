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
  console.log(`🔄 Connecting to MongoDB from ${os.platform()} (${os.release()})...`);

  // Configurations à tester dans l'ordre
  const configs = [
    {
      name: 'Standard SSL',
      uri: `mongodb+srv://paul:${mongoPassword}@eth-cc.4o0hvn9.mongodb.net/defi-apy-db?retryWrites=true&w=majority&appName=eth-cc`,
      options: {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 5,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
      }
    },
    {
      name: 'Minimal SSL',
      uri: `mongodb+srv://paul:${mongoPassword}@eth-cc.4o0hvn9.mongodb.net/defi-apy-db?retryWrites=true&w=majority&appName=eth-cc&ssl=true`,
      options: {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 5,
      }
    },
    {
      name: 'No SSL (Direct)',
      uri: `mongodb://paul:${mongoPassword}@ac-lzdpuke-shard-00-00.4o0hvn9.mongodb.net:27017,ac-lzdpuke-shard-00-01.4o0hvn9.mongodb.net:27017,ac-lzdpuke-shard-00-02.4o0hvn9.mongodb.net:27017/defi-apy-db?replicaSet=atlas-numqkw-shard-0&authSource=admin&retryWrites=true&w=majority`,
      options: {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 5,
        tls: false,
        ssl: false,
      }
    }
  ];

  // Tester chaque configuration
  for (const config of configs) {
    try {
      console.log(`🔄 Trying ${config.name}...`);
      
      // Créer une promesse de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Connection timeout after 8 seconds`)), 8000);
      });

      // Créer une promesse de connexion
      const connectionPromise = (async () => {
        const testClient = new MongoClient(config.uri, config.options);
        await testClient.connect();
        await testClient.db("admin").command({ ping: 1 });
        return testClient;
      })();

      // Race entre connexion et timeout
      const testClient = await Promise.race([connectionPromise, timeoutPromise]);
      
      // Si on arrive ici, la connexion a réussi
      client = testClient;
      database = client.db("defi-apy-db");
      
      console.log(`✅ Successfully connected to MongoDB using ${config.name}!`);
      return;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${config.name} failed: ${errorMessage}`);
      continue;
    }
  }

  // Si aucune configuration n'a fonctionné
  console.error('❌ All MongoDB connection attempts failed');
  console.log('Server will continue without MongoDB. Profile endpoints will use in-memory storage.');
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