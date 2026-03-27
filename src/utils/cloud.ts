/**
 * 微信云开发工具封装
 * 支持小程序端和 H5 端
 */
import Taro from '@tarojs/taro';
import { Network } from '@/network';

// 云开发环境 ID
const CLOUD_ENV = 'cloud1-3g7j95ax4a0f4a3f';

/**
 * 初始化云开发（仅小程序端）
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
  console.log('[Cloud] 调用云函数:', name, '参数:', data);
  
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    // 小程序端：直接调用云函数
    // @ts-ignore
    const res = await wx.cloud.callFunction({
      name,
      data
    });
    console.log('[Cloud] 云函数返回:', name, res.result);
    return res.result as T;
  } else {
    // H5 端：通过后端代理调用
    const response = await Network.request({
      url: `/api/cloud/${name}`,
      method: 'POST',
      data
    });
    console.log('[Cloud] 云函数返回:', name, response.data);
    return response.data as T;
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
 * 获取用户 OpenID
 */
export const getOpenId = async (): Promise<string | null> => {
  try {
    const res = await callFunction<{ openid: string }>('login');
    return res.openid;
  } catch (err) {
    console.error('[Cloud] 获取 OpenID 失败:', err);
    return null;
  }
};

// 云函数名称常量
export const CLOUD_FUNCTIONS = {
  LOGIN: 'login',
  TASK_LIST: 'task-list',
  TASK_CREATE: 'task-create',
  TASK_UPDATE: 'task-update',
  TASK_DELETE: 'task-delete',
  SUBTASK_CREATE: 'subtask-create',
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
  FEISHU_NOTIFY: 'feishu-notify'
} as const;
