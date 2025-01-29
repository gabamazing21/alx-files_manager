import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectId } from 'mongodb';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FileController = {
  async postUpload(req, res) {
    const token = req.headers['x-token'];
    const filelocation = await dbClient.fileCollection();
    const usersCollection = await dbClient.usersCollection();

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parent = await filelocation.findOne({ _id: new ObjectId(parentId) });
      if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    // look for user in the databae
    const objectId = new ObjectId(userId);
    const user = await usersCollection.findOne({ _id: objectId });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // prepare the file document
    const fileDocument = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    // Handle folder creation
    if (type === 'folder') {
      const result = await filelocation.insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    try {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

      // create storage direcoty if it doesn't exist
      await fs.mkdir(folderPath, { recursive: true });

      // generate unique filename
      const filePath = path.join(folderPath, uuidv4());

      // Save file to disk
      const fileContent = Buffer.from(data, 'base64');
      await fs.writeFile(filePath, fileContent);
      fileDocument.localPath = filePath;

      const result = await filelocation.insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    } catch (error) {
      console.error('Error saving file:', error);
      return res.status(500).json({ error: 'Error saving file' });
    }
  },
};

export default FileController;
