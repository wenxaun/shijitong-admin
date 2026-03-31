import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import { Task, CloudResponse, TaskListResponse, TaskGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { ChevronRight, Calendar, User, Award, Archive, Send, Trash2, CalendarDays, Loader, X, Funnel } from 'lucide-react-taro';
import { format } from 'date-fns';

type TabType = 'created' | 'executed' | 'deleted';

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string; bgClass: string }> = {
  pending: { label: '待办', color: '#6B7280', bgClass: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: '#1377EB', bgClass: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: '#00B365', bgClass: 'bg-green-50 text-green-600' },
  cancelled: { label: '已取消', color: '#EA4335', bgClass: 'bg-red-50 text-red-500' },
  deleted: { label: '已删除', color: '#9CA3AF', bgClass: 'bg-gray-100 text-gray-400' }
};

// 优先级配置
const PRIORITY_OPTIONS = [
  { value: '', label: '全部优先级' },
  { value: 'P0', label: 'P0 紧急重要' },
  { value: 'P1', label: 'P1 重要' },
  { value: 'P2', label: 'P2 普通' },
  { value: 'P3', label: 'P3 次要' }
];

// 优先级颜色
const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  P0: { bg: 'bg-red-50', text: 'text-red-500' },
  P1: { bg: 'bg-orange-50', text: 'text-orange-500' },
  P2: { bg: 'bg-blue-50', text: 'text-blue-500' },
  P3: { bg: 'bg-gray-100', text: 'text-gray-400' }
};

// Tab 配置
const TAB_CONFIG: { value: TabType; label: string; icon: typeof Archive }[] = [
  { value: 'created', label: '我创建的', icon: Send },
  { value: 'executed', label: '我执行的', icon: User },
  { value: 'deleted', label: '已删除', icon: Trash2 }
];

// 时间筛选选项
const TIME_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' }
] as const;

export default function History() {
  const { openid } = useUserStore();
  const [currentTab, setCurrentTab] = useState<TabType>('created');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  // 时间筛选
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // 多条件筛选
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // 加载分组列表
  const loadGroups = async () => {
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const storedGroups = Taro.getStorageSync('mock_groups') || '[]';
        setGroups(JSON.parse(storedGroups));
        return;
      }
      
      const res = await callFunction<CloudResponse<{ groups: TaskGroup[] }>>('group-list', {});
      if (res.success && res.data) {
        setGroups(res.data.groups || []);
      }
    } catch (err) {
      console.error('[History] 加载分组失败:', err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // 加载历史任务
  const loadTasks = useCallback(async (refresh = false) => {
    if (!openid) return;
    
    setLoading(true);
    try {
      const currentPage = refresh ? 1 : page;

      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        if (refresh) {
          const mockTasks: Task[] = [
            {
              _id: '1',
              task_id: '1',
              task_name: '示例任务1（提前完成）',
              task_description: '任务描述内容',
              status: 'completed',
              priority: 'P1',
              group_id: 'default1',
              group_name: '工作',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              complete_date: new Date().toISOString(),
              score: 100,
              score_note: '提前1天完成',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '2',
              task_id: '2',
              task_name: '示例任务2（按时完成）',
              status: 'completed',
              priority: 'P2',
              group_id: 'default1',
              group_name: '工作',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date().toISOString().split('T')[0],
              complete_date: new Date().toISOString(),
              score: 80,
              score_note: '按时完成',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '3',
              task_id: '3',
              task_name: '示例任务3（逾期完成）',
              status: 'completed',
              priority: 'P1',
              group_id: 'default2',
              group_name: '个人',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
              complete_date: new Date().toISOString(),
              score: 65,
              score_note: '逾期3天完成',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '4',
              task_id: '4',
              task_name: '示例任务4（进行中）',
              status: 'in_progress',
              priority: 'P0',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          
          // 应用筛选
          let filteredTasks = [...mockTasks];
          if (priorityFilter) {
            filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
          }
          if (groupFilter) {
            filteredTasks = filteredTasks.filter(t => t.group_id === groupFilter);
          }
          if (statusFilter) {
            filteredTasks = filteredTasks.filter(t => t.status === statusFilter);
          }
          
          setTasks(filteredTasks);
        }
        setHasMore(false);
        setLoading(false);
        return;
      }

      // 构建请求参数
      const params: Record<string, any> = {
        type: currentTab,
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

      // 处理多条件筛选
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (groupFilter) params.group_id = groupFilter;

      const res = await callFunction<CloudResponse<TaskListResponse>>(
        'task-history',
        params
      );

      if (res.success && res.data) {
        const newTasks = res.data.tasks || [];
        setTasks(refresh ? newTasks : [...tasks, ...newTasks]);
        setHasMore(res.data.hasMore);
        setPage(currentPage);
      }
    } catch (err) {
      console.error('加载历史失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [openid, currentTab, page, tasks, timeFilter, selectedDateRange, statusFilter, priorityFilter, groupFilter]);

  useEffect(() => {
    loadTasks(true);
  }, [currentTab, timeFilter, selectedDateRange, statusFilter, priorityFilter, groupFilter]);

  // 跳转详情
  const goDetail = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${taskId}` });
  };

  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      loadTasks();
    }
  };

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00B365';
    if (score >= 60) return '#FF7D27';
    return '#EA4335';
  };

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

  // 清除所有筛选
  const clearAllFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setGroupFilter('');
  };

  // 获取筛选条件数量
  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter) count++;
    if (priorityFilter) count++;
    if (groupFilter) count++;
    return count;
  };

  // 获取已选筛选条件的标签
  const getActiveFilterTags = () => {
    const tags: { type: string; label: string }[] = [];
    if (statusFilter) {
      const statusInfo = STATUS_MAP[statusFilter];
      tags.push({ type: 'status', label: statusInfo?.label || statusFilter });
    }
    if (priorityFilter) {
      tags.push({ type: 'priority', label: priorityFilter });
    }
    if (groupFilter) {
      const group = groups.find(g => g._id === groupFilter);
      tags.push({ type: 'group', label: group?.name || groupFilter });
    }
    return tags;
  };

  // 移除单个筛选条件
  const removeFilter = (type: string) => {
    if (type === 'status') setStatusFilter('');
    if (type === 'priority') setPriorityFilter('');
    if (type === 'group') setGroupFilter('');
  };

  // 渲染任务卡片
  const renderTaskCard = (task: Task) => {
    const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.pending;
    const priorityStyle = PRIORITY_STYLE[task.priority || 'P2'];
    
    // 计算逾期天数（如果任务已逾期）
    const requireDate = task.require_date ? new Date(task.require_date) : null;
    const completeDate = task.complete_date ? new Date(task.complete_date) : null;
    let overdueDays = 0;
    if (requireDate && completeDate) {
      overdueDays = Math.ceil((completeDate.getTime() - requireDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return (
      <Card
        key={task._id}
        className="mb-3 overflow-hidden"
        onClick={() => goDetail(task.task_id)}
      >
        <CardContent className="p-0">
          <View className="flex">
            {/* 左侧状态条 */}
            <View 
              className="w-1"
              style={{ backgroundColor: statusInfo.color }}
            />
            
            <View className="flex-1 p-4">
              {/* 标题行 */}
              <View className="flex items-start justify-between mb-2">
                <View className="flex-1 mr-3">
                  <Text className={`text-base font-semibold leading-6 ${task.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`} numberOfLines={2}>
                    {task.task_name}
                  </Text>
                </View>
                <Badge className={`${priorityStyle.bg} ${priorityStyle.text}`}>
                  {task.priority || 'P2'}
                </Badge>
              </View>

              {/* 信息行 */}
              <View className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className={statusInfo.bgClass}>{statusInfo.label}</Badge>
                
                {/* 任务分组 */}
                {task.group_name && (
                  <View className="px-2 py-1 bg-purple-50 rounded">
                    <Text className="text-xs text-purple-500">{task.group_name}</Text>
                  </View>
                )}
                
                {/* 创建日期 */}
                {task.created_at && (
                  <View className="flex items-center gap-1">
                    <Text className="text-xs text-gray-400">创建 {task.created_at}</Text>
                  </View>
                )}
                
                {/* 截止日期 */}
                <View className="flex items-center gap-1">
                  <Calendar size={14} color="#9CA3AF" />
                  <Text className="text-xs text-gray-400">截止 {task.require_date}</Text>
                </View>
                
                {/* 完成日期 */}
                {task.complete_date && (
                  <View className="flex items-center gap-1">
                    <Text className="text-xs text-green-500">完成 {task.complete_date}</Text>
                  </View>
                )}
                
                {/* 执行人 */}
                {task.executor_name && (
                  <View className="flex items-center gap-1">
                    <View className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                      <Text className="text-xs text-blue-500">{task.executor_name[0]}</Text>
                    </View>
                    <Text className="text-xs text-gray-400">{task.executor_name}</Text>
                  </View>
                )}
              </View>

              {/* 评分区域 */}
              {task.score !== null && task.score !== undefined && (
                <View className="pt-3 border-t border-gray-100">
                  <View className="flex items-center justify-between">
                    <View className="flex items-center gap-2">
                      <Award size={16} color={getScoreColor(task.score)} />
                      <Text className="text-sm text-gray-500">任务评分</Text>
                      {overdueDays > 0 && (
                        <Text className="text-xs text-orange-500">(逾期{overdueDays}天)</Text>
                      )}
                      {overdueDays < 0 && (
                        <Text className="text-xs text-green-500">(提前{Math.abs(overdueDays)}天)</Text>
                      )}
                    </View>
                    <View className="flex items-center gap-1">
                      <Text 
                        className="text-xl font-bold"
                        style={{ color: getScoreColor(task.score) }}
                      >
                        {task.score}
                      </Text>
                      <Text className="text-sm text-gray-400">分</Text>
                    </View>
                  </View>
                  
                  {/* 评分备注 */}
                  {task.score_note && (
                    <View className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <Text className="text-xs text-gray-500">{task.score_note}</Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* 右箭头 */}
              <View className="absolute right-3 top-1/2 -translate-y-1/2">
                <ChevronRight size={20} color="#D1D5DB" />
              </View>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  // 获取当前 Tab 图标
  const CurrentTabIcon = TAB_CONFIG.find(t => t.value === currentTab)?.icon || Archive;

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 加载遮罩层 - 有数据时显示 */}
      {loading && tasks.length > 0 && (
        <View 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          <View className="bg-white rounded-xl px-6 py-4 flex items-center gap-2 shadow-lg">
            <Loader size={20} color="#1377EB" className="animate-spin" />
            <Text className="text-gray-600">加载中...</Text>
          </View>
        </View>
      )}
      
      {/* Tab 选择 */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex gap-2">
          {TAB_CONFIG.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = currentTab === tab.value;
            
            return (
              <View
                key={tab.value}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-blue-500' 
                    : 'bg-gray-50'
                }`}
                onClick={() => setCurrentTab(tab.value)}
              >
                <TabIcon size={18} color={isActive ? '#ffffff' : '#9CA3AF'} />
                <Text className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {tab.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 时间筛选 */}
      <View className="bg-white px-4 py-2 border-b border-gray-100">
        <ScrollView scrollX className="whitespace-nowrap">
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
            
            {/* 筛选按钮 */}
            <View 
              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                getActiveFilterCount() > 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setShowFilterDialog(true)}
            >
              <Funnel size={14} color={getActiveFilterCount() > 0 ? '#ffffff' : '#6B7280'} />
              <Text>筛选</Text>
              {getActiveFilterCount() > 0 && (
                <View className="ml-1 px-1 bg-white bg-opacity-20 rounded-full">
                  <Text className="text-xs">{getActiveFilterCount()}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 已选筛选条件标签 */}
      {getActiveFilterCount() > 0 && (
        <View className="bg-white px-4 py-2 border-b border-gray-100">
          <View className="flex items-center gap-2 flex-wrap">
            {getActiveFilterTags().map((tag) => (
              <View 
                key={tag.type}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full"
              >
                <Text className="text-xs text-blue-500">{tag.label}</Text>
                <View onClick={() => removeFilter(tag.type)}>
                  <X size={12} color="#3B82F6" />
                </View>
              </View>
            ))}
            <View 
              className="px-2 py-1 text-xs text-gray-400"
              onClick={clearAllFilters}
            >
              <Text>清除全部</Text>
            </View>
          </View>
        </View>
      )}

      {/* 任务列表 */}
      <ScrollView className="h-screen" scrollY>
        <View className="px-4 pt-4 pb-24">
          {loading && tasks.length === 0 ? (
            <View className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <Skeleton className="h-3 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : tasks.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CurrentTabIcon size={36} color="#D1D5DB" />
              </View>
              <Text className="text-gray-500 mb-2">暂无历史记录</Text>
              <Text className="text-gray-400 text-sm">完成任务后将在这里显示</Text>
            </View>
          ) : (
            <>
              {tasks.map(renderTaskCard)}
              {hasMore && (
                <View className="flex justify-center py-4">
                  <Button variant="ghost" size="sm" onClick={loadMore}>
                    加载更多
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* 日期范围选择器弹窗 */}
      {showDateRangeDialog && (
        <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>选择日期范围</DialogTitle>
            </DialogHeader>
            
            <View className="py-4">
              <CalendarPicker
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

      {/* 多条件筛选弹窗 */}
      {showFilterDialog && (
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>筛选条件</DialogTitle>
            </DialogHeader>
            
            <View className="py-4 space-y-4">
              {/* 状态筛选 */}
              <View>
                <Text className="text-sm text-gray-500 mb-2">任务状态</Text>
                <ScrollView scrollX className="whitespace-nowrap">
                  <View className="flex gap-2">
                    <View
                      className={`px-3 py-2 rounded-lg ${!statusFilter ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setStatusFilter('')}
                    >
                      <Text className="text-sm">全部</Text>
                    </View>
                    {Object.entries(STATUS_MAP).filter(([key]) => key !== 'deleted').map(([key, value]) => (
                      <View
                        key={key}
                        className={`px-3 py-2 rounded-lg ${statusFilter === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        onClick={() => setStatusFilter(key)}
                      >
                        <Text className="text-sm">{value.label}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
              
              {/* 优先级筛选 */}
              <View>
                <Text className="text-sm text-gray-500 mb-2">优先级</Text>
                <ScrollView scrollX className="whitespace-nowrap">
                  <View className="flex gap-2">
                    {PRIORITY_OPTIONS.map((item) => (
                      <View
                        key={item.value}
                        className={`px-3 py-2 rounded-lg ${priorityFilter === item.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        onClick={() => setPriorityFilter(item.value)}
                      >
                        <Text className="text-sm">{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
              
              {/* 分组筛选 */}
              <View>
                <Text className="text-sm text-gray-500 mb-2">任务分组</Text>
                <ScrollView scrollX className="whitespace-nowrap">
                  <View className="flex gap-2">
                    <View
                      className={`px-3 py-2 rounded-lg ${!groupFilter ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setGroupFilter('')}
                    >
                      <Text className="text-sm">全部分组</Text>
                    </View>
                    {groups.map((group) => (
                      <View
                        key={group._id}
                        className={`px-3 py-2 rounded-lg ${groupFilter === group._id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        onClick={() => setGroupFilter(group._id)}
                      >
                        <Text className="text-sm">{group.name}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
            
            <DialogFooter>
              <View className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={clearAllFilters}
                >
                  清除筛选
                </Button>
                <Button 
                  className="flex-1 bg-blue-500 text-white"
                  onClick={() => setShowFilterDialog(false)}
                >
                  确定
                </Button>
              </View>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </View>
  );
}
