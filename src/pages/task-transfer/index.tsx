import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, User, FileText, MessageSquare } from 'lucide-react-taro'
import { isWework } from '@/utils/env'


export default function TaskTransferPage() {
  const router = useRouter()
  const { taskId } = router.params

  const [isWeworkEnv, setIsWeworkEnv] = useState(false)
  const [task, setTask] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // 检测是否企业微信环境
    const checkEnv = async () => {
      const isWw = await isWework()
      setIsWeworkEnv(isWw)
    }
    checkEnv()

    if (taskId) {
      loadTaskDetail()
    }
  }, [taskId])

  // 加载任务详情
  const loadTaskDetail = async () => {
    try {
      setLoading(true)
      const result = await Taro.cloud.callFunction({
        name: 'task-detail',
        data: { task_id: taskId }
      }) as any

      if (result.result?.success) {
        setTask(result.result.data)
      } else if (result.result) {
        Taro.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      } else {
        Taro.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载任务详情失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  // 从企业通讯录选择
  const handleSelectFromWecom = () => {
    if (!isWeworkEnv) {
      Taro.showToast({
        title: '仅企业微信支持',
        icon: 'none'
      })
      return
    }

    // @ts-ignore - 企业微信 API
    Taro.qy.selectEnterpriseContact({
      fromDepartmentId: 0,
      mode: 'single',
      type: ['user'],
      success: (res) => {
        const userList = res.result.userList
        if (userList && userList.length > 0) {
          const user = userList[0]
          setSelectedUser({
            openid: user.userid, // 注意：企业微信返回的是 userid，需要映射到 openid
            name: user.name,
            avatar: user.avatar
          })
        }
      },
      fail: (err) => {
        console.error('选择企业联系人失败:', err)
        Taro.showToast({
          title: '选择失败',
          icon: 'none'
        })
      }
    })
  }

  // 手动搜索用户
  const handleSearchUser = async () => {
    // 跳转到用户搜索页面
    Taro.navigateTo({
      url: `/pages/user-select/index?taskId=${taskId}`
    })
  }

  // 提交转交
  const handleSubmit = async () => {
    if (!selectedUser) {
      Taro.showToast({
        title: '请选择接收人',
        icon: 'none'
      })
      return
    }

    if (!reason.trim()) {
      Taro.showToast({
        title: '请填写交接说明',
        icon: 'none'
      })
      return
    }

    try {
      setSubmitting(true)
      const result = await Taro.cloud.callFunction({
        name: 'task-transfer',
        data: {
          task_id: taskId,
          to_user_id: selectedUser.openid,
          to_user_name: selectedUser.name,
          reason: reason.trim()
        }
      }) as any

      if (result.result?.success) {
        Taro.showToast({
          title: '转交成功',
          icon: 'success'
        })

        // 延迟返回，让用户看到提示
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else if (result.result) {
        Taro.showToast({
          title: result.result.message || '转交失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('任务转交失败:', error)
      Taro.showToast({
        title: '转交失败',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <View className="bg-white px-4 py-3 flex items-center border-b border-gray-100">
        <View className="mr-4" onClick={() => Taro.navigateBack()}>
          <ArrowLeft size={20} color="#666" />
        </View>
        <Text className="text-lg font-semibold">任务转交</Text>
      </View>

      {loading ? (
        <View className="flex items-center justify-center h-96">
          <Text className="text-gray-400">加载中...</Text>
        </View>
      ) : task ? (
        <View className="p-4 space-y-4">
          {/* 任务信息 */}
          <Card>
            <CardContent className="p-4">
              <View className="flex items-start mb-3">
                <FileText size={20} color="#1377EB" className="mr-2 mt-1" />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 block mb-1">
                    {task.task_name}
                  </Text>
                  <Text className="text-sm text-gray-500 block">
                    当前执行人：{task.executor_name || '未分配'}
                  </Text>
                </View>
              </View>
              {task.task_description && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-sm text-gray-600 block">{task.task_description}</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* 选择接收人 */}
          <Card>
            <CardContent className="p-4">
              <Text className="text-sm font-medium text-gray-900 block mb-3">
                选择接收人
              </Text>

              {/* 企业微信选择按钮 */}
              {isWeworkEnv && (
                <View className="mb-3">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleSelectFromWecom}
                  >
                    <User size={18} color="#1377EB" className="mr-2" />
                    从企业通讯录选择
                  </Button>
                </View>
              )}

              {/* 手动搜索 */}
              <View className="mb-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleSearchUser}
                >
                  <User size={18} color="#1377EB" className="mr-2" />
                  手动搜索用户
                </Button>
              </View>

              {/* 已选接收人 */}
              {selectedUser && (
                <View className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center">
                  <View className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                    <Text className="text-white text-sm font-medium">
                      {selectedUser.name?.charAt(0) || '用'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900 block">
                      {selectedUser.name}
                    </Text>
                    <Text className="text-xs text-gray-500 block">
                      {selectedUser.department_name || ''}
                    </Text>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>

          {/* 交接说明 */}
          <Card>
            <CardContent className="p-4">
              <Text className="text-sm font-medium text-gray-900 block mb-3">
                交接说明
              </Text>
              <View className="bg-gray-50 rounded-xl p-3">
                <Textarea
                  value={reason}
                  onInput={(e) => setReason(e.detail.value)}
                  placeholder="请详细说明任务背景、进度、注意事项等..."
                  maxlength={500}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    backgroundColor: 'transparent'
                  }}
                />
                <View className="text-right mt-2">
                  <Text className="text-xs text-gray-400">
                    {reason.length}/500
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* 提示信息 */}
          <Alert>
            <MessageSquare size={18} color="#1377EB" className="mr-2 text-blue-500" />
            <AlertDescription className="text-sm text-gray-600">
              转交后，原执行人和新执行人都会收到通知。任务状态不变。
            </AlertDescription>
          </Alert>

          {/* 提交按钮 */}
          <View className="pt-4">
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !selectedUser || !reason.trim()}
            >
              {submitting ? '转交中...' : '确认转交'}
            </Button>
          </View>
        </View>
      ) : (
        <View className="flex items-center justify-center h-96">
          <Text className="text-gray-400">任务不存在</Text>
        </View>
      )}
    </View>
  )
}
