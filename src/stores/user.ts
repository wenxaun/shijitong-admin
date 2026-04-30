import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import { User } from '@/types';
import { getOpenId } from '@/utils/cloud';
import { Network } from '@/network';

interface UserInfo {
  nickName: string;
  avatarUrl: string;
  user_type?: 'personal' | 'enterprise';
  role?: 'member' | 'admin' | 'owner';
  manager_id?: string;
  manager_name?: string;
  receive_daily?: boolean;
  receive_weekly?: boolean;
}

interface UserFeatures {
  task_enabled: boolean;
  team_enabled: boolean;
  enterprise_enabled: boolean;
  notification_enabled: boolean;
  weekly_report_enabled: boolean;
  voice_input_enabled: boolean;
  config_access: boolean;
}

interface UserLimits {
  max_tasks_per_user: number;
  max_subtasks_per_task: number;
  max_team_members: number;
}

interface UserState {
  openid: string | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  features: UserFeatures | null;
  limits: UserLimits | null;
  
  init: () => Promise<void>;
  setUserInfo: (user: User) => void;
  updateUserInfo: (info: Partial<UserInfo>) => void;
  loadPermissions: () => Promise<void>;
  hasFeature: (feature: keyof UserFeatures) => boolean;
  getLimit: (limit: keyof UserLimits) => number;
  logout: () => void;
}

// Taro 存储适配器
const taroStorage = {
  getItem: (name: string): string | null => {
    return Taro.getStorageSync(name) || null;
  },
  setItem: (name: string, value: string): void => {
    Taro.setStorageSync(name, value);
  },
  removeItem: (name: string): void => {
    Taro.removeStorageSync(name);
  }
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      openid: null,
      userInfo: null,
      isLoggedIn: false,
      isLoading: true,
      features: null,
      limits: null,

      init: async () => {
        console.log('[Store] 开始初始化用户状态...');
        
        const openid = await getOpenId();
        if (openid) {
          const storedUserInfo = Taro.getStorageSync('userInfo');
          const storedFeatures = Taro.getStorageSync('userFeatures');
          const storedLimits = Taro.getStorageSync('userLimits');
          set({ 
            openid, 
            userInfo: storedUserInfo || null,
            features: storedFeatures || null,
            limits: storedLimits || null,
            isLoading: false 
          });
          console.log('[Store] 用户 OpenID:', openid);
        } else {
          set({ isLoading: false });
          console.log('[Store] 未获取到 OpenID');
        }
      },

      setUserInfo: (user: User) => {
        const userInfo: UserInfo = {
          nickName: (user as any).nickName || (user as any).nickname || '',
          avatarUrl: (user as any).avatarUrl || (user as any).avatar_url || '',
          user_type: (user as any).user_type || 'personal',
          role: (user as any).role || 'member'
        };
        Taro.setStorageSync('userInfo', userInfo);
        set({ userInfo, isLoggedIn: true });
      },

      updateUserInfo: (info: Partial<UserInfo>) => {
        set((state) => {
          const newUserInfo = { ...state.userInfo, ...info } as UserInfo;
          Taro.setStorageSync('userInfo', newUserInfo);
          return { userInfo: newUserInfo };
        });
      },

      loadPermissions: async () => {
        const { openid } = get();
        if (!openid) return;
        
        try {
          const res = await Network.request({
            url: `/api/admin/permissions/${openid}`,
            method: 'GET'
          });
          
          if (res.data?.code === 200 && res.data?.data) {
            const { role, features, limits } = res.data.data;
            
            set((state) => {
              const newUserInfo = { ...state.userInfo, role } as UserInfo;
              Taro.setStorageSync('userInfo', newUserInfo);
              Taro.setStorageSync('userFeatures', features);
              Taro.setStorageSync('userLimits', limits);
              return { userInfo: newUserInfo, features, limits };
            });
            
            console.log('[Store] 权限加载成功:', { role, features, limits });
          }
        } catch (error) {
          console.error('[Store] 加载权限失败:', error);
        }
      },

      hasFeature: (feature: keyof UserFeatures) => {
        const { features, userInfo } = get();
        if (userInfo?.role === 'owner') return true;
        return features?.[feature] ?? false;
      },

      getLimit: (limit: keyof UserLimits) => {
        const { limits, userInfo } = get();
        if (userInfo?.role === 'owner') return 999;
        return limits?.[limit] ?? 50;
      },

      logout: () => {
        Taro.removeStorageSync('userInfo');
        Taro.removeStorageSync('token');
        Taro.removeStorageSync('userSettings');
        Taro.removeStorageSync('mock_manager');
        Taro.removeStorageSync('userFeatures');
        Taro.removeStorageSync('userLimits');
        set({ openid: null, userInfo: null, isLoggedIn: false, features: null, limits: null });
      }
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => taroStorage),
      partialize: (state) => ({
        openid: state.openid,
        userInfo: state.userInfo,
        features: state.features,
        limits: state.limits
      })
    }
  )
);
