import Taro, { useState, useEffect } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { Network } from '@/network';
import { configManager, AppConfig } from '@/utils/configManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, RefreshCw, History } from 'lucide-react-taro';

/**
 * 配置管理页面
 * 供管理员管理应用配置
 */
export default function ConfigAdminPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    loadConfig();
    loadVersions();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await configManager.loadConfig(true);
      setConfig(data);
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const res = await Network.request({
        url: '/api/config/versions',
        method: 'GET',
      });

      if (res.statusCode === 200) {
        setVersions(res.data || []);
      }
    } catch (error) {
      console.error('加载版本失败:', error);
    }
  };

  const updateConfig = async (id: string, value: any) => {
    setSaving(true);
    try {
      const res = await Network.request({
        url: `/api/config/records/${id}`,
        method: 'PUT',
        data: { value, operator: 'admin' },
      });

      if (res.statusCode === 200 && res.data.success) {
        // 刷新配置
        await loadConfig();
        await loadVersions();
      }
    } catch (error) {
      console.error('更新配置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const rollback = async (versionId: string) => {
    // 使用 Taro.showModal 替代 confirm
    Taro.showModal({
      title: '确认回滚',
      content: '确定要回滚到这个版本吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await Network.request({
              url: `/api/config/versions/${versionId}/rollback`,
              method: 'POST',
              data: { operator: 'admin' },
            });

            if (response.statusCode === 200 && response.data.success) {
              Taro.showToast({
                title: '回滚成功',
                icon: 'success',
              });
              await loadConfig();
              await loadVersions();
            }
          } catch (error) {
            console.error('回滚失败:', error);
            Taro.showToast({
              title: '回滚失败',
              icon: 'error',
            });
          }
        }
      },
    });
  };

  if (loading || !config) {
    return (
      <View className="flex items-center justify-center h-full">
        <Text className="text-gray-500">加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="h-full bg-gray-50">
      <View className="p-4 pb-8">
        {/* 页面标题 */}
        <View className="flex items-center justify-between mb-4">
          <View className="flex items-center gap-2">
            <Settings size={24} color="#1890ff" />
            <Text className="text-xl font-bold">配置管理</Text>
          </View>
          <View className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadConfig();
                loadVersions();
              }}
            >
              <RefreshCw size={16} color="#666" />
            </Button>
          </View>
        </View>

        {/* 版本信息 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <View className="flex justify-between items-center">
              <View>
                <Text className="text-sm text-gray-500">配置版本</Text>
                <Text className="text-lg font-semibold mt-1">{config._version}</Text>
              </View>
              <View>
                <Text className="text-sm text-gray-500">更新时间</Text>
                <Text className="text-sm mt-1">
                  {new Date(config._updatedAt).toLocaleString()}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 系统配置 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">系统配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfigItem
              label="环境标识"
              value={config.system.environment}
              onChange={(value) => updateConfig('system-environment', value)}
            />
            <ConfigItem
              label="API 超时时间 (ms)"
              value={config.system.apiTimeout}
              type="number"
              onChange={(value) => updateConfig('system-apiTimeout', Number(value))}
            />
          </CardContent>
        </Card>

        {/* 功能开关 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">功能开关</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchItem
              label="任务审核"
              value={config.features.taskReview}
              onChange={(value) => updateConfig('feature-taskReview', value)}
            />
            <SwitchItem
              label="组织架构同步"
              value={config.features.orgSync}
              onChange={(value) => updateConfig('feature-orgSync', value)}
            />
            <SwitchItem
              label="企微消息推送"
              value={config.features.wecomNotify}
              onChange={(value) => updateConfig('feature-wecomNotify', value)}
            />
            <SwitchItem
              label="语音输入"
              value={config.features.voiceInput}
              onChange={(value) => updateConfig('feature-voiceInput', value)}
            />
            <SwitchItem
              label="任务流转"
              value={config.features.taskTransfer}
              onChange={(value) => updateConfig('feature-taskTransfer', value)}
            />
            <SwitchItem
              label="AI 分析"
              value={config.features.aiAnalysis}
              onChange={(value) => updateConfig('feature-aiAnalysis', value)}
            />
            <SwitchItem
              label="统计功能"
              value={config.features.statistics}
              onChange={(value) => updateConfig('feature-statistics', value)}
            />
          </CardContent>
        </Card>

        {/* 业务规则 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">业务规则</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfigItem
              label="每日最大任务数"
              value={config.business.maxTasksPerDay}
              type="number"
              onChange={(value) => updateConfig('business-maxTasksPerDay', Number(value))}
            />
            <ConfigItem
              label="每任务最大子任务数"
              value={config.business.maxSubtasksPerTask}
              type="number"
              onChange={(value) => updateConfig('business-maxSubtasksPerTask', Number(value))}
            />
            <ConfigItem
              label="任务自动归档天数"
              value={config.business.taskAutoArchiveDays}
              type="number"
              onChange={(value) => updateConfig('business-taskAutoArchiveDays', Number(value))}
            />
            <ConfigItem
              label="团队最大成员数"
              value={config.business.maxTeamMembers}
              type="number"
              onChange={(value) => updateConfig('business-maxTeamMembers', Number(value))}
            />
            <ConfigItem
              label="任务自动关闭小时数"
              value={config.business.taskAutoCloseHours}
              type="number"
              onChange={(value) => updateConfig('business-taskAutoCloseHours', Number(value))}
            />
          </CardContent>
        </Card>

        {/* 文案配置 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">文案配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfigItem
              label="应用名称"
              value={config.texts.appName}
              onChange={(value) => updateConfig('text-appName', value)}
            />
            <ConfigItem
              label="欢迎文案"
              value={config.texts.welcomeText}
              onChange={(value) => updateConfig('text-welcomeText', value)}
            />
          </CardContent>
        </Card>

        {/* 版本历史 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History size={20} color="#666" />
              版本历史
            </CardTitle>
          </CardHeader>
          <CardContent>
            {versions.length === 0 ? (
              <Text className="text-gray-500 text-center py-4">暂无历史版本</Text>
            ) : (
              <View className="space-y-3">
                {versions.slice(0, 10).map((version, index) => (
                  <View key={version.id} className="border rounded-lg p-3 bg-white">
                    <View className="flex justify-between items-start mb-2">
                      <View>
                        <Text className="font-semibold">{version.version}</Text>
                        <Text className="text-xs text-gray-500 ml-2">
                          {version.comment}
                        </Text>
                      </View>
                      <Badge variant="outline">
                        {version.changes.length} 个变更
                      </Badge>
                    </View>
                    <View className="flex justify-between items-center">
                      <Text className="text-xs text-gray-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </Text>
                      {index > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rollback(version.id)}
                        >
                          回滚
                        </Button>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

        {saving && (
          <View className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <Text className="text-center text-gray-500">保存中...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * 配置项组件
 */
function ConfigItem({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string;
  value: any;
  type?: 'text' | 'number';
  onChange: (value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  useEffect(() => {
    setTempValue(String(value));
  }, [value]);

  const handleSave = () => {
    const parsed = type === 'number' ? Number(tempValue) : tempValue;
    onChange(parsed);
    setEditing(false);
  };

  return (
    <View className="flex justify-between items-center py-2">
      <Text className="text-sm">{label}</Text>
      {editing ? (
        <View className="flex gap-2">
          <Input
            className="w-32"
            value={tempValue}
            type={type}
            onInput={(e) => setTempValue(e.detail.value)}
            onBlur={handleSave}
          />
        </View>
      ) : (
        <View className="flex items-center gap-2">
          <Text className="text-sm font-medium">{String(value)}</Text>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Text className="text-xs text-blue-500">修改</Text>
          </Button>
        </View>
      )}
    </View>
  );
}

/**
 * 开关项组件
 */
function SwitchItem({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex justify-between items-center py-2">
      <Text className="text-sm">{label}</Text>
      <Switch checked={value} onCheckedChange={onChange} />
    </View>
  );
}
