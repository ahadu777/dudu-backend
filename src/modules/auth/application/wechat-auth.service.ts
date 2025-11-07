import { code2Session, getPhoneNumber } from '../infrastructure/wechat.client';
import { generateToken } from '../../../middlewares/auth';
import { dataSourceConfig } from '../../../config/data-source';
import { logger } from '../../../utils/logger';
import { AppDataSource } from '../../../config/database';
import { UserEntity } from '../../../models';

/**
 * WeChat Authentication Service
 * Implements mock-first development pattern:
 * - USE_DATABASE=false (default): Mock data, fast development
 * - USE_DATABASE=true: Real database with TypeORM
 */

// Mock user storage (in-memory for development)
interface MockUser {
  id: number;
  name: string;
  wechat_openid?: string;
  phone?: string | null;
  email?: string;
  auth_type: 'wechat' | 'email';
  age?: number;
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
}

const mockUsers: Map<number, MockUser> = new Map();
let nextMockUserId = 1001;

// Initialize some mock users for testing
mockUsers.set(1, {
  id: 1,
  name: 'Mock User 1',
  wechat_openid: 'oMock123TestOpenId456',
  phone: '+8613800138000',
  auth_type: 'wechat',
  isActive: true,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
});

export class WeChatAuthService {
  /**
   * Mock WeChat Login (Mock-first development)
   * Simulates WeChat code2Session without calling real WeChat API
   *
   * @param code - Temporary code from wx.login()
   * @returns { openid, user, token, needs_phone }
   */
  private async mockWeChatLogin(code: string): Promise<{
    openid: string;
    user: MockUser;
    token: string;
    needs_phone: boolean;
  }> {
    const startTime = Date.now();
    logger.info('wechat_auth.mock_login.start', { code_length: code.length });

    // Simulate network delay (10-50ms)
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));

    // Mock openid generation (deterministic for same code)
    const openid = `oMock${Buffer.from(code).toString('base64').substring(0, 20)}`;

    // Find or create user
    let user = Array.from(mockUsers.values()).find((u) => u.wechat_openid === openid);

    if (!user) {
      // First login - create new user
      const userId = nextMockUserId++;
      const defaultName = `WeChat User ${openid.substring(openid.length - 6)}`;

      user = {
        id: userId,
        name: defaultName,
        wechat_openid: openid,
        phone: null,
        auth_type: 'wechat',
        isActive: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUsers.set(userId, user);

      logger.info('wechat_auth.mock_login.user_created', {
        user_id: userId,
        openid_length: openid.length,
        duration_ms: Date.now() - startTime,
      });
    } else {
      logger.info('wechat_auth.mock_login.user_found', {
        user_id: user.id,
        openid_length: openid.length,
        duration_ms: Date.now() - startTime,
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email || '' });

    const needs_phone = !user.phone;

    logger.info('wechat_auth.mock_login.success', {
      user_id: user.id,
      needs_phone,
      duration_ms: Date.now() - startTime,
    });

    return { openid, user, token, needs_phone };
  }

  /**
   * Database WeChat Login (Production mode)
   * Calls real WeChat API and stores user in database
   *
   * @param code - Temporary code from wx.login()
   * @returns { openid, user, token, needs_phone }
   */
  private async databaseWeChatLogin(code: string): Promise<{
    openid: string;
    user: UserEntity;
    token: string;
    needs_phone: boolean;
  }> {
    const startTime = Date.now();
    logger.info('wechat_auth.database_login.start', { code_length: code.length });

    // Call real WeChat API
    const openid = await code2Session(code);

    // Find or create user in database
    const userRepository = AppDataSource.getRepository(UserEntity);

    let user = await userRepository.findOne({
      where: { wechat_openid: openid },
    });

    if (!user) {
      // First login - create new user
      const defaultName = `WeChat User ${openid.substring(openid.length - 6)}`;

      user = userRepository.create({
        wechat_openid: openid,
        auth_type: 'wechat',
        name: defaultName,
        isActive: true,
      });

      user = await userRepository.save(user);

      logger.info('wechat_auth.database_login.user_created', {
        user_id: user.id,
        openid_length: openid.length,
        duration_ms: Date.now() - startTime,
      });
    } else {
      logger.info('wechat_auth.database_login.user_found', {
        user_id: user.id,
        openid_length: openid.length,
        duration_ms: Date.now() - startTime,
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email || '' });

    const needs_phone = !user.phone;

    logger.info('wechat_auth.database_login.success', {
      user_id: user.id,
      needs_phone,
      duration_ms: Date.now() - startTime,
    });

    return { openid, user, token, needs_phone };
  }

  /**
   * WeChat Login (Dual-mode: Mock or Database)
   *
   * @param code - Temporary code from wx.login()
   * @returns { user, token, needs_phone }
   */
  async login(code: string): Promise<{
    user: MockUser | UserEntity;
    token: string;
    needs_phone: boolean;
  }> {
    // Dual-mode: Check if database is available
    const useDatabase = dataSourceConfig.useDatabase && AppDataSource.isInitialized;

    console.log('===== WECHAT LOGIN MODE SELECTION =====');
    console.log('USE_DATABASE config:', dataSourceConfig.useDatabase);
    console.log('DataSource initialized:', AppDataSource.isInitialized);
    console.log('Final mode:', useDatabase ? 'DATABASE' : 'MOCK');
    console.log('=======================================');

    logger.info('wechat_auth.login.mode_selection', {
      use_database_config: dataSourceConfig.useDatabase,
      datasource_initialized: AppDataSource.isInitialized,
      final_mode: useDatabase ? 'database' : 'mock',
    });

    if (useDatabase) {
      const result = await this.databaseWeChatLogin(code);
      return {
        user: result.user,
        token: result.token,
        needs_phone: result.needs_phone,
      };
    } else {
      const result = await this.mockWeChatLogin(code);
      return {
        user: result.user,
        token: result.token,
        needs_phone: result.needs_phone,
      };
    }
  }

  /**
   * Mock Phone Binding (Mock-first development)
   * Simulates WeChat getPhoneNumber without calling real WeChat API
   *
   * @param userId - User ID from JWT token
   * @param code - Phone authorization code
   * @returns { phone, user }
   */
  private async mockPhoneBinding(
    userId: number,
    code: string
  ): Promise<{
    phone: string;
    user: MockUser;
  }> {
    const startTime = Date.now();
    logger.info('wechat_auth.mock_phone_binding.start', {
      user_id: userId,
      code_length: code.length,
    });

    // Simulate network delay (10-50ms)
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));

    // Mock phone number generation (deterministic for same code)
    const phoneHash = Buffer.from(code).toString('base64').substring(0, 8);
    const phoneNumber = `+86138${phoneHash.replace(/[^0-9]/g, '').substring(0, 8).padEnd(8, '0')}`;

    // Find user
    const user = mockUsers.get(userId);

    if (!user) {
      logger.error('wechat_auth.mock_phone_binding.user_not_found', { user_id: userId });
      throw new Error('USER_NOT_FOUND');
    }

    // Update user phone
    user.phone = phoneNumber;
    user.updated_at = new Date();
    mockUsers.set(userId, user);

    logger.info('wechat_auth.mock_phone_binding.success', {
      user_id: userId,
      phone_length: phoneNumber.length,
      duration_ms: Date.now() - startTime,
    });

    return { phone: phoneNumber, user };
  }

  /**
   * Database Phone Binding (Production mode)
   * Calls real WeChat API and updates user in database
   *
   * @param userId - User ID from JWT token
   * @param code - Phone authorization code
   * @returns { phone, user }
   */
  private async databasePhoneBinding(
    userId: number,
    code: string
  ): Promise<{
    phone: string;
    user: UserEntity;
  }> {
    const startTime = Date.now();
    logger.info('wechat_auth.database_phone_binding.start', {
      user_id: userId,
      code_length: code.length,
    });

    // Call real WeChat API
    const { phone, countryCode } = await getPhoneNumber(code);

    // Find user
    const userRepository = AppDataSource.getRepository(UserEntity);
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      logger.error('wechat_auth.database_phone_binding.user_not_found', { user_id: userId });
      throw new Error('USER_NOT_FOUND');
    }

    // Update user phone
    user.phone = phone;

    // Optionally store country code in wechat_extra
    if (!user.wechat_extra) {
      user.wechat_extra = {};
    }
    user.wechat_extra.phone_country_code = countryCode;

    await userRepository.save(user);

    logger.info('wechat_auth.database_phone_binding.success', {
      user_id: userId,
      phone_length: phone.length,
      country_code: countryCode,
      duration_ms: Date.now() - startTime,
    });

    return { phone, user };
  }

  /**
   * Phone Binding (Dual-mode: Mock or Database)
   *
   * @param userId - User ID from JWT token
   * @param code - Phone authorization code
   * @returns { phone, user }
   */
  async bindPhone(
    userId: number,
    code: string
  ): Promise<{
    phone: string;
    user: MockUser | UserEntity;
  }> {
    // Dual-mode: Check if database is available
    const useDatabase = dataSourceConfig.useDatabase && AppDataSource.isInitialized;

    if (useDatabase) {
      // Database mode: uses real WeChat API
      return await this.databasePhoneBinding(userId, code);
    } else {
      // Mock mode: generates deterministic phone number
      return await this.mockPhoneBinding(userId, code);
    }
  }

  /**
   * Get user by ID (for testing and internal use)
   *
   * @param userId - User ID
   * @returns User or null
   */
  async getUserById(userId: number): Promise<MockUser | UserEntity | null> {
    const useDatabase = dataSourceConfig.useDatabase && AppDataSource.isInitialized;

    if (useDatabase) {
      const userRepository = AppDataSource.getRepository(UserEntity);
      return await userRepository.findOne({ where: { id: userId } });
    } else {
      return mockUsers.get(userId) || null;
    }
  }
}
