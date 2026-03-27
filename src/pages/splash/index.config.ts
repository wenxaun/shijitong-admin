export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '事绩通',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white',
      navigationStyle: 'custom'
    })
  : {
      navigationBarTitleText: '事绩通',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white',
      navigationStyle: 'custom'
    };
