import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Reader from '../pages/Reader.vue'
import ReaderPrototype from '../pages/ReaderPrototype.vue'
import Review from '../pages/Review.vue'
import Vocabulary from '../pages/Vocabulary.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/reader',
    name: 'reader',
    component: Reader,
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
