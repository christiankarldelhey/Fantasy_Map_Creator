import { createApp } from 'vue'
import './app/styles/index.css'
import App from './App.vue'
import router from './app/router'

const app = createApp(App)
app.use(router)
app.mount('#app')
