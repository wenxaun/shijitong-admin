/**
 * 任务筛选 Hook
 * 提供任务筛选状态和逻辑的封装
 */

import { useState, useCallback } from 'react';
import { format } from 'date-fns';

export interface FilterState {
  /** 状态筛选 */
  statusFilter: string;
  /** 优先级筛选 */
  priorityFilter: string;
  /** 分组筛选 */
  groupFilter: string;
  /** 时间筛选 */
  timeFilter: string;
  /** 自定义日期范围 */
  selectedDateRange: { from?: Date; to?: Date };
}

export interface FilterActions {
  /** 设置状态筛选 */
  setStatusFilter: (value: string) => void;
  /** 设置优先级筛选 */
  setPriorityFilter: (value: string) => void;
  /** 设置分组筛选 */
  setGroupFilter: (value: string) => void;
  /** 设置时间筛选 */
  setTimeFilter: (value: string) => void;
  /** 清除所有筛选 */
  clearAllFilters: () => void;
  /** 移除单个筛选 */
  removeFilter: (type: string) => void;
  /** 获取活跃筛选数量 */
  getActiveFilterCount: () => number;
  /** 获取筛选标签列表 */
  getFilterTags: (
    groups: { _id: string; name: string }[],
    statusMap: Record<string, { label: string }>
  ) => { type: string; label: string }[];
  /** 处理时间筛选点击 */
  handleTimeFilterClick: (value: string, onCustomClick?: () => void) => void;
  /** 确认日期范围选择 */
  confirmDateRange: (dateRange: { from?: Date; to?: Date }) => void;
  /** 清除自定义时间 */
  clearCustomTime: () => void;
  /** 获取显示日期范围 */
  getDisplayDateRange: () => string;
}

export interface UseTaskFiltersReturn extends FilterState, FilterActions {
  /** 日期选择器状态 */
  dateRange: { from?: Date; to?: Date };
  /** 设置日期选择器状态 */
  setDateRange: (value: { from?: Date; to?: Date }) => void;
  /** 构建请求参数 */
  buildRequestParams: (baseParams: Record<string, any>) => Record<string, any>;
}

/**
 * 任务筛选 Hook
 */
export function useTaskFilters(): UseTaskFiltersReturn {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // 清除所有筛选
  const clearAllFilters = useCallback(() => {
    setStatusFilter('');
    setPriorityFilter('');
    setGroupFilter('');
  }, []);

  // 移除单个筛选
  const removeFilter = useCallback((type: string) => {
    if (type === 'status') setStatusFilter('');
    if (type === 'priority') setPriorityFilter('');
    if (type === 'group') setGroupFilter('');
    if (type === 'time') {
      setSelectedDateRange({});
      setDateRange({});
      setTimeFilter('all');
    }
  }, []);

  // 获取活跃筛选数量
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (statusFilter) count++;
    if (priorityFilter) count++;
    if (groupFilter) count++;
    return count;
  }, [statusFilter, priorityFilter, groupFilter]);

  // 获取筛选标签列表
  const getFilterTags = useCallback((
    groups: { _id: string; name: string }[],
    statusMap: Record<string, { label: string }>
  ) => {
    const tags: { type: string; label: string }[] = [];
    if (statusFilter) {
      const statusInfo = statusMap[statusFilter];
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
  }, [statusFilter, priorityFilter, groupFilter]);

  // 处理时间筛选点击
  const handleTimeFilterClick = useCallback((value: string, onCustomClick?: () => void) => {
    if (value === 'custom') {
      setDateRange(selectedDateRange);
      if (onCustomClick) {
        onCustomClick();
      }
    } else {
      setTimeFilter(value);
    }
  }, [selectedDateRange]);

  // 确认日期范围选择
  const confirmDateRange = useCallback((range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setSelectedDateRange(range);
      setTimeFilter('custom');
    }
  }, []);

  // 清除自定义时间
  const clearCustomTime = useCallback(() => {
    setSelectedDateRange({});
    setDateRange({});
    setTimeFilter('all');
  }, []);

  // 获取显示日期范围
  const getDisplayDateRange = useCallback(() => {
    if (selectedDateRange.from && selectedDateRange.to) {
      return `${format(selectedDateRange.from, 'MM/dd')}-${format(selectedDateRange.to, 'MM/dd')}`;
    }
    return '';
  }, [selectedDateRange]);

  // 构建请求参数
  const buildRequestParams = useCallback((baseParams: Record<string, any>): Record<string, any> => {
    const params = { ...baseParams };

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

    return params;
  }, [timeFilter, selectedDateRange, statusFilter, priorityFilter, groupFilter]);

  return {
    // 状态
    statusFilter,
    priorityFilter,
    groupFilter,
    timeFilter,
    selectedDateRange,
    dateRange,
    
    // 操作
    setStatusFilter,
    setPriorityFilter,
    setGroupFilter,
    setTimeFilter,
    setDateRange,
    clearAllFilters,
    removeFilter,
    getActiveFilterCount,
    getFilterTags,
    handleTimeFilterClick,
    confirmDateRange,
    clearCustomTime,
    getDisplayDateRange,
    buildRequestParams,
  };
}

export default useTaskFilters;
