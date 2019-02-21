<template>
  <div id="app">
    <div>
      <section>
        <div>
          <h1 class="title">Vue AudioWorklet Demo</h1>
          <div class="field is-grouped is-grouped-multiline is-grouped-centered">
            <div class="control tags has-addons">
              <span class="tag">Web Audio</span>
              <span class="tag" :class="[webAudioEnabled ? 'is-primary' : 'is-danger']">
                {{ webAudioEnabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="control tags has-addons">
              <span class="tag">AudioWorklet</span>
              <span class="tag" :class="[audioWorkletEnabled ? 'is-primary' : 'is-danger']">
                {{ audioWorkletEnabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="control tags has-addons">
              <span class="tag">GetUserMedia</span>
              <span class="tag" :class="[getUserMediaEnabled ? 'is-primary' : 'is-danger']">
                {{ getUserMediaEnabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>

          <h2 class="subtitle">
            Press start to run the demo worklet with either a file or the local microphone.
          </h2>

          <section class="worklet-demo">
            <div class="gain-controls">
              <audio-channel v-model="leftGain" :level="leftChannelLevel" @update="updateLeftGain" label="Left" />
              <audio-channel v-model="rightGain" :level="rightChannelLevel" @update="updateRightGain" label="Right" />
            </div>
            <div class="startStop">
              <a
                class="button is-primary"
                :disabled="!audioWorkletEnabled || !webAudioEnabled || micRunning"
                @click.prevent="fileRunning ? stopAudio() : startAudio(createFileSource)"
              >
                {{ fileRunning ? 'Stop Audio' : 'Start Audio' }}
              </a>
              <div>or</div>
              <a
                class="button is-primary"
                :disabled="!audioWorkletEnabled || !webAudioEnabled || !getUserMediaEnabled || fileRunning"
                @click.prevent="micRunning ? stopAudio() : startAudio(createMicSource)"
              >
                {{ micRunning ? 'Stop Mic' : 'Start Mic' }}
              </a>
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
import AudioChannel from './components/AudioChannel'

export default {
  name: 'app',

  components: {
    AudioChannel
  },

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
    },
    fileRunning() {
      return this.audioRunning && this.source && this.source[Symbol.toStringTag] === 'AudioBufferSourceNode'
    },
    micRunning() {
      return this.audioRunning && this.source && this.source[Symbol.toStringTag] === 'MediaStreamAudioSourceNode'
    }
  },

  created() {
    this.audioWorkletEnabled = this.detectAudioWorklet()
    this.webAudioEnabled = this.detectWebAudio()
    this.getUserMediaEnabled = this.detectGum()
  },

  methods: {
    async startAudio(sourceFunction) {
      this.resetLevels()
      const context = new AudioContext()
      let source = null
      try {
        source = await sourceFunction(context)
      } catch (error) {
        console.log('error creating audio source')
        return
      }
      try {
        await this.setupAudioGraph(context, source)
      } catch (error) {
        console.log('error creating audio graph')
        return
      }
      if (source[Symbol.toStringTag] === 'AudioBufferSourceNode') {
        source.loop = this.loop
        source.start(0)
      }
      this.audioContext = context
      this.source = source
    },

    stopAudio() {
      if (this.audioContext) {
        try {
          this.audioContext.close()
        } catch (error) {
          // console.log('error closing context', error)
        }
        this.audioContext = null
      }
      if (this.animationLoopId) {
        cancelAnimationFrame(this.animationLoopId)
      }
      this.rightChannelLevel = 0
      this.leftChannelLevel = 0
      this.analysers = null
      this.source = null
    },

    resetLevels() {
      // reset gain to protect eardrums
      this.rightGain = 0.5
      this.leftGain = 0.5
    },

    async updateLeftGain() {
      let gain = await this.gainWorkletNode.parameters.get('gainChannel_0')
      gain.setValueAtTime(this.leftGain, this.audioContext.currentTime)
    },

    async updateRightGain() {
      let gain = await this.gainWorkletNode.parameters.get('gainChannel_1')
      gain.setValueAtTime(this.rightGain, this.audioContext.currentTime)
    },

    async createFileSource(context) {
      // Load the audio file
      const audioData = await this.loadAudioClip(audioFileUrl)
      let decodedAudioData = null
      decodedAudioData = await context.decodeAudioData(audioData)
      const fileSource = context.createBufferSource()
      fileSource.buffer = decodedAudioData
      return fileSource
    },

    async createMicSource(context) {
      const constraints = { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      return context.createMediaStreamSource(stream)
    },

    async setupAudioGraph(context, source) {
      // create worklet processor and worklet node
      let gainWorkletNode = null
      await context.audioWorklet.addModule(GainWorklet)
      gainWorkletNode = new AudioWorkletNode(context, 'gain-worklet')
      gainWorkletNode.port.onmessage = event => {
        console.log('Worklet Message:', event.data.msg)
      }
      this.gainWorkletNode = gainWorkletNode
      // Connect the source node to the worklet
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
          this.leftChannelLevel = maxVal
        } else {
          this.rightChannelLevel = maxVal
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
    },

    detectGum() {
      return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
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

.startStop {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button {
  width: 6rem;
  margin: 0.5rem;
}

.links {
  margin-top: 1rem;
}

a {
  padding: 1rem;
}
</style>
