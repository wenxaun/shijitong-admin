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
import { Plus, ChevronRight, Users, Crown, Shield, User, Share2 } from 'lucide-react-taro';

export default function TeamPage() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // 组件渲染时立即输出
  console.log('===== TeamPage 组件渲染 =====');
  console.log('[TeamPage] 当前时间:', new Date().toISOString());
  console.log('[TeamPage] hook openid:', openid);
  console.log('[TeamPage] store openid:', useUserStore.getState().openid);

  const loadTeams = useCallback(async () => {
    console.log('===== loadTeams 开始 =====');
    
    // 优先使用 hook 返回的 openid，否则从 store 获取
    const currentOpenid = openid || useUserStore.getState().openid;
    console.log('[Team] openid:', openid);
    console.log('[Team] currentOpenid:', currentOpenid);
    
    if (!currentOpenid) {
      console.log('[Team] openid 为空，跳过加载');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        console.log('[Team] H5 端使用模拟数据');
        // 从本地存储读取团队数据
        const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
        let teamList = JSON.parse(storedTeams);
        
        // 如果没有团队数据，初始化默认团队
        if (teamList.length === 0) {
          teamList = [
            { 
              _id: '1', 
              name: '产品研发组', 
              leader_id: currentOpenid, 
              leader_name: '我',
              members: [currentOpenid, 'user2', 'user3'], 
              member_details: [
                { openid: currentOpenid, nickname: '我', role: 'owner', permissions: { can_create_task: true, can_assign_task: true, can_view_all_tasks: true, can_edit_team: true, can_invite_member: true, can_remove_member: true }, joined_at: new Date().toISOString() },
                { openid: 'user2', nickname: '张三', role: 'admin', permissions: { can_create_task: true, can_assign_task: true, can_view_all_tasks: true, can_edit_team: false, can_invite_member: true, can_remove_member: false }, joined_at: new Date().toISOString() },
                { openid: 'user3', nickname: '李四', role: 'member', permissions: { can_create_task: true, can_assign_task: false, can_view_all_tasks: false, can_edit_team: false, can_invite_member: false, can_remove_member: false }, joined_at: new Date().toISOString() }
              ],
              created_at: new Date().toISOString() 
            },
            { 
              _id: '2', 
              name: '运营团队', 
              leader_id: 'other', 
              leader_name: '王五',
              members: [currentOpenid, 'other'], 
              member_details: [
                { openid: 'other', nickname: '王五', role: 'owner', permissions: { can_create_task: true, can_assign_task: true, can_view_all_tasks: true, can_edit_team: true, can_invite_member: true, can_remove_member: true }, joined_at: new Date().toISOString() },
                { openid: currentOpenid, nickname: '我', role: 'member', permissions: { can_create_task: true, can_assign_task: false, can_view_all_tasks: false, can_edit_team: false, can_invite_member: false, can_remove_member: false }, joined_at: new Date().toISOString() }
              ],
              created_at: new Date().toISOString() 
            }
          ];
          // 保存默认团队到本地存储
          Taro.setStorageSync('mock_teams', JSON.stringify(teamList));
        }
        
        setTeams(teamList);
        setLoading(false);
        return;
      }

      console.log('[Team] 调用 team-list 云函数...');
      const res = await callFunction<CloudResponse<{ teams: Team[] }>>(
        'team-list',
        {}
      );

      console.log('[Team] team-list 返回:', JSON.stringify(res));

      if (res.success && res.data) {
        console.log('[Team] 获取到团队数量:', res.data.teams?.length || 0);
        setTeams(res.data.teams || []);
      } else {
        console.error('[Team] 获取团队失败:', res.message);
      }
    } catch (err) {
      console.error('[Team] 加载团队失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      console.log('===== loadTeams 结束 =====');
    }
  }, [openid]);

  // 初始化加载
  useEffect(() => {
    console.log('[Team] useEffect 触发, openid:', openid);
    if (openid) {
      loadTeams();
    } else {
      console.log('[Team] openid 为空，尝试从 store 获取');
      // 尝试从 store 获取最新的 openid
      const storeOpenid = useUserStore.getState().openid;
      console.log('[Team] store 中的 openid:', storeOpenid);
      if (storeOpenid) {
        loadTeams();
      } else {
        setLoading(false);
      }
    }
  }, [openid, loadTeams]);

  // 页面显示时刷新
  Taro.useDidShow(() => {
    console.log('[Team] useDidShow 触发');
    const storeOpenid = useUserStore.getState().openid;
    console.log('[Team] store 中的 openid:', storeOpenid);
    if (storeOpenid) {
      loadTeams();
    } else {
      console.log('[Team] openid 为空，跳过加载');
      setLoading(false);
    }
  });

  // 跳转团队详情
  const goTeamDetail = (teamId: string) => {
    Taro.navigateTo({ url: `/pages/team-edit/index?id=${teamId}` });
  };

  // 创建团队
  const createTeam = () => {
    Taro.navigateTo({ url: '/pages/team-edit/index' });
  };

  // 获取角色图标
  const getRoleIcon = (role: string, isLeader: boolean) => {
    if (isLeader) return Crown;
    if (role === 'admin') return Shield;
    return User;
  };

  // 获取角色颜色
  const getRoleColor = (role: string, isLeader: boolean) => {
    if (isLeader) return { bg: 'bg-orange-50', text: 'text-orange-500' };
    if (role === 'admin') return { bg: 'bg-blue-50', text: 'text-blue-500' };
    return { bg: 'bg-gray-100', text: 'text-gray-500' };
  };

  // 渲染团队卡片
  const renderTeamCard = (team: Team) => {
    const isLeader = team.leader_id === openid;
    const memberCount = team.members?.length || 0;
    const myRole = team.member_details?.find(m => m.openid === openid)?.role || 'member';
    const RoleIcon = getRoleIcon(myRole, isLeader);
    const roleColor = getRoleColor(myRole, isLeader);

    return (
      <Card
        key={team._id}
        className="mb-4 overflow-hidden"
        onClick={() => goTeamDetail(team._id)}
      >
        <CardContent className="p-0">
          {/* 顶部色条 */}
          <View className={`h-1 ${isLeader ? 'bg-blue-500' : 'bg-gray-300'}`} />
          
          <View className="p-4">
            {/* 团队名称 */}
            <View className="flex items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">{team.name}</Text>
                {team.description && (
                  <Text className="text-sm text-gray-400 mt-1" numberOfLines={1}>
                    {team.description}
                  </Text>
                )}
              </View>
              <ChevronRight size={20} color="#D1D5DB" />
            </View>

            {/* 成员信息 */}
            <View className="flex items-center justify-between">
              <View className="flex items-center gap-2">
                <View className="flex items-center gap-1">
                  <Users size={16} color="#9CA3AF" />
                  <Text className="text-sm text-gray-500">{memberCount} 成员</Text>
                </View>
              </View>
              
              <View className="flex items-center gap-2">
                <Badge className={`${roleColor.bg} ${roleColor.text}`}>
                  <RoleIcon size={12} color={roleColor.text === 'text-orange-500' ? '#F97316' : roleColor.text === 'text-blue-500' ? '#1377EB' : '#6B7280'} />
                  <Text className={`ml-1 ${roleColor.text}`}>
                    {isLeader ? '创建者' : myRole === 'admin' ? '管理员' : '成员'}
                  </Text>
                </Badge>
              </View>
            </View>

            {/* 成员头像预览 */}
            {team.member_details && team.member_details.length > 0 && (
              <View className="flex items-center mt-3 pt-3 border-t border-gray-100">
                <View className="flex -space-x-2">
                  {team.member_details.slice(0, 5).map((member, index) => (
                    <View
                      key={member.openid}
                      className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white"
                      style={{ zIndex: 5 - index }}
                    >
                      <Text className="text-xs text-blue-500 font-semibold">
                        {(member.nickname || '未')[0]}
                      </Text>
                    </View>
                  ))}
                  {team.member_details.length > 5 && (
                    <View className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white">
                      <Text className="text-xs text-gray-500">
                        +{team.member_details.length - 5}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex items-center justify-between">
          <Text className="text-lg font-semibold text-gray-800">我的团队</Text>
          <Button size="sm" onClick={createTeam}>
            <Plus size={16} color="#ffffff" />
            <Text className="text-white ml-1">创建团队</Text>
          </Button>
        </View>
      </View>

      <ScrollView className="h-screen" scrollY>
        <View className="px-4 pt-4 pb-24">
          {loading ? (
            <View className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : teams.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users size={36} color="#D1D5DB" />
              </View>
              <Text className="text-gray-500 mb-2">暂无团队</Text>
              <Text className="text-gray-400 text-sm mb-4">创建团队开始协作吧</Text>
              <Button onClick={createTeam}>创建我的第一个团队</Button>
            </View>
          ) : (
            <>
              {teams.map(renderTeamCard)}
              
              {/* 加入团队入口 */}
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="p-4">
                  <View 
                    className="flex items-center justify-center gap-2"
                    onClick={() => {
                      Taro.navigateTo({ url: '/pages/team-join/index' });
                    }}
                  >
                    <Share2 size={20} color="#1377EB" />
                    <Text className="text-blue-500">通过邀请码加入团队</Text>
                  </View>
                </CardContent>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
