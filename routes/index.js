import express from 'express';
import AppController from '../controllers/AppController';
import UserController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FileController from '../controllers/FilesController';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UserController.postNew);
router.get('/users/me', UserController.getMe);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisConnect);
router.post('/files', FileController.postUpload);
router.get('/files/:id', FileController.getShow);
router.get('/files', FileController.getIndex);
router.put('/files/:id/publish', FileController.putPublish);
router.put('/files/:id/unpublish', FileController.putUnpublish);
export default router;
