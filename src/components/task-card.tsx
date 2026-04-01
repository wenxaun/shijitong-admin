/**
 * 任务卡片组件
 * 用于任务列表和历史任务页面的统一展示
 */

import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { Task } from '@/types';
import { STATUS_MAP, PRIORITY_STYLE, getScoreColor } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Award, ChevronRight } from 'lucide-react-taro';

interface TaskCardProps {
  /** 任务数据 */
  task: Task;
  /** 点击事件 */
  onClick?: (taskId: string) => void;
  /** 是否显示完成日期 */
  showCompleteDate?: boolean;
  /** 是否显示评分信息 */
  showScore?: boolean;
  /** 是否显示右侧箭头 */
  showArrow?: boolean;
  /** 是否显示状态条 */
  showStatusBar?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function TaskCard({
  task,
  onClick,
  showCompleteDate = true,
  showScore = true,
  showArrow = true,
  showStatusBar = true,
  className = ''
}: TaskCardProps) {
  const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.pending;
  const priorityStyle = PRIORITY_STYLE[task.priority || 'P2'];
  
  // 计算逾期天数（如果任务已逾期）
  const requireDate = task.require_date ? new Date(task.require_date) : null;
  const completeDate = task.complete_date ? new Date(task.complete_date) : null;
  let overdueDays = 0;
  if (requireDate && completeDate) {
    overdueDays = Math.ceil((completeDate.getTime() - requireDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const handleClick = () => {
    if (onClick) {
      onClick(task.task_id);
    } else {
      // 默认跳转到详情页
      Taro.navigateTo({ url: `/pages/detail/index?id=${task.task_id}` });
    }
  };

  return (
    <Card
      className={`mb-3 overflow-hidden ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <View className="flex">
          {/* 左侧状态条 */}
          {showStatusBar && (
            <View 
              className="w-1"
              style={{ backgroundColor: statusInfo.color }}
            />
          )}
          
          <View className={`flex-1 ${showStatusBar ? 'p-4' : 'p-3'}`}>
            {/* 标题行 */}
            <View className="flex items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text 
                  className={`text-base font-semibold leading-6 ${task.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`} 
                  numberOfLines={2}
                >
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
              {showCompleteDate && task.complete_date && (
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
            {showScore && task.score !== null && task.score !== undefined && (
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
            {showArrow && (
              <View className="absolute right-3 top-1/2 -translate-y-1/2">
                <ChevronRight size={20} color="#D1D5DB" />
              </View>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

export default TaskCard;
