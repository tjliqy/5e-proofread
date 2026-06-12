/** When your routing table is too long, you can split it into small modules **/

import Layout from '@/layout'

const tableRouter = {
  path: '/table',
  component: Layout,
  redirect: '/table/dashboard',
  name: 'Table',
  meta: {
    title: 'Table',
    icon: 'table'
  },
  children: [
    {
      path: 'dashboard',
      name: 'DashboardHome',
      component: () => import('@/views/dashboard/index'),
      meta: { title: '首页看板', affix: true }
    },
    // {
    //   path: 'dynamic-table',
    //   component: () => import('@/views/table/dynamic-table/index'),
    //   name: 'DynamicTable',
    //   meta: { title: 'Dynamic Table' }
    // },
    // {
    //   path: 'drag-table',
    //   component: () => import('@/views/table/drag-table'),
    //   name: 'DragTable',
    //   meta: { title: 'Drag Table' }
    // },
    // {
    //   path: 'inline-edit-table',
    //   component: () => import('@/views/table/inline-edit-table'),
    //   name: 'InlineEditTable',
    //   meta: { title: 'Inline Edit' }
    // },
    {
      path: 'menu',
      name: 'FileMenu',
      component: () => import('@/views/Menu'),
      meta: { title: '文件翻译进度', affix: false }
    },
    {
      path: 'files',
      component: () => import('@/views/file/File'),
      name: 'FileList',
      meta: { title: '文件校对' }
    },
    {
      path: 'words',
      component: () => import('@/views/table/word-table'),
      name: 'WordTable',
      meta: { title: '翻译列表', affix: false }
    },
    {
      path: 'terms',
      component: () => import('@/views/table/term-table'),
      name: 'TermTable',
      meta: { title: '术语表', affix: false }
    },
    {
      path: 'word/:id',
      component: () => import('@/views/table/word'),
      name: 'Word',
      hidden: true,
      meta: { title: '单词校对' }
    },
    {
      path: 'key-words',
      component: () => import('@/views/table/key-word-table'),
      name: 'KeyWordList',
      meta: { title: '关键词批量修正', affix: false, roles: ['admin'] // you can set roles in root nav
      }
    },
    {
      path: 'invite-codes',
      component: () => import('@/views/table/invite-code-table'),
      name: 'InviteCodeList',
      meta: { title: '邀请码管理', affix: false, roles: ['admin'] }
    },
    {
      path: 'render',
      name: 'Render',
      component: () => import('@/views/file/Render'),
      meta: { title: '高级模式', affix: false }
    }
  ]
}
export default tableRouter
