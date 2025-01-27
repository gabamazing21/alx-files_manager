import sha1 from 'sha1';
import dbClient from '../utils/db';

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

    return res.status(200).json({ id: result.insertedId, email });
  },

};

export default UserController;
