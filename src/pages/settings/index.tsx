import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, X, Search, FolderOpen, ArrowRightLeft } from 'lucide-react-taro';

interface Settings {
  enableReminder: boolean;
  reminderTime: string;
  receiveAssignNotify: boolean;
  receiveExceptionNotify: boolean;
  receiveDaily: boolean;
  receiveWeekly: boolean;
}

interface ManagerUser {
  openid: string;
  nickname: string;
  avatar_url: string;
  manager_name: string;
}

const DEFAULT_SETTINGS: Settings = {
  enableReminder: true,
  reminderTime: '16:00',
  receiveAssignNotify: true,
  receiveExceptionNotify: true,
  receiveDaily: true,
  receiveWeekly: true
};

export default function Settings() {
  const { userInfo } = useUserStore();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [manager, setManager] = useState<{ id: string; name: string } | null>(null);
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [managerList, setManagerList] = useState<ManagerUser[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    // 从本地存储加载设置
    const stored = Taro.getStorageSync('userSettings');
    if (stored) {
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
    }
    
    // 加载上级信息
    loadManagerInfo();
  }, []);

  // 加载上级信息
  const loadManagerInfo = async () => {
    // H5 端模拟
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      const storedManager = Taro.getStorageSync('mock_manager');
      if (storedManager) {
        setManager(JSON.parse(storedManager));
      }
      return;
    }
    
    // 小程序端从用户信息中获取
    if (userInfo?.manager_id && userInfo?.manager_name) {
      setManager({
        id: userInfo.manager_id,
        name: userInfo.manager_name
      });
    }
  };

  // 打开选择上级对话框
  const openManagerDialog = async () => {
    setShowManagerDialog(true);
    setManagerLoading(true);
    setSearchKeyword('');
    
    try {
      // H5 端模拟
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setManagerList([
          { openid: 'user1', nickname: '张三', avatar_url: '', manager_name: '' },
          { openid: 'user2', nickname: '李四', avatar_url: '', manager_name: '王五' },
          { openid: 'user3', nickname: '王五', avatar_url: '', manager_name: '' },
          { openid: 'user4', nickname: '赵六', avatar_url: '', manager_name: '张三' }
        ]);
        setManagerLoading(false);
        return;
      }
      
      const res = await callFunction<CloudResponse<{ users: ManagerUser[] }>>(
        CLOUD_FUNCTIONS.USER_LIST_FOR_MANAGER,
        { keyword: '' }
      );
      
      if (res.success && res.data) {
        setManagerList(res.data.users || []);
      }
    } catch (err) {
      console.error('[Settings] 获取用户列表失败:', err);
      Taro.showToast({ title: '获取失败', icon: 'none' });
    } finally {
      setManagerLoading(false);
    }
  };

  // 搜索用户
  const searchUsers = async (keyword: string) => {
    setSearchKeyword(keyword);
    
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      // H5 端模拟搜索
      const allUsers = [
        { openid: 'user1', nickname: '张三', avatar_url: '', manager_name: '' },
        { openid: 'user2', nickname: '李四', avatar_url: '', manager_name: '王五' },
        { openid: 'user3', nickname: '王五', avatar_url: '', manager_name: '' },
        { openid: 'user4', nickname: '赵六', avatar_url: '', manager_name: '张三' }
      ];
      
      if (keyword.trim()) {
        setManagerList(allUsers.filter(u => u.nickname.includes(keyword)));
      } else {
        setManagerList(allUsers);
      }
      return;
    }
    
    try {
      const res = await callFunction<CloudResponse<{ users: ManagerUser[] }>>(
        CLOUD_FUNCTIONS.USER_LIST_FOR_MANAGER,
        { keyword }
      );
      
      if (res.success && res.data) {
        setManagerList(res.data.users || []);
      }
    } catch (err) {
      console.error('[Settings] 搜索用户失败:', err);
    }
  };

  // 选择上级
  const selectManager = async (user: ManagerUser) => {
    try {
      // H5 端模拟
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setManager({ id: user.openid, name: user.nickname });
        Taro.setStorageSync('mock_manager', JSON.stringify({ id: user.openid, name: user.nickname }));
        Taro.showToast({ title: '设置成功', icon: 'success' });
        setShowManagerDialog(false);
        return;
      }
      
      const res = await callFunction<CloudResponse<{ manager_id: string; manager_name: string }>>(
        CLOUD_FUNCTIONS.USER_SET_MANAGER,
        { manager_openid: user.openid }
      );
      
      if (res.success) {
        setManager({
          id: res.data!.manager_id,
          name: res.data!.manager_name
        });
        Taro.showToast({ title: '设置成功', icon: 'success' });
        setShowManagerDialog(false);
      } else {
        Taro.showToast({ title: res.message || '设置失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Settings] 设置上级失败:', err);
      Taro.showToast({ title: '设置失败', icon: 'none' });
    }
  };

  // 清除上级
  const clearManager = async () => {
    Taro.showModal({
      title: '确认清除',
      content: '确定要清除直属上级吗？',
      success: async (res) => {
        if (res.confirm) {
          // H5 端模拟
          if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
            setManager(null);
            Taro.removeStorageSync('mock_manager');
            Taro.showToast({ title: '已清除', icon: 'success' });
            return;
          }
          
          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.USER_SET_MANAGER,
              { manager_openid: '' }
            );
            
            if (result.success) {
              setManager(null);
              Taro.showToast({ title: '已清除', icon: 'success' });
            }
          } catch (err) {
            Taro.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      }
    });
  };

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
        {/* 汇报关系 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-4">👥 汇报关系</Text>
            
            <View className="bg-blue-50 rounded-lg p-3 mb-4">
              <Text className="text-xs text-blue-600">
                设置直属上级后，您的日报和周报将自动抄送给上级
              </Text>
            </View>

            {/* 当前上级 */}
            <View className="flex items-center justify-between py-2">
              <View>
                <Text className="text-sm text-gray-800">直属上级</Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {manager ? `当前：${manager.name}` : '未设置'}
                </Text>
              </View>
              <View className="flex items-center gap-2">
                {manager && (
                  <View 
                    className="px-3 py-1 bg-red-50 rounded-lg"
                    onClick={clearManager}
                  >
                    <Text className="text-sm text-red-500">清除</Text>
                  </View>
                )}
                <View 
                  className="px-3 py-1 bg-blue-500 rounded-lg"
                  onClick={openManagerDialog}
                >
                  <Text className="text-sm text-white">{manager ? '更换' : '设置'}</Text>
                </View>
              </View>
            </View>

            <Separator className="my-2" />

            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-gray-800">接收日报</Text>
              <Switch
                checked={settings.receiveDaily}
                onCheckedChange={(checked) => saveSettings({ receiveDaily: checked })}
              />
            </View>

            <Separator className="my-2" />

            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-gray-800">接收周报</Text>
              <Switch
                checked={settings.receiveWeekly}
                onCheckedChange={(checked) => saveSettings({ receiveWeekly: checked })}
              />
            </View>
          </CardContent>
        </Card>

        {/* 任务分组 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-4">📁 任务分组</Text>
            
            <View className="bg-blue-50 rounded-lg p-3 mb-4">
              <Text className="text-xs text-blue-600">
                任务分组帮助您按项目、客户或类型对任务进行分类管理
              </Text>
            </View>

            {/* 分组管理 */}
            <View 
              className="flex items-center justify-between py-3 active:bg-gray-50 -mx-4 px-4"
              onClick={() => Taro.navigateTo({ url: '/pages/group-manage/index' })}
            >
              <View className="flex items-center">
                <FolderOpen size={18} color="#6B7280" />
                <Text className="text-sm text-gray-800 ml-3">任务分组管理</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" />
            </View>

            <Separator className="my-1" />

            {/* 分组划分 */}
            <View 
              className="flex items-center justify-between py-3 active:bg-gray-50 -mx-4 px-4"
              onClick={() => Taro.navigateTo({ url: '/pages/group-assign/index' })}
            >
              <View className="flex items-center">
                <ArrowRightLeft size={18} color="#6B7280" />
                <Text className="text-sm text-gray-800 ml-3">任务分组划分</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" />
            </View>
          </CardContent>
        </Card>

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

      {/* 选择上级对话框 */}
      {showManagerDialog && (
        <Dialog open={showManagerDialog} onOpenChange={setShowManagerDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>选择直属上级</DialogTitle>
            </DialogHeader>
            
            {/* 搜索框 */}
            <View className="bg-gray-100 rounded-lg px-3 py-2 flex items-center mb-3">
              <Search size={18} color="#9CA3AF" />
              <View className="flex-1 ml-2">
                <Input
                  type="text"
                  placeholder="搜索用户"
                  className="bg-transparent border-0 h-8"
                  value={searchKeyword}
                  onInput={(e) => searchUsers(e.detail.value)}
                />
              </View>
              {searchKeyword && (
                <View onClick={() => searchUsers('')} className="px-2">
                  <X size={18} color="#9CA3AF" />
                </View>
              )}
            </View>
            
            {/* 用户列表 */}
            <View className="max-h-80 overflow-y-auto">
              {managerLoading ? (
                <View className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <View key={i} className="flex items-center py-2">
                      <Skeleton className="w-10 h-10 rounded-full mr-3" />
                      <Skeleton className="h-4 w-20" />
                    </View>
                  ))}
                </View>
              ) : managerList.length === 0 ? (
                <View className="text-center py-8">
                  <Text className="text-gray-400">暂无用户</Text>
                </View>
              ) : (
                managerList.map((user) => (
                  <View
                    key={user.openid}
                    className="flex items-center py-3 px-2 border-b border-gray-100 active:bg-gray-50"
                    onClick={() => selectManager(user)}
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Text className="text-blue-500 font-semibold">{user.nickname[0]}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-800">{user.nickname}</Text>
                      {user.manager_name && (
                        <Text className="text-xs text-gray-400">上级：{user.manager_name}</Text>
                      )}
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" />
                  </View>
                ))
              )}
            </View>
          </DialogContent>
        </Dialog>
      )}
    </View>
  );
}
