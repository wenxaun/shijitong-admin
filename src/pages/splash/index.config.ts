export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '事绩通',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white',
      navigationStyle: 'custom',
      renderer: 'skyline',
      componentFramework: 'glass-easel'
    })
  : {
      navigationBarTitleText: '事绩通',
      navigationBarBackgroundColor: '#1377EB',
      navigationBarTextStyle: 'white',
      navigationStyle: 'custom',
      renderer: 'skyline',
      componentFramework: 'glass-easel'
    };
