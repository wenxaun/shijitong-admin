/**
 * 微信云开发工具封装
 * 支持小程序端和 H5 端
 */
import Taro from '@tarojs/taro';

// 云开发环境 ID
const CLOUD_ENV = 'cloud1-3g7j95ax4a0f4a3f';

// 模拟任务数据存储（用于 H5 端保持数据一致性）
let mockTasks: any[] = [
  {
    _id: 'mock_task_1',
    task_id: 'mock_task_1',
    task_name: '示例任务 1（已完成）',
    task_description: '这是一个已完成的示例任务，评分80分。',
    status: 'completed',
    priority: 'P1',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date().toISOString().split('T')[0],
    score: 80,
    score_note: '按时完成',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    _id: 'mock_task_2',
    task_id: 'mock_task_2',
    task_name: '示例任务 2（逾期完成）',
    task_description: '这是一个逾期完成的示例任务，评分65分。',
    status: 'completed',
    priority: 'P2',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    score: 65,
    score_note: '逾期3天完成',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    _id: 'mock_task_3',
    task_id: 'mock_task_3',
    task_name: '示例任务 3（进行中）',
    task_description: '这是一个进行中的示例任务。',
    status: 'in_progress',
    priority: 'P2',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    _id: 'mock_task_4',
    task_id: 'mock_task_4',
    task_name: '示例任务 4（待办）',
    task_description: '这是一个待办的示例任务。',
    status: 'pending',
    priority: 'P1',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// 模拟子任务数据存储
let mockSubtasks: any[] = [
  {
    _id: 'mock_subtask_1',
    parent_task_id: 'mock_task_1',
    task_name: '子任务 1 - 需求分析',
    name: '子任务 1 - 需求分析',
    status: 'completed',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  },
  {
    _id: 'mock_subtask_2',
    parent_task_id: 'mock_task_1',
    task_name: '子任务 2 - 设计方案',
    name: '子任务 2 - 设计方案',
    status: 'in_progress',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
];

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
 * H5 端模拟云函数响应
 */
const mockCloudFunction = async (name: string, data?: any): Promise<any> => {
  console.log('[Cloud Mock] 模拟云函数:', name, '参数:', data);
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));
  
  switch (name) {
    case 'login':
      return { openid: 'mock_openid' };
    
    case 'user-login':
      return {
        success: true,
        message: '欢迎加入事绩通！',
        data: {
          user_id: 'mock_user_' + Date.now(),
          openid: 'mock_openid',
          nickname: data?.userInfo?.nickName || '测试用户',
          avatar_url: data?.userInfo?.avatarUrl || '',
          role: 'executor',
          isNewUser: true
        }
      };
    
    case 'task-create': {
      const newTask = {
        _id: 'mock_task_' + Date.now(),
        task_id: 'mock_task_' + Date.now(),
        task_name: data?.task_name || '新任务',
        task_description: data?.task_description || '',
        status: 'pending',
        priority: data?.priority || 'P2',
        publisher_id: 'mock_openid',
        executor_id: data?.executor_id || 'mock_openid',
        require_date: data?.require_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockTasks.unshift(newTask);
      return {
        success: true,
        message: '创建成功',
        data: { task_id: newTask.task_id }
      };
    }
    
    case 'task-list':
      return {
        success: true,
        message: '获取成功',
        data: {
          tasks: mockTasks,
          hasMore: false
        }
      };
    
    case 'task-detail': {
      const task = mockTasks.find(t => t.task_id === data?.task_id || t._id === data?.task_id);
      if (task) {
        return {
          success: true,
          message: '获取成功',
          data: {
            task: task,
            publisher_name: '测试发布人',
            executor_name: '测试执行人'
          }
        };
      }
      return {
        success: false,
        message: '任务不存在'
      };
    }
    
    case 'task-update': {
      const taskIndex = mockTasks.findIndex(t => t.task_id === data?.task_id || t._id === data?.task_id);
      if (taskIndex >= 0) {
        mockTasks[taskIndex] = {
          ...mockTasks[taskIndex],
          ...data,
          updated_at: new Date().toISOString()
        };
        return {
          success: true,
          message: '更新成功'
        };
      }
      return {
        success: false,
        message: '任务不存在'
      };
    }
    
    case 'task-delete': {
      const taskIndex = mockTasks.findIndex(t => t.task_id === data?.task_id || t._id === data?.task_id);
      if (taskIndex >= 0) {
        mockTasks.splice(taskIndex, 1);
        return {
          success: true,
          message: '删除成功'
        };
      }
      return {
        success: false,
        message: '任务不存在'
      };
    }
    
    case 'subtask-create': {
      const newSubtask = {
        _id: 'mock_subtask_' + Date.now(),
        parent_task_id: data?.task_id,
        task_name: data?.title || '新子任务',
        name: data?.title || '新子任务',
        status: 'pending',
        executor_id: data?.executor_id || 'mock_openid',
        executor_name: '测试用户',
        require_date: data?.require_date || new Date().toISOString().split('T')[0],
        due_date: data?.require_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      mockSubtasks.push(newSubtask);
      return {
        success: true,
        message: '创建成功',
        data: { subtask_id: newSubtask._id }
      };
    }
    
    case 'subtask-list': {
      const subtasks = mockSubtasks.filter(s => s.parent_task_id === data?.parent_task_id);
      return {
        success: true,
        message: '获取成功',
        data: { subtasks }
      };
    }
    
    case 'subtask-detail': {
      const subtask = mockSubtasks.find(s => s._id === data?.subtask_id);
      if (subtask) {
        return {
          success: true,
          message: '获取成功',
          data: { subtask }
        };
      }
      return {
        success: false,
        message: '子任务不存在'
      };
    }
    
    case 'subtask-update': {
      const subtaskIndex = mockSubtasks.findIndex(s => s._id === data?.subtask_id);
      if (subtaskIndex >= 0) {
        mockSubtasks[subtaskIndex] = {
          ...mockSubtasks[subtaskIndex],
          ...data
        };
        return {
          success: true,
          message: '更新成功'
        };
      }
      return {
        success: false,
        message: '子任务不存在'
      };
    }
    
    case 'subtask-delete': {
      const subtaskIndex = mockSubtasks.findIndex(s => s._id === data?.subtask_id);
      if (subtaskIndex >= 0) {
        mockSubtasks.splice(subtaskIndex, 1);
        return {
          success: true,
          message: '删除成功'
        };
      }
      return {
        success: false,
        message: '子任务不存在'
      };
    }
    
    case 'comment-add':
      return {
        success: true,
        message: '评论成功',
        data: {
          comment: {
            _id: 'mock_comment_' + Date.now(),
            user_name: '测试用户',
            content: data?.content || '',
            created_at: new Date().toLocaleString()
          }
        }
      };
    
    case 'comment-list':
      return {
        success: true,
        message: '获取成功',
        data: { comments: [] }
      };
    
    case 'team-members':
      return {
        success: true,
        message: '获取成功',
        data: {
          members: [
            { openid: 'mock_openid', nickname: '测试用户' },
            { openid: 'mock_user_1', nickname: '张三' },
            { openid: 'mock_user_2', nickname: '李四' }
          ]
        }
      };
    
    case 'task-exception': {
      // 异常上报 - 更新任务状态
      const taskIndex = mockTasks.findIndex(t => t.task_id === data?.task_id || t._id === data?.task_id);
      if (taskIndex >= 0) {
        mockTasks[taskIndex] = {
          ...mockTasks[taskIndex],
          exception_type: data?.exception_type,
          exception_reason: data?.reason,
          new_deadline: data?.new_deadline,
          assist_user_id: data?.assist_user_id,
          has_exception: data?.has_exception ?? true, // 标记已上报异常
          status: 'exception',
          updated_at: new Date().toISOString()
        };
        return {
          success: true,
          message: '异常上报成功'
        };
      }
      return {
        success: false,
        message: '任务不存在'
      };
    }
    
    case 'send-notification':
      // 发送通知（模拟）
      console.log('[Cloud Mock] 发送通知:', data);
      return {
        success: true,
        message: '通知发送成功'
      };
    
    case 'task-history': {
      // 返回历史任务
      return {
        success: true,
        message: '获取成功',
        data: {
          tasks: mockTasks.filter(t => t.status === 'completed'),
          hasMore: false
        }
      };
    }
    
    case 'team-create': {
      // 创建新团队
      const newTeam = {
        _id: `team_${Date.now()}`,
        name: data?.name || '新团队',
        description: data?.description || '',
        leader_id: 'mock_openid',
        leader_name: '测试用户',
        members: ['mock_openid'],
        member_details: [
          { openid: 'mock_openid', nickname: '测试用户', role: 'owner', permissions: { can_create_task: true, can_assign_task: true, can_view_all_tasks: true, can_edit_team: true, can_invite_member: true, can_remove_member: true }, joined_at: new Date().toISOString() }
        ],
        invite_code: 'ABC' + Math.random().toString(36).substr(2, 3).toUpperCase(),
        created_at: new Date().toISOString()
      };
      
      // 保存到本地存储
      const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
      const teams = JSON.parse(storedTeams);
      teams.push(newTeam);
      Taro.setStorageSync('mock_teams', JSON.stringify(teams));
      
      return {
        success: true,
        message: '创建成功',
        data: { team_id: newTeam._id }
      };
    }
    
    case 'team-list': {
      // 从本地存储读取团队数据
      const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
      const teams = JSON.parse(storedTeams);
      
      // 筛选我是成员的团队
      const myTeams = teams.filter((team: any) => 
        team.members?.includes('mock_openid') || 
        team.member_details?.some((m: any) => m.openid === 'mock_openid')
      );
      
      return {
        success: true,
        message: '获取成功',
        data: { teams: myTeams }
      };
    }
    
    case 'team-detail': {
      // 返回团队详情
      return {
        success: true,
        message: '获取成功',
        data: {
          team: {
            _id: 'mock_team_1',
            name: '示例团队',
            description: '这是一个示例团队',
            leader_id: 'mock_openid',
            leader_name: '测试用户',
            members: ['mock_openid', 'mock_user_1', 'mock_user_2'],
            member_details: [
              { openid: 'mock_openid', nickname: '测试用户', role: 'owner' },
              { openid: 'mock_user_1', nickname: '张三', role: 'admin' },
              { openid: 'mock_user_2', nickname: '李四', role: 'member' }
            ],
            invite_code: 'ABC123',
            created_at: new Date().toISOString()
          }
        }
      };
    }
    
    case 'team-dissolve':
      return {
        success: true,
        message: '团队已解散'
      };
    
    case 'team-member-update':
      return {
        success: true,
        message: '成员角色已更新'
      };
    
    case 'team-member-remove':
      return {
        success: true,
        message: '成员已移除'
      };
    
    case 'team-invite': {
      // 邀请码查询和加入团队
      if (data?.action === 'query') {
        // 模拟查询邀请码
        if (data?.invite_code === 'ABC123') {
          return {
            success: true,
            message: '查询成功',
            data: {
              team_id: 'mock_team_1',
              team_name: '示例团队',
              inviter_name: '测试用户'
            }
          };
        }
        return {
          success: false,
          message: '邀请码无效或已过期'
        };
      } else if (data?.action === 'join') {
        // 模拟加入团队
        return {
          success: true,
          message: '加入成功'
        };
      }
      return {
        success: false,
        message: '未知操作'
      };
    }
    
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
      console.error('[Cloud] 云函数调用失败:', name, err);
      console.error('[Cloud] 错误详情:', err.message || err.errMsg);
      console.log('===== [Cloud] 云函数调用结束（失败）=====');
      throw err;
    }
  } else {
    // H5 端：使用模拟数据
    console.log('[Cloud] H5 端使用模拟数据');
    const result = await mockCloudFunction(name, data);
    console.log('[Cloud] 模拟返回:', name, JSON.stringify(result));
    console.log('===== [Cloud] 云函数调用结束 =====');
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
