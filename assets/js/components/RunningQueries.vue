<style lang="scss" module>
@import "../../scss/components/light-component";
@import "../../scss/components/black-component";

</style>

<template>
  <div class="container-fluid">
    <div class="row">
      <aside
          :class="asideClass"
      >
        <sidebar-component
            :collapsed="sidebarCollapsed"
            :currentCluster="cluster"
            @toggle-collapsed="toggleSidebarCollapsed"
            @change-cluster="changeCluster"
        />
      </aside>
      <div :class="contentClass">
        <cluster-component :cluster="cluster"/>
      </div>
    </div>
  </div>
</template>

<script>

import ClusterComponent from '@/components/cluster';
import SidebarComponent from '@/components/sidebar';
import axios from "axios";

export default {
  name: 'RunningQueries',
  components: {
    SidebarComponent,
    ClusterComponent,
  },
  data() {
    return {
      sidebarCollapsed: false,
      cluster: ''
    };
  },
  created() {
    this.fetchClusterName();
  },
  computed: {
    asideClass() {
      return this.sidebarCollapsed ? 'aside-collapsed col-1' : 'col-xs-12 col-3';
    },
    contentClass() {
      return this.sidebarCollapsed ? 'col-xs-12 col-11' : 'col-xs-12 col-9';
    },
  },
  methods: {
    async fetchClusterName() {
      const response = await axios.get('/api/get-cluster-name');
      this.cluster = response.data.cluster;
    },
    toggleSidebarCollapsed() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    changeCluster(cluster) {
      console.log(cluster);
      this.cluster = cluster
    }
  },
};
</script>
