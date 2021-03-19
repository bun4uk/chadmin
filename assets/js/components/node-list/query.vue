<template>
  <transition name="slide-fade">
    <div
        :class="[this.$style['query-box'], 'row', 'pb-1', 'pt-1']"
        :style="'background-color:rgba(130, 0, 0,' + query.elapsed/1000 + ');'"
    >
      <div class="col-2">
        {{ query.user }}
      </div>
      <div class="col-2">
        {{ query.elapsed.toFixed(2) }} sec.
      </div>


      <div class="col-2 query-memory-usage"
           :data-tooltip="'read_bytes: ' + query.formatted_read_bytes +
'\nwritten_bytes: '+ query.formatted_written_bytes +
'\nread_rows: ' + query.read_rows +
'\nwritten_rows: ' + query.written_rows">

        {{ query.formatted_memory_usage }}
      </div>
      <div :class="[this.$style['sql_query'] , 'col-4']" tabindex="0"
           :data-tooltip="query.query"
           @mouseover="showCopy = true"
           @mouseleave="showCopy = false"
      >
        <button
            :class="['btn','btn-sm', 'btn-secondary', this.$style['btn-copy']]"
            v-show="showCopy === true"
            v-clipboard="query.query"
        >
          copy query
        </button>
        <button
            :class="['btn','btn-sm', 'btn-secondary', this.$style['btn-copy']]"
            v-show="showCopy === true"
            v-clipboard="query.query_id"
            style="left: 110px"
        >
          copy id
        </button>
        {{ query.query_id }}
      </div>
      <div class="col-2 text-left">
      <span v-if="query.is_cancelled">
          Розбійник виходить
        </span>
        <span
            v-else-if="!isKilled"
            href="#"
            class="btn-sm btn-danger"
            data-tooltip="Kill query 🔪"
            @click="handleKillQuery(cluster, query.query_id)"
        >
          X
        </span>
        <span v-else>
          Розбійник виходить
        </span>
      </div>
    </div>
  </transition>
</template>

<script>
import axios from 'axios';


export default {
  name: 'Query',
  data: () => ({
    isKilled: false,
    showCopy: false
  })
  ,
  props: {
    query: {
      type: Object,
      required: true,
    },
    cluster: {
      type: String,
      default: ''
    },
  },
  methods: {
    async handleKillQuery(cluster, queryId) {
      this.toggleIsKilled();
      const response = await axios.get('/api/kill-query/' + queryId);
    },
    toggleIsKilled() {
      this.isKilled = !this.isKilled
    }
  },
  computed: {
    /**
     *
     * @returns {string}
     */
    price() {
      return (this.product.price / 100).toLocaleString('en-US', {minimumFractionDigits: 2});
    },
  },
};
</script>

<style lang="scss" module>
@import '~styles/components/light-component.scss';

.query-box {
  line-height: 2;
  border-bottom: 1px solid lightblue;
}

.query {
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

[data-tooltip] {
  position: relative;
  cursor: pointer;
}

[data-tooltip]::after {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  content: attr(data-tooltip);
  left: 0;
  top: calc(100% + 1px);
  border-radius: 3px;
  box-shadow: 0 0 5px 2px rgba(100, 100, 100, 0.6);
  background-color: white;
  z-index: 10;
  padding: 8px;
  width: 195px;
  transform: translateY(-20px);
  transition: all 150ms cubic-bezier(.25, .8, .25, 1);
  color: black;
}

[data-tooltip]:hover::after, [data-tooltip]:active::after, [data-tooltip]:focus::after {
  opacity: 1;
  transform: translateY(0);
  transition-duration: 300ms;
  white-space: pre;
}

.sql_query[data-tooltip]::after {
  left: calc(-100%);
  top: 3vw;
  width: 200%;
  line-height: 1.5;
  overflow: auto;
  overflow-wrap: break-word;
  height: auto;
}

.btn-copy {
  position: absolute;
}
</style>
