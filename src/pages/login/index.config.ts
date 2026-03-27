export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '登录',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '登录',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
