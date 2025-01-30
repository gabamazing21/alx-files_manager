import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull/lib/queue';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FileController = {
  async postUpload(req, res) {
    const token = req.headers['x-token'];
    const filelocation = await dbClient.fileCollection();
    const usersCollection = await dbClient.usersCollection();
    const fileQueue = new Queue('fileQueue');

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
      if (data.type === 'image') {
        fileQueue.add({ fileId: result.insertedId, userId: user._id });
      }
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
  async getShow(req, res) {
    const token = req.headers['x-token'];
    const filelocation = await dbClient.fileCollection();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filedId = req.params.id;

    if (!ObjectId.isValid(filedId)) {
      return res.status(404).json({ error: 'Not Found' });
    }
    const file = await filelocation.findOne({
      _id: new ObjectId(filedId),
      userId: new ObjectId(userId),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  },
  async getIndex(req, res) {
    const token = req.headers['x-token'];
    const filelocation = await dbClient.fileCollection();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const pageNumber = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const matchQuery = { userId: new ObjectId(userId) };
    if (parentId !== 0) {
      matchQuery.parentId = new ObjectId(parentId);
    }

    const files = await filelocation
      .aggregate([
        { $match: matchQuery },
        { $skip: pageNumber * pageSize },
        { $limit: pageSize },
      ]).toArray();

    return res.status(200).json(
      files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      })),
    );
  },
  async putPublish(req, res) {
    const token = req.headers['x-token'];
    const filelocation = await dbClient.fileCollection();
    const usersCollection = await dbClient.usersCollection();
    const filedId = req.params.id;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // check if user exist in db for that particular user
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!ObjectId.isValid(filedId)) {
      return res.status(404).json({ error: 'Not Found' });
    }
    const file = await filelocation.findOne({
      _id: new ObjectId(filedId),
      userId: new ObjectId(userId),
    });
    // check if file dcoument link with the user
    if (file.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Not Found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not Found' });
    }

    // check if the file belongs to the authenticated user
    await filelocation.updateOne(
      { _id: new ObjectId(filedId) },
      { $set: { isPublic: true } },
    );

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId,
    });
  },
  async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const filelocation = await dbClient.fileCollection();
    const usersCollection = await dbClient.usersCollection();
    const filedId = req.params.id;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // check if user exist in db for that particular user
    const user = usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!ObjectId.isValid(filedId)) {
      return res.status(404).json({ error: 'Not Found' });
    }
    const file = await filelocation.findOne({
      _id: new ObjectId(filedId),
      userId: new ObjectId(userId),
    });

    // check if file dcoument link with the user
    if (file.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Not Found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not Found' });
    }

    // check if the file belongs to the authenticated user
    if (file.userId.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Not Found' });
    }
    await filelocation.updateOne(
      { _id: new ObjectId(filedId) },
      { $set: { isPublic: false } },
    );

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId,
    });
  },
  async getFile(req, res) {
    const token = req.headers['x-token'];
    const filedId = req.params.id;
    const { size } = req.query;
    const filelocation = await dbClient.fileCollection();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!ObjectId.isValid(filedId)) {
      return res.status(404).json({ error: 'Not Found' });
    }
    const file = await filelocation.findOne({
      _id: new ObjectId(filedId),
      userId: new ObjectId(userId),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not Found' });
    }

    // check if the file belongs to the authenticated user
    if (file.userId.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Not Found' });
    }
    // check if file is public
    if (file.isPublic === false) {
      return res.status(404).json({ error: 'Not Found' });
    }

    // check if the file is a folder
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }
    let filepath;
    if (size && [100, 250, 500].includes(parseInt(size, 10))) {
      filepath = `${file.localPath}_${size}`;
    }
    // check if the fileis locally present
    try {
      await fs.access(filepath);
      res.sendFile(filepath);
      await fs.access(file.localPath);
    } catch (error) {
      return res.status(400).json({ error: 'Not Found' });
    }
    if (!file.localPath) {
      return res.status(400).json({ error: 'Not Found' });
    }
    try {
      // const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      // // generate unique filename
      // const filePath = path.join(folderPath, file.lo);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);

      const fileContent = await fs.readFile(file.localPath);
      return res.status(200).send(fileContent);
    } catch (error) {
      return res.status(404).json({ error: 'Not Found' });
    }
  },
};

export default FileController;
