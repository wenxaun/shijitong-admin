import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { Team, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, Users } from 'lucide-react-taro';

export default function Team() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);

  const loadTeams = useCallback(async () => {
    if (!openid) return;

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setTeams([
          { _id: '1', name: '产品研发组', leader_id: openid, members: [openid], created_at: new Date().toISOString() },
          { _id: '2', name: '运营团队', leader_id: openid, members: [openid], created_at: new Date().toISOString() }
        ]);
        setLoading(false);
        return;
      }

      const res = await callFunction<CloudResponse<{ teams: Team[] }>>(
        'team-list',
        {}
      );

      if (res.success && res.data) {
        setTeams(res.data.teams || []);
      }
    } catch (err) {
      console.error('加载团队失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [openid]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // 跳转团队详情
  const goTeamDetail = (teamId: string) => {
    Taro.navigateTo({ url: `/pages/team-edit/index?id=${teamId}` });
  };

  // 创建团队
  const createTeam = () => {
    Taro.navigateTo({ url: '/pages/team-edit/index' });
  };

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        {/* 头部操作 */}
        <View className="bg-white px-3 py-2 mb-3 flex items-center justify-between">
          <Text className="text-base font-semibold text-gray-800">我的团队</Text>
          <Button size="sm" onClick={createTeam}>
            <Plus size={16} color="#ffffff" />
            <Text className="text-white ml-1">创建团队</Text>
          </Button>
        </View>

        {/* 团队列表 */}
        <View className="px-3">
          {loading ? (
            <View className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : teams.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <Users size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mb-4 mt-4">暂无团队</Text>
              <Button onClick={createTeam}>创建我的第一个团队</Button>
            </View>
          ) : (
            teams.map((team) => (
              <Card
                key={team._id}
                className="mb-3"
                onClick={() => goTeamDetail(team._id)}
              >
                <CardContent className="p-3">
                  <View className="flex items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">{team.name}</Text>
                      <View className="flex items-center gap-2 mt-2">
                        <Badge className="bg-blue-50 text-blue-600">
                          {team.members?.length || 0} 成员
                        </Badge>
                        {team.leader_id === openid && (
                          <Badge className="bg-orange-50 text-orange-500">管理员</Badge>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={20} color="#9CA3AF" />
                  </View>
                </CardContent>
              </Card>
            ))
          )}
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
