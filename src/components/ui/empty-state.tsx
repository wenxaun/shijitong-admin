import { View, Text } from '@tarojs/components';
import { Inbox, FileX, SearchX, CalendarX, ClipboardList } from 'lucide-react-taro';

export type EmptyType = 
  | 'tasks' 
  | 'completed' 
  | 'search' 
  | 'calendar' 
  | 'general'
  | 'subtasks';

interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  description?: string;
  icon?: React.ComponentType<any>;
  action?: React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMPTY_CONFIG: Record<EmptyType, { icon: React.ComponentType<any>; title: string; description: string }> = {
  tasks: {
    icon: ClipboardList,
    title: '暂无任务',
    description: '点击下方「发布」创建新任务'
  },
  completed: {
    icon: FileX,
    title: '暂无已完成任务',
    description: '完成任务后会显示在这里'
  },
  search: {
    icon: SearchX,
    title: '未找到相关内容',
    description: '换个关键词试试吧'
  },
  calendar: {
    icon: CalendarX,
    title: '暂无日程安排',
    description: '选择其他日期查看'
  },
  general: {
    icon: Inbox,
    title: '暂无内容',
    description: ''
  },
  subtasks: {
    icon: ClipboardList,
    title: '暂无子任务',
    description: '点击添加子任务'
  }
};

export function EmptyState({ type = 'general', title, description, icon: CustomIcon, action }: EmptyStateProps) {
  const config = EMPTY_CONFIG[type];
  const IconComponent = CustomIcon || config.icon;
  
  return (
    <View className="flex flex-col items-center justify-center py-16 px-8">
      <View className="mb-4 opacity-30">
        <IconComponent size={64} color="#9ca3af" />
      </View>
      <Text className="text-lg font-semibold text-gray-800 mb-2">
        {title || config.title}
      </Text>
      {(description || config.description) && (
        <Text className="text-sm text-gray-500 text-center mb-4">
          {description || config.description}
        </Text>
      )}
      {action && (
        <View className="mt-2">
          {action}
        </View>
      )}
    </View>
  );
}
