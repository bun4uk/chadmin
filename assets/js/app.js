import '../scss/app.scss';
import Vue from 'vue';
import PrettyCheckbox from 'pretty-checkbox-vue';
import Routes from './routes.js';
import App from './pages/App';
import Clipboard from 'v-clipboard'

Vue.use(Clipboard)
Vue.use(PrettyCheckbox);

const app = new Vue({
    el: '#app',
    router: Routes,
    render: h => h(App),
}).$mount('#app');

export default app;