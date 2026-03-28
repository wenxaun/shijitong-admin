import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import { Task, TaskStatus, TaskPriority, CloudResponse, TaskListResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { DeadlineReminder } from '@/components/deadline-reminder';
import { CalendarDays, Loader } from 'lucide-react-taro';
import { format } from 'date-fns';

// 状态筛选选项
const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
] as const;

// 时间筛选选项
const TIME_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' }
] as const;

// 状态显示映射
const STATUS_MAP: Record<TaskStatus, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  exception: '异常'
};

// 状态颜色映射
const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-500',
  exception: 'bg-orange-50 text-orange-600'
};

// 优先级颜色映射
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  P0: 'bg-red-50 text-red-500',
  P1: 'bg-orange-50 text-orange-500',
  P2: 'bg-blue-50 text-blue-500',
  P3: 'bg-gray-100 text-gray-400'
};

export default function Index() {
  // 组件渲染时立即输出
  console.log('===== IndexPage 组件渲染 =====');
  console.log('[IndexPage] 当前时间:', new Date().toISOString());
  
  const { openid } = useUserStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // 自定义时间筛选
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});

  // 加载任务列表
  const loadTasks = useCallback(async (refresh = false) => {
    console.log('===== loadTasks 开始 =====');
    
    // 优先使用 hook 返回的 openid，否则从 store 获取
    const currentOpenid = openid || useUserStore.getState().openid;
    console.log('[Index] openid:', openid);
    console.log('[Index] currentOpenid:', currentOpenid);
    
    if (!currentOpenid) {
      console.log('[Index] openid 为空，跳过加载');
      setLoading(false);
      return;
    }

    console.log('[Index] 开始加载任务列表...');
    setLoading(true);
    try {
      const currentPage = refresh ? 1 : page;
      
      // 构建请求参数
      const params: Record<string, any> = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        pageSize: 20
      };
      
      // 处理时间筛选
      if (timeFilter === 'custom' && selectedDateRange.from && selectedDateRange.to) {
        params.start_date = format(selectedDateRange.from, 'yyyy-MM-dd');
        params.end_date = format(selectedDateRange.to, 'yyyy-MM-dd');
      } else if (timeFilter !== 'all' && timeFilter !== 'custom') {
        params.time_filter = timeFilter;
      }
      
      console.log('[Index] 调用参数:', JSON.stringify(params));
      
      const res = await callFunction<CloudResponse<TaskListResponse>>(
        CLOUD_FUNCTIONS.TASK_LIST,
        params
      );

      console.log('[Index] 任务列表返回:', JSON.stringify(res));

      if (res.success && res.data) {
        const newTasks = res.data.tasks || [];
        console.log('[Index] 任务数量:', newTasks.length);
        if (refresh) {
          setTasks(newTasks);
          setPage(1);
        } else {
          setTasks(prev => [...prev, ...newTasks]);
        }
        setHasMore(res.data.hasMore);
      } else {
        console.error('[Index] 加载任务失败:', res.message);
        Taro.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Index] 加载任务异常:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      console.log('===== loadTasks 结束 =====');
    }
  }, [openid, statusFilter, timeFilter, page, selectedDateRange]);

  // 初始化加载
  useEffect(() => {
    console.log('===== Index useEffect =====');
    console.log('[Index] openid:', openid);
    
    // 如果 hook 返回的 openid 为空，尝试从 store 直接获取
    const storeOpenid = useUserStore.getState().openid;
    console.log('[Index] store 中的 openid:', storeOpenid);
    
    if (openid || storeOpenid) {
      loadTasks(true);
    } else {
      console.log('[Index] openid 为空，跳过加载');
      setLoading(false);
    }
  }, [openid]);

  // 页面显示时刷新数据
  Taro.useDidShow(() => {
    console.log('===== Index useDidShow =====');
    const storeOpenid = useUserStore.getState().openid;
    console.log('[Index] openid:', openid);
    console.log('[Index] store 中的 openid:', storeOpenid);
    
    if (openid || storeOpenid) {
      loadTasks(true);
    }
  });

  // 筛选变化时重新加载
  useEffect(() => {
    // 如果选择自定义时间但未选择日期范围，不触发加载
    if (timeFilter === 'custom' && (!selectedDateRange.from || !selectedDateRange.to)) {
      return;
    }
    
    if (openid || useUserStore.getState().openid) {
      setTasks([]);
      setPage(1);
      loadTasks(true);
    }
  }, [statusFilter, timeFilter, selectedDateRange]);

  // 处理时间筛选点击
  const handleTimeFilterClick = (value: string) => {
    if (value === 'custom') {
      // 打开日期范围选择器
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

  // 渲染任务卡片
  const renderTaskCard = (task: Task) => {
    // 判断是否逾期
    const requireDate = new Date(task.require_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requireDate.setHours(0, 0, 0, 0);
    const isOverdue = today > requireDate && task.status !== 'completed' && task.status !== 'cancelled';
    
    // 计算剩余天数
    const daysLeft = Math.ceil((requireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <Card
        key={task._id}
        className="mb-3 overflow-hidden active:bg-gray-50"
        onClick={() => goDetail(task.task_id)}
      >
        <CardContent className="p-0">
          <View className="flex">
            {/* 左侧状态条 */}
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
              {/* 标题行 */}
              <View className="flex items-start justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text className={`text-base font-semibold ${task.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`} numberOfLines={2}>
                    {task.task_name}
                  </Text>
                </View>
                <Badge className={PRIORITY_COLOR[task.priority]}>{task.priority}</Badge>
              </View>

              {/* 元信息行 */}
              <View className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={STATUS_COLOR[task.status]}>{STATUS_MAP[task.status]}</Badge>
                
                {/* 创建日期 */}
                {task.created_at && (
                  <View className="flex items-center gap-1">
                    <Text className="text-xs text-gray-400">创建 {task.created_at}</Text>
                  </View>
                )}
                
                {/* 截止日期 */}
                <View className="flex items-center gap-1">
                  <Text className={`text-xs ${isOverdue ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                    截止 {isOverdue ? `(已逾期${Math.abs(daysLeft)}天)` : daysLeft === 0 ? '今日' : daysLeft === 1 ? '明日' : task.require_date}
                  </Text>
                </View>
                
                {/* 完成日期 */}
                {task.complete_date && task.status === 'completed' && (
                  <View className="flex items-center gap-1">
                    <Text className="text-xs text-green-500">完成 {task.complete_date}</Text>
                  </View>
                )}
              </View>

              {/* 执行人和子任务信息 */}
              <View className="flex items-center justify-between">
                <View className="flex items-center gap-3">
                  {/* 执行人 */}
                  {task.executor_name && (
                    <View className="flex items-center gap-1">
                      <View className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <Text className="text-xs text-blue-500">{task.executor_name[0]}</Text>
                      </View>
                      <Text className="text-xs text-gray-500">{task.executor_name}</Text>
                    </View>
                  )}
                  
                  {/* 子任务数量 */}
                  {task.subtask_count && task.subtask_count > 0 && (
                    <View className="flex items-center gap-1">
                      <Text className="text-xs text-gray-400">📋 {task.subtask_count} 项子任务</Text>
                    </View>
                  )}
                </View>
                
                {/* 进度条 */}
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

              {/* 评分 */}
              {task.score !== null && task.score !== undefined && (
                <View className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <Text
                    className={`text-sm font-semibold ${
                      task.score >= 100
                        ? 'text-green-500'
                        : task.score >= 80
                        ? 'text-blue-500'
                        : 'text-orange-500'
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

  // 渲染空状态
  const renderEmpty = () => (
    <View className="flex flex-col items-center justify-center py-20">
      <Text className="text-6xl mb-4 opacity-30">📋</Text>
      <Text className="text-lg font-semibold text-gray-800 mb-2">暂无任务</Text>
      <Text className="text-sm text-gray-500">点击下方「发布」创建新任务</Text>
    </View>
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

      {/* 筛选栏 */}
      <View className="bg-white px-3 py-2 mb-3">
        {/* 时间筛选 */}
        <View className="flex items-center mb-2">
          <Text className="text-sm text-gray-500 w-12">时间：</Text>
          <ScrollView scrollX className="flex-1 whitespace-nowrap">
            <View className="flex gap-2">
              {TIME_FILTERS.map((item) => (
                <View
                  key={item.value}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                    timeFilter === item.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => handleTimeFilterClick(item.value)}
                >
                  {item.value === 'custom' && timeFilter === 'custom' && selectedDateRange.from ? (
                    <>
                      <CalendarDays size={14} color={timeFilter === item.value ? '#ffffff' : '#1377EB'} />
                      <Text>{getDisplayDateRange()}</Text>
                    </>
                  ) : (
                    <Text>{item.label}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 状态筛选 */}
        <View className="flex items-center">
          <Text className="text-sm text-gray-500 w-12">状态：</Text>
          <ScrollView scrollX className="flex-1 whitespace-nowrap">
            <View className="flex gap-2">
              {STATUS_FILTERS.map((item) => (
                <View
                  key={item.value}
                  className={`px-3 py-1 rounded-full text-sm ${
                    statusFilter === item.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setStatusFilter(item.value)}
                >
                  <Text>{item.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 任务列表 */}
      <View className="px-3 pb-20">
        {loading && tasks.length === 0 ? (
          renderLoading()
        ) : tasks.length === 0 ? (
          renderEmpty()
        ) : (
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
              
              {/* 已选择的日期范围显示 */}
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
    </View>
  );
}
