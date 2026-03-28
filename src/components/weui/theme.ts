/**
 * WeUI 主题配置
 * 用于统一样式，使组件符合 WeUI 设计规范
 * 
 * 颜色参考：https://weui.io/
 */

// WeUI 主色调
export const WEUI_COLORS = {
  // 主色（微信绿）
  primary: '#07C160',
  primaryLight: '#E8F8EE',
  
  // 辅助色
  link: '#576B95',
  success: '#07C160',
  warning: '#FA9D3B',
  error: '#FA5151',
  info: '#10AEFF',
  
  // 中性色
  black: '#000000',
  white: '#FFFFFF',
  gray: {
    100: '#F7F7F7',
    200: '#F2F2F2',
    300: '#EBEBEB',
    400: '#D9D9D9',
    500: '#C7C7CC',
    600: '#B2B2B2',
    700: '#999999',
    800: '#666666',
    900: '#333333'
  },
  
  // 背景色
  bgPage: '#F7F7F7',
  bgComponent: '#FFFFFF',
  
  // 边框色
  border: '#E5E5E5',
  borderLight: '#F0F0F0'
} as const;

// WeUI 间距
export const WEUI_SPACING = {
  pagePadding: '16px',
  cellPadding: '16px',
  cellGap: '8px',
  cardPadding: '16px',
  buttonGap: '12px'
} as const;

// WeUI 字体大小
export const WEUI_FONTS = {
  h1: '22px',
  h2: '17px',
  h3: '15px',
  body: '17px',
  bodySmall: '14px',
  caption: '12px',
  
  // 行高
  lineHeight: '1.6',
  lineHeightTight: '1.4'
} as const;

// WeUI 圆角
export const WEUI_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px'
} as const;

// 任务状态颜色（WeUI 风格）
export const STATUS_STYLES = {
  pending: {
    bg: '#F7F7F7',
    text: '#666666',
    label: '待办'
  },
  in_progress: {
    bg: '#E8F4FF',
    text: '#10AEFF',
    label: '进行中'
  },
  completed: {
    bg: '#E8F8EE',
    text: '#07C160',
    label: '已完成'
  },
  cancelled: {
    bg: '#FFF0F0',
    text: '#FA5151',
    label: '已取消'
  },
  exception: {
    bg: '#FFF5E6',
    text: '#FA9D3B',
    label: '异常'
  }
} as const;

// 优先级颜色（WeUI 风格）
export const PRIORITY_STYLES = {
  P0: {
    bg: '#FFF0F0',
    text: '#FA5151',
    label: '紧急'
  },
  P1: {
    bg: '#FFF5E6',
    text: '#FA9D3B',
    label: '高'
  },
  P2: {
    bg: '#E8F4FF',
    text: '#10AEFF',
    label: '中'
  },
  P3: {
    bg: '#F7F7F7',
    text: '#999999',
    label: '低'
  }
} as const;
