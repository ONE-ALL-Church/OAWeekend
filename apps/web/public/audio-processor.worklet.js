/**
 * AudioWorklet processor that converts browser audio (float32, native sample rate)
 * to Deepgram's required format (linear16, 16kHz mono).
 *
 * This runs in a separate thread and posts PCM buffers to the main thread.
 */

const TARGET_SAMPLE_RATE = 16000;

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.resampleRatio = sampleRate / TARGET_SAMPLE_RATE;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channelData = input[0]; // mono - first channel only

    // Calculate audio level (RMS) for VU meter
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / channelData.length);

    // Downsample to 16kHz
    const outputLength = Math.floor(channelData.length / this.resampleRatio);
    const resampled = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = Math.floor(i * this.resampleRatio);
      resampled[i] = channelData[Math.min(srcIndex, channelData.length - 1)];
    }

    // Convert float32 [-1, 1] to int16 [-32768, 32767]
    const pcm16 = new Int16Array(resampled.length);
    for (let i = 0; i < resampled.length; i++) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Post the PCM buffer and audio level to main thread
    this.port.postMessage(
      {
        type: "audio",
        pcm: pcm16.buffer,
        audioLevel: rms,
      },
      [pcm16.buffer]
    );

    return true;
  }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
