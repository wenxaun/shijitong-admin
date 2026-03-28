export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '任务列表'
      // WeUI 扩展库组件通过 app.config.ts 全局配置 useExtendedLib
      // 小程序运行时自动加载，不占用包体积
      // 如需使用 WeUI 组件，参考：https://developers.weixin.qq.com/miniprogram/dev/extended/weui/
    })
  : {
      navigationBarTitleText: '任务列表'
    };
