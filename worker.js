import Queue from 'bull/lib/queue';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs/promises';
import path from 'path';
import ObjectId from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing filedId');
  if (!userId) throw new Error('Missing userId');
  const fileCollection = await dbClient.fileCollection();
  const file = await fileCollection.findOne({ _id: new ObjectId(fileId), userId });

  if (!file) throw new Error('File not found');

  const localpaths = file.localpath;
  if (!localpaths) throw new Error('local path not found');

  const sizes = [500, 250, 100];

  for (const size of sizes) {
    const thumbnailPath = `${localpaths}_${size}`;
    const options = { width: size };

    try {
      const thumbnail = await imageThumbnail(localpaths, options);
      await fs.writeFile(thumbnailPath, thumbnail);
    } catch (error) {
      console.error(`Error generating thumbnail for size ${size}`);
    }
  }
});
