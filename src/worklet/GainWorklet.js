/* eslint-disable */
class GainWorklet extends AudioWorkletProcessor {
  constructor() {
    super()
  }

  static get parameterDescriptors() {
    return [
      { name: 'gainChannel_0', defaultValue: 0.5 },
      { name: 'gainChannel_1', defaultValue: 0.5 }
    ]
  }

  /**
   * Normally for gain you would normally just use a splitter and a GainNode for each channel,
   * but for this example, we'll use an AudioWorklet to set the gain for each channel.
   *
   * @param inputs
   * @param outputs
   * @param parameters
   * @returns {boolean}
   */
  process(inputs, outputs, parameters) {
    // inputs is a sequence of sequences of 128 frame float32's. We just want the first input sequence.
    const input = inputs[0]
    const output = outputs[0]

    for (let channel = 0; channel < output.length; ++channel) {
      const inputChannel = input[channel]
      const outputChannel = output[channel]
      // parameters contains our audioParams for each channel
      let gain = parameters[`gainChannel_${channel}`]
      // handle a-rate and k-rate values and multiply by the gain values
      if (gain.length === 1) {
        for (let i = 0; i < inputChannel.length; ++i) outputChannel[i] = inputChannel[i] * gain[0]
      } else {
        for (let i = 0; i < inputChannel.length; ++i) outputChannel[i] = inputChannel[i] * gain[i]
      }
    }
    return true
  }
}
registerProcessor('gain-worklet', GainWorklet)
