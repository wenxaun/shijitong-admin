import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback, useRef } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { Team, CloudResponse } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, ChevronRight, Users, Search, UserPlus, Building, X, Loader, RefreshCw } from 'lucide-react-taro';

type TabType = 'team' | 'enterprise';

interface SearchResult {
  type: 'team' | 'member';
  team: Team;
  member?: {
    openid: string;
    nickname: string;
    role: string;
  };
}

export default function TeamPage() {
  const { openid, userInfo } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('team');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const isFirstLoad = useRef(true);
  const isLoadingRef = useRef(false);
  
  // 企业相关状态
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);
  const [enterpriseInfo, setEnterpriseInfo] = useState<any>(null);

  const loadTeams = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    const currentOpenid = openid || useUserStore.getState().openid;
    if (!currentOpenid) {
      setLoading(false);
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    
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
            },
            { 
              _id: '3', 
              name: '市场营销部', 
              leader_id: 'user4', 
              leader_name: '赵六',
              members: [currentOpenid, 'user4', 'user5'], 
              member_details: [
                { openid: 'user4', nickname: '赵六', role: 'owner', joined_at: new Date().toISOString() },
                { openid: 'user5', nickname: '孙七', role: 'admin', joined_at: new Date().toISOString() },
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
  }, [openid]);

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
      if (currentTab === 'team') {
        loadTeams();
      } else {
        loadEnterpriseInfo();
      }
    }
  });

  // 加载企业信息
  const loadEnterpriseInfo = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setEnterpriseLoading(true);

    try {
      // 如果不是企业用户，显示提示
      if (userInfo?.user_type !== 'enterprise') {
        setEnterpriseInfo(null);
        return;
      }

      // 调用云函数获取企业信息
      const result = await callFunction<CloudResponse<{
        enterprise: any;
        members: any[];
        departments: any[];
      }>>('enterprise-info', {
        openid
      });

      if (result.success && result.data) {
        setEnterpriseInfo(result.data.enterprise);
      } else {
        setEnterpriseInfo(null);
      }
    } catch (error) {
      console.error('[Team] 加载企业信息失败:', error);
      setEnterpriseInfo(null);
    } finally {
      setEnterpriseLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 同步企业数据
  const syncEnterpriseData = async () => {
    Taro.showLoading({ title: '同步中...' });

    try {
      const result = await callFunction<CloudResponse<{
        corp_name: string;
        member_count: number;
        department_count: number;
      }>>('wecom-sync-org', {
        action: 'sync'
      });

      Taro.hideLoading();

      if (result.success && result.data) {
        setEnterpriseInfo(result.data);
        Taro.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        Taro.showToast({
          title: result.message || '同步失败',
          icon: 'none'
        });
      }
    } catch (error) {
      Taro.hideLoading();
      console.error('[Team] 同步企业数据失败:', error);
      Taro.showToast({
        title: '同步失败',
        icon: 'none'
      });
    }
  };

  // 监听 tab 切换
  useEffect(() => {
    if (currentTab === 'enterprise' && !enterpriseInfo && !enterpriseLoading) {
      loadEnterpriseInfo();
    }
  }, [currentTab]);

  // 搜索功能
  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    
    if (!keyword.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const results: SearchResult[] = [];
    const lowerKeyword = keyword.toLowerCase().trim();
    
    teams.forEach(team => {
      // 搜索团队名称
      if (team.name.toLowerCase().includes(lowerKeyword)) {
        results.push({
          type: 'team',
          team: team
        });
      }
      
      // 搜索团队成员
      if (team.member_details) {
        team.member_details.forEach(member => {
          // 搜索用户昵称
          if (member.nickname.toLowerCase().includes(lowerKeyword)) {
            // 检查是否已经添加过这个结果
            const exists = results.some(
              r => r.type === 'member' && r.team._id === team._id && r.member?.openid === member.openid
            );
            if (!exists) {
              results.push({
                type: 'member',
                team: team,
                member: {
                  openid: member.openid,
                  nickname: member.nickname,
                  role: member.role
                }
              });
            }
          }
          
          // 搜索用户ID（openid后8位）
          const shortId = member.openid.slice(-8).toLowerCase();
          if (shortId.includes(lowerKeyword)) {
            const exists = results.some(
              r => r.type === 'member' && r.team._id === team._id && r.member?.openid === member.openid
            );
            if (!exists) {
              results.push({
                type: 'member',
                team: team,
                member: {
                  openid: member.openid,
                  nickname: member.nickname,
                  role: member.role
                }
              });
            }
          }
        });
      }
    });
    
    setSearchResults(results);
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchKeyword('');
    setIsSearching(false);
    setSearchResults([]);
  };

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

  // 渲染搜索结果项
  const renderSearchResultItem = (result: SearchResult) => {
    if (result.type === 'team') {
      return renderTeamItem(result.team);
    }
    
    // 成员搜索结果
    const team = result.team;
    const member = result.member!;
    
    return (
      <View
        key={`${team._id}_${member.openid}`}
        className="flex items-center px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50"
        onClick={() => goTeamDetail(team._id)}
      >
        {/* 成员头像 */}
        <View className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
          <Text className="text-blue-500 text-lg font-semibold">{member.nickname[0]}</Text>
        </View>
        
        {/* 成员信息 */}
        <View className="flex-1 min-w-0">
          <View className="flex items-center gap-2">
            <Text className="text-base text-gray-900">{member.nickname}</Text>
            <View className="px-2 py-1 bg-gray-100 rounded">
              <Text className="text-xs text-gray-500">
                {member.role === 'owner' ? '创建者' : member.role === 'admin' ? '管理员' : '成员'}
              </Text>
            </View>
          </View>
          <View className="flex items-center gap-1 mt-1">
            <Users size={12} color="#9CA3AF" />
            <Text className="text-sm text-gray-400">{team.name}</Text>
          </View>
        </View>
        
        <ChevronRight size={20} color="#D1D5DB" />
      </View>
    );
  };

  // 渲染企业页面
  const renderEnterpriseContent = () => { return (
    <View className="flex-1">
      {/* 功能入口 */}
      <View className="bg-white mb-2">
        <View
          className="flex items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
          onClick={() => Taro.navigateTo({ url: '/pages/org-tree/index' })}
        >
          <View className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center mr-3">
            <Building size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-base text-gray-900">组织架构</Text>
            <Text className="text-xs text-gray-400 mt-1">查看企业组织架构</Text>
          </View>
          <ChevronRight size={20} color="#D1D5DB" />
        </View>

        <View
          className="flex items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
          onClick={() => Taro.navigateTo({ url: '/pages/enterprise/index' })}
        >
          <View className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center mr-3">
            <Users size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-base text-gray-900">企业成员</Text>
            <Text className="text-xs text-gray-400 mt-1">
              {enterpriseInfo?.member_count ? `${enterpriseInfo.member_count} 位成员` : '查看企业成员'}
            </Text>
          </View>
          <ChevronRight size={20} color="#D1D5DB" />
        </View>

        <View
          className="flex items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
          onClick={() => syncEnterpriseData()}
        >
          <View className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center mr-3">
            <RefreshCw size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-base text-gray-900">同步企业数据</Text>
            <Text className="text-xs text-gray-400 mt-1">从企业微信同步最新信息</Text>
          </View>
          <ChevronRight size={20} color="#D1D5DB" />
        </View>
      </View>

      {/* 企业概览 */}
      {enterpriseInfo && (
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="text-base font-medium text-gray-900">企业概览</Text>
          </View>
          <View className="px-4 py-4">
            <View className="flex items-center mb-4">
              <Text className="text-sm text-gray-500 w-24">企业名称</Text>
              <Text className="text-sm text-gray-900 flex-1">{enterpriseInfo.corp_name}</Text>
            </View>
            <View className="flex items-center mb-4">
              <Text className="text-sm text-gray-500 w-24">成员数量</Text>
              <Text className="text-sm text-gray-900 flex-1">{enterpriseInfo.member_count} 人</Text>
            </View>
            <View className="flex items-center">
              <Text className="text-sm text-gray-500 w-24">部门数量</Text>
              <Text className="text-sm text-gray-900 flex-1">{enterpriseInfo.department_count} 个</Text>
            </View>
          </View>
        </View>
      )}

      {/* 提示信息 */}
      <View className="px-4 py-8">
        <View className="bg-blue-50 rounded-lg p-4">
          <Text className="text-sm text-blue-600 font-medium mb-2">企业微信接入说明</Text>
          <Text className="text-xs text-blue-500 leading-relaxed">
            1. 小程序需先提交审核并通过上线{'\n'}
            2. 在企业微信管理后台关联小程序{'\n'}
            3. 配置企业微信应用权限{'\n'}
            4. 自动同步企业组织架构和成员
          </Text>
        </View>
      </View>

      {/* 空状态 */}
      {!enterpriseInfo && (
        <View className="flex flex-col items-center justify-center py-16">
          <View className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Building size={32} color="#D1D5DB" />
          </View>
          <Text className="text-gray-500 mb-1">暂无企业信息</Text>
          <Text className="text-gray-400 text-sm">接入企业微信后自动同步</Text>
        </View>
      )}
    </View>
    );
  };

  return (
    <View className="min-h-screen bg-gray-100">
      {/* 加载遮罩层 */}
      {loading && teams.length > 0 && (
        <View 
          className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
        >
          <View className="bg-white rounded-xl px-6 py-4 flex items-center gap-2 shadow-lg">
            <Loader size={20} color="#1377EB" className="animate-spin" />
            <Text className="text-gray-600">加载中...</Text>
          </View>
        </View>
      )}
      
      {/* 搜索栏 */}
      <View className="bg-gray-100 px-3 py-2">
        <View className="bg-white rounded-lg px-3 py-2 flex items-center">
          <Search size={18} color="#9CA3AF" />
          <View className="flex-1 ml-2">
            <Input
              type="text"
              placeholder={currentTab === 'team' ? '搜索团队名称/成员昵称/用户ID' : '搜索企业/部门/成员'}
              className="bg-transparent border-0 h-7 text-sm"
              value={searchKeyword}
              onInput={(e) => handleSearch(e.detail.value)}
            />
          </View>
          {searchKeyword && (
            <View onClick={clearSearch} className="px-1">
              <X size={18} color="#9CA3AF" />
            </View>
          )}
        </View>
      </View>

      {/* Tab 切换 */}
      <View className="bg-white px-4 py-2 flex items-center gap-2 border-b border-gray-100">
        <View 
          className={`flex-1 py-2 rounded-lg text-center ${currentTab === 'team' ? 'bg-blue-500' : 'bg-gray-100'}`}
          onClick={() => { setCurrentTab('team'); clearSearch(); }}
        >
          <Text className={currentTab === 'team' ? 'text-white font-medium' : 'text-gray-600'}>我的团队</Text>
        </View>
        <View 
          className={`flex-1 py-2 rounded-lg text-center ${currentTab === 'enterprise' ? 'bg-blue-500' : 'bg-gray-100'}`}
          onClick={() => { setCurrentTab('enterprise'); clearSearch(); }}
        >
          <Text className={currentTab === 'enterprise' ? 'text-white font-medium' : 'text-gray-600'}>我的企业</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        scrollY 
        style={{ height: 'calc(100vh - 104px - 60px)' }}
      >
        {currentTab === 'enterprise' ? (
          renderEnterpriseContent()
        ) : (
          <>
            {/* 搜索结果 */}
            {isSearching ? (
              <View className="bg-white">
                {searchResults.length === 0 ? (
                  <View className="flex flex-col items-center justify-center py-16">
                    <View className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} color="#D1D5DB" />
                    </View>
                    <Text className="text-gray-500 mb-1">未找到相关结果</Text>
                    <Text className="text-gray-400 text-sm">尝试其他关键词</Text>
                  </View>
                ) : (
                  <>
                    <View className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <Text className="text-sm text-gray-500">找到 {searchResults.length} 个结果</Text>
                    </View>
                    {searchResults.map(renderSearchResultItem)}
                  </>
                )}
              </View>
            ) : (
              <>
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
                {teams.length > 0 && (
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
                  ) : teams.length === 0 ? (
                    <View className="flex flex-col items-center justify-center py-16">
                      <View className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users size={32} color="#D1D5DB" />
                      </View>
                      <Text className="text-gray-500 mb-1">暂无团队</Text>
                      <Text className="text-gray-400 text-sm">创建或加入团队开始协作</Text>
                    </View>
                  ) : (
                    teams.map(renderTeamItem)
                  )}
                </View>

                {/* 底部提示 */}
                {teams.length > 0 && (
                  <View className="py-4 text-center">
                    <Text className="text-sm text-gray-400">共 {teams.length} 个团队</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* 底部安全区 */}
        <View className="h-16" />
      </ScrollView>
    </View>
  );
}
