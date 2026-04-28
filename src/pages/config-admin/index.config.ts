export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '配置管理',
    })
  : {
      navigationBarTitleText: '配置管理',
    };
