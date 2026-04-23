export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '任务管理',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '任务管理',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
