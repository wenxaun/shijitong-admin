import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';

export interface User {
  _id: string;
  name: string;
  openid?: string;
  username?: string;
  password?: string;
  user_type?: 'personal' | 'enterprise';
  role?: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly configService: ConfigService) {}
  async login(username: string, password: string) {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === adminUsername && password === adminPassword) {
      const token = Buffer.from(
        JSON.stringify({
          id: 'admin',
          username: adminUsername,
          role: 'admin',
          iat: Date.now(),
        }),
      ).toString('base64');

      return {
        code: 200,
        msg: 'success',
        data: {
          token,
          user: {
            id: 'admin',
            username: adminUsername,
            role: 'admin',
          },
        },
      };
    }

    return {
      code: 401,
      msg: '用户名或密码错误',
    };
  }

  async getStats() {
    console.log('[Admin] getStats called');
    
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      console.log('[Admin] 未配置密钥，使用模拟数据');
      return {
        code: 200,
        msg: 'success (mock)',
        data: { totalUsers: 100, activeUsers: 45, totalTasks: 320, completedTasks: 180 },
      };
    }

    try {
      console.log('[Admin] 连接云数据库...');
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      
      console.log('[Admin] 查询用户数...');
      const usersCount = await db.collection('users').count();
      console.log('[Admin] 查询任务数...');
      const tasksCount = await db.collection('tasks').count();
      const completedCount = await db.collection('tasks').where({ status: 'completed' }).count();

      return {
        code: 200,
        msg: 'success',
        data: {
          totalUsers: usersCount.total,
          activeUsers: Math.floor(usersCount.total * 0.6),
          totalTasks: tasksCount.total,
          completedTasks: completedCount.total,
        },
      };
    } catch (error: any) {
      console.error('[Admin] 查询失败:', error.message);
      return {
        code: 500,
        msg: '查询失败: ' + error.message,
        data: { totalUsers: 0, activeUsers: 0, totalTasks: 0, completedTasks: 0 },
      };
    }
  }

  async getUsers(params: {
    search?: string;
    userType?: string;
    limit: number;
    offset: number;
  }) {
    console.log('[Admin] getUsers called');
    
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      return {
        code: 200,
        msg: 'success (mock)',
        data: { list: [], total: 0 },
      };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();

      const countResult = await db.collection('users').count();
      const total = countResult.total;

      const result = await db.collection('users')
        .skip(params.offset)
        .limit(params.limit)
        .orderBy('created_at', 'desc')
        .get();

      return { code: 200, msg: 'success', data: { list: result.data, total } };
    } catch (error: any) {
      console.error('[Admin] 获取用户列表失败:', error.message);
      return { code: 500, msg: '获取用户列表失败: ' + error.message, data: { list: [], total: 0 } };
    }
  }

  async deleteUser(id: string) {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      return { code: 200, msg: 'success (mock)' };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      await db.collection('users').doc(id).remove();
      return { code: 200, msg: 'success' };
    } catch (error: any) {
      return { code: 500, msg: '删除用户失败: ' + error.message };
    }
  }

  async updateUserRole(userId: string, role: string) {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!['member', 'admin', 'owner'].includes(role)) {
      return { code: 400, msg: '无效的角色类型' };
    }
    
    if (!secretId || !secretKey || !envId) {
      return { code: 200, msg: 'success (mock)' };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      
      await db.collection('users').doc(userId).update({
        role,
        updated_at: new Date().toISOString()
      });
      
      return { code: 200, msg: '角色更新成功' };
    } catch (error: any) {
      return { code: 500, msg: '更新角色失败: ' + error.message };
    }
  }

  async getAnalytics(startDate: string, endDate: string) {
    return this.getMockAnalytics(startDate, endDate);
  }

  private getMockAnalytics(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const taskTrend = Array.from({ length: days }, (_, i) => ({
      date: new Date(start.getTime() + i * 1000 * 60 * 60 * 24).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + 5,
    }));

    const userActivity = Array.from({ length: days }, (_, i) => ({
      date: new Date(start.getTime() + i * 1000 * 60 * 60 * 24).toISOString().split('T')[0],
      active: Math.floor(Math.random() * 50) + 20,
      total: Math.floor(Math.random() * 100) + 50,
    }));

    return {
      code: 200,
      msg: 'success (mock)',
      data: { taskTrend, userActivity, deptDistribution: [] },
    };
  }

  async exportAnalytics(startDate: string, endDate: string) {
    const analytics = await this.getAnalytics(startDate, endDate);
    return 'date,count\n' + analytics.data.taskTrend.map((d: any) => `${d.date},${d.count}`).join('\n');
  }

  async getSystemStatus() {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    const cloudReady = !!(secretId && secretKey);

    return {
      code: 200,
      msg: 'success',
      data: {
        api: true,
        database: cloudReady,
        cloudFunction: cloudReady,
        resources: { cpu: 50, memory: 60, storage: 70 },
      },
    };
  }

  async getSystemLogs(params: { level?: string; limit: number }) {
    const logs: LogEntry[] = [
      { timestamp: new Date().toISOString(), level: 'info', message: '管理后台启动成功' },
    ];
    return { code: 200, msg: 'success', data: logs.slice(0, params.limit) };
  }

  async getConfig() {
    try {
      const config = await this.configService.getCurrentConfig();
      return { code: 200, msg: 'success', data: config };
    } catch (error: any) {
      console.error('[Admin] 获取配置失败:', error.message);
      return { code: 500, msg: '获取配置失败: ' + error.message };
    }
  }

  async updateConfig(config: any) {
    try {
      const updates: Array<{ id: string; value: any }> = [];
      
      if (config.role_config) {
        updates.push({ id: 'role_config', value: config.role_config });
      }
      
      if (config.wecom) {
        if (config.wecom.corpId !== undefined) updates.push({ id: 'wecom-corpId', value: config.wecom.corpId });
        if (config.wecom.corpSecret !== undefined) updates.push({ id: 'wecom-corpSecret', value: config.wecom.corpSecret });
        if (config.wecom.agentId !== undefined) updates.push({ id: 'wecom-agentId', value: config.wecom.agentId });
        if (config.wecom.agentSecret !== undefined) updates.push({ id: 'wecom-agentSecret', value: config.wecom.agentSecret });
        if (config.wecom.contactSecret !== undefined) updates.push({ id: 'wecom-contactSecret', value: config.wecom.contactSecret });
      }
      
      if (updates.length > 0) {
        await this.configService.batchUpdateConfig(updates, 'admin');
      }
      
      return { code: 200, msg: 'success' };
    } catch (error: any) {
      console.error('[Admin] 更新配置失败:', error.message);
      return { code: 500, msg: '更新配置失败: ' + error.message };
    }
  }

  async syncConfigToCloud() {
    return { code: 200, msg: 'success' };
  }

  async getUserPermissions(openid: string) {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    const defaultPermissions = {
      role: 'member',
      features: { task_enabled: true, team_enabled: false, enterprise_enabled: false, notification_enabled: true, weekly_report_enabled: false, voice_input_enabled: false, config_access: false },
      limits: { max_tasks_per_user: 50, max_subtasks_per_task: 10, max_team_members: 20 }
    };
    
    if (!secretId || !secretKey || !envId) {
      return { code: 200, msg: 'success (default)', data: defaultPermissions };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      
      const userResult = await db.collection('users').where({ openid }).get();
      if (!userResult.data || userResult.data.length === 0) {
        return { code: 200, msg: 'success (default)', data: defaultPermissions };
      }
      
      const user = userResult.data[0];
      const role = user.role || 'member';
      
      const configResult = await db.collection('config').doc('app_config').get();
      let config = configResult.data?.[0];
      
      if (!config || !config.role_config) {
        config = {
          role_config: {
            member: { features: defaultPermissions.features, limits: defaultPermissions.limits },
            admin: { features: { ...defaultPermissions.features, team_enabled: true, weekly_report_enabled: true, config_access: true }, limits: { max_tasks_per_user: 200, max_subtasks_per_task: 30, max_team_members: 50 } },
            owner: { features: { task_enabled: true, team_enabled: true, enterprise_enabled: true, notification_enabled: true, weekly_report_enabled: true, voice_input_enabled: true, config_access: true }, limits: { max_tasks_per_user: 999, max_subtasks_per_task: 100, max_team_members: 500 } }
          }
        };
      }
      
      const roleConfig = config.role_config[role] || config.role_config.member;
      
      return {
        code: 200,
        msg: 'success',
        data: {
          role,
          features: roleConfig.features,
          limits: roleConfig.limits
        }
      };
    } catch (error: any) {
      console.error('[Admin] 获取用户权限失败:', error.message);
      return { code: 200, msg: 'success (default)', data: defaultPermissions };
    }
  }

  async getUserRelatedData(userId: string) {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      return { 
        code: 200, 
        msg: 'success (mock)', 
        data: { 
          tasks: [], 
          teams: [], 
          relatedUsers: [],
          summary: { taskCount: 0, teamCount: 0, relatedUserCount: 0 }
        } 
      };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      
      const userRes = await db.collection('users').doc(userId).get();
      if (!userRes.data || userRes.data.length === 0) {
        return { code: 404, msg: '用户不存在' };
      }
      const user = userRes.data[0];
      
      const tasksWhere = db.collection('tasks').where(
        db.command.or([
          { creator_id: userId },
          { assignee_id: userId },
          { 'members.user_id': userId }
        ])
      );
      const tasksRes = await tasksWhere.get();
      const tasks = tasksRes.data || [];
      
      const teamsWhere = db.collection('teams').where(
        db.command.or([
          { creator_id: userId },
          { 'members.user_id': userId }
        ])
      );
      const teamsRes = await teamsWhere.get();
      const teams = teamsRes.data || [];
      
      const relatedUserIds = new Set<string>();
      tasks.forEach((task: any) => {
        if (task.creator_id && task.creator_id !== userId) relatedUserIds.add(task.creator_id);
        if (task.assignee_id && task.assignee_id !== userId) relatedUserIds.add(task.assignee_id);
        if (task.members) {
          task.members.forEach((m: any) => {
            if (m.user_id && m.user_id !== userId) relatedUserIds.add(m.user_id);
          });
        }
      });
      teams.forEach((team: any) => {
        if (team.creator_id && team.creator_id !== userId) relatedUserIds.add(team.creator_id);
        if (team.members) {
          team.members.forEach((m: any) => {
            if (m.user_id && m.user_id !== userId) relatedUserIds.add(m.user_id);
          });
        }
      });
      
      let relatedUsers: any[] = [];
      if (relatedUserIds.size > 0) {
        const relatedUsersRes = await db.collection('users').where({
          _id: db.command.in(Array.from(relatedUserIds))
        }).field({ _id: true, nickname: true, openid: true }).get();
        relatedUsers = relatedUsersRes.data || [];
      }
      
      return {
        code: 200,
        msg: 'success',
        data: {
          tasks,
          teams,
          relatedUsers,
          summary: {
            taskCount: tasks.length,
            teamCount: teams.length,
            relatedUserCount: relatedUsers.length
          }
        }
      };
    } catch (error: any) {
      console.error('[Admin] 获取用户关联数据失败:', error.message);
      return { code: 500, msg: '获取关联数据失败: ' + error.message };
    }
  }

  async backupUserTasks(userId: string, targetUserId: string) {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      return { code: 200, msg: 'success (mock)', data: { backupCount: 0 } };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      
      const targetUserRes = await db.collection('users').doc(targetUserId).get();
      if (!targetUserRes.data || targetUserRes.data.length === 0) {
        return { code: 404, msg: '目标用户不存在' };
      }
      
      const tasksWhere = db.collection('tasks').where(
        db.command.or([
          { creator_id: userId },
          { assignee_id: userId },
          { 'members.user_id': userId }
        ])
      );
      const tasksRes = await tasksWhere.get();
      const tasks = tasksRes.data || [];
      
      let backupCount = 0;
      for (const task of tasks) {
        const backupTask = {
          ...task,
          _id: undefined,
          original_task_id: task._id,
          original_user_id: userId,
          backup_to_user_id: targetUserId,
          backup_at: new Date().toISOString(),
          title: `[备份] ${task.title || task.name || '未命名任务'}`,
          creator_id: targetUserId,
          assignee_id: task.assignee_id === userId ? targetUserId : task.assignee_id,
        };
        delete backupTask._id;
        
        await db.collection('tasks').add(backupTask);
        backupCount++;
      }
      
      return { 
        code: 200, 
        msg: 'success', 
        data: { backupCount, message: `已备份 ${backupCount} 条任务到目标用户` } 
      };
    } catch (error: any) {
      console.error('[Admin] 备份用户任务失败:', error.message);
      return { code: 500, msg: '备份失败: ' + error.message };
    }
  }

  async deleteUserWithCascade(userId: string, options: { backupToUserId?: string } = {}) {
    const envId = process.env.TCB_ENV_ID;
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey || !envId) {
      return { code: 200, msg: 'success (mock)' };
    }

    try {
      const cloudbase = require('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });
      const db = app.database();
      
      if (options.backupToUserId) {
        await this.backupUserTasks(userId, options.backupToUserId);
      }
      
      const tasksWhere = db.collection('tasks').where(
        db.command.or([
          { creator_id: userId },
          { assignee_id: userId },
          { 'members.user_id': userId }
        ])
      );
      const tasksRes = await tasksWhere.get();
      const tasks = tasksRes.data || [];
      
      for (const task of tasks) {
        await db.collection('tasks').doc(task._id).remove();
      }
      
      const teamsWhere = db.collection('teams').where(
        db.command.or([
          { creator_id: userId },
          { 'members.user_id': userId }
        ])
      );
      const teamsRes = await teamsWhere.get();
      const teams = teamsRes.data || [];
      
      for (const team of teams) {
        if (team.creator_id === userId) {
          await db.collection('teams').doc(team._id).remove();
        } else {
          const updatedMembers = (team.members || []).filter((m: any) => m.user_id !== userId);
          await db.collection('teams').doc(team._id).update({
            members: updatedMembers,
            updated_at: new Date().toISOString()
          });
        }
      }
      
      await db.collection('users').doc(userId).remove();
      
      return { 
        code: 200, 
        msg: 'success',
        data: {
          deletedTasks: tasks.length,
          deletedTeams: teams.filter((t: any) => t.creator_id === userId).length,
          updatedTeams: teams.filter((t: any) => t.creator_id !== userId).length
        }
      };
    } catch (error: any) {
      console.error('[Admin] 级联删除用户失败:', error.message);
      return { code: 500, msg: '删除失败: ' + error.message };
    }
  }
}
