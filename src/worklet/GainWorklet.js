/* eslint-disable */
class GainWorklet extends AudioWorkletProcessor {
  constructor() {
    super()
    this.port.postMessage({ msg: 'Processor created on the audio thread.'})
  }

  static get parameterDescriptors() {
    return [
      { name: 'gainChannel_0',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate"
      },
      { name: 'gainChannel_1',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate"
      }
    ]
  }

  /**
   * Normally for gain you would  just use a GainNode and possibly SplitterNode(s), but for
   * this example, we'll use an AudioWorklet to independently set the gain for each channel.
   *
   * see: https://developers.google.com/web/updates/2017/12/audio-worklet
   *
   * @param inputs
   * @param outputs
   * @param parameters
   * @returns {boolean}
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel]
      const outputChannel = output[channel]
      // parameters contains our audioParams for each channel
      let gain = parameters[`gainChannel_${channel}`]
      for (let i = 0; i < inputChannel.length; ++i) outputChannel[i] = inputChannel[i] * gain[0]
    }
    return true
  }
}
registerProcessor('gain-worklet', GainWorklet)
