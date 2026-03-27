import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { Team, CloudResponse, TeamMemberRole } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Shield, User, Menu, UserPlus, Trash2, Settings } from 'lucide-react-taro';

// 默认权限配置
const DEFAULT_PERMISSIONS = {
  owner: {
    can_create_task: true,
    can_assign_task: true,
    can_view_all_tasks: true,
    can_edit_team: true,
    can_invite_member: true,
    can_remove_member: true
  },
  admin: {
    can_create_task: true,
    can_assign_task: true,
    can_view_all_tasks: true,
    can_edit_team: false,
    can_invite_member: true,
    can_remove_member: false
  },
  member: {
    can_create_task: true,
    can_assign_task: false,
    can_view_all_tasks: false,
    can_edit_team: false,
    can_invite_member: false,
    can_remove_member: false
  }
};

export default function TeamEdit() {
  const router = useRouter();
  const { openid } = useUserStore();
  const teamId = router.params.id || '';

  const [loading, setLoading] = useState(!!teamId);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);

  const isCreator = !teamId || team?.leader_id === openid;

  // 加载团队详情
  const loadTeam = useCallback(async () => {
    if (!teamId || !openid) return;

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const mockTeam: Team = {
          _id: teamId,
          name: '产品研发组',
          description: '负责产品研发工作',
          leader_id: openid,
          leader_name: '我',
          members: [openid, 'user2', 'user3'],
          member_details: [
            { openid, nickname: '我', role: 'owner', permissions: DEFAULT_PERMISSIONS.owner, joined_at: new Date().toISOString(), task_count: 10, completed_count: 8 },
            { openid: 'user2', nickname: '张三', role: 'admin', permissions: DEFAULT_PERMISSIONS.admin, joined_at: new Date().toISOString(), task_count: 5, completed_count: 4 },
            { openid: 'user3', nickname: '李四', role: 'member', permissions: DEFAULT_PERMISSIONS.member, joined_at: new Date().toISOString(), task_count: 3, completed_count: 2 }
          ],
          invite_code: 'ABC123',
          created_at: new Date().toISOString()
        };
        setTeam(mockTeam);
        setTeamName(mockTeam.name);
        setTeamDesc(mockTeam.description || '');
        setInviteCode(mockTeam.invite_code || '');
        setLoading(false);
        return;
      }

      const res = await callFunction<CloudResponse<{ team: Team }>>(
        'team-detail',
        { team_id: teamId }
      );

      if (res.success && res.data?.team) {
        setTeam(res.data.team);
        setTeamName(res.data.team.name);
        setTeamDesc(res.data.team.description || '');
        setInviteCode(res.data.team.invite_code || '');
      }
    } catch (err) {
      console.error('加载团队失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [teamId, openid]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // 保存团队
  const saveTeam = async () => {
    if (!teamName.trim()) {
      Taro.showToast({ title: '请输入团队名称', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      // H5 端模拟
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        // 从本地存储获取现有团队
        const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
        const teams = JSON.parse(storedTeams);
        
        if (teamId) {
          // 更新现有团队
          const index = teams.findIndex((t: Team) => t._id === teamId);
          if (index >= 0) {
            teams[index] = {
              ...teams[index],
              name: teamName,
              description: teamDesc
            };
          }
        } else {
          // 创建新团队
          const newTeam: Team = {
            _id: `team_${Date.now()}`,
            name: teamName,
            description: teamDesc,
            leader_id: openid || 'mock_user',
            leader_name: '我',
            members: [openid || 'mock_user'],
            member_details: [
              {
                openid: openid || 'mock_user',
                nickname: '我',
                role: 'owner',
                permissions: DEFAULT_PERMISSIONS.owner,
                joined_at: new Date().toISOString()
              }
            ],
            invite_code: generateInviteCode(),
            created_at: new Date().toISOString()
          };
          teams.push(newTeam);
        }
        
        // 保存到本地存储
        Taro.setStorageSync('mock_teams', JSON.stringify(teams));
        
        Taro.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
        setSaving(false);
        return;
      }

      const res = await callFunction<CloudResponse>(
        teamId ? 'team-update' : 'team-create',
        {
          team_id: teamId,
          name: teamName,
          description: teamDesc
        }
      );

      if (res.success) {
        Taro.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存团队失败:', err);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  // 生成邀请码
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // 邀请成员
  const inviteMember = async () => {
    const code = inviteCode || generateInviteCode();
    setInviteCode(code);
    
    try {
      const res = await Taro.showModal({
        title: '邀请成员',
        content: `邀请码: ${code}\n\n分享此邀请码给需要加入的成员`,
        confirmText: '复制邀请码'
      });
      
      if (res.confirm) {
        await Taro.setClipboardData({ data: code });
        Taro.showToast({ title: '已复制邀请码', icon: 'success' });
      }
    } catch (err) {
      console.error('邀请成员失败:', err);
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  // 修改成员角色
  const changeMemberRole = (memberOpenid: string, newRole: TeamMemberRole) => {
    if (!team || memberOpenid === openid) return;

    Taro.showModal({
      title: '确认修改',
      content: `确定将该成员角色修改为${newRole === 'admin' ? '管理员' : '普通成员'}吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            // H5 端模拟
            if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
              const updatedMembers = team.member_details?.map(m => 
                m.openid === memberOpenid 
                  ? { ...m, role: newRole, permissions: DEFAULT_PERMISSIONS[newRole] }
                  : m
              );
              setTeam({ ...team, member_details: updatedMembers });
              Taro.showToast({ title: '修改成功', icon: 'success' });
              setShowMemberMenu(null);
              return;
            }

            const result = await callFunction<CloudResponse>(
              'team-member-update',
              { team_id: teamId, member_openid: memberOpenid, role: newRole }
            );

            if (result.success) {
              loadTeam();
              setShowMemberMenu(null);
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 移除成员
  const removeMember = (memberOpenid: string) => {
    if (!team || memberOpenid === openid) return;

    Taro.showModal({
      title: '确认移除',
      content: '确定将该成员移出团队吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // H5 端模拟
            if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
              const updatedMembers = team.member_details?.filter(m => m.openid !== memberOpenid);
              setTeam({ 
                ...team, 
                member_details: updatedMembers,
                members: team.members.filter(id => id !== memberOpenid)
              });
              Taro.showToast({ title: '已移除', icon: 'success' });
              setShowMemberMenu(null);
              return;
            }

            const result = await callFunction<CloudResponse>(
              'team-member-remove',
              { team_id: teamId, member_openid: memberOpenid }
            );

            if (result.success) {
              loadTeam();
              setShowMemberMenu(null);
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 解散团队
  const dissolveTeam = () => {
    Taro.showModal({
      title: '解散团队',
      content: '确定要解散团队吗？此操作不可恢复！',
      success: async (res) => {
        if (res.confirm) {
          try {
            // H5 端模拟
            if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
              // 从本地存储删除团队
              const storedTeams = Taro.getStorageSync('mock_teams') || '[]';
              const teams = JSON.parse(storedTeams);
              const filteredTeams = teams.filter((t: Team) => t._id !== teamId);
              Taro.setStorageSync('mock_teams', JSON.stringify(filteredTeams));
              
              Taro.showToast({ title: '已解散', icon: 'success' });
              setTimeout(() => Taro.navigateBack(), 1500);
              return;
            }

            const result = await callFunction<CloudResponse>(
              'team-dissolve',
              { team_id: teamId }
            );

            if (result.success) {
              Taro.showToast({ title: '已解散', icon: 'success' });
              setTimeout(() => Taro.navigateBack(), 1500);
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 获取角色图标和颜色
  const getRoleStyle = (role: string, isSelf: boolean) => {
    if (isSelf && role === 'owner') {
      return { icon: Crown, bg: 'bg-orange-50', text: 'text-orange-500', label: '创建者' };
    }
    if (role === 'admin') {
      return { icon: Shield, bg: 'bg-blue-50', text: 'text-blue-500', label: '管理员' };
    }
    return { icon: User, bg: 'bg-gray-100', text: 'text-gray-500', label: '成员' };
  };

  if (loading && teamId) {
    return (
      <View className="min-h-screen bg-gray-50 p-4">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="flex-1" scrollY style={{ height: "calc(100vh - 50px)" }}>
        {/* 团队基本信息 */}
        <View className="p-4">
          <Card>
            <CardContent className="p-4">
              <Text className="text-sm text-gray-500 mb-2">团队名称 *</Text>
              <Input
                placeholder="请输入团队名称"
                placeholderClass="text-gray-400"
                value={teamName}
                onInput={(e) => setTeamName(e.detail.value)}
                maxlength={30}
                disabled={!isCreator}
                className="bg-gray-50 border-gray-200"
              />

              <Text className="text-sm text-gray-500 mb-2 mt-4">团队描述</Text>
              <Textarea
                placeholder="请输入团队描述（可选）"
                placeholderClass="text-gray-400"
                value={teamDesc}
                onInput={(e) => setTeamDesc(e.detail.value)}
                maxlength={200}
                disabled={!isCreator}
                className="bg-gray-50 border-gray-200"
              />

              {isCreator && (
                <Button 
                  className="w-full mt-4" 
                  onClick={saveTeam}
                  disabled={saving}
                >
                  {saving ? '保存中...' : teamId ? '保存修改' : '创建团队'}
                </Button>
              )}
            </CardContent>
          </Card>
        </View>

        {/* 成员管理 */}
        {teamId && team && (
          <>
            <View className="px-4 mb-3">
              <View className="flex items-center justify-between">
                <Text className="text-base font-semibold text-gray-800">成员管理</Text>
                {isCreator && (
                  <View onClick={inviteMember}>
                    <Badge className="bg-blue-50 text-blue-500">
                      <UserPlus size={14} color="#1377EB" />
                      <Text className="ml-1 text-blue-500">邀请成员</Text>
                    </Badge>
                  </View>
                )}
              </View>
            </View>

            {/* 成员列表 */}
            <View className="px-4">
              {team.member_details?.map((member) => {
                const isSelf = member.openid === openid;
                const roleStyle = getRoleStyle(member.role, isSelf);
                const RoleIcon = roleStyle.icon;

                return (
                  <Card key={member.openid} className="mb-3">
                    <CardContent className="p-4">
                      <View className="flex items-center">
                        {/* 头像 */}
                        <View className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <Text className="text-sm text-blue-500 font-semibold">
                            {member.nickname[0]}
                          </Text>
                        </View>

                        {/* 信息 */}
                        <View className="flex-1">
                          <View className="flex items-center gap-2">
                            <Text className="text-base font-medium text-gray-800">
                              {member.nickname}
                              {isSelf && <Text className="text-gray-400">（我）</Text>}
                            </Text>
                          </View>
                          <View className="flex items-center gap-2 mt-1">
                            <Badge className={`${roleStyle.bg} ${roleStyle.text}`}>
                              <RoleIcon size={12} color={roleStyle.text === 'text-orange-500' ? '#F97316' : roleStyle.text === 'text-blue-500' ? '#1377EB' : '#6B7280'} />
                              <Text className={`ml-1 text-xs ${roleStyle.text}`}>{roleStyle.label}</Text>
                            </Badge>
                            <Text className="text-xs text-gray-400">
                              {member.completed_count || 0}/{member.task_count || 0} 任务完成
                            </Text>
                          </View>
                        </View>

                        {/* 操作按钮 */}
                        {isCreator && !isSelf && (
                          <View 
                            className="p-2"
                            onClick={() => setShowMemberMenu(showMemberMenu === member.openid ? null : member.openid)}
                          >
                            <Menu size={20} color="#9CA3AF" />
                          </View>
                        )}
                      </View>

                      {/* 操作菜单 */}
                      {showMemberMenu === member.openid && isCreator && !isSelf && (
                        <View className="mt-3 pt-3 border-t border-gray-100">
                          <View className="flex gap-2">
                            {member.role !== 'admin' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => changeMemberRole(member.openid, 'admin')}
                              >
                                <Shield size={14} color="#1377EB" />
                                <Text className="ml-1">设为管理员</Text>
                              </Button>
                            )}
                            {member.role === 'admin' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => changeMemberRole(member.openid, 'member')}
                              >
                                <User size={14} color="#6B7280" />
                                <Text className="ml-1">设为成员</Text>
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-500 border-red-200"
                              onClick={() => removeMember(member.openid)}
                            >
                              <Trash2 size={14} color="#EA4335" />
                              <Text className="ml-1 text-red-500">移除</Text>
                            </Button>
                          </View>
                        </View>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </View>

            {/* 权限说明 */}
            <View className="px-4 mt-2">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <View className="flex items-center gap-2 mb-3">
                    <Settings size={16} color="#6B7280" />
                    <Text className="text-sm font-semibold text-gray-700">权限说明</Text>
                  </View>
                  <View className="space-y-2">
                    <View className="flex items-start gap-2">
                      <Crown size={14} color="#F97316" className="mt-1" />
                      <View>
                        <Text className="text-sm text-gray-600">创建者：拥有所有权限</Text>
                      </View>
                    </View>
                    <View className="flex items-start gap-2">
                      <Shield size={14} color="#1377EB" className="mt-1" />
                      <View>
                        <Text className="text-sm text-gray-600">管理员：可创建/分配任务、邀请成员</Text>
                      </View>
                    </View>
                    <View className="flex items-start gap-2">
                      <User size={14} color="#6B7280" className="mt-1" />
                      <View>
                        <Text className="text-sm text-gray-600">成员：可创建任务，仅查看自己的任务</Text>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* 解散团队 */}
            {isCreator && (
              <View className="px-4 mt-4 mb-24">
                <Button 
                  variant="outline"
                  className="w-full text-red-500 border-red-200"
                  onClick={dissolveTeam}
                >
                  解散团队
                </Button>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
