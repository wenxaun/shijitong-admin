export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '添加待办',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '添加待办',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white'
    };
