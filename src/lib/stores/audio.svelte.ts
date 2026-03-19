import { Howl } from 'howler';
import { settingsStore } from './settings.svelte';

const sounds: Record<string, Howl> = {};

function getSound(name: string): Howl {
  if (!sounds[name]) {
    sounds[name] = new Howl({
      src: [`/sounds/${name}.mp3`, `/sounds/${name}.wav`],
      volume: settingsStore.current.soundVolume,
    });
  }
  return sounds[name];
}

export const audio = {
  play(name: 'yaniv' | 'assaf' | 'halving' | 'elimination' | 'win') {
    if (!settingsStore.current.soundEnabled) return;
    const sound = getSound(name);
    sound.volume(settingsStore.current.soundVolume);
    sound.play();
  },
};
