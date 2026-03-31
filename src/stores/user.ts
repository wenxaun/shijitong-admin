import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import { User } from '@/types';
import { getOpenId } from '@/utils/cloud';

interface UserInfo {
  nickName: string;
  avatarUrl: string;
  // 汇报关系
  manager_id?: string;
  manager_name?: string;
  receive_daily?: boolean;
  receive_weekly?: boolean;
}

interface UserState {
  openid: string | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Actions
  init: () => Promise<void>;
  setUserInfo: (user: User) => void;
  updateUserInfo: (info: Partial<UserInfo>) => void;
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
          // 从本地存储恢复用户信息
          const storedUserInfo = Taro.getStorageSync('userInfo');
          set({ 
            openid, 
            userInfo: storedUserInfo || null,
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
          avatarUrl: (user as any).avatarUrl || (user as any).avatar_url || ''
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
