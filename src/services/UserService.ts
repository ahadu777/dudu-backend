import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { CreateUserDto, UpdateUserDto } from '../dto/UserDto';
import { AppError } from '../middlewares/errorHandler';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }

    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id);

    // 如果更新邮箱,检查是否与其他用户重复
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new AppError('Email already exists', 400);
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    
    // 软删除: 只标记为不活跃
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async hardDeleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
  }
}

