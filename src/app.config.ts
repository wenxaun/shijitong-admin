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
    'pages/weekly/index',
    'pages/stats/index',
    'pages/register/index',
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
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1377EB',
    navigationBarTitleText: '事绩通',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  tabBar: {
    color: '#666666',
    selectedColor: '#1377EB',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '任务',
        iconPath: './assets/tabbar/task.png',
        selectedIconPath: './assets/tabbar/task-active.png'
      },
      {
        pagePath: 'pages/create/index',
        text: '发布',
        iconPath: './assets/tabbar/create.png',
        selectedIconPath: './assets/tabbar/create-active.png'
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
