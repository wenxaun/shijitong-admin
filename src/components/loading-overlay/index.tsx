import { View, Text } from '@tarojs/components';
import { Loader } from 'lucide-react-taro';

interface LoadingOverlayProps {
  /** 是否显示 */
  visible: boolean;
  /** 加载文字 */
  text?: string;
  /** 是否全屏遮罩 */
  fullscreen?: boolean;
}

/**
 * 加载遮罩组件
 * 用于刷新、提交等操作的加载状态
 */
export function LoadingOverlay({ 
  visible, 
  text = '加载中...', 
  fullscreen = true 
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View 
      className={`flex items-center justify-center z-50 bg-black bg-opacity-20 ${
        fullscreen ? 'fixed inset-0' : 'absolute inset-0'
      }`}
      style={{ zIndex: 9999 }}
    >
      <View className="bg-white rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg">
        <Loader size={20} color="#1377EB" className="animate-spin" />
        <Text className="text-sm text-gray-600">{text}</Text>
      </View>
    </View>
  );
}
