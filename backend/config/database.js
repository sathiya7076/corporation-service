import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Set mongoose options to handle your specific issues
    const options = {
      // Disable deprecated warnings
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection pool settings
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      
      // Important: This prevents the transaction error you're seeing
      // By explicitly setting this to false for standalone MongoDB
      useCreateIndex: true,
      useFindAndModify: false,
      
      // Buffer settings
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      
      // Auto-reconnect settings
      autoReconnect: true,
      reconnectTries: 5,
      reconnectInterval: 500,
    };

    // Connect with explicit options
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`📊 Database name: ${conn.connection.name}`);
    console.log(`🔧 Connection state: ${conn.connection.readyState}`);

    // Set up connection event listeners for better debugging
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

    return conn;

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('🔍 Full error:', error);
    
    // More specific error handling
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('🌐 Network connectivity issue - Check your MongoDB URI and internet connection');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed - Check your MongoDB credentials');
    } else if (error.message.includes('replica set')) {
      console.error('🔄 Replica set issue - You might be using transactions with standalone MongoDB');
    }
    
    // Exit the process if connection fails
    process.exit(1);
  }
};

// Additional helper function to check connection status
export const checkConnection = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  
  console.log(`📊 Current MongoDB connection state: ${states[state] || 'unknown'}`);
  return states[state];
};

// Helper function to safely close connection
export const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed successfully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
};

export default connectDB;