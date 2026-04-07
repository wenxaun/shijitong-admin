// 用户服务协议页面
import { View, Text, ScrollView } from '@tarojs/components';
import { ArrowLeft } from 'lucide-react-taro';
import Taro from '@tarojs/taro';
import { Button } from '@/components/ui/button';

export default function UserAgreement() {
  const handleBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <View className="sticky top-0 bg-white z-50 border-b border-gray-100">
        <View className="flex items-center px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 mr-2"
            onClick={handleBack}
          >
            <ArrowLeft size={20} color="#374151" />
          </Button>
          <Text className="text-base font-medium text-gray-800">用户服务协议</Text>
        </View>
      </View>

      <ScrollView scrollY className="px-5 py-6" style={{ height: 'calc(100vh - 56px)' }}>
        <Text className="text-lg font-semibold text-gray-900 block mb-4">用户服务协议</Text>
        <Text className="text-xs text-gray-400 block mb-6">更新日期：2024年1月1日</Text>

        <View className="text-sm text-gray-600 leading-relaxed space-y-4">
          <Text className="block text-base font-medium text-gray-800 mt-4">一、服务说明</Text>
          <Text className="block">
            事绩通是一款高效任务管理工具，帮助用户创建、分配、执行和复盘任务，实现团队高效协作。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">二、用户责任</Text>
          <Text className="block">
            1. 用户需保证所发布的任务信息真实、准确；
          </Text>
          <Text className="block">
            2. 用户应遵守国家法律法规，不得利用本服务从事违法活动；
          </Text>
          <Text className="block">
            3. 用户应尊重他人隐私，不得发布侮辱、诽谤他人的内容。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">三、服务变更</Text>
          <Text className="block">
            我们保留随时修改或中断服务的权利，并会提前通知用户。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">四、免责声明</Text>
          <Text className="block">
            由于网络环境的特殊性，我们不对因不可抗力导致的损失承担责任。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">五、联系我们</Text>
          <Text className="block">
            如您对本协议有任何疑问，请通过小程序内的反馈功能与我们联系。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
