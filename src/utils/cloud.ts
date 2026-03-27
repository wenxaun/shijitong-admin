/**
 * 微信云开发工具封装
 * 支持小程序端和 H5 端
 */
import Taro from '@tarojs/taro';

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
 * H5 端模拟云函数响应
 */
const mockCloudFunction = async (name: string, data?: any): Promise<any> => {
  console.log('[Cloud Mock] 模拟云函数:', name, '参数:', data);
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  switch (name) {
    case 'login':
      return { openid: 'mock_openid_' + Date.now() };
    
    case 'task-create':
      return {
        success: true,
        message: '创建成功',
        data: { task_id: 'mock_task_' + Date.now() }
      };
    
    case 'task-list':
      return {
        success: true,
        message: '获取成功',
        data: {
          tasks: [
            {
              _id: 'mock_1',
              task_id: 'mock_1',
              task_name: '示例任务 1',
              task_description: '这是一个示例任务',
              status: 'pending',
              priority: 'P1',
              publisher_id: 'mock_openid',
              executor_id: 'mock_openid',
              require_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: 'mock_2',
              task_id: 'mock_2',
              task_name: '示例任务 2',
              task_description: '这是另一个示例任务',
              status: 'in_progress',
              priority: 'P2',
              publisher_id: 'mock_openid',
              executor_id: 'mock_openid',
              require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          hasMore: false
        }
      };
    
    case 'task-update':
      return {
        success: true,
        message: '更新成功'
      };
    
    case 'task-delete':
      return {
        success: true,
        message: '删除成功'
      };
    
    case 'subtask-create':
      return {
        success: true,
        message: '创建成功',
        data: { subtask_id: 'mock_subtask_' + Date.now() }
      };
    
    case 'subtask-list':
      return {
        success: true,
        message: '获取成功',
        data: { subtasks: [] }
      };
    
    case 'subtask-update':
      return {
        success: true,
        message: '更新成功'
      };
    
    case 'subtask-delete':
      return {
        success: true,
        message: '删除成功'
      };
    
    case 'comment-add':
      return {
        success: true,
        message: '评论成功',
        data: {
          comment: {
            _id: 'mock_comment_' + Date.now(),
            user_name: '测试用户',
            content: data?.content || '',
            created_at: new Date().toISOString()
          }
        }
      };
    
    case 'comment-list':
      return {
        success: true,
        message: '获取成功',
        data: { comments: [] }
      };
    
    default:
      console.warn('[Cloud Mock] 未知的云函数:', name);
      return {
        success: true,
        message: '操作成功（模拟）'
      };
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
    // H5 端：使用模拟数据
    console.log('[Cloud] H5 端使用模拟数据');
    const result = await mockCloudFunction(name, data);
    console.log('[Cloud] 模拟返回:', name, result);
    return result as T;
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
  FEISHU_NOTIFY: 'feishu-notify'
} as const;
