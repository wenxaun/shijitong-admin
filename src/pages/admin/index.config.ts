export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '管理控制台',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '管理控制台',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
