import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  /** 图标组件 */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮文字 */
  actionText?: string;
  /** 操作按钮点击事件 */
  onAction?: () => void;
  /** 自定义图标颜色 */
  iconColor?: string;
}

/**
 * 空状态组件
 * 用于列表为空、搜索无结果等场景
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  iconColor = '#999999'
}: EmptyStateProps) {
  const handleAction = () => {
    if (onAction) {
      onAction();
    }
  };

  return (
    <View className="flex flex-col items-center justify-center py-12 px-6">
      {/* 图标 */}
      {Icon && (
        <View className="mb-4">
          <Icon size={64} color={iconColor} />
        </View>
      )}
      
      {/* 标题 */}
      <Text className="text-base font-medium text-gray-800 text-center mb-2">
        {title}
      </Text>
      
      {/* 描述 */}
      {description && (
        <Text className="text-sm text-gray-500 text-center mb-6">
          {description}
        </Text>
      )}
      
      {/* 操作按钮 */}
      {actionText && onAction && (
        <Button
          variant="default"
          size="default"
          onClick={handleAction}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {actionText}
        </Button>
      )}
    </View>
  );
}
