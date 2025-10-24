import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../middlewares/errorHandler';
import { ResponseUtil } from '../../../utils/response';
import { UserService } from './user.service';

export class UserController {
  constructor(private readonly userService: UserService = new UserService()) {}

  getAllUsers = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const users = await this.userService.getAllUsers();
    return ResponseUtil.success(res, users, 'Users retrieved successfully');
  });

  getUserById = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    const user = await this.userService.getUserById(id);
    return ResponseUtil.success(res, user, 'User retrieved successfully');
  });

  createUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = await this.userService.createUser(req.body);
    return ResponseUtil.created(res, user, 'User created successfully');
  });

  updateUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    const user = await this.userService.updateUser(id, req.body);
    return ResponseUtil.success(res, user, 'User updated successfully');
  });

  deleteUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    await this.userService.deleteUser(id);
    return ResponseUtil.success(res, null, 'User deleted successfully');
  });
}
