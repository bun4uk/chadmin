<template>
  <section class="hero is-danger">
    <div class="hero-body">
      <div class="container">
        <h1 class="title">
          404 Page not found
        </h1>
        <p class="subtitle">
          its just another vue route - you can change the url above to any thing
        </p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "notFound"
}
</script>

<style scoped lang="scss">
.title {
  color: #0000F0;
}

.hero-body {
  background-color: gray;
  padding: 15px;

  .title {
    color: white;
  }
}
</style>