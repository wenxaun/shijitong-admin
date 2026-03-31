export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '功能排序' })
  : { navigationBarTitleText: '功能排序' }
