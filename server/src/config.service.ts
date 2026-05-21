import { Injectable } from '@nestjs/common';
import { 
  ConfigRecord, 
  ConfigVersion, 
  ConfigChange, 
  ConfigCategory,
  AppConfig
} from './types/config';

/**
 * 配置管理服务（云数据库版本）
 * 使用云开发数据库存储配置，自动持久化
 */
@Injectable()
export class ConfigService {
  private configRecords: ConfigRecord[] = [];
  private configVersions: ConfigVersion[] = [];
  private currentConfig: AppConfig;
  private initialized = false;

  constructor() {
    // 异步初始化，不阻塞构造函数
    this.initialize().catch(err => {
      console.error('[ConfigService] 初始化失败:', err);
    });
  }

  /**
   * 初始化配置服务
   */
  private async initialize() {
    try {
      await this.loadConfigFromDB();
      this.initialized = true;
      console.log('[ConfigService] 初始化完成');
    } catch (err) {
      console.error('[ConfigService] 初始化失败，使用默认配置:', err);
      this.initDefaultConfigRecords();
      this.currentConfig = this.buildConfigFromRecords();
      this.initialized = true;
    }
  }

  /**
   * 等待初始化完成
   */
  private async waitForInit() {
    if (this.initialized) return;
    
    // 最多等待 5 秒
    for (let i = 0; i < 50; i++) {
      if (this.initialized) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('配置服务初始化超时');
  }

  /**
   * 获取云开发数据库实例
   */
  private getDB() {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      return null;
    }
    
    const cloudbase = require('@cloudbase/node-sdk');
    const app = cloudbase.init({ env: envId, secretId, secretKey });
    return app.database();
  }

  /**
   * 从数据库加载配置
   */
  private async loadConfigFromDB() {
    const db = this.getDB();
    
    if (!db) {
      console.log('[ConfigService] 云数据库不可用，使用本地默认配置');
      this.initDefaultConfigRecords();
      this.currentConfig = this.buildConfigFromRecords();
      return;
    }

    // 加载配置记录
    const recordsRes = await db.collection('config_records').limit(1000).get();
    if (recordsRes.data && recordsRes.data.length > 0) {
      this.configRecords = recordsRes.data;
      console.log('[ConfigService] 从数据库加载配置记录:', this.configRecords.length, '条');
    } else {
      // 初始化默认配置
      this.initDefaultConfigRecords();
      await this.saveConfigRecordsToDB();
      console.log('[ConfigService] 初始化默认配置记录');
    }

    // 加载配置版本
    try {
      const versionsRes = await db.collection('config_versions').orderBy('createdAt', 'desc').limit(100).get();
      if (versionsRes.data) {
        this.configVersions = versionsRes.data;
      }
    } catch (err) {
      console.warn('[ConfigService] 加载配置版本失败:', err.message);
    }

    // 构建当前配置
    this.currentConfig = this.buildConfigFromRecords();
  }

  /**
   * 保存配置记录到数据库
   */
  private async saveConfigRecordsToDB() {
    const db = this.getDB();
    if (!db) return;

    try {
      // 先清空旧记录
      const oldRecords = await db.collection('config_records').get();
      for (const record of oldRecords.data || []) {
        await db.collection('config_records').doc(record._id).remove();
      }
      
      // 批量插入新记录
      for (const record of this.configRecords) {
        await db.collection('config_records').add({ data: record });
      }
    } catch (err) {
      console.error('[ConfigService] 保存配置记录失败:', err.message);
    }
  }

  /**
   * 保存配置版本到数据库
   */
  private async saveConfigVersionsToDB() {
    const db = this.getDB();
    if (!db) return;

    try {
      // 只保存最新的 10 个版本
      const recentVersions = this.configVersions.slice(0, 10);
      
      // 清空旧版本
      const oldVersions = await db.collection('config_versions').get();
      for (const version of oldVersions.data || []) {
        await db.collection('config_versions').doc(version._id).remove();
      }
      
      // 批量插入新版本
      for (const version of recentVersions) {
        await db.collection('config_versions').add({ data: version });
      }
    } catch (err) {
      console.error('[ConfigService] 保存配置版本失败:', err.message);
    }
  }

  /**
   * 初始化默认配置记录
   */
  private initDefaultConfigRecords() {
    this.configRecords = [
      // 系统配置
      {
        id: 'system-version',
        key: 'system.version',
        value: '1.0.0',
        description: '配置版本号',
        category: ConfigCategory.SYSTEM,
        dataType: 'string',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'system-environment',
        key: 'system.environment',
        value: 'production',
        description: '环境标识',
        category: ConfigCategory.SYSTEM,
        dataType: 'string',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'system-apiTimeout',
        key: 'system.apiTimeout',
        value: 30000,
        description: '请求超时时间（毫秒）',
        category: ConfigCategory.SYSTEM,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'system-cacheTimeout',
        key: 'system.cacheTimeout',
        value: 300,
        description: '配置缓存时间（秒）',
        category: ConfigCategory.SYSTEM,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },

      // 功能开关
      {
        id: 'feature-taskReview',
        key: 'features.taskReview',
        value: true,
        description: '任务复盘',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'feature-orgSync',
        key: 'features.orgSync',
        value: true,
        description: '组织同步',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'feature-wecomNotify',
        key: 'features.wecomNotify',
        value: true,
        description: '企业微信通知',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'feature-voiceInput',
        key: 'features.voiceInput',
        value: true,
        description: '语音输入',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'feature-taskTransfer',
        key: 'features.taskTransfer',
        value: true,
        description: '任务转办',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'feature-aiAnalysis',
        key: 'features.aiAnalysis',
        value: true,
        description: 'AI 分析',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'feature-statistics',
        key: 'features.statistics',
        value: true,
        description: '统计分析',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },

      // 企业微信配置
      {
        id: 'wecom-corpId',
        key: 'wecom.corpId',
        value: '',
        description: '企业ID',
        category: ConfigCategory.WECOM,
        dataType: 'string',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-corpSecret',
        key: 'wecom.corpSecret',
        value: '',
        description: '企业微信通讯录管理Secret',
        category: ConfigCategory.WECOM,
        dataType: 'string',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-agentId',
        key: 'wecom.agentId',
        value: 0,
        description: '应用ID',
        category: ConfigCategory.WECOM,
        dataType: 'number',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-agentSecret',
        key: 'wecom.agentSecret',
        value: '',
        description: '应用Secret',
        category: ConfigCategory.WECOM,
        dataType: 'string',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-contactSecret',
        key: 'wecom.contactSecret',
        value: '',
        description: '通讯录同步Secret',
        category: ConfigCategory.WECOM,
        dataType: 'string',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-syncInterval',
        key: 'wecom.syncInterval',
        value: 24,
        description: '同步间隔（小时）',
        category: ConfigCategory.WECOM,
        dataType: 'number',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-maxDepartments',
        key: 'wecom.maxDepartments',
        value: 1000,
        description: '最大部门数限制',
        category: ConfigCategory.WECOM,
        dataType: 'number',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-notifyTemplateId',
        key: 'wecom.notifyTemplateId',
        value: '',
        description: '消息模板ID',
        category: ConfigCategory.WECOM,
        dataType: 'string',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'wecom-autoSync',
        key: 'wecom.autoSync',
        value: false,
        description: '自动同步',
        category: ConfigCategory.WECOM,
        dataType: 'boolean',
        isPublic: false,
        updatedAt: new Date(),
        updatedBy: 'system'
      },

      // 文本配置
      {
        id: 'texts-appName',
        key: 'texts.appName',
        value: '任务管理系统',
        description: '应用名称',
        category: ConfigCategory.TEXTS,
        dataType: 'string',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'texts-welcomeText',
        key: 'texts.welcomeText',
        value: '欢迎使用任务管理系统',
        description: '欢迎文案',
        category: ConfigCategory.TEXTS,
        dataType: 'string',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },

      // 业务规则配置
      {
        id: 'business-maxTasksPerDay',
        key: 'business.maxTasksPerDay',
        value: 100,
        description: '每日最大任务数',
        category: ConfigCategory.BUSINESS,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'business-maxSubtasksPerTask',
        key: 'business.maxSubtasksPerTask',
        value: 50,
        description: '单个任务最大子任务数',
        category: ConfigCategory.BUSINESS,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'business-taskAutoArchiveDays',
        key: 'business.taskAutoArchiveDays',
        value: 90,
        description: '任务自动归档天数',
        category: ConfigCategory.BUSINESS,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'business-maxTeamMembers',
        key: 'business.maxTeamMembers',
        value: 500,
        description: '团队最大成员数',
        category: ConfigCategory.BUSINESS,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'business-taskAutoCloseHours',
        key: 'business.taskAutoCloseHours',
        value: 168,
        description: '任务自动关闭小时数',
        category: ConfigCategory.BUSINESS,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
    ];
  }

  /**
   * 从配置记录构建完整配置
   */
  private buildConfigFromRecords(): AppConfig {
    const getRecordValue = (key: string, defaultValue: any): any => {
      const record = this.configRecords.find(r => r.key === key);
      return record ? record.value : defaultValue;
    };

    return {
      system: {
        version: getRecordValue('system.version', '1.0.0'),
        environment: getRecordValue('system.environment', 'dev'),
        apiTimeout: getRecordValue('system.apiTimeout', 30000),
        cacheTimeout: getRecordValue('system.cacheTimeout', 300),
      },
      features: {
        taskReview: getRecordValue('features.taskReview', true),
        orgSync: getRecordValue('features.orgSync', true),
        wecomNotify: getRecordValue('features.wecomNotify', true),
        voiceInput: getRecordValue('features.voiceInput', true),
        taskTransfer: getRecordValue('features.taskTransfer', true),
        aiAnalysis: getRecordValue('features.aiAnalysis', true),
        statistics: getRecordValue('features.statistics', true),
      },
      wecom: {
        corpId: getRecordValue('wecom.corpId', ''),
        corpSecret: getRecordValue('wecom.corpSecret', ''),
        agentId: getRecordValue('wecom.agentId', 0),
        agentSecret: getRecordValue('wecom.agentSecret', ''),
        contactSecret: getRecordValue('wecom.contactSecret', ''),
        syncInterval: getRecordValue('wecom.syncInterval', 24),
        maxDepartments: getRecordValue('wecom.maxDepartments', 1000),
        notifyTemplateId: getRecordValue('wecom.notifyTemplateId', ''),
        autoSync: getRecordValue('wecom.autoSync', false),
      },
      texts: {
        appName: getRecordValue('texts.appName', '任务管理系统'),
        welcomeText: getRecordValue('texts.welcomeText', '欢迎使用任务管理系统'),
        errorMessages: {},
        successMessages: {},
      },
      business: {
        maxTasksPerDay: getRecordValue('business.maxTasksPerDay', 100),
        maxSubtasksPerTask: getRecordValue('business.maxSubtasksPerTask', 50),
        taskAutoArchiveDays: getRecordValue('business.taskAutoArchiveDays', 90),
        maxTeamMembers: getRecordValue('business.maxTeamMembers', 500),
        taskAutoCloseHours: getRecordValue('business.taskAutoCloseHours', 168),
      },
      _version: getRecordValue('system.version', '1.0.0'),
      _updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取当前配置（公开部分）
   */
  async getCurrentConfig(): Promise<AppConfig> {
    await this.waitForInit();
    
    const publicConfig: AppConfig = {
      ...this.currentConfig,
      wecom: {
        ...this.currentConfig.wecom,
        corpSecret: '', // 隐藏敏感信息
        agentSecret: '',
        contactSecret: '',
      },
    };
    return publicConfig;
  }

  /**
   * 获取完整配置（包含敏感信息）
   */
  async getFullConfig(): Promise<AppConfig> {
    await this.waitForInit();
    return this.currentConfig;
  }

  /**
   * 获取配置记录列表
   */
  async getConfigRecords(category?: ConfigCategory): Promise<ConfigRecord[]> {
    await this.waitForInit();
    
    if (category) {
      return this.configRecords.filter(r => r.category === category);
    }
    return this.configRecords;
  }

  /**
   * 获取单个配置记录
   */
  async getConfigRecord(id: string): Promise<ConfigRecord | null> {
    await this.waitForInit();
    return this.configRecords.find(r => r.id === id) || null;
  }

  /**
   * 更新配置记录
   */
  async updateConfigRecord(
    id: string,
    value: any,
    operator: string
  ): Promise<{ success: boolean; message?: string }> {
    await this.waitForInit();
    
    const record = this.configRecords.find(r => r.id === id);
    if (!record) {
      return { success: false, message: '配置记录不存在' };
    }

    const oldValue = record.value;
    record.value = value;
    record.updatedAt = new Date();
    record.updatedBy = operator;

    await this.saveConfigRecordsToDB();

    // 重新构建配置并创建版本
    const newConfig = this.buildConfigFromRecords();
    const change: ConfigChange = {
      key: record.key,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      operator,
    };
    
    this.currentConfig = newConfig;
    const version = this.createConfigVersion(`更新配置: ${record.key}`, operator);
    version.changes = [change];
    await this.saveConfigVersionsToDB();

    return { success: true };
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfig(
    updates: Array<{ id: string; value: any }>,
    operator: string
  ): Promise<{ success: boolean; message?: string }> {
    await this.waitForInit();
    
    for (const update of updates) {
      const record = this.configRecords.find(r => r.id === update.id);
      if (record) {
        record.value = update.value;
        record.updatedAt = new Date();
        record.updatedBy = operator;
      }
    }

    await this.saveConfigRecordsToDB();

    // 重新构建完整配置
    const newConfig = this.buildConfigFromRecords();
    const changes = this.compareConfig(this.currentConfig, newConfig);

    if (changes.length > 0) {
      this.currentConfig = newConfig;
      const version = this.createConfigVersion('批量更新配置', operator);
      version.changes = changes;
      await this.saveConfigVersionsToDB();
    }

    return { success: true };
  }

  /**
   * 重新加载配置（从数据库）
   */
  async reloadConfig(): Promise<void> {
    console.log('[ConfigService] 重新加载配置...');
    await this.loadConfigFromDB();
    console.log('[ConfigService] 配置重新加载完成, wecom.corpId:', this.currentConfig?.wecom?.corpId);
  }

  /**
   * 获取配置版本列表
   */
  async getConfigVersions(): Promise<ConfigVersion[]> {
    await this.waitForInit();
    return this.configVersions;
  }

  /**
   * 创建配置版本
   */
  private createConfigVersion(comment: string, operator: string): ConfigVersion {
    const newVersion: ConfigVersion = {
      id: `v-${Date.now()}`,
      version: this.generateVersion(),
      configSnapshot: JSON.parse(JSON.stringify(this.currentConfig)),
      changes: [],
      createdAt: new Date(),
      createdBy: operator,
      comment,
    };

    this.configVersions.unshift(newVersion);
    return newVersion;
  }

  /**
   * 生成版本号
   */
  private generateVersion(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const versionCount = this.configVersions.length + 1;
    return `${year}.${month}.${day}.${versionCount}`;
  }

  /**
   * 比较配置变更
   */
  private compareConfig(oldConfig: any, newConfig: any, path: string = ''): ConfigChange[] {
    const changes: ConfigChange[] = [];
    
    for (const key in newConfig) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in oldConfig)) {
        changes.push({
          key: currentPath,
          oldValue: undefined,
          newValue: newConfig[key],
          timestamp: new Date(),
        });
      } else if (typeof newConfig[key] === 'object' && newConfig[key] !== null && !Array.isArray(newConfig[key])) {
        changes.push(...this.compareConfig(oldConfig[key], newConfig[key], currentPath));
      } else if (oldConfig[key] !== newConfig[key]) {
        changes.push({
          key: currentPath,
          oldValue: oldConfig[key],
          newValue: newConfig[key],
          timestamp: new Date(),
        });
      }
    }
    
    return changes;
  }
}
