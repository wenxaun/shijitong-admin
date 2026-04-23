export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '用户管理',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '用户管理',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
