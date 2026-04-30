import Taro from '@tarojs/taro'

interface NavigationOptions {
  url: string
  animationType?: 'slide' | 'fade' | 'zoom' | 'none'
  duration?: number
}

export const navigateTo = (options: NavigationOptions) => {
  const { url, animationType = 'slide', duration = 300 } = options
  
  if (animationType === 'none') {
    return Taro.navigateTo({ url })
  }
  
  return Taro.navigateTo({
    url,
    success: () => {
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        Taro.nextTick(() => {
          const pages = Taro.getCurrentPages()
          if (pages.length > 1) {
            const currentPage = pages[pages.length - 1]
            if (currentPage) {
              (currentPage as any).setData({
                __animation_type__: animationType,
                __animation_duration__: duration
              })
            }
          }
        })
      }
    }
  })
}

export const navigateBack = (delta = 1) => {
  return Taro.navigateBack({ delta })
}

export const switchTab = (url: string) => {
  return Taro.switchTab({ url })
}

export const redirectTo = (url: string) => {
  return Taro.redirectTo({ url })
}

export const reLaunch = (url: string) => {
  return Taro.reLaunch({ url })
}

export const showPageLoading = (title = '加载中...') => {
  Taro.showLoading({ title, mask: true })
}

export const hidePageLoading = () => {
  Taro.hideLoading()
}
