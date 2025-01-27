import express from 'express';
import AppController from '../controller/AppController';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStatus);
export default router;
