export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '任务分组管理' })
  : { navigationBarTitleText: '任务分组管理' }
