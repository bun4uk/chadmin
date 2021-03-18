import Vue from 'vue';
import VueRouter from 'vue-router';

import RunningQueries from "@/components/RunningQueries";

Vue.use(VueRouter);

const router = new VueRouter({
    mode: 'history',
    routes: [
        {
            path: '/',
            name: 'rq',
            component: RunningQueries
        }
    ]
});

export default router;