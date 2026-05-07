import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Building, Users, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react-taro'
import { isWeworkSync } from '@/utils/env'

// 部门节点组件
interface DepartmentNodeProps {
  department: any
  level: number
  onDepartmentClick: (deptId: string) => void
  onUserClick: (user: any) => void
  expandedDepts: Set<string>
  onToggleExpand: (deptId: string) => void
}

const DepartmentNode: React.FC<DepartmentNodeProps> = ({
  department,
  level,
  onDepartmentClick,
  onUserClick,
  expandedDepts,
  onToggleExpand
}) => {
  const isExpanded = expandedDepts.has(department._id)
  const hasChildren = department.children && department.children.length > 0

  return (
    <View>
      {/* 部门标题 */}
      <View
        className="flex items-center py-3 px-4 active:bg-gray-50"
        style={{ paddingLeft: `${20 + level * 16}px` }}
        onClick={() => {
          if (hasChildren) {
            onToggleExpand(department._id)
          }
          onDepartmentClick(department._id)
        }}
      >
        <Building size={16} color="#666" className="mr-2 flex-shrink-0" />
        <Text className="flex-1 text-sm text-gray-900">{department.name}</Text>
        <Text className="text-xs text-gray-400 mr-2">
          {department.member_count || 0}人
        </Text>
        {hasChildren && (
          <View>
            {isExpanded ? (
              <ChevronDown size={16} color="#999" />
            ) : (
              <ChevronRight size={16} color="#999" />
            )}
          </View>
        )}
      </View>

      {/* 子部门和成员 */}
      {isExpanded && (
        <View>
          {/* 子部门 */}
          {department.children &&
            department.children.map((child: any) => (
              <DepartmentNode
                key={child._id}
                department={child}
                level={level + 1}
                onDepartmentClick={onDepartmentClick}
                onUserClick={onUserClick}
                expandedDepts={expandedDepts}
                onToggleExpand={onToggleExpand}
              />
            ))}

          {/* 成员列表 */}
          {department.members && department.members.length > 0 && (
            <View className="pb-2">
              {department.members.map((member: any) => (
                <View
                  key={member._id}
                  className="flex items-center py-2 px-4 active:bg-gray-50"
                  style={{ paddingLeft: `${36 + level * 16}px` }}
                  onClick={() => onUserClick(member)}
                >
                  <View
                    className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0"
                  >
                    <Text className="text-xs text-blue-600 font-medium">
                      {member.nick_name?.charAt(0) || member.wecom_userid?.charAt(0) || '用'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900 block">
                      {member.nick_name || member.wecom_userid}
                    </Text>
                    {member.job_title && (
                      <Text className="text-xs text-gray-500 block">
                        {member.job_title}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default function OrgTreePage() {
  const [treeData, setTreeData] = useState<any[]>([])
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadOrgTree()
  }, [])

  // 加载组织架构树
  const loadOrgTree = async () => {
    try {
      setLoading(true)
      const result = await Taro.cloud.callFunction({
        name: 'enterprise-info',
        data: { action: 'getOrgTree' }
      }) as any

      if (result.result?.success) {
        setTreeData(result.result.data || [])

        // 默认展开第一层
        const firstLevelIds = (result.result.data || []).map((dept: any) => dept._id)
        setExpandedDepts(new Set(firstLevelIds))
      } else if (result.result) {
        Taro.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载组织架构失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 展开/收起部门
  const handleToggleExpand = (deptId: string) => {
    const newExpanded = new Set(expandedDepts)
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId)
    } else {
      newExpanded.add(deptId)
    }
    setExpandedDepts(newExpanded)
  }

  // 点击部门
  const handleDepartmentClick = (deptId: string) => {
    console.log('点击部门:', deptId)
  }

  // 点击成员
  const handleUserClick = (user: any) => {
    // 可以跳转到用户详情或执行其他操作
    Taro.showModal({
      title: user.nick_name || user.wecom_userid,
      content: `职位：${user.job_title || '未设置'}\n部门：${user.department_name || '未设置'}`,
      showCancel: false
    })
  }

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadOrgTree()
  }

  // 同步组织架构
  const handleSync = async () => {
    if (!isWeworkSync()) {
      Taro.showToast({
        title: '仅企业微信支持',
        icon: 'none'
      })
      return
    }

    try {
      const confirm = await Taro.showModal({
        title: '确认同步',
        content: '将从企业微信同步最新的组织架构，是否继续？'
      })

      if (!confirm.confirm) return

      Taro.showLoading({ title: '同步中...' })

      // 从配置管理器获取企业微信配置
      const { configManager } = await import('@/utils/configManager')
      await configManager.loadConfig() // 确保配置已加载
      const config = configManager.getWecomConfig()
      const corpId = config?.corpId

      console.log('[OrgTree] 企业微信配置:', { corpId, config })

      if (!corpId) {
        Taro.hideLoading()
        Taro.showToast({
          title: '请先在Web后台配置企业ID',
          icon: 'none',
          duration: 3000
        })
        return
      }

      const result = await Taro.cloud.callFunction({
        name: 'wecom-sync-org',
        data: { corp_id: corpId }
      }) as any

      Taro.hideLoading()

      if (result.result?.success) {
        Taro.showToast({
          title: '同步成功',
          icon: 'success'
        })
        await loadOrgTree()
      } else if (result.result) {
        Taro.showToast({
          title: result.result.message || '同步失败',
          icon: 'none'
        })
      }
    } catch (error) {
      Taro.hideLoading()
      console.error('同步失败:', error)
      Taro.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  }

  // 计算总人数
  const totalMembers = treeData.reduce(
    (sum, dept) => sum + (dept.member_count || 0),
    0
  )

  // 计算部门数量
  const totalDepts = treeData.reduce(
    (sum, dept) => sum + 1 + (dept.children?.length || 0),
    0
  )

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <View className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <View className="flex items-center">
          <Building size={20} color="#1377EB" className="mr-2" />
          <Text className="text-lg font-semibold">组织架构</Text>
        </View>
        <View className="flex items-center space-x-2">
          <View onClick={handleRefresh}>
            <RefreshCw size={20} color="#666" className={refreshing ? 'animate-spin' : ''} />
          </View>
          {isWeworkSync() && (
            <Button size="sm" onClick={handleSync}>
              同步
            </Button>
          )}
        </View>
      </View>

      {/* 统计信息 */}
      <View className="bg-white px-4 py-3 flex items-center border-b border-gray-100">
        <Users size={18} color="#1377EB" className="mr-2" />
        <Text className="text-sm text-gray-600">
          共 <Text className="text-blue-600 font-medium">{totalDepts}</Text> 个部门，
          <Text className="text-blue-600 font-medium">{totalMembers}</Text> 位成员
        </Text>
      </View>

      {/* 组织架构树 */}
      {loading ? (
        <View className="flex items-center justify-center h-96">
          <Text className="text-gray-400">加载中...</Text>
        </View>
      ) : treeData && treeData.length > 0 ? (
        <Card className="mx-4 mt-4">
          <CardContent className="p-0">
            {treeData.map((department) => (
              <DepartmentNode
                key={department._id}
                department={department}
                level={0}
                onDepartmentClick={handleDepartmentClick}
                onUserClick={handleUserClick}
                expandedDepts={expandedDepts}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <View className="flex flex-col items-center justify-center h-96 px-4">
          <Building size={48} color="#D1D5DB" className="mb-4" />
          <Text className="text-sm text-gray-400 block mb-4">暂无组织架构</Text>
          {isWeworkSync() && (
            <Button onClick={handleSync}>同步企业微信组织</Button>
          )}
        </View>
      )}
    </View>
  )
}
