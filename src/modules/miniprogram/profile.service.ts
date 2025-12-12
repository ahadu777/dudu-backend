import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { UserEntity } from '../../models';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';

export interface UpdateProfileRequest {
  name?: string;
  nickname?: string;
}

export interface ProfileResponse {
  user_id: number;
  name: string;
  nickname: string | null;
  phone: string | null;
  updated_at: string;
}

/**
 * 业务错误 - 扩展 AppError 添加 code 属性
 */
class ProfileError extends AppError {
  public code: string;

  constructor(message: string, code: string, statusCode: number) {
    super(message, statusCode);
    this.code = code;
  }
}

export class MiniprogramProfileService {
  private readonly userRepository: Repository<UserEntity>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
  }

  /**
   * 获取用户资料
   */
  async getProfile(userId: number): Promise<ProfileResponse | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      return null;
    }

    return this.toProfileResponse(user);
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: number, data: UpdateProfileRequest): Promise<ProfileResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new ProfileError('用户不存在', 'USER_NOT_FOUND', 404);
    }

    const fieldsChanged: string[] = [];

    // 更新 name
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName.length === 0) {
        throw new ProfileError('名称不能为空', 'INVALID_NAME', 422);
      }
      if (trimmedName.length > 50) {
        throw new ProfileError('名称不能超过50个字符', 'INVALID_NAME', 422);
      }
      user.name = trimmedName;
      fieldsChanged.push('name');
    }

    // 更新 nickname (存储在 wechat_extra 中)
    if (data.nickname !== undefined) {
      const trimmedNickname = data.nickname.trim();
      if (trimmedNickname.length > 50) {
        throw new ProfileError('昵称不能超过50个字符', 'INVALID_NICKNAME', 422);
      }

      // 确保 wechat_extra 存在
      if (!user.wechat_extra) {
        user.wechat_extra = {};
      }
      // 空字符串时设置为 null，表示用户显式清空昵称
      user.wechat_extra.nickname = trimmedNickname.length > 0 ? trimmedNickname : undefined;
      fieldsChanged.push('nickname');
    }

    // 保存更新
    const updatedUser = await this.userRepository.save(user);

    logger.info('miniprogram.profile.update.success', {
      user_id: userId,
      fields_changed: fieldsChanged
    });

    return this.toProfileResponse(updatedUser);
  }

  /**
   * 转换为响应格式
   */
  private toProfileResponse(user: UserEntity): ProfileResponse {
    return {
      user_id: user.id,
      name: user.name,
      nickname: user.wechat_extra?.nickname || null,
      phone: user.phone || null,
      updated_at: user.updatedAt.toISOString()
    };
  }
}
