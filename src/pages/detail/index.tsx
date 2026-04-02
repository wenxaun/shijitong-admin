// 注意：分享功能必须使用 Taro 原生 Button 组件，因为需要 openType="share"
// eslint-disable-next-line no-restricted-syntax
import { View, Text, ScrollView, Button } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { Task, Subtask, CloudResponse } from '@/types';
import { STATUS_MAP, PRIORITY_STYLE } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button as UIButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Ellipsis,
  Pencil,
  Trash2,
  Play,
  Check,
  TriangleAlert,
  ChevronRight,
  MessageCircle,
  ListTodo,
  FileText,
  Share2,
  History,
  Star
} from 'lucide-react-taro';

interface Comment {
  _id: string;
  user_name: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

interface TaskLog {
  _id: string;
  task_id: string;
  action_type: string;
  action_detail: string;
  operator_id: string;
  operator_name: string;
  created_at: string;
}

// 操作类型映射
const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  create: { label: '创建任务', color: '#1890ff' },
  update: { label: '更新任务', color: '#52c41a' },
  delete: { label: '删除任务', color: '#ff4d4f' },
  complete: { label: '完成任务', color: '#52c41a' },
  cancel: { label: '取消任务', color: '#ff4d4f' },
  assign: { label: '分配任务', color: '#1890ff' },
  priority: { label: '修改优先级', color: '#faad14' },
  status: { label: '修改状态', color: '#1890ff' },
  score: { label: '评分', color: '#722ed1' },
  exception: { label: '异常上报', color: '#faad14' },
  follow: { label: '关注任务', color: '#1890ff' },
  unfollow: { label: '取消关注', color: '#8c8c8c' }
};

export default function Detail() {
  const router = useRouter();
  const { openid } = useUserStore();
  const taskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [publisherName, setPublisherName] = useState('');
  const [executorName, setExecutorName] = useState('');
  const [currentTab, setCurrentTab] = useState('detail');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 子任务
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskProgress, setSubtaskProgress] = useState({ total: 0, completed: 0, progress: 0 });

  // 评论
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // 日志
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [isFollowed, setIsFollowed] = useState(false);

  // 权限
  const [isPublisher, setIsPublisher] = useState(false);
  const [isExecutor, setIsExecutor] = useState(false);
  
  // 操作权限：创建人或执行人可以操作（开始、完成、异常上报）
  const canOperate = isPublisher || isExecutor;

  // 加载任务详情
  const loadTask = useCallback(async () => {
    if (!taskId || !openid) return;

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ task: Task; publisher_name: string; executor_name: string }>>(
        'task-detail',
        { task_id: taskId }
      );

      if (res.success && res.data) {
        setTask(res.data.task);
        setPublisherName(res.data.publisher_name);
        setExecutorName(res.data.executor_name);
        const isPublisherUser = res.data.task.publisher_id === openid;
        const isExecutorUser = res.data.task.executor_id === openid;
        setIsPublisher(isPublisherUser);
        setIsExecutor(isExecutorUser);
        
        // 只有非创建人、非执行人才需要检查关注状态
        if (!isPublisherUser && !isExecutorUser) {
          // 内联检查关注状态
          try {
            const followRes = await callFunction<CloudResponse<{ is_followed: boolean }>>(
              'task-follow',
              { action: 'check', task_id: taskId }
            );
            if (followRes.success && followRes.data) {
              setIsFollowed(followRes.data.is_followed);
            }
          } catch (err) {
            console.error('检查关注状态失败:', err);
          }
        } else {
          // 创建人或执行人，重置关注状态
          setIsFollowed(false);
        }
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [taskId, openid]);

  // 加载子任务
  const loadSubtasks = useCallback(async () => {
    if (!taskId) return;

    try {
      const res = await callFunction<CloudResponse<{ subtasks: Subtask[] }>>(
        CLOUD_FUNCTIONS.SUBTASK_LIST,
        { parent_task_id: taskId }
      );

      if (res.success && res.data) {
        const list = res.data.subtasks || [];
        const completed = list.filter(s => s.status === 'completed').length;
        setSubtasks(list);
        setSubtaskProgress({
          total: list.length,
          completed,
          progress: list.length > 0 ? Math.round((completed / list.length) * 100) : 0
        });
      }
    } catch (err) {
      console.error('加载子任务失败:', err);
    }
  }, [taskId]);

  // 加载评论
  const loadComments = useCallback(async () => {
    if (!taskId) return;

    try {
      const res = await callFunction<CloudResponse<{ comments: Comment[] }>>(
        CLOUD_FUNCTIONS.COMMENT_LIST,
        { task_id: taskId }
      );

      if (res.success && res.data) {
        setComments(res.data.comments || []);
      }
    } catch (err) {
      console.error('加载评论失败:', err);
    }
  }, [taskId]);

  // 加载任务日志
  const loadLogs = useCallback(async () => {
    if (!taskId) return;

    try {
      const res = await callFunction<CloudResponse<{ logs: TaskLog[] }>>(
        'task-logs',
        { action: 'list', task_id: taskId }
      );

      if (res.success && res.data) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('加载日志失败:', err);
    }
  }, [taskId]);

  // 关注/取消关注任务
  const toggleFollow = async () => {
    if (!taskId) return;
    
    // 判断是否可以关注
    if (isPublisher) {
      Taro.showToast({ title: '您是任务创建者，无需关注', icon: 'none' });
      return;
    }
    if (isExecutor) {
      Taro.showToast({ title: '您是任务执行者，无需关注', icon: 'none' });
      return;
    }

    try {
      const action = isFollowed ? 'unfollow' : 'follow';
      const res = await callFunction<CloudResponse>(
        'task-follow',
        { action, task_id: taskId }
      );

      if (res.success) {
        setIsFollowed(!isFollowed);
        Taro.showToast({ 
          title: isFollowed ? '已取消关注' : '关注成功', 
          icon: 'success' 
        });
      } else {
        Taro.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      console.error('关注操作失败:', err);
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  useEffect(() => {
    if (taskId && openid) {
      loadTask();
      loadSubtasks();
    }
  }, [taskId, openid, loadTask, loadSubtasks]);

  // 页面显示时刷新数据
  Taro.useDidShow(() => {
    if (taskId && openid) {
      loadTask();
      loadSubtasks();
    }
  });

  useEffect(() => {
    if (currentTab === 'comment') {
      loadComments();
    }
    if (currentTab === 'log') {
      loadLogs();
    }
  }, [currentTab, loadComments, loadLogs]);

  // 开始任务
  const startTask = async () => {
    if (!task) return;

    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.TASK_UPDATE,
        { task_id: taskId, status: 'in_progress' }
      );

      if (res.success) {
        Taro.showToast({ title: '已开始', icon: 'success' });
        loadTask();
      } else {
        Taro.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      console.error('开始任务失败:', err);
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  // 完成任务
  const completeTask = async () => {
    if (!task) return;

    // 检查子任务
    if (subtaskProgress.total > 0 && subtaskProgress.progress < 100) {
      Taro.showModal({
        title: '子任务未完成',
        content: `还有 ${subtaskProgress.total - subtaskProgress.completed} 个子任务未完成`,
        showCancel: false
      });
      return;
    }

    // 检查是否逾期
    const requireDate = new Date(task.require_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requireDate.setHours(0, 0, 0, 0);
    const isOverdue = today > requireDate;

    // 弹窗确认完成
    Taro.showModal({
      title: isOverdue ? '任务逾期确认' : '确认完成',
      content: isOverdue 
        ? '该任务已逾期，完成前需要填写复盘内容，确定继续吗？'
        : '确定要完成此任务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 先更新任务状态为完成（跳过复盘验证，后续在复盘页面填写）
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.TASK_UPDATE,
              { 
                task_id: taskId, 
                status: 'completed',
                complete_date: new Date().toISOString(),
                skip_review_check: true
              }
            );

            if (result.success) {
              // 判断是否需要复盘
              if (isOverdue || isExecutor) {
                // 逾期或执行人完成，跳转到复盘页面
                Taro.redirectTo({ url: `/pages/review/index?id=${taskId}` });
              } else {
                Taro.showToast({ title: '完成成功', icon: 'success' });
                loadTask();
              }
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 异常上报
  const reportException = () => {
    Taro.navigateTo({ url: `/pages/exception/index?id=${taskId}` });
  };

  // 编辑任务
  const editTask = () => {
    setShowMoreMenu(false);
    
    // 判断是否可以编辑
    if (!isPublisher) {
      Taro.showToast({ title: '只有任务创建者才能编辑', icon: 'none' });
      return;
    }
    if (task?.status !== 'pending') {
      const statusText = STATUS_MAP[task?.status as keyof typeof STATUS_MAP]?.label || task?.status;
      Taro.showToast({ title: `任务${statusText}中无法编辑`, icon: 'none' });
      return;
    }
    
    Taro.navigateTo({ url: `/pages/edit/index?id=${taskId}` });
  };

  // 删除任务
  const deleteTask = () => {
    setShowMoreMenu(false);
    
    // 判断是否可以删除
    if (!isPublisher) {
      Taro.showToast({ title: '只有任务创建者才能删除', icon: 'none' });
      return;
    }
    if (task?.status !== 'pending') {
      const statusText = STATUS_MAP[task?.status as keyof typeof STATUS_MAP]?.label || task?.status;
      Taro.showToast({ title: `任务${statusText}中无法删除`, icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除吗？',
      confirmColor: '#EA4335',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.TASK_DELETE,
              { task_id: taskId }
            );

            if (result.success) {
              Taro.showToast({ title: '删除成功', icon: 'success' });
              setTimeout(() => Taro.navigateBack(), 1500);
            }
          } catch (err) {
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 添加评论
  const addComment = async () => {
    const content = commentInput.trim();
    if (!content) {
      Taro.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }

    try {
      const res = await callFunction<CloudResponse<{ comment: Comment }>>(
        CLOUD_FUNCTIONS.COMMENT_ADD,
        { task_id: taskId, content }
      );

      if (res.success && res.data) {
        setComments([res.data.comment, ...comments]);
        setCommentInput('');
        Taro.showToast({ title: '评论成功', icon: 'success' });
      }
    } catch (err) {
      Taro.showToast({ title: '评论失败', icon: 'none' });
    }
  };

  // 跳转子任务管理
  const goToSubtaskManage = () => {
    Taro.navigateTo({ url: `/pages/subtask-manage/index?id=${taskId}` });
  };

  // 分享配置
  Taro.useShareAppMessage(() => {
    return {
      title: task ? `任务：${task.task_name}` : '查看任务详情',
      path: `/pages/detail/index?id=${taskId}`,
      imageUrl: ''
    };
  });

  // 加载中
  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-3">
        <Card>
          <CardContent className="p-3">
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </View>
    );
  }

  // 无数据
  if (!task) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-gray-400">任务不存在</Text>
      </View>
    );
  }

  const statusInfo = STATUS_MAP[task.status];

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 更多菜单 */}
      {showMoreMenu && (
        <View
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMoreMenu(false)}
        >
          <View
            className="absolute right-3 top-16 bg-white rounded-lg shadow-lg overflow-hidden min-w-32"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关注/取消关注 */}
            <View
              className="flex flex-row items-center h-11 px-4 active:bg-gray-50"
              onClick={toggleFollow}
            >
              <View className="w-5 flex items-center justify-center">
                <Star size={18} color={isFollowed ? '#F59E0B' : '#4B5563'} />
              </View>
              <Text className="ml-2 text-base text-gray-800">{isFollowed ? '取消关注' : '关注任务'}</Text>
            </View>
            
            <View className="h-px bg-gray-100 ml-4 mr-4" />
            
            {/* 分享 */}
            <Button 
              className="flex flex-row items-center h-11 w-full px-4 bg-white border-0 rounded-none text-left"
              style={{ padding: '0 16px', lineHeight: 'normal' }}
              openType="share"
              onClick={() => setShowMoreMenu(false)}
            >
              <View className="w-5 flex items-center justify-center">
                <Share2 size={18} color="#4B5563" />
              </View>
              <Text className="ml-2 text-base text-gray-800">分享任务</Text>
            </Button>
            
            <View className="h-px bg-gray-100 ml-4 mr-4" />
            
            {/* 编辑 */}
            <View
              className="flex flex-row items-center h-11 px-4 active:bg-gray-50"
              onClick={editTask}
            >
              <View className="w-5 flex items-center justify-center">
                <Pencil size={18} color="#4B5563" />
              </View>
              <Text className="ml-2 text-base text-gray-800">编辑任务</Text>
            </View>
            
            <View className="h-px bg-gray-100 ml-4 mr-4" />
            
            {/* 删除 */}
            <View
              className="flex flex-row items-center h-11 px-4 active:bg-gray-50"
              onClick={deleteTask}
            >
              <View className="w-5 flex items-center justify-center">
                <Trash2 size={18} color="#EF4444" />
              </View>
              <Text className="ml-2 text-base text-red-500">删除任务</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView className="h-screen" scrollY>
        {/* 任务信息卡片 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            {/* 标题行 */}
            <View className="flex items-start justify-between mb-3">
              <Text className="text-xl font-bold text-gray-800 flex-1">{task.task_name}</Text>
              {/* 所有人都可以点击更多菜单 */}
              <View 
                className="p-1"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <Ellipsis size={20} color="#9CA3AF" />
              </View>
            </View>

            {/* 描述 */}
            {task.task_description && (
              <Text className="text-sm text-gray-500 mb-4">{task.task_description}</Text>
            )}

            {/* 元信息网格 */}
            <View className="grid grid-cols-2 gap-3 mb-4">
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">截止日期</Text>
                <Text className="text-sm text-gray-800">{task.require_date}</Text>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">状态</Text>
                <Badge className={statusInfo.bgClass}>{statusInfo.label}</Badge>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">优先级</Text>
                <Text className={`text-sm font-semibold ${PRIORITY_STYLE[task.priority || 'P2'].text}`}>
                  {task.priority || 'P2'}
                </Text>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">发布人</Text>
                <Text className="text-sm text-gray-800">{publisherName || '未知'}</Text>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">执行人</Text>
                <Text className="text-sm text-gray-800">{executorName || '未知'}</Text>
              </View>
            </View>

            {/* 子任务进度 */}
            {subtaskProgress.total > 0 && (
              <View className="mb-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">子任务进度</Text>
                  <Text className="text-sm text-blue-500">{subtaskProgress.completed}/{subtaskProgress.total}</Text>
                </View>
                <Progress value={subtaskProgress.progress} className="h-2" />
              </View>
            )}

            {/* 状态操作按钮 */}
            {canOperate && task.status === 'pending' && (
              <Button className="w-full bg-blue-500 text-white rounded-lg" onClick={startTask}>
                <Play size={16} color="#ffffff" />
                <Text className="text-white ml-2">开始任务</Text>
              </Button>
            )}

            {canOperate && task.status === 'in_progress' && (
              <View className="flex gap-3">
                <Button className="flex-1 bg-green-500 text-white rounded-lg" onClick={completeTask}>
                  <Check size={16} color="#ffffff" />
                  <Text className="text-white ml-2">完成任务</Text>
                </Button>
                <Button 
                  className="flex-1 text-orange-500 border border-orange-400 bg-transparent rounded-lg" 
                  onClick={reportException}
                >
                  <TriangleAlert size={16} color="#F97316" />
                  <Text className="text-orange-500 ml-2">异常上报</Text>
                </Button>
              </View>
            )}

            {/* 异常状态处理按钮 */}
            {canOperate && task.status === 'exception' && (
              <View className="space-y-3">
                <View className="bg-orange-50 rounded-lg p-3 mb-2">
                  <Text className="text-sm text-orange-600">
                    任务已上报异常，请根据情况处理
                  </Text>
                  {task.exception_type === 'delay' && task.new_deadline && (
                    <Text className="text-xs text-orange-500 mt-1">
                      申请延期至：{task.new_deadline}
                    </Text>
                  )}
                  {task.exception_type === 'assist' && (
                    <Text className="text-xs text-orange-500 mt-1">
                      已申请协助
                    </Text>
                  )}
                </View>
                <Button className="w-full bg-green-500 text-white rounded-lg" onClick={completeTask}>
                  <Check size={16} color="#ffffff" />
                  <Text className="text-white ml-2">完成任务</Text>
                </Button>
              </View>
            )}

            {/* 评分信息 */}
            {task.score !== null && task.score !== undefined && (
              <View className="mt-4 p-4 bg-gray-50 rounded-lg">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-700">任务评分</Text>
                  <Text className={`text-2xl font-bold ${task.score >= 80 ? 'text-green-500' : task.score >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                    {task.score}分
                  </Text>
                </View>
                {task.score_note && (
                  <Text className="text-sm text-gray-500">{task.score_note}</Text>
                )}
              </View>
            )}
          </CardContent>
        </Card>

        {/* Tab 导航 */}
        <View className="mx-3 mt-3">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="w-full">
              <TabsTrigger value="detail" className="flex-1">
                <FileText size={14} color="#6B7280" />
                <Text className="ml-1">详情</Text>
              </TabsTrigger>
              <TabsTrigger value="subtask" className="flex-1">
                <ListTodo size={14} color="#6B7280" />
                <Text className="ml-1">子任务</Text>
                {subtaskProgress.total > 0 && (
                  <Badge className="ml-1 bg-blue-100 text-blue-600 text-xs">
                    {subtaskProgress.completed}/{subtaskProgress.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1">
                <History size={14} color="#6B7280" />
                <Text className="ml-1">日志</Text>
              </TabsTrigger>
              <TabsTrigger value="comment" className="flex-1">
                <MessageCircle size={14} color="#6B7280" />
                <Text className="ml-1">评论</Text>
              </TabsTrigger>
            </TabsList>

            {/* 详情 Tab */}
            <TabsContent value="detail">
              <Card>
                <CardContent className="p-4">
                  {task.task_description && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-gray-700 mb-2">任务描述</Text>
                      <Text className="text-sm text-gray-600">{task.task_description}</Text>
                    </View>
                  )}

                  {task.learnings && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-gray-700 mb-2">学习收获</Text>
                      <Text className="text-sm text-gray-600">{task.learnings}</Text>
                    </View>
                  )}

                  {task.delay_reason && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-gray-700 mb-2">延迟原因</Text>
                      <Text className="text-sm text-gray-600">{task.delay_reason}</Text>
                    </View>
                  )}

                  {task.improvements && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-gray-700 mb-2">反思改进</Text>
                      <Text className="text-sm text-gray-600">{task.improvements}</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 子任务 Tab */}
            <TabsContent value="subtask">
              <Card>
                <CardContent className="p-4">
                  {task.status !== 'pending' && (
                    <View
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3 active:bg-gray-100"
                      onClick={goToSubtaskManage}
                    >
                      <Text className="text-base text-gray-800">管理子任务</Text>
                      <ChevronRight size={18} color="#9CA3AF" />
                    </View>
                  )}

                  {task.status === 'pending' && (
                    <View className="flex items-center p-3 bg-blue-50 rounded-lg mb-3">
                      <Text className="text-blue-500 mr-2">ℹ️</Text>
                      <Text className="text-sm text-blue-600">任务需先开始才能添加子任务</Text>
                    </View>
                  )}

                  {subtasks.length > 0 ? (
                    subtasks.map((subtask) => (
                      <View
                        key={subtask._id}
                        className="flex items-center p-3 border-b border-gray-100 last:border-0"
                        onClick={() => Taro.navigateTo({ url: `/pages/subtask-detail/index?id=${subtask._id}` })}
                      >
                        <View
                          className={`w-2 h-2 rounded-full mr-3 ${
                            subtask.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                        />
                        <View className="flex-1">
                          <Text className="text-sm text-gray-800">{subtask.name || subtask.task_name}</Text>
                          <Text className="text-xs text-gray-400">截止：{subtask.due_date || subtask.require_date}</Text>
                        </View>
                        <ChevronRight size={16} color="#D1D5DB" />
                      </View>
                    ))
                  ) : (
                    <View className="flex justify-center py-8">
                      <Text className="text-sm text-gray-400">暂无子任务</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 日志 Tab */}
            <TabsContent value="log">
              <Card>
                <CardContent className="p-4">
                  {logs.length > 0 ? (
                    logs.map((log, index) => {
                      const actionInfo = ACTION_TYPE_MAP[log.action_type] || { label: log.action_type, color: '#8c8c8c' };
                      let detailText = '';
                      
                      try {
                        const detail = JSON.parse(log.action_detail || '{}');
                        if (log.action_type === 'priority') {
                          detailText = `${detail.from || '-'} → ${detail.to || '-'}`;
                        } else if (log.action_type === 'status') {
                          detailText = `${STATUS_MAP[detail.from as keyof typeof STATUS_MAP]?.label || detail.from} → ${STATUS_MAP[detail.to as keyof typeof STATUS_MAP]?.label || detail.to}`;
                        } else if (log.action_type === 'assign') {
                          detailText = `${detail.from || '未分配'} → ${detail.to || '未分配'}`;
                        } else if (log.action_type === 'create') {
                          detailText = `优先级：${detail.priority || 'P2'}`;
                        } else if (log.action_type === 'complete') {
                          detailText = `完成于 ${detail.to || '未知'}`;
                        }
                      } catch {
                        detailText = log.action_detail || '';
                      }
                      
                      return (
                        <View key={log._id} className={`flex items-start py-3 ${index < logs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <View className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: actionInfo.color }} />
                          <View className="flex-1">
                            <View className="flex items-center justify-between mb-1">
                              <Text className="text-sm font-medium text-gray-800">{actionInfo.label}</Text>
                              <Text className="text-xs text-gray-400">{log.created_at}</Text>
                            </View>
                            {detailText && (
                              <Text className="text-sm text-gray-500">{detailText}</Text>
                            )}
                            {log.operator_name && (
                              <Text className="text-xs text-gray-400 mt-1">操作人：{log.operator_name}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View className="flex flex-col items-center justify-center py-8">
                      <History size={48} color="#d1d5db" />
                      <Text className="text-sm text-gray-400 mt-3">暂无操作日志</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 评论 Tab */}
            <TabsContent value="comment">
              <Card>
                <CardContent className="p-4">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <View key={comment._id} className="flex mb-4 last:mb-0">
                        <View className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <Text className="text-sm text-blue-600">{comment.user_name?.[0] || '匿'}</Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex items-center mb-1">
                            <Text className="text-sm font-semibold text-gray-800">{comment.user_name}</Text>
                            <Text className="text-xs text-gray-400 ml-2">{comment.created_at}</Text>
                          </View>
                          <Text className="text-sm text-gray-600">{comment.content}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className="flex justify-center py-8">
                      <Text className="text-sm text-gray-400">暂无评论</Text>
                    </View>
                  )}
                </CardContent>
              </Card>

              {/* 评论输入 */}
              <View className="flex items-center gap-2 mt-3">
                <View className="flex-1">
                  <Input
                    placeholder="写下你的评论..."
                    placeholderClass="text-gray-400"
                    value={commentInput}
                    onInput={(e) => setCommentInput(e.detail.value)}
                    className="bg-gray-50 border-gray-200"
                  />
                </View>
                <UIButton size="sm" onClick={addComment}>发送</UIButton>
              </View>
            </TabsContent>
          </Tabs>
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
