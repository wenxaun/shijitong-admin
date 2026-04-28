import { Injectable } from '@nestjs/common';
import { 
  ConfigRecord, 
  ConfigVersion, 
  ConfigChange, 
  ConfigCategory,
  AppConfig,
  SystemConfig,
  FeatureConfig,
  WecomConfig,
  TextConfig,
  BusinessConfig
} from '../../src/types/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 配置管理服务
 * 使用 JSON 文件存储配置（生产环境可升级为数据库）
 */
@Injectable()
export class ConfigService {
  private configDir: string;
  private configRecords: ConfigRecord[] = [];
  private configVersions: ConfigVersion[] = [];
  private currentConfig: AppConfig;

  constructor() {
    this.configDir = path.join(process.cwd(), 'config-data');
    this.ensureConfigDir();
    this.loadConfigRecords();
    this.loadConfigVersions();
    this.loadCurrentConfig();
  }

  /**
   * 确保配置目录存在
   */
  private ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * 加载配置记录
   */
  private loadConfigRecords() {
    const filePath = path.join(this.configDir, 'records.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      this.configRecords = JSON.parse(data);
    } else {
      // 初始化默认配置
      this.initDefaultConfigRecords();
      this.saveConfigRecords();
    }
  }

  /**
   * 加载配置版本
   */
  private loadConfigVersions() {
    const filePath = path.join(this.configDir, 'versions.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      this.configVersions = JSON.parse(data);
    }
  }

  /**
   * 加载当前配置
   */
  private loadCurrentConfig() {
    const filePath = path.join(this.configDir, 'current.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      this.currentConfig = JSON.parse(data);
    } else {
      // 创建初始配置
      this.currentConfig = this.buildConfigFromRecords();
      this.saveCurrentConfig();
      this.createConfigVersion('初始配置', 'system');
    }
  }

  /**
   * 保存配置记录
   */
  private saveConfigRecords() {
    const filePath = path.join(this.configDir, 'records.json');
    fs.writeFileSync(filePath, JSON.stringify(this.configRecords, null, 2));
  }

  /**
   * 保存配置版本
   */
  private saveConfigVersions() {
    const filePath = path.join(this.configDir, 'versions.json');
    fs.writeFileSync(filePath, JSON.stringify(this.configVersions, null, 2));
  }

  /**
   * 保存当前配置
   */
  private saveCurrentConfig() {
    const filePath = path.join(this.configDir, 'current.json');
    fs.writeFileSync(filePath, JSON.stringify(this.currentConfig, null, 2));
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
        value: 'dev',
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
        description: '任务审核功能',
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
        description: '组织架构同步',
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
        description: '企微消息推送',
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
        description: '任务流转',
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
        description: '统计功能',
        category: ConfigCategory.FEATURE,
        dataType: 'boolean',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },

      // 企微配置
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

      // 业务规则
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
        description: '每个任务最大子任务数',
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
        description: '任务自动关闭时间（小时）',
        category: ConfigCategory.BUSINESS,
        dataType: 'number',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },

      // 文案配置
      {
        id: 'text-appName',
        key: 'texts.appName',
        value: '任务管理系统',
        description: '应用名称',
        category: ConfigCategory.TEXT,
        dataType: 'string',
        isPublic: true,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        id: 'text-welcomeText',
        key: 'texts.welcomeText',
        value: '欢迎使用任务管理系统',
        description: '欢迎文案',
        category: ConfigCategory.TEXT,
        dataType: 'string',
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
      return record !== undefined ? record.value : defaultValue;
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
        agentId: getRecordValue('wecom.agentId', 0),
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
    this.saveConfigVersions();

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

    const oldKeys = Object.keys(oldConfig || {});
    const newKeys = Object.keys(newConfig || {});
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      const oldValue = oldConfig?.[key];
      const newValue = newConfig?.[key];

      if (oldValue === undefined && newValue !== undefined) {
        changes.push({ key: fullPath, oldValue, newValue, type: 'added' });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({ key: fullPath, oldValue, newValue, type: 'deleted' });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        if (typeof oldValue === 'object' && typeof newValue === 'object') {
          changes.push(...this.compareConfig(oldValue, newValue, fullPath));
        } else {
          changes.push({ key: fullPath, oldValue, newValue, type: 'modified' });
        }
      }
    }

    return changes;
  }

  /**
   * 获取当前配置（公开部分）
   */
  async getCurrentConfig(): Promise<AppConfig> {
    // 只返回公开的配置
    const publicConfig: AppConfig = {
      ...this.currentConfig,
      wecom: {
        ...this.currentConfig.wecom,
        corpId: '', // 隐藏敏感信息
        agentId: 0,
      },
    };
    return publicConfig;
  }

  /**
   * 获取配置记录列表
   */
  async getConfigRecords(category?: ConfigCategory): Promise<ConfigRecord[]> {
    if (category) {
      return this.configRecords.filter(r => r.category === category);
    }
    return this.configRecords;
  }

  /**
   * 获取单个配置记录
   */
  async getConfigRecord(id: string): Promise<ConfigRecord | null> {
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
    const record = this.configRecords.find(r => r.id === id);
    if (!record) {
      return { success: false, message: '配置记录不存在' };
    }

    // 保存旧值
    const oldValue = record.value;

    // 更新值
    record.value = value;
    record.updatedAt = new Date();
    record.updatedBy = operator;

    // 保存
    this.saveConfigRecords();

    // 重新构建完整配置
    const newConfig = this.buildConfigFromRecords();
    const changes = this.compareConfig(this.currentConfig, newConfig);

    // 如果有变更，创建新版本
    if (changes.length > 0) {
      this.currentConfig = newConfig;
      this.saveCurrentConfig();
      const version = this.createConfigVersion(`更新配置: ${record.key}`, operator);
      version.changes = changes;
      this.saveConfigVersions();
    }

    return { success: true };
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfig(
    updates: Array<{ id: string; value: any }>,
    operator: string
  ): Promise<{ success: boolean; message?: string }> {
    for (const update of updates) {
      const record = this.configRecords.find(r => r.id === update.id);
      if (record) {
        record.value = update.value;
        record.updatedAt = new Date();
        record.updatedBy = operator;
      }
    }

    this.saveConfigRecords();

    // 重新构建完整配置
    const newConfig = this.buildConfigFromRecords();
    const changes = this.compareConfig(this.currentConfig, newConfig);

    if (changes.length > 0) {
      this.currentConfig = newConfig;
      this.saveCurrentConfig();
      const version = this.createConfigVersion('批量更新配置', operator);
      version.changes = changes;
      this.saveConfigVersions();
    }

    return { success: true };
  }

  /**
   * 获取配置版本列表
   */
  async getConfigVersions(): Promise<ConfigVersion[]> {
    return this.configVersions;
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(
    versionId: string,
    operator: string
  ): Promise<{ success: boolean; message?: string }> {
    const version = this.configVersions.find(v => v.id === versionId);
    if (!version) {
      return { success: false, message: '版本不存在' };
    }

    // 恢复配置
    this.currentConfig = JSON.parse(JSON.stringify(version.configSnapshot));
    this.saveCurrentConfig();

    // 从恢复的配置更新配置记录
    this.syncRecordsFromConfig();

    // 创建回滚版本
    this.createConfigVersion(`回滚到版本 ${version.version}`, operator);

    return { success: true };
  }

  /**
   * 从完整配置同步到配置记录
   */
  private syncRecordsFromConfig() {
    const config = this.currentConfig;

    // 同步系统配置
    this.configRecords.find(r => r.key === 'system.version')!.value = config.system.version;
    this.configRecords.find(r => r.key === 'system.environment')!.value = config.system.environment;
    this.configRecords.find(r => r.key === 'system.apiTimeout')!.value = config.system.apiTimeout;
    this.configRecords.find(r => r.key === 'system.cacheTimeout')!.value = config.system.cacheTimeout;

    // 同步功能开关
    this.configRecords.find(r => r.key === 'features.taskReview')!.value = config.features.taskReview;
    this.configRecords.find(r => r.key === 'features.orgSync')!.value = config.features.orgSync;
    this.configRecords.find(r => r.key === 'features.wecomNotify')!.value = config.features.wecomNotify;
    this.configRecords.find(r => r.key === 'features.voiceInput')!.value = config.features.voiceInput;
    this.configRecords.find(r => r.key === 'features.taskTransfer')!.value = config.features.taskTransfer;
    this.configRecords.find(r => r.key === 'features.aiAnalysis')!.value = config.features.aiAnalysis;
    this.configRecords.find(r => r.key === 'features.statistics')!.value = config.features.statistics;

    // 同步企微配置
    this.configRecords.find(r => r.key === 'wecom.corpId')!.value = config.wecom.corpId;
    this.configRecords.find(r => r.key === 'wecom.agentId')!.value = config.wecom.agentId;
    this.configRecords.find(r => r.key === 'wecom.syncInterval')!.value = config.wecom.syncInterval;
    this.configRecords.find(r => r.key === 'wecom.maxDepartments')!.value = config.wecom.maxDepartments;
    this.configRecords.find(r => r.key === 'wecom.notifyTemplateId')!.value = config.wecom.notifyTemplateId;
    this.configRecords.find(r => r.key === 'wecom.autoSync')!.value = config.wecom.autoSync;

    // 同步业务规则
    this.configRecords.find(r => r.key === 'business.maxTasksPerDay')!.value = config.business.maxTasksPerDay;
    this.configRecords.find(r => r.key === 'business.maxSubtasksPerTask')!.value = config.business.maxSubtasksPerTask;
    this.configRecords.find(r => r.key === 'business.taskAutoArchiveDays')!.value = config.business.taskAutoArchiveDays;
    this.configRecords.find(r => r.key === 'business.maxTeamMembers')!.value = config.business.maxTeamMembers;
    this.configRecords.find(r => r.key === 'business.taskAutoCloseHours')!.value = config.business.taskAutoCloseHours;

    // 同步文案配置
    this.configRecords.find(r => r.key === 'texts.appName')!.value = config.texts.appName;
    this.configRecords.find(r => r.key === 'texts.welcomeText')!.value = config.texts.welcomeText;

    this.saveConfigRecords();
  }

  /**
   * 获取配置变更详情
   */
  async getVersionChanges(versionId: string): Promise<ConfigVersion | null> {
    return this.configVersions.find(v => v.id === versionId) || null;
  }
}
