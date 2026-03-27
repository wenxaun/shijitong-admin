export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '我的',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '我的',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
