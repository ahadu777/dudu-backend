import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { UserEntity } from '../../models';
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
      const error: any = new Error('用户不存在');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const fieldsChanged: string[] = [];

    // 更新 name
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName.length === 0) {
        const error: any = new Error('名称不能为空');
        error.code = 'INVALID_NAME';
        throw error;
      }
      if (trimmedName.length > 50) {
        const error: any = new Error('名称不能超过50个字符');
        error.code = 'INVALID_NAME';
        throw error;
      }
      user.name = trimmedName;
      fieldsChanged.push('name');
    }

    // 更新 nickname (存储在 wechat_extra 中)
    if (data.nickname !== undefined) {
      const trimmedNickname = data.nickname.trim();
      if (trimmedNickname.length > 50) {
        const error: any = new Error('昵称不能超过50个字符');
        error.code = 'INVALID_NICKNAME';
        throw error;
      }

      // 确保 wechat_extra 存在
      if (!user.wechat_extra) {
        user.wechat_extra = {};
      }
      user.wechat_extra.nickname = trimmedNickname || undefined;
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
