
import express from 'express';
import { loginUser, getUsers, createUser, deleteUser, verifySession } from '../controllers/userController.js';

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', verifySession); // New endpoint to restore session
router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);

export default router;