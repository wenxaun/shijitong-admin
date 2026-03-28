/**
 * WeUI 组件包装器
 * 用于在 Taro 中使用 WeUI 扩展库组件
 * 
 * 使用方式：
 * 1. 在页面 config.ts 中添加 usingComponents
 * 2. 使用包装后的组件
 */

// WeUI 组件路径前缀
export const WEUI_PREFIX = 'weui-miniprogram';

// WeUI 组件映射表
export const WEUI_COMPONENTS = {
  // 基础组件
  button: `${WEUI_PREFIX}/button/button`,
  icon: `${WEUI_PREFIX}/icon/icon`,
  
  // 表单组件
  form: `${WEUI_PREFIX}/form/form`,
  formPage: `${WEUI_PREFIX}/form-page/form-page`,
  cell: `${WEUI_PREFIX}/cell/cell`,
  cellGroup: `${WEUI_PREFIX}/cell-group/cell-group`,
  input: `${WEUI_PREFIX}/input/input`,
  textarea: `${WEUI_PREFIX}/textarea/textarea`,
  checkbox: `${WEUI_PREFIX}/checkbox/checkbox`,
  checkboxGroup: `${WEUI_PREFIX}/checkbox-group/checkbox-group`,
  radio: `${WEUI_PREFIX}/radio/radio`,
  radioGroup: `${WEUI_PREFIX}/radio-group/radio-group`,
  switch: `${WEUI_PREFIX}/switch/switch`,
  slider: `${WEUI_PREFIX}/slider/slider`,
  picker: `${WEUI_PREFIX}/picker/picker`,
  
  // 操作反馈
  dialog: `${WEUI_PREFIX}/dialog/dialog`,
  halfScreenDialog: `${WEUI_PREFIX}/half-screen-dialog/half-screen-dialog`,
  slideview: `${WEUI_PREFIX}/slideview/slideview`,
  actionsheet: `${WEUI_PREFIX}/actionsheet/actionsheet`,
  toast: `${WEUI_PREFIX}/toast/toast`,
  loading: `${WEUI_PREFIX}/loading/loading`,
  
  // 导航组件
  navigation: `${WEUI_PREFIX}/navigation/navigation`,
  navigationBar: `${WEUI_PREFIX}/navigation-bar/navigation-bar`,
  tabbar: `${WEUI_PREFIX}/tabbar/tabbar`,
  
  // 搜索组件
  searchbar: `${WEUI_PREFIX}/searchbar/searchbar`,
  
  // 数据展示
  badge: `${WEUI_PREFIX}/badge/badge`,
  gallery: `${WEUI_PREFIX}/gallery/gallery`,
  list: `${WEUI_PREFIX}/list/list`,
  collapse: `${WEUI_PREFIX}/collapse/collapse`,
  
  // 其他
  footer: `${WEUI_PREFIX}/footer/footer`,
  article: `${WEUI_PREFIX}/article/article`,
  avatar: `${WEUI_PREFIX}/avatar/avatar`,
  progress: `${WEUI_PREFIX}/progress/progress`,
  empty: `${WEUI_PREFIX}/empty/empty`,
} as const;

// 生成页面配置中的 usingComponents
export function getWeUIComponents(...components: (keyof typeof WEUI_COMPONENTS)[]) {
  const usingComponents: Record<string, string> = {};
  components.forEach(name => {
    if (WEUI_COMPONENTS[name]) {
      usingComponents[`weui-${name}`] = WEUI_COMPONENTS[name];
    }
  });
  return usingComponents;
}
