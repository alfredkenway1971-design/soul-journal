// Converts a recorded webm/opus blob into a 16kHz mono WAV blob.
// The self-hosted Whisper server rejects webm, so we decode in the browser
// (which can read what it just recorded) and re-encode as WAV.
export async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Downmix to mono 16kHz (what Whisper prefers)
    const sampleRate = 16000;
    const numFrames = Math.ceil(audioBuffer.duration * sampleRate);
    const samples = new Float32Array(numFrames);
    const orig = audioBuffer.getChannelData(0);
    const ratio = audioBuffer.sampleRate / sampleRate;
    for (let i = 0; i < numFrames; i++) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, orig.length - 1);
      const frac = pos - i0;
      samples[i] = orig[i0] * (1 - frac) + orig[i1] * frac;
    }

    return new Blob([encodeWav(samples, sampleRate)], { type: "audio/wav" });
  } finally {
    audioCtx.close();
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}
