<template>
  <div class="channel">
    <div class="channel-controls">
      <div>
        <meter :value="level" :min="gainMin" :max="gainMax"></meter>
      </div>
      <div>
        <input
          class="gain"
          type="range"
          :value="internalValue"
          @input="internalValue = $event.currentTarget.value"
          :min="rangeMin"
          :max="rangeMax"
          :step="rangeStep"
        />
      </div>
    </div>
    <div class="channel-label">{{ label }}</div>
  </div>
</template>

<script>
export default {
  name: 'AudioChannel',

  model: {
    event: 'update'
  },

  data() {
    return {
      gainMin: 0,
      gainMax: 255,
      rangeMin: 0,
      rangeMax: 1,
      rangeStep: 0.001
    }
  },

  props: {
    level: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    value: {}
  },

  computed: {
    internalValue: {
      get() {
        return this.value
      },
      set(value) {
        this.$emit('update', value)
      }
    }
  }
}
</script>

<style scoped lang="scss">
.channel {
  border: solid 1px grey;
  padding: 5px;
  margin-top: 10px;
  line-height: 4rem;
  text-align: center;
  width: 10rem;
}

input[type='range'] {
  width: 100%;
}

meter {
  width: 100%;
}
</style>
