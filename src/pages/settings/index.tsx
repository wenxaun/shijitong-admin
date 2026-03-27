import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

interface Settings {
  enableReminder: boolean;
  reminderTime: string;
  receiveAssignNotify: boolean;
  receiveExceptionNotify: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  enableReminder: true,
  reminderTime: '16:00',
  receiveAssignNotify: true,
  receiveExceptionNotify: true
};

export default function Settings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // 从本地存储加载设置
    const stored = Taro.getStorageSync('userSettings');
    if (stored) {
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
    }
  }, []);

  // 保存设置
  const saveSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    Taro.setStorageSync('userSettings', updated);
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  // 复制文本
  const copyText = (text: string) => {
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' });
      }
    });
  };

  return (
    <View className="min-h-screen bg-gray-50">
      <View className="p-3 space-y-3">
        {/* 提醒设置 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-4">⏰ 提醒设置</Text>

            <View className="flex items-center justify-between py-2">
              <View>
                <Text className="text-sm text-gray-800">启用 16:00 提醒</Text>
              </View>
              <Switch
                checked={settings.enableReminder}
                onCheckedChange={(checked) => saveSettings({ enableReminder: checked })}
              />
            </View>

            {settings.enableReminder && (
              <>
                <Separator className="my-2" />
                <View className="flex items-center justify-between py-2">
                  <Text className="text-sm text-gray-800">提醒时间</Text>
                  <Picker
                    mode="time"
                    value={settings.reminderTime}
                    onChange={(e) => saveSettings({ reminderTime: e.detail.value })}
                  >
                    <View className="bg-gray-100 px-3 py-1 rounded-lg">
                      <Text className="text-sm text-gray-600">{settings.reminderTime}</Text>
                    </View>
                  </Picker>
                </View>
              </>
            )}

            <Separator className="my-2" />

            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-gray-800">免打扰时段</Text>
              <Text className="text-sm text-gray-400">20:00 - 08:00</Text>
            </View>
          </CardContent>
        </Card>

        {/* 消息通知 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-4">📬 消息通知</Text>

            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-gray-800">接收任务分配通知</Text>
              <Switch
                checked={settings.receiveAssignNotify}
                onCheckedChange={(checked) => saveSettings({ receiveAssignNotify: checked })}
              />
            </View>

            <Separator className="my-2" />

            <View className="flex items-center justify-between py-2">
              <View className="flex-1">
                <Text className="text-sm text-gray-800">接收异常上报通知</Text>
                <Text className="text-xs text-gray-400 mt-1">作为发布人时，接收执行人的异常上报</Text>
              </View>
              <Switch
                checked={settings.receiveExceptionNotify}
                onCheckedChange={(checked) => saveSettings({ receiveExceptionNotify: checked })}
              />
            </View>
          </CardContent>
        </Card>

        {/* 关于 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-4">ℹ️ 关于</Text>

            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-gray-600">版本</Text>
              <Text className="text-sm text-gray-800">v2.0.0</Text>
            </View>

            <Separator className="my-2" />

            <View
              className="flex items-center justify-between py-2 active:bg-gray-50"
              onClick={() => copyText('cloud1-3g7j95ax4a0f4a3f')}
            >
              <Text className="text-sm text-gray-600">云环境</Text>
              <Text className="text-sm text-blue-500">cloud1-3g7j95ax4a0f4a3f</Text>
            </View>

            <Separator className="my-2" />

            <View
              className="flex items-center justify-between py-2 active:bg-gray-50"
              onClick={() => copyText('wx2be578f65935b5e8')}
            >
              <Text className="text-sm text-gray-600">AppID</Text>
              <Text className="text-sm text-blue-500">wx2be578f65935b5e8</Text>
            </View>
          </CardContent>
        </Card>

        {/* 说明 */}
        <View className="flex justify-center py-4">
          <Text className="text-xs text-gray-400">
            提醒功能仅在微信小程序中可用
          </Text>
        </View>
      </View>
    </View>
  );
}
