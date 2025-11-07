import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { UserEntity } from '../../../models';
import { CreateUserDto, UpdateUserDto } from './dto';

export class UserService {
  private readonly userRepository: Repository<UserEntity>;

  constructor(repository: Repository<UserEntity> = AppDataSource.getRepository(UserEntity)) {
    this.userRepository = repository;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  async getUserById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async createUser(payload: CreateUserDto): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({
      where: { email: payload.email }
    });

    if (existing) {
      throw new AppError('Email already exists', 400);
    }

    const user = this.userRepository.create(payload);
    return this.userRepository.save(user);
  }

  async updateUser(id: number, payload: UpdateUserDto): Promise<UserEntity> {
    const user = await this.getUserById(id);

    if (payload.email && payload.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: payload.email }
      });

      if (existing) {
        throw new AppError('Email already exists', 400);
      }
    }

    Object.assign(user, payload);
    return this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async hardDeleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
  }
}
