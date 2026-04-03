import { View, Text } from '@tarojs/components';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import { Network } from '@/network';
import { Task, CloudResponse, TaskListResponse, TaskStatus } from '@/types';
import { STATUS_MAP, STATUS_FILTERS, TIME_FILTERS, PRIORITY_STYLE } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { DeadlineReminder } from '@/components/deadline-reminder';
import { toast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader, ChevronDown, ChevronRight } from 'lucide-react-taro';
import { format } from 'date-fns';

// 缓存时间（毫秒）
const CACHE_DURATION = 2 * 60 * 1000; // 2分钟

// 视图筛选选项
const VIEW_FILTERS = [
  { value: 'all', label: '全部', icon: 'ListChecks' },
  { value: 'assigned', label: '我分配的', icon: 'Send' },
  { value: 'followed', label: '我关注的', icon: 'Star' }
];

// 分组类型
const GROUP_TYPES = [
  { value: 'none', label: '列表' },
  { value: 'priority', label: '按优先级' },
  { value: 'status', label: '按状态' },
  { value: 'time', label: '按时间' },
  { value: 'kanban', label: '看板' }
];

// 看板列配置
const KANBAN_COLUMNS = [
  { key: 'pending', label: '待办', color: 'bg-gray-100', borderColor: 'border-gray-300' },
  { key: 'in_progress', label: '进行中', color: 'bg-blue-50', borderColor: 'border-blue-300' },
  { key: 'completed', label: '已完成', color: 'bg-green-50', borderColor: 'border-green-300' }
];

// 优先级分组配置
const PRIORITY_GROUPS = [
  { key: 'P0', label: 'P0 紧急', color: 'text-red-500', bgColor: 'bg-red-50' },
  { key: 'P1', label: 'P1 高', color: 'text-orange-500', bgColor: 'bg-orange-50' },
  { key: 'P2', label: 'P2 中', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { key: 'P3', label: 'P3 低', color: 'text-gray-400', bgColor: 'bg-gray-50' }
];

// 状态分组配置
const STATUS_GROUPS = [
  { key: 'pending', label: '待办', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { key: 'in_progress', label: '进行中', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { key: 'completed', label: '已完成', color: 'text-green-500', bgColor: 'bg-green-50' },
  { key: 'cancelled', label: '已取消', color: 'text-red-500', bgColor: 'bg-red-50' }
];

// 时间分组配置
const TIME_GROUPS = [
  { key: 'overdue', label: '已逾期', color: 'text-red-500', bgColor: 'bg-red-50' },
  { key: 'today', label: '今日截止', color: 'text-orange-500', bgColor: 'bg-orange-50' },
  { key: 'week', label: '本周截止', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { key: 'month', label: '本月截止', color: 'text-green-500', bgColor: 'bg-green-50' },
  { key: 'later', label: '以后', color: 'text-gray-400', bgColor: 'bg-gray-50' }
];

// 获取缓存键
const getCacheKey = (statusFilter: string, timeFilter: string, viewFilter: string, customDateRange?: { from?: Date; to?: Date }) => {
  let key = `tasks_cache_${viewFilter}_${statusFilter}_${timeFilter}`;
  if (timeFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
    key += `_${format(customDateRange.from, 'yyyyMMdd')}_${format(customDateRange.to, 'yyyyMMdd')}`;
  }
  return key;
};

export default function Index() {
  const { openid } = useUserStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<string>('all');
  const [groupType, setGroupType] = useState<string>('none');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // 当前展开的下拉菜单
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // 自定义时间筛选
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // 使用 ref 跟踪加载状态
  const isLoadingRef = useRef(false);
  const tasksCountRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // 分组任务数据
  const groupedTasks = useMemo(() => {
    if (groupType === 'none') return null;
    
    const groups: Record<string, Task[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    tasks.forEach(task => {
      let groupKey = '';
      
      if (groupType === 'priority') {
        groupKey = task.priority || 'P2';
      } else if (groupType === 'status') {
        groupKey = task.status;
      } else if (groupType === 'time') {
        const requireDate = new Date(task.require_date);
        requireDate.setHours(0, 0, 0, 0);
        
        if (task.status === 'completed' || task.status === 'cancelled') {
          return; // 不显示已完成/已取消的任务
        }
        
        if (requireDate < today) {
          groupKey = 'overdue';
        } else if (requireDate.getTime() === today.getTime()) {
          groupKey = 'today';
        } else if (requireDate <= endOfWeek) {
          groupKey = 'week';
        } else if (requireDate <= endOfMonth) {
          groupKey = 'month';
        } else {
          groupKey = 'later';
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    return groups;
  }, [tasks, groupType]);

  // 切换分组展开状态
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // 获取分组配置
  const getGroupConfig = (groupKey: string) => {
    if (groupType === 'priority') {
      return PRIORITY_GROUPS.find(g => g.key === groupKey);
    } else if (groupType === 'status') {
      return STATUS_GROUPS.find(g => g.key === groupKey);
    } else if (groupType === 'time') {
      return TIME_GROUPS.find(g => g.key === groupKey);
    }
    return null;
  };

  // 从缓存加载数据
  const loadFromCache = useCallback((status: string, time: string, view: string, customDateRange?: { from?: Date; to?: Date }) => {
    try {
      const cacheKey = getCacheKey(status, time, view, customDateRange);
      const cached = Taro.getStorageSync(cacheKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const cacheTime = cacheData.timestamp;
        // 检查缓存是否过期
        if (Date.now() - cacheTime < CACHE_DURATION) {
          console.log('[Index] 使用缓存数据');
          return cacheData;
        }
      }
    } catch (e) {
      console.error('[Index] 解析缓存失败:', e);
    }
    return null;
  }, []);

  // 保存到缓存
  const saveToCache = useCallback((status: string, time: string, view: string, data: Task[], customDateRange?: { from?: Date; to?: Date }) => {
    try {
      const cacheKey = getCacheKey(status, time, view, customDateRange);
      Taro.setStorageSync(cacheKey, JSON.stringify({
        tasks: data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('[Index] 保存缓存失败:', e);
    }
  }, []);

  // 加载任务列表
  const loadTasks = useCallback(async (refresh = false, forceRefresh = false) => {
    // 避免重复加载
    if (isLoadingRef.current) {
      console.log('[Index] 正在加载中，跳过');
      return;
    }
    
    // 限流：最少间隔1秒
    const now = Date.now();
    if (!refresh && now - lastLoadTimeRef.current < 1000) {
      console.log('[Index] 请求过于频繁，跳过');
      return;
    }
    
    const currentOpenid = openid || useUserStore.getState().openid;
    if (!currentOpenid) {
      setLoading(false);
      return;
    }

    // 非强制刷新时，先尝试从缓存加载
    if (!forceRefresh && refresh) {
      const cachedData = loadFromCache(statusFilter, timeFilter, viewFilter, selectedDateRange);
      if (cachedData && cachedData.tasks) {
        setTasks(cachedData.tasks);
        tasksCountRef.current = cachedData.tasks.length;
        setLoading(false);
        // 后台静默刷新
        setTimeout(() => loadTasks(true, true), 100);
        return;
      }
    }

    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;
    setLoading(tasksCountRef.current === 0);
    
    try {
      const currentPage = refresh ? 1 : page;
      
      const params: Record<string, any> = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        pageSize: 20,
        view_type: viewFilter
      };
      
      if (timeFilter === 'custom' && selectedDateRange.from && selectedDateRange.to) {
        params.start_date = format(selectedDateRange.from, 'yyyy-MM-dd');
        params.end_date = format(selectedDateRange.to, 'yyyy-MM-dd');
      } else if (timeFilter !== 'all' && timeFilter !== 'custom') {
        params.time_filter = timeFilter;
      }
      
      const res = await callFunction<CloudResponse<TaskListResponse>>(
        CLOUD_FUNCTIONS.TASK_LIST,
        params
      );

      if (res.success && res.data) {
        const newTasks = res.data.tasks || [];
        if (refresh) {
          setTasks(newTasks);
          tasksCountRef.current = newTasks.length;
          setPage(1);
          // 保存到缓存
          saveToCache(statusFilter, timeFilter, viewFilter, newTasks, selectedDateRange);
        } else {
          setTasks(prev => {
            const updated = [...prev, ...newTasks];
            tasksCountRef.current = updated.length;
            return updated;
          });
        }
        setHasMore(res.data.hasMore);
      } else {
        Taro.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Index] 加载任务异常:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [openid, statusFilter, timeFilter, viewFilter, page, selectedDateRange, loadFromCache, saveToCache]);

  // 初始化加载
  useEffect(() => {
    const storeOpenid = useUserStore.getState().openid;
    if (openid || storeOpenid) {
      loadTasks(true);
      hasInitializedRef.current = true;
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openid]);

  // 页面显示时刷新数据
  Taro.useDidShow(() => {
    if (!hasInitializedRef.current) {
      return;
    }
    
    const storeOpenid = useUserStore.getState().openid;
    if ((openid || storeOpenid) && !isLoadingRef.current) {
      loadTasks(true);
    }
  });

  // 筛选变化时重新加载
  useEffect(() => {
    if (timeFilter === 'custom' && (!selectedDateRange.from || !selectedDateRange.to)) {
      return;
    }
    
    const storeOpenid = useUserStore.getState().openid;
    if (openid || storeOpenid) {
      setPage(1);
      loadTasks(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, timeFilter, viewFilter, selectedDateRange]);

  // 处理时间筛选点击
  const handleTimeFilterClick = (value: string) => {
    if (value === 'custom') {
      setDateRange(selectedDateRange);
      setShowDateRangeDialog(true);
    } else {
      setTimeFilter(value);
    }
  };

  // 确认日期范围选择
  const confirmDateRange = () => {
    if (dateRange.from && dateRange.to) {
      setSelectedDateRange(dateRange);
      setTimeFilter('custom');
    }
    setShowDateRangeDialog(false);
  };

  // 清除自定义时间
  const clearCustomTime = () => {
    setSelectedDateRange({});
    setDateRange({});
    setTimeFilter('all');
  };

  // 格式化显示日期范围
  const getDisplayDateRange = () => {
    if (selectedDateRange.from && selectedDateRange.to) {
      return `${format(selectedDateRange.from, 'MM/dd')}-${format(selectedDateRange.to, 'MM/dd')}`;
    }
    return '';
  };

  // 跳转详情
  const goDetail = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${taskId}` });
  };

  // 处理任务点击（看板视图用）
  const handleTaskPress = (task: Task) => {
    goDetail(task.task_id);
  };

  // 渲染任务卡片
  const renderTaskCard = (task: Task) => {
    const requireDate = new Date(task.require_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requireDate.setHours(0, 0, 0, 0);
    const isOverdue = today > requireDate && task.status !== 'completed' && task.status !== 'cancelled';
    const daysLeft = Math.ceil((requireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <Card
        key={task._id}
        className="mb-3 overflow-hidden active:bg-gray-50"
        onClick={() => goDetail(task.task_id)}
      >
        <CardContent className="p-0">
          <View className="flex">
            <View
              className={`w-1 ${
                task.status === 'completed'
                  ? 'bg-green-500'
                  : task.status === 'in_progress'
                  ? 'bg-blue-500'
                  : task.status === 'cancelled'
                  ? 'bg-red-500'
                  : isOverdue
                  ? 'bg-orange-500'
                  : 'bg-gray-300'
              }`}
            />
            <View className="flex-1 p-3">
              <View className="flex items-start justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text className={`text-base font-semibold ${task.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`} numberOfLines={2}>
                    {task.task_name}
                  </Text>
                </View>
                <Badge className={PRIORITY_STYLE[task.priority].bg + ' ' + PRIORITY_STYLE[task.priority].text}>{task.priority}</Badge>
              </View>

              <View className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={STATUS_MAP[task.status].bgClass}>{STATUS_MAP[task.status].label}</Badge>
                
                {task.group_name && (
                  <View className="px-2 py-1 bg-purple-50 rounded">
                    <Text className="text-xs text-purple-500">{task.group_name}</Text>
                  </View>
                )}
                
                {task.created_at && (
                  <View className="flex items-center gap-1">
                    <Text className="text-xs text-gray-400">创建 {task.created_at}</Text>
                  </View>
                )}
                
                <View className="flex items-center gap-1">
                  <Text className={`text-xs ${isOverdue ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                    截止 {isOverdue ? `(已逾期${Math.abs(daysLeft)}天)` : daysLeft === 0 ? '今日' : daysLeft === 1 ? '明日' : task.require_date}
                  </Text>
                </View>
                
                {task.complete_date && task.status === 'completed' && (
                  <View className="flex items-center gap-1">
                    <Text className="text-xs text-green-500">完成 {task.complete_date}</Text>
                  </View>
                )}
              </View>

              <View className="flex items-center justify-between">
                <View className="flex items-center gap-3">
                  {task.executor_name && (
                    <View className="flex items-center gap-1">
                      <View className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <Text className="text-xs text-blue-500">{task.executor_name[0]}</Text>
                      </View>
                      <Text className="text-xs text-gray-500">{task.executor_name}</Text>
                    </View>
                  )}
                  
                  {task.subtask_count && task.subtask_count > 0 && (
                    <View className="flex items-center gap-1">
                      <Text className="text-xs text-gray-400">📋 {task.subtask_count} 项子任务</Text>
                    </View>
                  )}
                </View>
                
                {task.subtask_count && task.subtask_count > 0 && (
                  <View className="flex items-center gap-2">
                    <View className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${
                          task.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </View>
                    <Text className="text-xs text-gray-400">{task.progress || 0}%</Text>
                  </View>
                )}
              </View>

              {task.score !== null && task.score !== undefined && (
                <View className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <Text
                    className={`text-sm font-semibold ${
                      task.score >= 80
                        ? 'text-green-500'
                        : task.score >= 60
                        ? 'text-orange-500'
                        : 'text-red-500'
                    }`}
                  >
                    {task.score}分
                  </Text>
                  {task.score_note && (
                    <Text className="text-xs text-gray-400" numberOfLines={1}>
                      {task.score_note}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  // 处理任务状态变更（看板视图用）
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const task = tasks.find(t => t.task_id === taskId);
      if (!task) return;

      // 更新本地状态
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, status: newStatus } : t
      ));

      // 如果状态变为已完成，设置完成时间
      const updateData: any = { 
        status: newStatus,
        task_status: newStatus
      };
      
      if (newStatus === 'completed') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        updateData.complete_date = `${year}-${month}-${day}`;
        updateData.progress = 100;
      }

      // 调用后端更新
      await Network.request({
        url: `/api/tasks/${taskId}`,
        method: 'PUT',
        data: updateData
      });

      toast.success('状态已更新');
    } catch (error) {
      console.error('更新任务状态失败:', error);
      toast.error('更新失败');
      // 回滚
      loadTasks();
    }
  };

  // 看板视图组件
  const KanbanView = ({ tasks: taskList, onTaskPress, onStatusChange }: { 
    tasks: Task[]; 
    onTaskPress: (task: Task) => void;
    onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  }) => {
    const [confirmTask, setConfirmTask] = useState<Task | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<TaskStatus | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // 按状态分组 - 看板视图始终显示所有状态列
    const columns: Record<string, Task[]> = {
      pending: taskList.filter(t => t.status === 'pending'),
      in_progress: taskList.filter(t => t.status === 'in_progress'),
      completed: taskList.filter(t => t.status === 'completed')
    };

    // 获取下一个状态
    const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
      const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'completed'];
      const currentIndex = statusOrder.indexOf(currentStatus);
      if (currentIndex < statusOrder.length - 1) {
        return statusOrder[currentIndex + 1];
      }
      return null;
    };

    // 获取状态显示名称
    const getStatusLabel = (status: TaskStatus): string => {
      const labels: Record<TaskStatus, string> = {
        pending: '待办',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
        exception: '异常'
      };
      return labels[status] || status;
    };

    // 点击快捷按钮 - 弹出确认对话框
    const handleQuickAction = (task: Task, e: any) => {
      e.stopPropagation();
      const nextStatus = getNextStatus(task.status);
      if (nextStatus) {
        setConfirmTask(task);
        setConfirmStatus(nextStatus);
        setShowConfirmDialog(true);
      }
    };

    // 确认切换状态
    const handleConfirmStatusChange = async () => {
      if (confirmTask && confirmStatus) {
        await onStatusChange(confirmTask.task_id, confirmStatus);
      }
      setShowConfirmDialog(false);
      setConfirmTask(null);
      setConfirmStatus(null);
    };

    // 取消切换
    const handleCancelStatusChange = () => {
      setShowConfirmDialog(false);
      setConfirmTask(null);
      setConfirmStatus(null);
    };

    // 渲染看板卡片
    const renderKanbanCard = (task: Task) => {
      const nextStatus = getNextStatus(task.status);
      
      return (
        <View 
          key={task._id} 
          className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100 active:bg-gray-50"
          onClick={() => onTaskPress(task)}
        >
          <View className="flex items-start justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-medium text-gray-800 line-clamp-2">
                {task.task_name}
              </Text>
            </View>
            {nextStatus && (
              <View 
                className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center active:bg-blue-100"
                onClick={(e) => handleQuickAction(task, e)}
              >
                <Text className="text-blue-500 text-lg">→</Text>
              </View>
            )}
          </View>
          
          <View className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={PRIORITY_STYLE[task.priority].bg + ' ' + PRIORITY_STYLE[task.priority].text}>
              {task.priority}
            </Badge>
            
            {task.executor_name && (
              <View className="flex items-center gap-1">
                <View className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <Text className="text-xs text-blue-500">{task.executor_name[0]}</Text>
                </View>
                <Text className="text-xs text-gray-500">{task.executor_name}</Text>
              </View>
            )}
          </View>
          
          {task.require_date && (
            <Text className="text-xs text-gray-400 mt-2">
              截止: {task.require_date}
            </Text>
          )}
        </View>
      );
    };

    return (
      <>
        <View className="py-2">
          {KANBAN_COLUMNS.map(column => (
            <View key={column.key} className="mb-4">
              {/* 列标题 */}
              <View 
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${column.color} mb-2`}
              >
                <View className="flex items-center gap-2">
                  <Text className="text-sm font-semibold text-gray-700">{column.label}</Text>
                  <View className="px-2 py-1 rounded-full bg-white">
                    <Text className="text-xs text-gray-600">{columns[column.key]?.length || 0}</Text>
                  </View>
                </View>
              </View>
              
              {/* 任务列表 */}
              <View className="px-1">
                {columns[column.key]?.map(renderKanbanCard)}
                {(!columns[column.key] || columns[column.key].length === 0) && (
                  <View className="py-6 flex items-center justify-center bg-gray-50 rounded-lg">
                    <Text className="text-xs text-gray-400">暂无{column.label}任务</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 确认切换状态对话框 */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>确认切换状态</DialogTitle>
            </DialogHeader>
            <View className="py-4">
              <Text className="text-sm text-gray-600 mb-2">
                将任务「{confirmTask?.task_name}」
              </Text>
              <Text className="text-sm font-medium text-gray-800">
                从「{confirmTask ? getStatusLabel(confirmTask.status) : ''}」切换到「{confirmStatus ? getStatusLabel(confirmStatus) : ''}」？
              </Text>
            </View>
            <View className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCancelStatusChange}
              >
                取消
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConfirmStatusChange}
              >
                确认
              </Button>
            </View>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // 渲染空状态
  const renderEmpty = () => (
    <EmptyState 
      type="tasks"
      action={
        <Button 
          size="sm"
          onClick={() => Taro.switchTab({ url: '/pages/publish/index' })}
        >
          创建任务
        </Button>
      }
    />
  );

  // 渲染加载中
  const renderLoading = () => (
    <View className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </View>
  );

  // 渲染分组任务
  const renderGroupedTasks = () => {
    if (!groupedTasks) return null;
    
    // 确定分组顺序
    const groupOrder = groupType === 'priority' 
      ? PRIORITY_GROUPS.map(g => g.key)
      : groupType === 'status'
      ? STATUS_GROUPS.map(g => g.key)
      : TIME_GROUPS.map(g => g.key);
    
    return (
      <>
        {groupOrder.map(groupKey => {
          const groupTasks = groupedTasks[groupKey];
          if (!groupTasks || groupTasks.length === 0) return null;
          
          const config = getGroupConfig(groupKey);
          if (!config) return null;
          
          const isExpanded = expandedGroups[groupKey] !== false; // 默认展开
          
          return (
            <View key={groupKey} className="mb-4">
              {/* 分组标题 */}
              <View 
                className={`flex flex-row items-center py-2 px-3 rounded-lg ${config.bgColor} mb-2`}
                onClick={() => toggleGroup(groupKey)}
              >
                {isExpanded ? (
                  <ChevronDown size={18} color={config.color.replace('text-', '').replace('-500', '')} />
                ) : (
                  <ChevronRight size={18} color={config.color.replace('text-', '').replace('-500', '')} />
                )}
                <Text className={`text-sm font-medium ${config.color} ml-1`}>
                  {config.label}
                </Text>
                <View className="px-2 py-1 rounded-full bg-white ml-2">
                  <Text className="text-xs text-gray-500">{groupTasks.length}</Text>
                </View>
              </View>
              
              {/* 分组任务列表 */}
              {isExpanded && (
                <View>
                  {groupTasks.map(renderTaskCard)}
                </View>
              )}
            </View>
          );
        })}
      </>
    );
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 加载遮罩层 */}
      {loading && tasks.length > 0 && (
        <View className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-40 pointer-events-none">
          <View className="bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
            <Loader size={18} color="#1377EB" className="animate-spin" />
            <Text className="text-gray-600 text-sm">加载中...</Text>
          </View>
        </View>
      )}
      
      {/* 截止日期提醒弹窗 */}
      <DeadlineReminder />

      {/* 筛选栏 - 固定在顶部，紧贴导航栏 */}
      <View 
        className="bg-white px-3 py-2 relative z-30"
        style={{ 
          position: 'sticky', 
          top: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <View className="flex flex-row items-center">
          {/* 时间筛选 */}
          <View className="flex-1 relative">
            <View 
              className="flex flex-row items-center justify-center h-7 mx-1 bg-gray-50 rounded-full overflow-hidden"
              onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
            >
              <Text className="text-sm text-gray-700 truncate max-w-16" numberOfLines={1}>
                {timeFilter === 'custom' && selectedDateRange.from ? getDisplayDateRange() : TIME_FILTERS.find(f => f.value === timeFilter)?.label || '全部'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" className="ml-1 flex-shrink-0" />
            </View>
            {activeDropdown === 'time' && (
              <View className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-28">
                {TIME_FILTERS.map((item) => (
                  <View
                    key={item.value}
                    className={`px-4 py-2 ${timeFilter === item.value ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      handleTimeFilterClick(item.value);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text className={`text-sm ${timeFilter === item.value ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 视图筛选 */}
          <View className="flex-1 relative">
            <View 
              className="flex flex-row items-center justify-center h-7 mx-1 bg-gray-50 rounded-full overflow-hidden"
              onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')}
            >
              <Text className="text-sm text-gray-700 truncate max-w-16" numberOfLines={1}>
                {VIEW_FILTERS.find(f => f.value === viewFilter)?.label || '全部'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" className="ml-1 flex-shrink-0" />
            </View>
            {activeDropdown === 'view' && (
              <View className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-28">
                {VIEW_FILTERS.map((item) => (
                  <View
                    key={item.value}
                    className={`px-4 py-2 ${viewFilter === item.value ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setViewFilter(item.value);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text className={`text-sm ${viewFilter === item.value ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 状态筛选 */}
          <View className="flex-1 relative">
            <View 
              className="flex flex-row items-center justify-center h-7 mx-1 bg-gray-50 rounded-full overflow-hidden"
              onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
            >
              <Text className="text-sm text-gray-700 truncate max-w-16" numberOfLines={1}>
                {STATUS_FILTERS.find(f => f.value === statusFilter)?.label || '全部'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" className="ml-1 flex-shrink-0" />
            </View>
            {activeDropdown === 'status' && (
              <View className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-28">
                {STATUS_FILTERS.map((item) => (
                  <View
                    key={item.value}
                    className={`px-4 py-2 ${statusFilter === item.value ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setStatusFilter(item.value);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text className={`text-sm ${statusFilter === item.value ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 分组筛选 */}
          <View className="flex-1 relative">
            <View 
              className="flex flex-row items-center justify-center h-7 mx-1 bg-gray-50 rounded-full overflow-hidden"
              onClick={() => setActiveDropdown(activeDropdown === 'group' ? null : 'group')}
            >
              <Text className="text-sm text-gray-700 truncate max-w-16" numberOfLines={1}>
                {GROUP_TYPES.find(f => f.value === groupType)?.label || '列表'}
              </Text>
              <ChevronDown size={16} color="#9ca3af" className="ml-1 flex-shrink-0" />
            </View>
            {activeDropdown === 'group' && (
              <View className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-28">
                {GROUP_TYPES.map((item) => (
                  <View
                    key={item.value}
                    className={`px-4 py-2 ${groupType === item.value ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      // 切换到看板视图时，自动重置状态筛选为"全部"
                      // 因为看板视图本身就是按状态分组的，需要显示所有状态的任务
                      if (item.value === 'kanban' && statusFilter !== 'all') {
                        setStatusFilter('all');
                      }
                      setGroupType(item.value);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text className={`text-sm ${groupType === item.value ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* 点击遮罩关闭下拉 */}
        {activeDropdown && (
          <View 
            className="fixed inset-0 z-40"
            onClick={() => setActiveDropdown(null)}
          />
        )}
      </View>

      {/* 任务列表 */}
      <View className="px-3 pb-20 pt-3">
        {loading && tasks.length === 0 ? (
          renderLoading()
        ) : tasks.length === 0 ? (
          renderEmpty()
        ) : groupType === 'kanban' ? (
          // 看板视图
          <KanbanView
            tasks={tasks}
            onTaskPress={handleTaskPress}
            onStatusChange={handleTaskStatusChange}
          />
        ) : groupType !== 'none' && groupedTasks ? (
          // 分组视图
          renderGroupedTasks()
        ) : (
          // 列表视图
          <>
            {tasks.map(renderTaskCard)}
            {hasMore && (
              <View className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadTasks()}
                  disabled={loading}
                >
                  {loading ? '加载中...' : '加载更多'}
                </Button>
              </View>
            )}
          </>
        )}
      </View>
      
      {/* 日期范围选择器弹窗 */}
      {showDateRangeDialog && (
        <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>选择日期范围</DialogTitle>
            </DialogHeader>
            
            <View className="py-4">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => setDateRange(range || {})}
                className="rounded-md border"
              />
              
              {dateRange.from && (
                <View className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <View className="flex items-center justify-between">
                    <Text className="text-sm text-gray-500">已选择：</Text>
                    <Text className="text-sm font-medium text-blue-500">
                      {format(dateRange.from, 'yyyy年MM月dd日')}
                      {dateRange.to && ` - ${format(dateRange.to, 'yyyy年MM月dd日')}`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            
            <DialogFooter className="flex-col gap-2">
              <View className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowDateRangeDialog(false)}
                >
                  取消
                </Button>
                <Button 
                  className="flex-1"
                  onClick={confirmDateRange}
                  disabled={!dateRange.from || !dateRange.to}
                >
                  确定
                </Button>
              </View>
              {selectedDateRange.from && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-gray-500"
                  onClick={() => {
                    clearCustomTime();
                    setShowDateRangeDialog(false);
                  }}
                >
                  清除自定义时间
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 悬浮添加按钮 */}
      <View 
        className="flex items-center justify-center"
        style={{
          position: 'fixed',
          left: '16px',
          bottom: '70px',
          width: '56px',
          height: '56px',
          backgroundColor: '#1377EB',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(19, 119, 235, 0.4)',
          zIndex: 100
        }}
        onClick={() => {
          Taro.navigateTo({
            url: '/pages/create/index'
          });
        }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </View>
    </View>
  );
}
