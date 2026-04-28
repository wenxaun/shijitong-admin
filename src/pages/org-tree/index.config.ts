export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '组织架构',
      navigationStyle: 'default'
    })
  : {
      navigationBarTitleText: '组织架构',
      navigationStyle: 'default'
    }
