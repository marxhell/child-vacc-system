const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const resolvedUri = new URL(uri);
    const databaseName = process.env.MONGO_DB_NAME || 'child-vaccination-system';
    resolvedUri.pathname = `/${databaseName}`;

    const conn = await mongoose.connect(resolvedUri.toString());

    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
