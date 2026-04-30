/**
 * 微信云开发工具封装
 * 支持小程序端和 H5 端
 */
import Taro from '@tarojs/taro';
import { mockCloudFunction } from '@/mocks';

// 云开发环境 ID
const CLOUD_ENV = 'cloud1-3g7j95ax4a0f4a3f';

/**
 * 初始化云开发（仅小程序端）
 * @deprecated 云开发初始化已移至 app.tsx 的 useLaunch 中，此函数保留用于兼容
 */
export const initCloud = () => {
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    // @ts-ignore
    if (wx.cloud) {
      // @ts-ignore
      wx.cloud.init({
        env: CLOUD_ENV,
        traceUser: true
      });
      console.log('[Cloud] 云开发初始化成功，环境:', CLOUD_ENV);
    }
  }
};

/**
 * 调用云函数
 * @param name 云函数名称
 * @param data 参数
 */
export const callFunction = async <T = any>(name: string, data?: any): Promise<T> => {
  const env = Taro.getEnv();
  console.log('===== [Cloud] 开始调用云函数 =====');
  console.log('[Cloud] 环境:', env === Taro.ENV_TYPE.WEAPP ? '微信小程序' : 'H5');
  console.log('[Cloud] 云函数名:', name);
  console.log('[Cloud] 参数:', JSON.stringify(data));
  
  if (env === Taro.ENV_TYPE.WEAPP) {
    // 小程序端：调用云函数
    try {
      // @ts-ignore
      if (!wx.cloud) {
        throw new Error('wx.cloud 不存在，请检查云开发配置');
      }
      
      // 调用云函数
      // @ts-ignore
      const res = await wx.cloud.callFunction({
        name,
        data
      });
      console.log('[Cloud] 云函数返回:', name, JSON.stringify(res.result));
      console.log('===== [Cloud] 云函数调用结束 =====');
      return res.result as T;
    } catch (err: any) {
      const errorInfo = {
        function: name,
        params: data,
        environment: 'WEAPP',
        error: err.message || err.errMsg || String(err),
        stack: err.stack
      };
      console.error('[Cloud] 云函数调用失败:', JSON.stringify(errorInfo, null, 2));
      console.log('===== [Cloud] 云函数调用结束（失败）=====');
      throw new Error(`云函数 ${name} 调用失败: ${errorInfo.error}`);
    }
  } else {
    // H5 端：使用模拟数据
    console.log('[Cloud] H5 端使用模拟数据');
    try {
      const result = await mockCloudFunction(name, data);
      console.log('[Cloud] 模拟返回:', name, JSON.stringify(result));
      console.log('===== [Cloud] 云函数调用结束 =====');
      return result as T;
    } catch (err: any) {
      console.error('[Cloud] 模拟数据失败:', name, err);
      throw new Error(`H5 模拟云函数 ${name} 失败: ${err.message}`);
    }
  }
};

/**
 * 获取数据库引用
 */
export const getDatabase = () => {
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    // @ts-ignore
    return wx.cloud.database();
  }
  return null;
};

/**
 * 上传文件到云存储
 * @param filePath 本地文件路径
 * @param cloudPath 云存储路径（可选，默认自动生成）
 */
export const uploadFile = async (options: {
  filePath: string;
  cloudPath?: string;
}): Promise<{ success: boolean; fileID?: string; url?: string; message?: string }> => {
  const { filePath, cloudPath } = options;
  const env = Taro.getEnv();
  
  console.log('[Cloud] 开始上传文件:', filePath);
  
  if (env === Taro.ENV_TYPE.WEAPP) {
    try {
      // 生成云存储路径
      const finalCloudPath = cloudPath || `user-uploads/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // @ts-ignore
      const res = await wx.cloud.uploadFile({
        cloudPath: finalCloudPath,
        filePath: filePath
      });
      
      console.log('[Cloud] 文件上传成功:', res.fileID);
      return {
        success: true,
        fileID: res.fileID,
        url: res.fileID // 云存储的 fileID 可以直接作为图片 URL 使用
      };
    } catch (err: any) {
      console.error('[Cloud] 文件上传失败:', err);
      return {
        success: false,
        message: err.message || '上传失败'
      };
    }
  } else {
    // H5 端模拟上传
    console.log('[Cloud] H5 端模拟上传');
    return {
      success: true,
      fileID: 'mock_file_' + Date.now(),
      url: filePath // H5 端直接返回原始路径
    };
  }
};

/**
 * 获取用户 OpenID
 */
export const getOpenId = async (): Promise<string | null> => {
  try {
    console.log('[Cloud] 开始获取 OpenID...');
    const res = await callFunction<{ 
      success: boolean; 
      data?: { openid: string; userId: string };
      code?: string;
      message?: string;
    }>('login');
    
    console.log('[Cloud] login 云函数返回:', JSON.stringify(res));
    
    if (res.success && res.data?.openid) {
      console.log('[Cloud] 获取到的 OpenID:', res.data.openid);
      return res.data.openid;
    }
    
    console.error('[Cloud] login 云函数返回失败:', res.message || res.code);
    return null;
  } catch (err) {
    console.error('[Cloud] 获取 OpenID 失败:', err);
    return null;
  }
};

// 云函数名称常量
export const CLOUD_FUNCTIONS = {
  LOGIN: 'login',
  USER_LOGIN: 'user-login',
  USER_UPDATE: 'user-update',
  USER_SET_MANAGER: 'user-set-manager',
  USER_LIST_FOR_MANAGER: 'user-list-for-manager',
  TASK_LIST: 'task-list',
  TASK_CREATE: 'task-create',
  TASK_UPDATE: 'task-update',
  TASK_DELETE: 'task-delete',
  TASK_TRANSFER: 'task-transfer',
  TASK_REVIEW: 'task-review',
  SUBTASK_CREATE: 'subtask-create',
  SUBTASK_LIST: 'subtask-list',
  SUBTASK_UPDATE: 'subtask-update',
  SUBTASK_DELETE: 'subtask-delete',
  COMMENT_ADD: 'comment-add',
  COMMENT_LIST: 'comment-list',
  CHECKLIST_ADD: 'checklist-add',
  CHECKLIST_UPDATE: 'checklist-update',
  CHECKLIST_DELETE: 'checklist-delete',
  ORG_CREATE: 'org-create',
  ORG_LIST: 'org-list',
  DEPT_CREATE: 'dept-create',
  DEPT_LIST: 'dept-list',
  WECOM_SYNC_ORG: 'wecom-sync-org',
  PUSH_NOTIFICATION: 'push-notification',
  FEISHU_NOTIFY: 'feishu-notify'
} as const;
