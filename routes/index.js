import express from 'express';
import AppController from '../controller/AppController';
import UserController from '../controller/UsersController';
import AuthController from '../controller/AuthController';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStatus);
router.post('/users', UserController.postNew);
router.get('/users/me', UserController.getMe);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisConnect);

export default router;
