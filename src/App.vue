<template>
  <div id="app">
    <div>
      <section>
        <div>
          <h1 class="title">Vue AudioWorklet Demo</h1>
          <div class="field is-grouped is-grouped-multiline is-grouped-centered">
            <div class="control tags has-addons">
              <span class="tag">Web Audio</span>
              <template v-if="webAudioEnabled"
                ><span class="tag is-primary">Enabled</span></template
              >
              <template v-else
                ><span class="tag is-error">Disabled</span></template
              >
            </div>
            <div class="control tags has-addons">
              <span class="tag">AudioWorklet</span>
              <template v-if="audioWorkletEnabled"
                ><span class="tag is-primary">Enabled</span></template
              >
              <template v-else
                ><span class="tag is-error">Disabled</span></template
              >
            </div>
          </div>

          <h2 class="subtitle">
            Press start to run the demo worklet.
          </h2>

          <section class="worklet-demo">
            <div class="gain-controls">
              <div class="channel channel-left">
                <div class="channel-controls">
                  <div>
                    <meter ref="audioMeterLeft" :value="rightChannelLevel" min="0" max="255"></meter>
                  </div>
                  <div>
                    <input
                      class="gain"
                      type="range"
                      v-model="leftGain"
                      @change="updateLeftGain"
                      @input="updateLeftGain"
                      name="leftGain"
                      min="0"
                      max="1"
                      step=".001"
                    />
                  </div>
                </div>
                <div class="channel-label">Left</div>
              </div>
              <div class="channel channel-right">
                <div class="channel-controls">
                  <div>
                    <meter ref="audioMeterRight" :value="leftChannelLevel" min="0" max="255"></meter>
                  </div>
                  <div>
                    <input
                      class="gain"
                      type="range"
                      v-model="rightGain"
                      @change="updateRightGain"
                      @input="updateRightGain"
                      name="rightGain"
                      min="0"
                      max="1"
                      step=".001"
                    />
                  </div>
                </div>
                <div class="channel-label">Right</div>
              </div>
            </div>
            <div class="startStop">
              <template v-if="audioRunning">
                <a class="button is-primary " @click.prevent="stopAudio">Stop</a>
              </template>
              <template v-else>
                <a
                  class="button is-primary"
                  @click.prevent="startAudio"
                  v-bind:disabled="!audioWorkletEnabled || !webAudioEnabled"
                  >Start</a
                >
              </template>
            </div>
            <div class="links">
              <p>
                <a href="https://github.com/montag/vue-audioworklet-demo">Source</a> -
                <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API">Web Audio</a> -
                <a href="https://developers.google.com/web/updates/2017/12/audio-worklet">Audio Worklet Intro</a> -
                <a href="https://webaudio.github.io/web-audio-api/#AudioWorklet">Audio Worklet Spec</a>
              </p>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import audioFileUrl from './assets/audio/he6_getready_break.ogg'
import GainWorklet from './worklet/GainWorklet'

export default {
  name: 'app',

  components: {},

  data() {
    return {
      audioContext: null,
      analysers: null,
      gainWorkletNode: null,
      visualizationEnabled: true,
      rightGain: 0.5,
      rightChannelLevel: 0,
      leftGain: 0.5,
      leftChannelLevel: 0,
      source: null,
      loop: true
    }
  },

  computed: {
    audioRunning() {
      return this.audioContext ? this.audioContext.state === 'running' : false
    }
  },

  created() {
    this.audioWorkletEnabled = this.detectAudioWorklet()
    this.webAudioEnabled = this.detectWebAudio()
  },

  methods: {
    async startAudio() {
      // reset gain to protect eardrums
      this.rightGain = 0.5
      this.leftGain = 0.5
      this.source = await this.setupAudioGraph()
      if (this.source) {
        this.source.loop = this.loop
        this.source.start(0)
      }
    },

    stopAudio() {
      this.source.stop(0)
      this.source.disconnect()
      this.rightChannelLevel = 0
      this.leftChannelLevel = 0
      if (this.animationLoopId) {
        cancelAnimationFrame(this.animationLoopId)
      }
      if (this.audioContext) {
        try {
          this.audioContext.close()
        } catch (error) {
          // console.log('error closing context', error)
        }
        this.audioContext = null
      }
      this.analysers = null
    },

    async updateLeftGain() {
      let gain = await this.gainWorkletNode.parameters.get('gainChannel_0')
      gain.setValueAtTime(this.leftGain, this.audioContext.currentTime)
    },

    async updateRightGain() {
      let gain = await this.gainWorkletNode.parameters.get('gainChannel_1')
      gain.setValueAtTime(this.rightGain, this.audioContext.currentTime)
    },

    async setupAudioGraph() {
      // Create a new audio context
      let context = new AudioContext()
      this.audioContext = context
      // Create a buffer and load the audio file
      const source = context.createBufferSource()
      const audioData = await this.loadAudioClip(audioFileUrl)
      let decodedAudioData = null
      let gainWorkletNode = null
      try {
        decodedAudioData = await context.decodeAudioData(audioData)
      } catch (error) {
        // console.log('unable to decode audio data', error)
        return
      }
      // Load and create the worklet
      try {
        await context.audioWorklet.addModule(GainWorklet)
        gainWorkletNode = new AudioWorkletNode(context, 'gain-worklet')
      } catch (error) {
        // console.log('unable to create worklet', error)
        return
      }
      this.gainWorkletNode = gainWorkletNode
      // Now we can build the audio graph...
      // Fill the buffer with audio data
      source.buffer = decodedAudioData
      // Connect the source buffer node to the worklet
      source.connect(gainWorkletNode)
      // Create a splitter for the visualization
      const splitter = context.createChannelSplitter(source.channelCount)
      // Connect the worklet to the splitter
      gainWorkletNode.connect(splitter)
      // Connect the worklet to the destination output (this is what you hear)
      gainWorkletNode.connect(context.destination)
      // Add visualization that shows the gain for each channel
      if (this.visualizationEnabled) {
        this.analysers = new Map()
        for (let i = 0; i < source.channelCount; i++) {
          let analyser = context.createAnalyser()
          analyser.fftSize = 128
          analyser.minDecibels = -70
          analyser.maxDecibels = -25
          analyser.smoothingTimeConstant = 0.8
          this.analysers.set(i, analyser)
          splitter.connect(analyser, i, 0)
        }
        // Start the animations
        this.updateLevels()
      }
      return source
    },

    updateLevels() {
      for (let [key, analyser] of this.analysers) {
        let buffer = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(buffer)
        let maxVal = 0
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          maxVal = Math.max(maxVal, buffer[i])
        }
        if (key === 0) {
          this.rightChannelLevel = maxVal
        } else {
          this.leftChannelLevel = maxVal
        }
      }
      this.animationLoopId = requestAnimationFrame(this.updateLevels)
    },

    async loadAudioClip(url) {
      const response = await fetch(url)
      return await response.arrayBuffer()
    },

    detectAudioWorklet() {
      let context = new OfflineAudioContext(1, 1, 44100)
      return Boolean(context && context.audioWorklet && typeof context.audioWorklet.addModule === 'function')
    },

    detectWebAudio() {
      return !!(window.webkitAudioContext || window.AudioContext)
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 25px;
}

.gain-controls {
  padding: 0;
  margin: 0;
  list-style: none;
  display: -webkit-box;
  display: -webkit-flex;
  display: flex;
  justify-content: center;
}

.channel {
  border: solid 1px grey;
  padding: 5px;
  margin-top: 10px;
  line-height: 4rem;
  text-align: center;
  width: 10rem;
}

.startStop {
  padding: 1rem;
}

.button {
  width: 10rem;
}

input[type='range'] {
  width: 100%;
}

meter {
  width: 100%;
}

.footer {
  background-color: white !important;
  padding: 3rem 1.5rem 6rem;
}

.links {
  margin-top: 1rem;
}

a {
  padding: 1rem;
}
</style>
