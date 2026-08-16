import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import ReaderLegacy from '../pages/Reader.vue'
import ReaderPrototype from '../pages/ReaderPrototype.vue'
import ReaderWorkspace from '../pages/ReaderWorkspace.vue'
import Review from '../pages/Review.vue'
import Vocabulary from '../pages/Vocabulary.vue'

const routes = [
  {
    path: '/',
    redirect: '/reader',
  },
  {
    path: '/home',
    name: 'home',
    component: Home,
  },
  {
    path: '/reader',
    name: 'reader',
    component: ReaderWorkspace,
    meta: {
      standalone: true,
    },
  },
  {
    path: '/reader-prototype',
    name: 'reader-prototype',
    component: ReaderPrototype,
    meta: {
      standalone: true,
    },
  },
  {
    path: '/reader-legacy',
    name: 'reader-legacy',
    component: ReaderLegacy,
  },
  {
    path: '/vocabulary',
    name: 'vocabulary',
    component: Vocabulary,
  },
  {
    path: '/review',
    name: 'review',
    component: Review,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
