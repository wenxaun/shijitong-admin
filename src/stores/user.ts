import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import { User } from '@/types';
import { getOpenId } from '@/utils/cloud';

interface UserState {
  openid: string | null;
  userInfo: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Actions
  init: () => Promise<void>;
  setUserInfo: (user: User) => void;
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
    (set) => ({
      openid: null,
      userInfo: null,
      isLoggedIn: false,
      isLoading: true,

      init: async () => {
        console.log('[Store] 开始初始化用户状态...');
        
        // 云开发已在 app.tsx 的 useLaunch 中初始化，这里不再重复初始化
        
        // 获取 OpenID
        const openid = await getOpenId();
        if (openid) {
          set({ openid, isLoading: false });
          console.log('[Store] 用户 OpenID:', openid);
        } else {
          set({ isLoading: false });
          console.log('[Store] 未获取到 OpenID');
        }
      },

      setUserInfo: (user: User) => {
        set({ userInfo: user, isLoggedIn: true });
      },

      logout: () => {
        set({ openid: null, userInfo: null, isLoggedIn: false });
      }
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => taroStorage),
      partialize: (state) => ({
        openid: state.openid,
        userInfo: state.userInfo
      })
    }
  )
);
