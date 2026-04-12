// Type declarations for AudioWorklet global scope
// These types are not included in standard lib.dom.d.ts

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

declare const sampleRate: number;
declare const currentTime: number;
declare const currentFrame: number;
