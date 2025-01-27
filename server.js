import express from 'express';
import router from './routes/index';
import redisClient from './utils/redis';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use('', router);
// Test Redis set and get
app.listen(port, async () => {
  // Test Redis set and get
  await redisClient.set('test_key', 'test_value', 60);
  const value = await redisClient.get('test_key');
  console.log(value); // Should print "test_value"
  console.log(`Example app listening on port ${port}`);
});
