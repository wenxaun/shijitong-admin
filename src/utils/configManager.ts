import Taro from '@tarojs/taro';
import { Network } from '@/network';
import { AppConfig, FeatureConfig, BusinessConfig } from '@/types/config';

/**
 * 配置管理器
 * 负责加载、缓存和更新应用配置
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private configKey = 'app_config';
  private versionKey = 'app_config_version';
  private lastUpdateTime = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 加载配置
   * 策略：优先使用本地缓存，后台检查更新
   */
  async loadConfig(forceRefresh = false): Promise<AppConfig> {
    // 如果已加载且未过期，直接返回
    if (!forceRefresh && this.config && this.isCacheValid()) {
      console.log('[ConfigManager] 使用缓存配置');
      return this.config;
    }

    console.log('[ConfigManager] 开始加载配置');

    try {
      // 获取本地缓存
      const localConfig = await this.getLocalConfig();
      const remoteVersion = await this.getRemoteVersion();

      // 判断是否需要更新
      const needUpdate = this.shouldUpdateConfig(localConfig, remoteVersion);

      if (needUpdate) {
        console.log('[ConfigManager] 发现新版本，从服务器加载');
        const remoteConfig = await this.fetchRemoteConfig();
        await this.saveLocalConfig(remoteConfig);
        this.config = remoteConfig;
      } else if (localConfig) {
        console.log('[ConfigManager] 使用本地缓存');
        this.config = localConfig;
      } else {
        console.log('[ConfigManager] 首次加载，从服务器获取');
        const remoteConfig = await this.fetchRemoteConfig();
        await this.saveLocalConfig(remoteConfig);
        this.config = remoteConfig;
      }

      this.lastUpdateTime = Date.now();
      return this.config;
    } catch (error) {
      console.error('[ConfigManager] 加载配置失败:', error);

      // 加载失败时，尝试使用本地缓存
      const localConfig = await this.getLocalConfig();
      if (localConfig) {
        console.log('[ConfigManager] 使用本地缓存作为降级方案');
        this.config = localConfig;
        return localConfig;
      }

      // 如果本地缓存也没有，返回默认配置
      console.warn('[ConfigManager] 无法加载配置，使用默认配置');
      return this.getDefaultConfig();
    }
  }

  /**
   * 判断缓存是否有效
   */
  private isCacheValid(): boolean {
    const now = Date.now();
    const cacheAge = now - this.lastUpdateTime;
    return cacheAge < this.cacheTimeout;
  }

  /**
   * 获取本地配置
   */
  private async getLocalConfig(): Promise<AppConfig | null> {
    try {
      const data = await Taro.getStorageSync(this.configKey);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('[ConfigManager] 读取本地配置失败:', error);
      return null;
    }
  }

  /**
   * 保存本地配置
   */
  private async saveLocalConfig(config: AppConfig): Promise<void> {
    try {
      await Taro.setStorageSync(this.configKey, JSON.stringify(config));
      console.log('[ConfigManager] 本地配置已保存');
    } catch (error) {
      console.error('[ConfigManager] 保存本地配置失败:', error);
    }
  }

  /**
   * 获取远程版本
   */
  private async getRemoteVersion(): Promise<{ version: string; updatedAt: string } | null> {
    try {
      const res = await Network.request({
        url: '/api/config/version',
        method: 'GET',
      });

      if (res.statusCode === 200 && res.data) {
        return res.data;
      }
      return null;
    } catch (error) {
      console.error('[ConfigManager] 获取远程版本失败:', error);
      return null;
    }
  }

  /**
   * 从服务器获取配置
   */
  private async fetchRemoteConfig(): Promise<AppConfig> {
    try {
      const res = await Network.request({
        url: '/api/config/current',
        method: 'GET',
      });

      console.log('[ConfigManager] 远程配置响应:', res);

      if (res.statusCode === 200 && res.data) {
        return res.data;
      }

      throw new Error('获取配置失败');
    } catch (error) {
      console.error('[ConfigManager] 获取远程配置失败:', error);
      throw error;
    }
  }

  /**
   * 判断是否需要更新配置
   */
  private shouldUpdateConfig(
    localConfig: AppConfig | null,
    remoteVersion: { version: string; updatedAt: string } | null
  ): boolean {
    if (!localConfig || !remoteVersion) {
      return true;
    }

    return localConfig._version !== remoteVersion.version;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      system: {
        version: '1.0.0',
        environment: 'dev',
        apiTimeout: 30000,
        cacheTimeout: 300,
      },
      features: {
        taskReview: true,
        orgSync: true,
        wecomNotify: true,
        voiceInput: true,
        taskTransfer: true,
        aiAnalysis: true,
        statistics: true,
      },
      wecom: {
        corpId: '',
        agentId: 0,
        syncInterval: 24,
        maxDepartments: 1000,
        notifyTemplateId: '',
        autoSync: false,
      },
      texts: {
        appName: '任务管理系统',
        welcomeText: '欢迎使用任务管理系统',
        errorMessages: {},
        successMessages: {},
      },
      business: {
        maxTasksPerDay: 100,
        maxSubtasksPerTask: 50,
        taskAutoArchiveDays: 90,
        maxTeamMembers: 500,
        taskAutoCloseHours: 168,
      },
      _version: '1.0.0',
      _updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): AppConfig | null {
    return this.config;
  }

  /**
   * 获取功能配置
   */
  getFeatures(): FeatureConfig {
    return this.config?.features || this.getDefaultConfig().features;
  }

  /**
   * 获取业务配置
   */
  getBusiness(): BusinessConfig {
    return this.config?.business || this.getDefaultConfig().business;
  }

  /**
   * 检查功能是否开启
   */
  isFeatureEnabled(featureName: keyof FeatureConfig): boolean {
    return this.getFeatures()[featureName] === true;
  }

  /**
   * 获取配置值（带类型安全）
   */
  get<T>(path: string, defaultValue?: T): T {
    const config = this.config;
    if (!config) {
      return defaultValue as T;
    }

    const keys = path.split('.');
    let value: any = config;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  /**
   * 刷新配置
   */
  async refresh(): Promise<AppConfig> {
    console.log('[ConfigManager] 强制刷新配置');
    return await this.loadConfig(true);
  }

  /**
   * 清除本地缓存
   */
  async clearCache(): Promise<void> {
    try {
      await Taro.removeStorageSync(this.configKey);
      await Taro.removeStorageSync(this.versionKey);
      this.config = null;
      this.lastUpdateTime = 0;
      console.log('[ConfigManager] 本地缓存已清除');
    } catch (error) {
      console.error('[ConfigManager] 清除缓存失败:', error);
    }
  }

  /**
   * 获取应用名称
   */
  getAppName(): string {
    return this.get('texts.appName', '任务管理系统');
  }

  /**
   * 获取欢迎文案
   */
  getWelcomeText(): string {
    return this.get('texts.welcomeText', '欢迎使用任务管理系统');
  }

  /**
   * 获取 API 超时时间
   */
  getApiTimeout(): number {
    return this.get('system.apiTimeout', 30000);
  }

  /**
   * 获取企微配置
   */
  getWecomConfig() {
    return this.config?.wecom || this.getDefaultConfig().wecom;
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();

// 导出类型
export type { AppConfig, FeatureConfig, BusinessConfig };
