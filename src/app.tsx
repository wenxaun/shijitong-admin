import '@/app.css';
import { initSystemInfo } from '@/utils/env';
import { initCloud } from '@/utils/cloud';
import { LucideTaroProvider } from 'lucide-react-taro';
import { Toaster } from '@/components/ui/toast';
import { Preset } from './presets';
import { configManager } from '@/utils/configManager';

// 初始化系统信息（检测企业微信环境）
try {
  initSystemInfo();
} catch (error) {
  console.error('[App] 初始化系统信息失败:', error);
}

// 初始化云开发（小程序端）
try {
  initCloud();
} catch (error) {
  console.error('[App] 初始化云开发失败:', error);
}

// 预加载配置（后台异步加载，不阻塞应用启动）
configManager.loadConfig().catch(err => {
  console.error('[App] 预加载配置失败:', err);
});

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
