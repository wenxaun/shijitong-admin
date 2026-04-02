export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '创建任务',
      enableShareAppMessage: true
    })
  : {
      navigationBarTitleText: '创建任务',
      enableShareAppMessage: true
    };
