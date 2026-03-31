import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import type { MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GripVertical, RotateCcw } from 'lucide-react-taro';

// 默认菜单项
const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { icon: '📈', label: '数据统计', path: '/pages/stats/index', order: 1 },
  { icon: '📜', label: '历史任务', path: '/pages/history/index', order: 2 },
  { icon: '⚙️', label: '设置', path: '/pages/settings/index', order: 3 },
  { icon: '📊', label: '周报', path: '/pages/weekly/index', order: 4 }
];

export default function MenuSort() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    loadMenuItems();
  }, []);

  // 加载菜单项
  const loadMenuItems = () => {
    const storedOrder = Taro.getStorageSync('menu_order');
    if (storedOrder) {
      // 根据存储的顺序重新排列
      const orderMap = new Map<string, number>(storedOrder.map((item: { path: string; order: number }) => [item.path, item.order]));
      const sortedItems = [...DEFAULT_MENU_ITEMS].sort((a, b) => {
        const orderA: number = orderMap.get(a.path) ?? a.order ?? 0;
        const orderB: number = orderMap.get(b.path) ?? b.order ?? 0;
        return orderA - orderB;
      });
      setMenuItems(sortedItems);
    } else {
      setMenuItems(DEFAULT_MENU_ITEMS);
    }
  };

  // 上移
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...menuItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setMenuItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
    setHasChanged(true);
  };

  // 下移
  const moveDown = (index: number) => {
    if (index === menuItems.length - 1) return;
    const newItems = [...menuItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setMenuItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
    setHasChanged(true);
  };

  // 保存排序
  const saveOrder = () => {
    const orderData = menuItems.map((item, index) => ({
      path: item.path,
      order: index + 1
    }));
    Taro.setStorageSync('menu_order', orderData);
    setHasChanged(false);
    
    // 发送事件通知"我的"页面刷新菜单排序
    Taro.eventCenter.trigger('menuOrderChanged');
    
    Taro.showToast({ title: '保存成功', icon: 'success' });
    
    // 延迟返回上一页
    setTimeout(() => {
      Taro.navigateBack();
    }, 1000);
  };

  // 重置为默认排序
  const resetOrder = () => {
    Taro.showModal({
      title: '重置排序',
      content: '确定要恢复默认排序吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('menu_order');
          setMenuItems(DEFAULT_MENU_ITEMS);
          setHasChanged(false);
          
          // 发送事件通知"我的"页面刷新菜单排序
          Taro.eventCenter.trigger('menuOrderChanged');
          
          Taro.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  };

  return (
    <View className="min-h-screen bg-gray-50">
      <View className="p-3 space-y-3">
        {/* 说明 */}
        <View className="bg-blue-50 rounded-lg p-3">
          <Text className="text-sm text-blue-600">
            长按拖动或点击上下箭头可调整功能菜单的显示顺序
          </Text>
        </View>

        {/* 功能列表 */}
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <View key={item.path}>
                <View className="flex items-center px-4 py-4">
                  {/* 排序指示 */}
                  <View className="flex flex-col items-center mr-3">
                    <View 
                      className={`p-1 ${index === 0 ? 'opacity-30' : 'active:bg-gray-100'}`}
                      onClick={() => moveUp(index)}
                    >
                      <Text className={`text-lg ${index === 0 ? 'text-gray-300' : 'text-gray-500'}`}>↑</Text>
                    </View>
                    <View 
                      className={`p-1 ${index === menuItems.length - 1 ? 'opacity-30' : 'active:bg-gray-100'}`}
                      onClick={() => moveDown(index)}
                    >
                      <Text className={`text-lg ${index === menuItems.length - 1 ? 'text-gray-300' : 'text-gray-500'}`}>↓</Text>
                    </View>
                  </View>
                  
                  {/* 图标 */}
                  <Text className="text-2xl mr-3">{item.icon}</Text>
                  
                  {/* 名称 */}
                  <View className="flex-1">
                    <Text className="text-base text-gray-800">{item.label}</Text>
                    <Text className="text-xs text-gray-400 mt-1">第 {index + 1} 位</Text>
                  </View>
                  
                  {/* 拖动提示 */}
                  <GripVertical size={20} color="#D1D5DB" />
                </View>
                {index < menuItems.length - 1 && <Separator className="mx-4" />}
              </View>
            ))}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <View className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={resetOrder}
          >
            <RotateCcw size={16} color="#6B7280" />
            <Text className="ml-2">恢复默认</Text>
          </Button>
          <Button
            className="flex-1 bg-blue-500 text-white"
            onClick={saveOrder}
            disabled={!hasChanged}
          >
            保存排序
          </Button>
        </View>
      </View>
    </View>
  );
}
