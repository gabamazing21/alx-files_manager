import express from 'express';
import AppController from '../controller/AppController';
import UserController from '../controller/UsersController';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStatus);
router.post('/users', UserController.postNew);
export default router;
