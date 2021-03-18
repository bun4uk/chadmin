<template>
  <div
      :class="[this.$style['component'], 'p-3', 'mb-5']"
  >
    <div
        v-show="!collapsed"
    >
      <h5 class="text-center">
        Clusters
      </h5>

      <ul class="nav flex-column mb4">
        <li
            v-for="(cluster, index) in clusters"
            :key="index"
            :class="[cluster.cluster === currentCluster ? $style['current-cluster'] : 'nav-item']"
        >
          <a
              class="nav-link"
              :href="cluster.link"
              :data-cluster="cluster.name"
              @click="$emit('change-cluster', cluster.cluster)"
          >
            {{ cluster.name }}
          </a>
        </li>
      </ul>

      <hr>
    </div>

    <div class="d-flex justify-content-end">
      <button
          class="btn btn-secondary btn-sm"
          @click="$emit('toggle-collapsed')"
          v-text="collapsed ?'>>':'<< Collapse'"
      />
    </div>
  </div>
</template>
<script>
import axios from "axios";

export default {
  name: 'Sidebar',
  props: {
    collapsed: {
      type: Boolean,
      required: true,
    },
    currentCluster: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      clusters: [
      ],
    };
  },
  created() {
    this.fetchClusterList();
  },
  computed: {},
  methods: {
    async fetchClusterList() {
      const response = await axios.get('/api/get-cluster-list');
      let clusters = [];
      let name = '';
      for (let cluster in response.data) {
        name = response.data[cluster];
        clusters.push({'name': name, 'cluster': name, 'link': '#'})
      }
      this.clusters = clusters;
    }
  },
};
</script>

<style lang="scss" module>
@import "~styles/components/light-component";
@import "~styles/components/black-component";

.component {
  @include light-component;

  ul {
    li a:hover {
      background: $blue-component-link-hover;
    }
  }
}

.current-cluster {
  background-color: #dce1f1;
}
</style>

