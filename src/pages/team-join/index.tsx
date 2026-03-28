import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse, Team } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Check, CircleAlert, Clock, User } from 'lucide-react-taro';

interface TeamInviteInfo {
  team_id: string;
  team_name: string;
  team_description?: string;
  inviter_name: string;
  member_count: number;
  expires_at?: string;
}

export default function TeamJoinPage() {
  const router = useRouter();
  const { openid } = useUserStore();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [teamInfo, setTeamInfo] = useState<TeamInviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 从 URL 参数获取邀请码
  useEffect(() => {
    const code = router.params.code;
    if (code) {
      setInviteCode(code.toUpperCase());
      // 自动查询
      setTimeout(() => queryInvite(code.toUpperCase()), 100);
    }
  }, [router.params.code]);

  // 查询邀请码
  const queryInvite = async (code?: string) => {
    const queryCode = code || inviteCode.trim();
    
    if (!queryCode) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    // 验证邀请码格式（6位字母数字）
    if (!/^[A-Z0-9]{6}$/i.test(queryCode)) {
      setError('邀请码格式不正确，应为6位字母或数字');
      return;
    }

    setLoading(true);
    setError(null);
    setTeamInfo(null);

    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 模拟邀请码验证
        if (queryCode.toUpperCase() === 'ABC123' || queryCode.toUpperCase() === 'TEST12') {
          setTeamInfo({
            team_id: 'mock_team_1',
            team_name: '产品研发组',
            team_description: '负责产品研发工作，包括前端、后端、设计等',
            inviter_name: '张三',
            member_count: 5,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        } else {
          setError('邀请码无效或已过期');
        }
        setLoading(false);
        return;
      }

      // 小程序端调用云函数
      const res = await callFunction<CloudResponse<TeamInviteInfo>>('team-invite', {
        action: 'query',
        invite_code: queryCode.toUpperCase()
      });

      if (res.success && res.data) {
        setTeamInfo(res.data);
      } else {
        setError(res.message || '邀请码无效或已过期');
      }
    } catch (err) {
      console.error('查询邀请码失败:', err);
      setError('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加入团队
  const handleJoinTeam = async () => {
    if (!teamInfo || !openid) {
      Taro.showToast({ title: '请先查询邀请码', icon: 'none' });
      return;
    }

    setJoining(true);
    try {
      // H5 端模拟
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        // 模拟加入团队
        const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
        const teams: Team[] = JSON.parse(storedTeams);
        
        const teamIndex = teams.findIndex(t => t._id === teamInfo.team_id);
        if (teamIndex >= 0) {
          // 检查是否已是成员
          if (teams[teamIndex].members?.includes(openid)) {
            Taro.showToast({ title: '你已是该团队成员', icon: 'none' });
            setJoining(false);
            return;
          }
          
          // 添加成员
          teams[teamIndex].members = [...(teams[teamIndex].members || []), openid];
          teams[teamIndex].member_details = [
            ...(teams[teamIndex].member_details || []),
            {
              openid,
              nickname: '我',
              role: 'member',
              permissions: {
                can_create_task: true,
                can_assign_task: false,
                can_view_all_tasks: false,
                can_edit_team: false,
                can_invite_member: false,
                can_remove_member: false
              },
              joined_at: new Date().toISOString()
            }
          ];
          Taro.setStorageSync('mock_teams', JSON.stringify(teams));
        }
        
        Taro.showToast({ title: '加入成功', icon: 'success' });
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/team/index' });
        }, 1500);
        setJoining(false);
        return;
      }

      // 小程序端调用云函数
      const res = await callFunction<CloudResponse>('team-invite', {
        action: 'join',
        invite_code: inviteCode.trim().toUpperCase(),
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
      Taro.showToast({ title: '加入失败，请稍后重试', icon: 'none' });
    } finally {
      setJoining(false);
    }
  };

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        <View className="p-4">
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
                    onInput={(e) => {
                      setInviteCode(e.detail.value.toUpperCase());
                      setError(null);
                      setTeamInfo(null);
                    }}
                    placeholder="请输入6位邀请码"
                    className="text-center tracking-widest text-lg font-mono"
                    maxlength={6}
                  />
                </View>
                <Button
                  onClick={() => queryInvite()}
                  disabled={loading || !inviteCode.trim()}
                >
                  {loading ? <Skeleton className="w-12 h-5" /> : '查询'}
                </Button>
              </View>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <View className="flex items-center gap-2">
                  <CircleAlert size={20} color="#EA4335" />
                  <Text className="text-red-500">{error}</Text>
                </View>
              </CardContent>
            </Card>
          )}

          {/* 团队信息 */}
          {teamInfo && (
            <Card className="mb-4 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check size={20} color="#00B365" />
                  <Text>找到团队</Text>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* 团队名称 */}
                <View className="mb-4">
                  <Text className="text-xl font-semibold text-gray-800">{teamInfo.team_name}</Text>
                  {teamInfo.team_description && (
                    <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                      {teamInfo.team_description}
                    </Text>
                  )}
                </View>

                {/* 团队信息 */}
                <View className="space-y-2 mb-4">
                  <View className="flex items-center justify-between py-2 border-b border-blue-100">
                    <View className="flex items-center gap-2">
                      <User size={16} color="#6B7280" />
                      <Text className="text-gray-500">邀请人</Text>
                    </View>
                    <Text className="font-medium text-gray-800">{teamInfo.inviter_name}</Text>
                  </View>
                  <View className="flex items-center justify-between py-2 border-b border-blue-100">
                    <View className="flex items-center gap-2">
                      <Users size={16} color="#6B7280" />
                      <Text className="text-gray-500">团队成员</Text>
                    </View>
                    <Badge className="bg-blue-100 text-blue-600">{teamInfo.member_count} 人</Badge>
                  </View>
                  {teamInfo.expires_at && (
                    <View className="flex items-center justify-between py-2">
                      <View className="flex items-center gap-2">
                        <Clock size={16} color="#6B7280" />
                        <Text className="text-gray-500">有效期至</Text>
                      </View>
                      <Text className="text-sm text-gray-600">
                        {new Date(teamInfo.expires_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 加入按钮 */}
                <Button
                  className="w-full"
                  onClick={handleJoinTeam}
                  disabled={joining}
                >
                  <View className="flex items-center gap-2">
                    <Text className="text-white">{joining ? '加入中...' : '确认加入'}</Text>
                    {!joining && <ArrowRight size={16} color="white" />}
                  </View>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 提示 */}
          <View className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Text className="block text-sm text-amber-700 leading-relaxed">
              💡 邀请码由团队管理员生成，请向团队管理员获取邀请码。{'\n'}
              邀请码通常为6位字母和数字组合，例如：ABC123。
            </Text>
          </View>
          
          {/* 底部留白 */}
          <View className="h-24" />
        </View>
      </ScrollView>
    </View>
  );
}
