/**
 * 企业微信环境检测工具
 */
import Taro from '@tarojs/taro';

export interface SystemInfo {
  platform: string;
  environment?: string; // 企业微信会返回 "wxwork"
  version: string;
  SDKVersion: string;
}

let cachedSystemInfo: SystemInfo | null = null;

/**
 * 获取系统信息（带缓存）
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  if (cachedSystemInfo) {
    return cachedSystemInfo;
  }

  const systemInfo = await Taro.getSystemInfo();
  cachedSystemInfo = systemInfo as SystemInfo;
  return cachedSystemInfo;
}

/**
 * 检测是否在企业微信环境运行
 */
export async function isWework(): Promise<boolean> {
  const systemInfo = await getSystemInfo();
  return systemInfo.environment === 'wxwork';
}

/**
 * 同步检测是否在企业微信环境运行
 * 使用多种检测方法提高准确性
 */
export function isWeworkSync(): boolean {
  // 方法1：检查缓存的系统信息
  if (cachedSystemInfo) {
    if (cachedSystemInfo.environment === 'wxwork') {
      console.log('[Env] 企业微信环境检测成功（缓存）: environment=wxwork');
      return true;
    }
    
    if (cachedSystemInfo.platform && cachedSystemInfo.platform.includes('wxwork')) {
      console.log('[Env] 企业微信环境检测成功（缓存）: platform includes wxwork');
      return true;
    }
  }
  
  // 方法2：实时获取系统信息
  try {
    const systemInfo = Taro.getSystemInfoSync() as SystemInfo;
    if (!cachedSystemInfo) {
      cachedSystemInfo = systemInfo;
    }
    
    console.log('[Env] 系统信息:', {
      environment: systemInfo.environment,
      platform: systemInfo.platform,
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion
    });
    
    // 优先检查 environment 字段（企业微信标准字段）
    if (systemInfo.environment === 'wxwork') {
      console.log('[Env] 企业微信环境检测成功: environment=wxwork');
      return true;
    }
    
    // 检查 platform
    if (systemInfo.platform && systemInfo.platform.includes('wxwork')) {
      console.log('[Env] 企业微信环境检测成功: platform includes wxwork');
      return true;
    }
    
    // 方法3：检查企业微信特有 API
    // @ts-ignore
    if (typeof wx !== 'undefined' && wx.qy) {
      console.log('[Env] 企业微信环境检测成功: wx.qy 存在');
      return true;
    }
    
    console.log('[Env] 非企业微信环境');
    return false;
  } catch (error) {
    console.error('[Env] 检测企业微信环境失败:', error);
    return false;
  }
}

/**
 * 获取环境类型
 */
export async function getEnvType(): Promise<'weixin' | 'wework' | 'h5' | 'other'> {
  // 先检测是否企业微信
  if (await isWework()) {
    return 'wework';
  }
  
  // 检测Taro环境
  const env = Taro.getEnv();
  
  if (env === Taro.ENV_TYPE.WEAPP) {
    return 'weixin';
  } else if (env === Taro.ENV_TYPE.WEB) {
    return 'h5';
  }
  
  return 'other';
}

/**
 * 获取用户类型
 */
export async function getUserType(): Promise<'personal' | 'employee'> {
  const envType = await getEnvType();
  return envType === 'wework' ? 'employee' : 'personal';
}

/**
 * 初始化系统信息缓存（在App启动时调用）
 */
export function initSystemInfo() {
  try {
    const systemInfo = Taro.getSystemInfoSync() as SystemInfo;
    cachedSystemInfo = systemInfo;
    
    console.log('[Env] 系统信息:', {
      platform: systemInfo.platform,
      environment: systemInfo.environment || 'weixin',
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion,
      isWework: systemInfo.environment === 'wxwork'
    });
  } catch (error) {
    console.error('[Env] 获取系统信息失败:', error);
  }
}
