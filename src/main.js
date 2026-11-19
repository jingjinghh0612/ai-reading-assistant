import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { applyAppTheme } from './utils/appTheme.js'
import './theme.css'
import './style.css'

applyAppTheme()
createApp(App).use(router).mount('#app')
