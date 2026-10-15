// Web Audio API Engine for Voice Chatrooms
// Provides real-time microphone volume analysis, sound effects, and ambient background vibes

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// -------------------------------------------------------------
// SOUND EFFECTS
// -------------------------------------------------------------

export function playChimeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Dual crystal chime
    const notes = [587.33, 880]; // D5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.55);
    });
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export function playPopSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export function playClapSound() {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 2.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export function playMicToggleSound(isUnmuted: boolean) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = isUnmuted ? 300 : 600;
    const endFreq = isUnmuted ? 600 : 300;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export function playGongSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 1.2);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.25);
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export function playVictorySound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.55);
    });
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export function playDiceRollSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(260 + Math.random() * 300, now + i * 0.05);
      gain.gain.setValueAtTime(0.12, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.05);
    }
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

// -------------------------------------------------------------
// AMBIENT VIBE GENERATOR
// -------------------------------------------------------------

export interface AmbientController {
  stop: () => void;
  setVolume: (v: number) => void;
}

export function startAmbientVibe(
  type: 'lofi' | 'rain' | 'cafe' | 'synth',
  initialVolume = 0.2
): AmbientController {
  try {
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(initialVolume, ctx.currentTime + 1.2);
    masterGain.connect(ctx.destination);

    const activeNodes: (AudioNode | { stop?: () => void })[] = [];

    if (type === 'rain') {
      // Pink / brown filtered rain noise
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;

      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      activeNodes.push(noise);
    } else if (type === 'lofi') {
      // Warm chill lo-fi chords + subtle vinyl crackle
      const chordFreqs = [196.00, 246.94, 293.66, 369.99]; // G3, B3, D4, F#4
      chordFreqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        oscGain.gain.value = 0.04;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 850;

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        activeNodes.push(osc);
      });
    } else if (type === 'cafe') {
      // Low warm cafe rumble & ambience
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 450;
      filter.Q.value = 1.0;

      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      activeNodes.push(noise);
    } else if (type === 'synth') {
      // Ethereal ambient space pad
      const droneNotes = [146.83, 220.00, 293.66, 440.00]; // D3, A3, D4, A4
      droneNotes.forEach((f) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        oscGain.gain.value = 0.05;

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        activeNodes.push(osc);
      });
    }

    return {
      stop: () => {
        try {
          const now = ctx.currentTime;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.linearRampToValueAtTime(0.001, now + 0.6);
          setTimeout(() => {
            activeNodes.forEach((node) => {
              if (typeof (node as any).stop === 'function') {
                try { (node as any).stop(); } catch {}
              }
              if (typeof (node as any).disconnect === 'function') {
                try { (node as any).disconnect(); } catch {}
              }
            });
            try { masterGain.disconnect(); } catch {}
          }, 700);
        } catch {}
      },
      setVolume: (v: number) => {
        try {
          const clamped = Math.max(0, Math.min(1, v));
          masterGain.gain.linearRampToValueAtTime(clamped, ctx.currentTime + 0.1);
        } catch {}
      }
    };
  } catch (e) {
    console.debug('Ambient vibe initialization error:', e);
    return {
      stop: () => {},
      setVolume: () => {}
    };
  }
}

// -------------------------------------------------------------
// MICROPHONE STREAM ANALYSER
// -------------------------------------------------------------

export interface MicAnalyserHandle {
  stream: MediaStream;
  analyser: AnalyserNode;
  getVolumeLevel: () => number; // 0 - 100
  setMuted: (muted: boolean) => void;
  cleanup: () => void;
}

export async function createMicAnalyser(): Promise<MicAnalyserHandle | null> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    console.warn('getUserMedia not supported in this environment');
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const getVolumeLevel = (): number => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      // Normalize roughly 0 to 100
      return Math.min(100, Math.round((average / 128) * 100));
    };

    const setMuted = (muted: boolean) => {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    };

    const cleanup = () => {
      try {
        stream.getTracks().forEach((track) => track.stop());
        source.disconnect();
        analyser.disconnect();
      } catch {}
    };

    return {
      stream,
      analyser,
      getVolumeLevel,
      setMuted,
      cleanup,
    };
  } catch (err) {
    console.warn('Microphone access denied or unavailable:', err);
    return null;
  }
}
