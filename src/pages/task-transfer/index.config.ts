export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '任务转交',
      navigationStyle: 'default'
    })
  : {
      navigationBarTitleText: '任务转交',
      navigationStyle: 'default'
    }
