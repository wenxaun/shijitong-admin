import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback, useRef } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { Team, CloudResponse } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, Users, Search, UserPlus } from 'lucide-react-taro';

export default function TeamPage() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const isFirstLoad = useRef(true);
  const isLoadingRef = useRef(false);

  const loadTeams = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    const currentOpenid = openid || useUserStore.getState().openid;
    if (!currentOpenid) {
      setLoading(false);
      return;
    }

    isLoadingRef.current = true;
    setLoading(teams.length === 0);
    
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
        let teamList = JSON.parse(storedTeams);
        
        if (teamList.length === 0) {
          teamList = [
            { 
              _id: '1', 
              name: '产品研发组', 
              leader_id: currentOpenid, 
              leader_name: '我',
              members: [currentOpenid, 'user2', 'user3'], 
              member_details: [
                { openid: currentOpenid, nickname: '我', role: 'owner', joined_at: new Date().toISOString() },
                { openid: 'user2', nickname: '张三', role: 'admin', joined_at: new Date().toISOString() },
                { openid: 'user3', nickname: '李四', role: 'member', joined_at: new Date().toISOString() }
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
                { openid: 'other', nickname: '王五', role: 'owner', joined_at: new Date().toISOString() },
                { openid: currentOpenid, nickname: '我', role: 'member', joined_at: new Date().toISOString() }
              ],
              created_at: new Date().toISOString() 
            }
          ];
          Taro.setStorageSync('mock_teams', JSON.stringify(teamList));
        }
        
        setTeams(teamList);
        return;
      }

      const res = await callFunction<CloudResponse<{ teams: Team[] }>>('team-list', {});
      if (res.success && res.data) {
        setTeams(res.data.teams || []);
      }
    } catch (err) {
      console.error('[Team] 加载团队失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [openid, teams.length]);

  useEffect(() => {
    if (openid) {
      loadTeams();
    } else {
      const storeOpenid = useUserStore.getState().openid;
      if (storeOpenid) {
        loadTeams();
      } else {
        setLoading(false);
      }
    }
  }, [openid, loadTeams]);

  Taro.useDidShow(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const storeOpenid = useUserStore.getState().openid;
    if (storeOpenid && !isLoadingRef.current) {
      loadTeams();
    }
  });

  // 创建团队
  const createTeam = () => {
    Taro.navigateTo({ url: '/pages/team-edit/index' });
  };

  // 加入团队
  const joinTeam = () => {
    Taro.navigateTo({ url: '/pages/team-join/index' });
  };

  // 跳转团队详情
  const goTeamDetail = (teamId: string) => {
    Taro.navigateTo({ url: `/pages/team-edit/index?id=${teamId}` });
  };

  // 过滤团队
  const filteredTeams = teams;

  // 分享配置
  Taro.useShareAppMessage(() => ({
    title: '邀请你加入我的团队',
    path: '/pages/team-join/index'
  }));

  // 渲染团队项（微信通讯录风格）
  const renderTeamItem = (team: Team) => {
    const isLeader = team.leader_id === openid;
    const memberCount = team.members?.length || 0;
    const myRole = team.member_details?.find(m => m.openid === openid)?.role || 'member';

    return (
      <View
        key={team._id}
        className="flex items-center px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50"
        onClick={() => goTeamDetail(team._id)}
      >
        {/* 团队头像 */}
        <View className={`w-12 h-12 rounded-lg flex items-center justify-center mr-3 ${isLeader ? 'bg-green-500' : 'bg-blue-500'}`}>
          <Text className="text-white text-lg font-semibold">{team.name[0]}</Text>
        </View>
        
        {/* 团队信息 */}
        <View className="flex-1 min-w-0">
          <View className="flex items-center gap-2">
            <Text className="text-base text-gray-900 truncate">{team.name}</Text>
            {isLeader && (
              <View className="px-2 py-1 bg-orange-50 rounded">
                <Text className="text-xs text-orange-500">创建者</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-400 mt-1">{memberCount} 人</Text>
        </View>
        
        {/* 右侧角色标签 */}
        {!isLeader && (
          <View className="px-2 py-1 bg-gray-100 rounded mr-2">
            <Text className="text-xs text-gray-500">
              {myRole === 'admin' ? '管理员' : '成员'}
            </Text>
          </View>
        )}
        
        <ChevronRight size={20} color="#D1D5DB" />
      </View>
    );
  };

  return (
    <View className="min-h-screen bg-gray-100">
      {/* 搜索栏 */}
      <View className="bg-gray-100 px-3 py-2">
        <View className="bg-white rounded-lg px-3 py-2 flex items-center">
          <Search size={18} color="#9CA3AF" />
          <Text className="text-gray-400 text-sm ml-2">搜索团队</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        scrollY 
        style={{ height: 'calc(100vh - 52px - 60px)' }}
      >
        {/* 功能入口 */}
        <View className="bg-white mb-2">
          {/* 创建团队 */}
          <View 
            className="flex items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
            onClick={createTeam}
          >
            <View className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center mr-3">
              <Plus size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base text-gray-900">创建团队</Text>
              <Text className="text-xs text-gray-400 mt-1">创建新团队开始协作</Text>
            </View>
            <ChevronRight size={20} color="#D1D5DB" />
          </View>
          
          {/* 加入团队 */}
          <View 
            className="flex items-center px-4 py-3 active:bg-gray-50"
            onClick={joinTeam}
          >
            <View className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center mr-3">
              <UserPlus size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base text-gray-900">加入团队</Text>
              <Text className="text-xs text-gray-400 mt-1">通过邀请码加入团队</Text>
            </View>
            <ChevronRight size={20} color="#D1D5DB" />
          </View>
        </View>

        {/* 团队列表标题 */}
        {filteredTeams.length > 0 && (
          <View className="px-4 py-2 bg-gray-100">
            <Text className="text-sm text-gray-500">我的团队</Text>
          </View>
        )}

        {/* 团队列表 */}
        <View className="bg-white">
          {loading ? (
            <View className="px-4 py-3">
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex items-center py-3 border-b border-gray-100">
                  <Skeleton className="w-12 h-12 rounded-lg mr-3" />
                  <View className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredTeams.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-16">
              <View className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users size={32} color="#D1D5DB" />
              </View>
              <Text className="text-gray-500 mb-1">暂无团队</Text>
              <Text className="text-gray-400 text-sm">创建或加入团队开始协作</Text>
            </View>
          ) : (
            filteredTeams.map(renderTeamItem)
          )}
        </View>

        {/* 底部提示 */}
        {filteredTeams.length > 0 && (
          <View className="py-4 text-center">
            <Text className="text-sm text-gray-400">共 {filteredTeams.length} 个团队</Text>
          </View>
        )}

        {/* 底部安全区 */}
        <View className="h-16" />
      </ScrollView>
    </View>
  );
}
