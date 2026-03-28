export default defineAppConfig({
  pages: [
    'pages/splash/index',
    'pages/index/index',
    'pages/create/index',
    'pages/detail/index',
    'pages/profile/index',
    'pages/review/index',
    'pages/edit/index',
    'pages/exception/index',
    'pages/settings/index',
    'pages/history/index',
    'pages/team/index',
    'pages/team-edit/index',
    'pages/team-join/index',
    'pages/weekly/index',
    'pages/stats/index',
    'pages/login/index',
    'pages/org-create/index',
    'pages/dept-manage/index',
    'pages/team-manage/index',
    'pages/subtask-manage/index',
    'pages/subtask-create/index',
    'pages/subtask-detail/index',
    'pages/subtask-flow/index',
    'pages/subtask-edit/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '事绩通',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F5F7FA'
  },
  // 移除全局 Skyline 配置，改为在需要高性能渲染的页面单独配置
  lazyCodeLoading: 'requiredComponents',
  // 引用 WeUI 扩展库，不占用小程序包体积
  useExtendedLib: {
    weui: true
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1A1A1A',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '任务',
        iconPath: './assets/tabbar/list-todo.png',
        selectedIconPath: './assets/tabbar/list-todo-active.png'
      },
      {
        pagePath: 'pages/create/index',
        text: '发布',
        iconPath: './assets/tabbar/plus.png',
        selectedIconPath: './assets/tabbar/plus-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png'
      }
    ]
  }
})
