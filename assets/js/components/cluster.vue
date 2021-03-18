<template>
  <div class="container-fluid">
    <div class="row mb-1">
      <div class="col-12">
        <div class="row">
          <h1>
            {{ this.cluster }} Queries
          </h1>
          <div class="container-fluid">
            <div class="d-flex flex-row-reverse">
              <div class="p-1">
                <loading-btn
                    aria-label="Post message"
                    class="button"
                    style="width: 100px;"
                    @click.native="forceRefresh"
                    :loading="isLoading"
                    :styled=true
                >
                  🔄
                </loading-btn>
              </div>
              <div class="p-1">
                <p-input
                    type="checkbox"
                    name="check"
                    color="success"
                    class="pretty p-switch p-fill"
                    :v-model="auto_refresh"
                    @change="handleChangeAutorefresh"
                    :checked="auto_refresh"
                >Auto-refresh</p-input>
              </div>

                <div class="p-1">
                  <label for="refresh_interval">refresh interval</label>
                  <select name="" id="refresh_interval" v-model="refresh_interval" @change="handleChangeRefreshInterval">
                    <option value="5">5 sec</option>
                    <option value="10">10 sec</option>
                    <option value="30">30 sec</option>
                    <option value="60">1 min</option>
                    <option :value="60*5">5 min</option>
                    <option :value="60*10">10 min</option>
                  </select>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
    <transition name="fade">
      <node-list :clusterQueries="clusterQueries"/>
    </transition>
  </div>
</template>
<script>
import axios from 'axios';
import NodeList from '@/components/node-list';
import LoadingBtn from "@/components/LoadingBtn";

export default {
  name: 'Cluster',
  props: {
    cluster: {
      type: String,
      default: ''
    },
  },
  components: {
    NodeList,
    LoadingBtn
  },
  data: () => ({
    clusterQueries: {},
    timer: 0,
    auto_refresh: true,
    refresh_interval: 30,
    isLoading: false
  }),
  created() {
    this.fetchEventsList();
    this.updateInterval(this.refresh_interval);
  },
  watch: {
    cluster: function () {
      this.forceRefresh();
    }
  },
  methods: {
    async fetchEventsList() {
      this.isLoading = true;
      const response = await axios.get('/api/cluster-processes/');
      this.clusterQueries = response.data.processes;
      this.isLoading = false;
    },
    handleChangeRefreshInterval(e) {
      this.updateInterval(e.target.value);
    },
    handleChangeAutorefresh() {
      console.log('handleChangeRefreshInterval');
      this.auto_refresh = !this.auto_refresh;
      this.updateInterval(this.refresh_interval);
    },
    updateInterval(refreshInterval) {
      clearInterval(this.timer);
      console.log('updateInterval', this.auto_refresh);
      if (this.auto_refresh) {
        this.timer = setInterval(this.fetchEventsList, refreshInterval * 1000);
      }
    },
    forceRefresh() {
      this.isLoading = true;
      clearInterval(this.timer);
      this.fetchEventsList();
      this.updateInterval(this.refresh_interval);
    },
  },
  beforeDestroy() {
    clearInterval(this.timer)
  }
};
</script>

<style lang="scss" module>

.refresh_btn {
  cursor: pointer;
  font-size: 20px;
  display: block;
  width: 21px;
  height: 30px;

  &:active {
    font-size: 18px;
  }
}

</style>