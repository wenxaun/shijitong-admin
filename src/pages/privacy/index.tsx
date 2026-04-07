// 隐私政策页面
import { View, Text, ScrollView } from '@tarojs/components';
import { ArrowLeft } from 'lucide-react-taro';
import Taro from '@tarojs/taro';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
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
          <Text className="text-base font-medium text-gray-800">隐私政策</Text>
        </View>
      </View>

      <ScrollView scrollY className="px-5 py-6" style={{ height: 'calc(100vh - 56px)' }}>
        <Text className="text-lg font-semibold text-gray-900 block mb-4">隐私政策</Text>
        <Text className="text-xs text-gray-400 block mb-6">更新日期：2024年1月1日</Text>

        <View className="text-sm text-gray-600 leading-relaxed space-y-4">
          <Text className="block text-base font-medium text-gray-800 mt-4">一、信息收集</Text>
          <Text className="block">
            我们收集您主动提供的信息，包括昵称、头像等，以便为您提供更好的服务体验。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">二、信息使用</Text>
          <Text className="block">
            我们仅使用您提供的信息用于小程序内的功能服务，不会将您的个人信息用于其他目的或提供给第三方。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">三、信息存储</Text>
          <Text className="block">
            您的信息将安全存储在我们的服务器中，并采取相应的安全措施保护您的个人信息。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">四、信息共享</Text>
          <Text className="block">
            我们不会向任何第三方出售、交易或转让您的个人信息。
          </Text>

          <Text className="block text-base font-medium text-gray-800 mt-4">五、联系我们</Text>
          <Text className="block">
            如您对本隐私政策有任何疑问，请通过小程序内的反馈功能与我们联系。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
