<template>
  <transition name="fade">
  <div class="row">
    <div class="container">
      <node
          v-for="(node, nodeIp) in clusterQueries"
          :key="node['@id']"
          :nodeQueries="node"
          :nodeIp="nodeIp"
      />
    </div>
  </div>
  </transition>
</template>
<script>
// import Query from '@/components/node-list/query';
import Node from '@/components/node-list/node';

export default {
  name: 'NodeList',
  components: {
    Node,
  },
  props: {
    clusterQueries: {
      type: Object,
      required: true,
    },
  },
};
</script>
