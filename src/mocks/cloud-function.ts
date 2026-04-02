/**
 * 云函数模拟逻辑
 */

import Taro from '@tarojs/taro';
import {
  getMockTasks,
  addMockTask,
  updateMockTask,
  deleteMockTask,
  getMockTask
} from './tasks';
import {
  addMockSubtask,
  updateMockSubtask,
  deleteMockSubtask,
  getMockSubtask,
  getMockSubtasksByParentId
} from './subtasks';

/**
 * 模拟网络延迟
 */
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * H5 端模拟云函数响应
 */
export const mockCloudFunction = async (name: string, data?: any): Promise<any> => {
  console.log('[Cloud Mock] 模拟云函数:', name, '参数:', data);
  
  await delay();
  
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
    
    case 'user-update':
      return {
        success: true,
        message: '更新成功',
        data: {
          nickname: data?.nickname,
          avatar_url: data?.avatar_url
        }
      };
    
    case 'task-create': {
      const newTask = {
        _id: 'mock_task_' + Date.now(),
        task_id: 'mock_task_' + Date.now(),
        task_name: data?.task_name || '新任务',
        task_description: data?.task_description || '',
        status: 'pending' as const,
        priority: data?.priority || 'P2',
        publisher_id: 'mock_openid',
        executor_id: data?.executor_id || 'mock_openid',
        require_date: data?.require_date || new Date().toISOString().split('T')[0],
        repeat_type: data?.repeat_type || 'none',
        repeat_end_date: data?.repeat_end_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      addMockTask(newTask);
      return {
        success: true,
        message: '创建成功',
        data: { task_id: newTask.task_id }
      };
    }
    
    case 'task-list': {
      let tasks = getMockTasks();
      
      // 状态筛选
      if (data?.status && data.status !== 'all') {
        tasks = tasks.filter((t: any) => t.status === data.status);
      }
      
      // 视图筛选
      if (data?.view_type && data.view_type !== 'all') {
        // 这里可以根据 view_type 进行筛选
        // assigned: 我分配的, followed: 我关注的
      }
      
      // 时间筛选
      if (data?.time_filter && data.time_filter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        tasks = tasks.filter((t: any) => {
          if (t.status === 'completed' || t.status === 'cancelled') return false;
          
          const requireDate = new Date(t.require_date);
          requireDate.setHours(0, 0, 0, 0);
          
          switch (data.time_filter) {
            case 'today':
              return requireDate.getTime() === today.getTime();
            case 'week': {
              const endOfWeek = new Date(today);
              endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
              return requireDate >= today && requireDate <= endOfWeek;
            }
            case 'month': {
              const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              return requireDate >= today && requireDate <= endOfMonth;
            }
            default:
              return true;
          }
        });
      }
      
      // 自定义时间范围
      if (data?.start_date && data?.end_date) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        tasks = tasks.filter((t: any) => {
          const requireDate = new Date(t.require_date);
          return requireDate >= startDate && requireDate <= endDate;
        });
      }
      
      return {
        success: true,
        message: '获取成功',
        data: {
          tasks,
          hasMore: false
        }
      };
    }
    
    case 'task-detail': {
      const task = getMockTask(data?.task_id);
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
      const success = updateMockTask(data?.task_id, data);
      if (success) {
        return { success: true, message: '更新成功' };
      }
      return { success: false, message: '任务不存在' };
    }
    
    case 'task-delete': {
      const success = deleteMockTask(data?.task_id);
      if (success) {
        return { success: true, message: '删除成功' };
      }
      return { success: false, message: '任务不存在' };
    }
    
    case 'subtask-create': {
      const newSubtask = {
        _id: 'mock_subtask_' + Date.now(),
        parent_task_id: data?.task_id,
        task_name: data?.title || '新子任务',
        name: data?.title || '新子任务',
        status: 'pending' as const,
        executor_id: data?.executor_id || 'mock_openid',
        executor_name: '测试用户',
        require_date: data?.require_date || new Date().toISOString().split('T')[0],
        due_date: data?.require_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      addMockSubtask(newSubtask);
      return {
        success: true,
        message: '创建成功',
        data: { subtask_id: newSubtask._id }
      };
    }
    
    case 'subtask-list': {
      const subtasks = getMockSubtasksByParentId(data?.parent_task_id);
      return {
        success: true,
        message: '获取成功',
        data: { subtasks }
      };
    }
    
    case 'subtask-detail': {
      const subtask = getMockSubtask(data?.subtask_id);
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
      const success = updateMockSubtask(data?.subtask_id, data);
      if (success) {
        return { success: true, message: '更新成功' };
      }
      return { success: false, message: '子任务不存在' };
    }
    
    case 'subtask-delete': {
      const success = deleteMockSubtask(data?.subtask_id);
      if (success) {
        return { success: true, message: '删除成功' };
      }
      return { success: false, message: '子任务不存在' };
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
      const success = updateMockTask(data?.task_id, {
        exception_type: data?.exception_type,
        exception_reason: data?.reason,
        new_deadline: data?.new_deadline,
        assist_user_id: data?.assist_user_id,
        has_exception: data?.has_exception ?? true,
        status: 'exception'
      });
      if (success) {
        return { success: true, message: '异常上报成功' };
      }
      return { success: false, message: '任务不存在' };
    }
    
    case 'send-notification':
      console.log('[Cloud Mock] 发送通知:', data);
      return { success: true, message: '通知发送成功' };
    
    case 'task-history': {
      const tasks = getMockTasks().filter(t => t.status === 'completed');
      return {
        success: true,
        message: '获取成功',
        data: { tasks, hasMore: false }
      };
    }
    
    case 'team-create': {
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
      const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
      const teams = JSON.parse(storedTeams);
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
    
    case 'team-detail':
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
    
    case 'team-dissolve':
      return { success: true, message: '团队已解散' };
    
    case 'team-member-update':
      return { success: true, message: '成员角色已更新' };
    
    case 'team-member-remove':
      return { success: true, message: '成员已移除' };
    
    case 'team-invite': {
      if (data?.action === 'query') {
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
        return { success: false, message: '邀请码无效或已过期' };
      } else if (data?.action === 'join') {
        return { success: true, message: '加入成功' };
      }
      return { success: false, message: '未知操作' };
    }
    
    case 'weekly-report': {
      const completedTasks = getMockTasks().filter(t => t.status === 'completed');
      return {
        success: true,
        message: '获取成功',
        data: {
          weekStart: data?.week_start || new Date().toISOString().split('T')[0],
          weekEnd: data?.week_end || new Date().toISOString().split('T')[0],
          tasks: completedTasks,
          stats: {
            totalTasks: completedTasks.length,
            avgScore: completedTasks.length > 0 
              ? Math.round(completedTasks.reduce((sum, t) => sum + (t.score || 0), 0) / completedTasks.length)
              : 0,
            highScoreCount: completedTasks.filter(t => (t.score || 0) >= 80).length,
            lowScoreCount: completedTasks.filter(t => (t.score || 0) < 80).length,
            attributionStats: []
          }
        }
      };
    }
    
    default:
      console.warn('[Cloud Mock] 未知的云函数:', name);
      return { success: true, message: '操作成功（模拟）' };
  }
};

export default mockCloudFunction;
