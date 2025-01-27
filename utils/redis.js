import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    // create a redis client
    const client = createClient();
    this.client = client;
    // conncect to redis
    this.client.on('error', (err) => console.log('Redis Client Error', err));
    // this.client.on('connect', () => {
    //   console.log('Connected to Redis server');
    // });
    this._getAsync = promisify(this.client.get).bind(this.client);
    this._setAsync = promisify(this.client.set).bind(this.client);
    this._delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async set(key, value, duration) {
    try {
      await this._setAsync(key, value, 'EX', duration);
    } catch (error) {
      console.error('Error setting key: ', error);
    }
  }

  async get(key) {
    try {
      const value = await this._getAsync(key);
      console.log(`Got value for key ${key}: ${value}`);
      return value;
    } catch (error) {
      console.error('Error getting key: ', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this._delAsync(key);
      console.log(`Deleted key: ${key}`);
    } catch (error) {
      console.error('Error deleting key: ', error);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
