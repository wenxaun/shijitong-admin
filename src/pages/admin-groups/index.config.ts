export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '分组管理',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '分组管理',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
