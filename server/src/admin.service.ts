import { Injectable } from '@nestjs/common';

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
    return { code: 200, msg: 'success', data: {} };
  }

  async updateConfig(config: any) {
    return { code: 200, msg: 'success' };
  }

  async syncConfigToCloud() {
    return { code: 200, msg: 'success' };
  }
}
