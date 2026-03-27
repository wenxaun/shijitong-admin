export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '发布任务',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '发布任务',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
