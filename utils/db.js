const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const dbName = 'files_manager';
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || dbName;

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.dbName = database;
    this.client.connect()
      .then(() => console.log('Connected to MongoDB'))
      .catch((err) => console.error('MongoDB connection error:', err));
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      const db = this.client.db(this.dbName);
      return await db.collection('users').countDocuments();
    } catch (err) {
      console.error('Error fetching user count:', err);
      return 0;
    }
  }

  async nbFiles() {
    try {
      const db = this.client.db(this.dbName);
      return await db.collection('files').countDocuments();
    } catch (err) {
      console.log('Error fetching file count:', err);
      return 0;
    }
  }
}

// create and export an instance of a class
const dbClient = new DBClient();
export default dbClient;
