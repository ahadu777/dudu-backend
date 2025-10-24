import { Router } from 'express';
import { validateBody } from '../../middlewares/validator';
import { UserController } from './application/user.controller';
import { CreateUserDto, UpdateUserDto } from './application/dto';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', validateBody(CreateUserDto), userController.createUser);
router.put('/:id', validateBody(UpdateUserDto), userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
