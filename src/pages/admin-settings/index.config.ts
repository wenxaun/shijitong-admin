export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '系统设置',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '系统设置',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
