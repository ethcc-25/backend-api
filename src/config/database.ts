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
  console.log(`🔑 Using username: paul`);
  console.log(`🔑 Password length: ${mongoPassword.length} characters`);
  console.log(`🔑 Password starts with: ${mongoPassword.substring(0, 3)}...`);
  
  // Vérifier l'adresse IP publique du serveur
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    console.log(`🌐 Server public IP: ${response.data.ip}`);
    console.log(`💡 Make sure this IP is whitelisted in MongoDB Atlas Network Access`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`⚠️  Could not fetch public IP: ${errorMessage}`);
  }

  // Configurations à tester dans l'ordre
  const configs = [
    {
      name: 'MongoDB Atlas Standard URI (Recommended)',
      uri: `mongodb+srv://paul:${encodeURIComponent(mongoPassword)}@eth-cc.4o0hvn9.mongodb.net/?retryWrites=true&w=majority&appName=eth-cc`,
      options: {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
      }
    },
    {
      name: 'MongoDB Atlas with Database specified',
      uri: `mongodb+srv://paul:${encodeURIComponent(mongoPassword)}@eth-cc.4o0hvn9.mongodb.net/defi-apy-db?retryWrites=true&w=majority&appName=eth-cc`,
      options: {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
      }
    },
    {
      name: 'MongoDB Atlas with authSource=admin',
      uri: `mongodb+srv://paul:${encodeURIComponent(mongoPassword)}@eth-cc.4o0hvn9.mongodb.net/defi-apy-db?retryWrites=true&w=majority&appName=eth-cc&authSource=admin`,
      options: {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
      }
    },
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

  // Tester chaque configuration
  for (const config of configs) {
    try {
      console.log(`🔄 Trying ${config.name}...`);
      
      // Créer une promesse de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Connection timeout after 15 seconds`)), 15000);
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
      
      // Log plus détaillé pour les erreurs d'authentification
      if (errorMessage.includes('auth') || errorMessage.includes('Authentication') || errorMessage.includes('credential')) {
        console.log(`🔍 Authentication error detected. Check username/password in MongoDB Atlas.`);
      }
      continue;
    }
  }

  // Si aucune configuration n'a fonctionné
  console.error('❌ All MongoDB connection attempts failed');
  console.log('💡 Suggestions:');
  console.log('   1. Check if username "paul" exists in MongoDB Atlas');
  console.log('   2. Verify password is correct');
  console.log('   3. Check if IP address is whitelisted');
  console.log('   4. Ensure user has proper roles (atlasAdmin or readWrite)');
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