/** When your routing table is too long, you can split it into small modules **/

import Layout from '@/layout'

const tableRouter = {
  path: '/table',
  component: Layout,
  redirect: '/table/menu',
  name: 'Table',
  meta: {
    title: 'Table',
    icon: 'table'
  },
  children: [
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
      meta: { title: '文件翻译进度', affix: true }
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
      meta: { title: '翻译列表', affix: true }
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
      meta: { title: '关键词批量修正', affix: true, roles: ['admin'] // you can set roles in root nav
      }
    }
  ]
}
export default tableRouter
