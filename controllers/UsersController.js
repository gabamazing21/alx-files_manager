import sha1 from 'sha1';
import ObjectId from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const UserController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    // check if the email already exists in the database
    const usersCollection = await dbClient.usersCollection();
    const userExists = await usersCollection.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: 'Already Exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    // Create a new user object

    const newUser = {
      email,
      password: hashedPassword,
    };

    // Inser the new user into the database
    const result = await usersCollection.insertOne(newUser);

    return res.status(201).json({ id: result.insertedId, email });
  },

  async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized no token' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized no user id' });
    }
    const objectId = new ObjectId(userId);
    const usersCollection = await dbClient.usersCollection();
    const user = await usersCollection.findOne({ _id: objectId });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  },

};

export default UserController;
