import { createClient } from 'redis';

const client = createClient();

class RedisClient {
  constructor() {
    // create a redis client
    this.client = client;
    // conncect to redis
    this.client.on('error', (err) => console.log('Redis Client Error', err));
    this.client.on('connect', () => {
      console.log('Connected to Redis server');
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async set(key, value) {
    await this.client.set(key, value);
    console.log(`set key ${key}, value: ${value}`);
  }

  async get(key) {
    const value = await this.client.get(key);
    console.log(`Got value for key ${key}: ${value}`);
  }

  async del(key) {
    await this.client.del(key);
    console.log(`Deleted key: ${key}`);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
