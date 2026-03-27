import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowRight } from 'lucide-react-taro';

export default function TeamJoinPage() {
  const { openid } = useUserStore();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{
    team_id: string;
    team_name: string;
    inviter_name: string;
  } | null>(null);

  // 查询邀请码
  const handleQueryInvite = async () => {
    if (!inviteCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{
        team_id: string;
        team_name: string;
        inviter_name: string;
      }>>('team-invite', {
        action: 'query',
        invite_code: inviteCode.trim()
      });

      if (res.success && res.data) {
        setTeamInfo(res.data);
      } else {
        Taro.showToast({ title: res.message || '邀请码无效', icon: 'none' });
      }
    } catch (err) {
      console.error('查询邀请码失败:', err);
      Taro.showToast({ title: '查询失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // 加入团队
  const handleJoinTeam = async () => {
    if (!teamInfo || !openid) return;

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse>('team-invite', {
        action: 'join',
        invite_code: inviteCode.trim(),
        user_id: openid
      });

      if (res.success) {
        Taro.showToast({ title: '加入成功', icon: 'success' });
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/team/index' });
        }, 1500);
      } else {
        Taro.showToast({ title: res.message || '加入失败', icon: 'none' });
      }
    } catch (err) {
      console.error('加入团队失败:', err);
      Taro.showToast({ title: '加入失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {/* 标题 */}
      <View className="mb-6">
        <Text className="block text-xl font-semibold text-gray-900 mb-2">加入团队</Text>
        <Text className="block text-sm text-gray-500">请输入团队邀请码加入团队</Text>
      </View>

      {/* 输入邀请码 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <View className="flex items-center gap-3">
            <View className="flex-1">
              <Input
                value={inviteCode}
                onInput={(e) => setInviteCode(e.detail.value.toUpperCase())}
                placeholder="请输入邀请码"
                className="text-center tracking-widest text-lg font-mono"
                maxlength={8}
              />
            </View>
            <Button
              onClick={handleQueryInvite}
              disabled={loading || !inviteCode.trim()}
            >
              {loading ? <Skeleton className="w-12 h-5" /> : '查询'}
            </Button>
          </View>
        </CardContent>
      </Card>

      {/* 团队信息 */}
      {teamInfo && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={20} color="#1377EB" />
              <Text>团队信息</Text>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <View className="space-y-2">
              <View className="flex justify-between">
                <Text className="text-gray-500">团队名称</Text>
                <Text className="font-medium">{teamInfo.team_name}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">邀请人</Text>
                <Text className="font-medium">{teamInfo.inviter_name}</Text>
              </View>
            </View>

            <Button
              className="w-full mt-4"
              onClick={handleJoinTeam}
              disabled={loading}
            >
              <View className="flex items-center gap-2">
                <Text>确认加入</Text>
                <ArrowRight size={16} color="white" />
              </View>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 提示 */}
      <View className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <Text className="block text-sm text-amber-700">
          邀请码由团队管理员生成，请向团队管理员获取邀请码。
        </Text>
      </View>
    </View>
  );
}
