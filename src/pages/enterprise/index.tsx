// 企业信息页面
import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import { Card, CardContent } from '@/components/ui/card';
import { Button as UIButton } from '@/components/ui/button';
import { Building2 } from 'lucide-react-taro';
import type { CloudResponse } from '@/types';

export default function Enterprise() {
  const { openid, userInfo } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [enterpriseInfo, setEnterpriseInfo] = useState<any>(null);
  const [enterpriseMembers, setEnterpriseMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    loadEnterpriseInfo();
  }, []);

  const loadEnterpriseInfo = async () => {
    if (userInfo?.user_type !== 'enterprise') {
      setLoading(false);
      return;
    }

    try {
      const result = await callFunction<CloudResponse<{
        enterprise: any;
        members: any[];
        departments: any[];
      }>>('enterprise-info', {
        openid
      });

      if (result.success && result.data) {
        setEnterpriseInfo(result.data.enterprise);
        setEnterpriseMembers(result.data.members || []);
        setDepartments(result.data.departments || []);
      }
    } catch (error) {
      console.error('[Enterprise] 加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 如果不是企业用户，显示提示
  if (userInfo?.user_type !== 'enterprise') {
    return (
      <View className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8">
        <View className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Building2 size={32} color="#9CA3AF" />
        </View>
        <Text className="text-base text-gray-700 font-medium mb-2">企业功能</Text>
        <Text className="text-sm text-gray-400 text-center mb-6">
          此功能仅企业微信用户可用，请在企业微信中打开小程序
        </Text>
        <UIButton className="w-full max-w-xs bg-gray-100 text-gray-400">
          功能暂不可用
        </UIButton>
      </View>
    );
  }

  // 加载中
  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="text-gray-400">加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView scrollY className="bg-gray-50 h-full">
      {/* 企业基本信息 */}
      <Card className="mx-4 mt-4 mb-3">
        <CardContent className="p-4">
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Building2 size={32} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800 mb-1">
                {enterpriseInfo?.name || '我的企业'}
              </Text>
              <Text className="text-sm text-gray-500">
                成员 {enterpriseMembers.length} 人
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* 企业成员 */}
      <Card className="mx-4 mb-3">
        <CardContent className="p-4">
          <Text className="text-base font-semibold text-gray-800 mb-3">企业成员</Text>
          
          {enterpriseMembers.length === 0 ? (
            <Text className="text-sm text-gray-400 text-center py-8">
              暂无企业成员
            </Text>
          ) : (
            <View className="space-y-3">
              {enterpriseMembers.map((member, index) => (
                <View key={index} className="flex items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Text className="text-sm font-medium text-blue-600">
                      {member.nickname?.[0] || '用'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-700">{member.nickname}</Text>
                    <Text className="text-xs text-gray-400">
                      {member.department_name || '未设置部门'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* 企业部门 */}
      {departments.length > 0 && (
        <Card className="mx-4 mb-3">
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">组织架构</Text>
            <View className="space-y-2">
              {departments.map((dept, index) => (
                <View key={index} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                  <Building2 size={16} color="#9CA3AF" />
                  <Text className="text-sm text-gray-700">{dept.name}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}
