import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

export class UserController {
  private userService = new UserService();

  /**
   * 获取所有用户
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const users = await this.userService.getAllUsers();
    return ResponseUtil.success(res, users, 'Users retrieved successfully');
  });

  /**
   * 根据ID获取用户
   */
  getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    const user = await this.userService.getUserById(id);
    return ResponseUtil.success(res, user, 'User retrieved successfully');
  });

  /**
   * 创建新用户
   */
  createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await this.userService.createUser(req.body);
    return ResponseUtil.created(res, user, 'User created successfully');
  });

  /**
   * 更新用户
   */
  updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    const user = await this.userService.updateUser(id, req.body);
    return ResponseUtil.success(res, user, 'User updated successfully');
  });

  /**
   * 删除用户（软删除）
   */
  deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    await this.userService.deleteUser(id);
    return ResponseUtil.success(res, null, 'User deleted successfully');
  });
}

