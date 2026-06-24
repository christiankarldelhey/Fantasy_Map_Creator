import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'welcome',
    component: () => import('@/pages/welcome')
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/pages/explore')
  },
  {
    path: '/wander',
    name: 'wander',
    component: () => import('@/pages/wander')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
