import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const TOKEN_KEY = 'me-auth-token'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'welcome',
    component: () => import('@/pages/welcome'),
    meta: { requiresAuth: true }
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/pages/explore'),
    meta: { public: true }
  },
  {
    path: '/wander',
    name: 'wander',
    component: () => import('@/pages/wander'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' })
  } else if (to.name === 'login' && token) {
    next({ name: 'welcome' })
  } else {
    next()
  }
})

export default router
