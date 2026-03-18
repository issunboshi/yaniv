#!/usr/bin/env node
/**
 * Generates simple sine-wave WAV files for Yaniv game sound effects.
 * Each sound has a distinct frequency and duration.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../static/sounds');
mkdirSync(outDir, { recursive: true });

function generateWav(frequency, durationMs, fadeOut = true) {
  const sampleRate = 44100;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const amplitude = 0.4;

  // WAV header: 44 bytes
  const dataSize = numSamples * 2; // 16-bit PCM
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // chunk size
  buffer.writeUInt16LE(1, 20);        // PCM
  buffer.writeUInt16LE(1, 22);        // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);        // block align
  buffer.writeUInt16LE(16, 34);       // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 1.0;
    if (fadeOut) {
      // simple linear fade-out in last 30%
      const fadeStart = numSamples * 0.7;
      if (i > fadeStart) {
        env = 1.0 - (i - fadeStart) / (numSamples - fadeStart);
      }
    }
    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * env;
    const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(pcm, 44 + i * 2);
  }

  return buffer;
}

function generateChord(frequencies, durationMs) {
  const sampleRate = 44100;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const amplitude = 0.3 / frequencies.length;

  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeStart = numSamples * 0.6;
    let env = i > fadeStart ? 1.0 - (i - fadeStart) / (numSamples - fadeStart) : 1.0;
    let sample = 0;
    for (const freq of frequencies) {
      sample += Math.sin(2 * Math.PI * freq * t);
    }
    sample *= amplitude * env;
    const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(pcm, 44 + i * 2);
  }

  return buffer;
}

// yaniv: triumphant ascending tone (523Hz C5 → 659Hz E5), 400ms
function generateYaniv() {
  const sampleRate = 44100;
  const durationMs = 400;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    const freq = 523 + (659 - 523) * progress;
    const env = progress < 0.8 ? 1.0 : 1.0 - (progress - 0.8) / 0.2;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * env;
    const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(pcm, 44 + i * 2);
  }
  return buffer;
}

const sounds = {
  'yaniv': generateYaniv(),                        // triumphant ascending
  'assaf': generateChord([392, 523, 659], 500),    // G4+C5+E5 - surprise chord
  'halving': generateWav(880, 200),                // high A5 - short ding
  'elimination': generateWav(196, 600),            // low G3 - ominous
  'win': generateChord([261, 329, 392, 523], 800), // C maj chord - victory
};

for (const [name, data] of Object.entries(sounds)) {
  const path = join(outDir, `${name}.wav`);
  writeFileSync(path, data);
  console.log(`Generated ${path} (${data.length} bytes)`);
}

console.log('Done.');
