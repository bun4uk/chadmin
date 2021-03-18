<template>
  <div class="row">
    <transition name="fade">
      <div :class="[this.$style['node-box'], 'col-xs-12', 'col-12', 'mb-2','pb-2']">
        <h2>
          Node: {{ nodeIp }}
        </h2>
        <div class="container-fluid">
          <query
              v-for="nodeQuery in nodeQueries"
              :key="nodeQuery['@id']"
              :query="nodeQuery"/>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import Query from '@/components/node-list/query';


export default {
  name: 'Node',
  components: {
    Query,
  },
  props: {
    nodeQueries: {
      type: Array,
      required: true,
    },
    nodeIp: {
      type: String,
      required: true,
    }
  },
  computed: {
    df() {
      console.log(this.nodeQueries);
    }
  }
};
</script>

<style lang="scss" module>
@import '~styles/components/light-component.scss';

.node-box {
  border: 1px solid $light-component-border;
  box-shadow: 0 0 7px 4px #efefee;
  border-radius: 5px;
}

.image {
  img {
    width: 100%;
    height: auto;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
  }

  h3 {
    font-size: 1.2rem;
  }
}
</style>
