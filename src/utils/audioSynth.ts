export class AmbienceSynth {
  private ctx: AudioContext | null = null;
  private nodes: {
    sourceNoise?: AudioWorkletNode | AudioBufferSourceNode;
    oscillators?: OscillatorNode[];
    gainNodes?: GainNode[];
    filterNodes?: BiquadFilterNode[];
  } = {};

  constructor() {
    // Lazy initialisation of AudioContext is done on play to comply with browser autoplay security policies
  }

  private initCtx() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generate a 2-second buffer of white noise
  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialised');
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  public playRain() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;

      // Bandpass filter to sculpt white noise into a gentle rain pitter-patter
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(1.2, this.ctx.currentTime);

      // Lowpass filter to smooth the high-end hiss
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(3200, this.ctx.currentTime);

      // Master volume
      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // keep rain soft

      // Connect nodes: noise -> bandpass -> lowpass -> mainGain -> destination
      noise.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(mainGain);
      mainGain.connect(this.ctx.destination);

      noise.start();

      this.nodes.sourceNoise = noise;
      this.nodes.filterNodes = [bandpass, lowpass];
      this.nodes.gainNodes = [mainGain];
    } catch (e) {
      console.error('Failed to play rain synthesis:', e);
    }
  }

  public playZenDrone() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const oscs: OscillatorNode[] = [];
      const gains: GainNode[] = [];

      // Create a drone with multiple harmonically-tuned low-frequency sine waves
      // Roots: 110Hz (A2), 165Hz (E3 - Perfect fifth), 220Hz (A3 - Octave)
      const pitches = [110, 165, 220, 330];
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      // Fade in master drone gently over 2 seconds
      masterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 2.0);

      pitches.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Detune slightly to create rich, organic chorus beats
        osc.detune.setValueAtTime((idx - 1.5) * 4, this.ctx.currentTime);

        // Modulate individual volumes to make the drone breathe organically
        const oscVol = idx === 0 ? 0.35 : idx === 1 ? 0.25 : idx === 2 ? 0.20 : 0.15;
        oscGain.gain.setValueAtTime(oscVol, this.ctx.currentTime);

        // Slow breathing animation using scheduling
        const breathePeriod = 6 + idx * 2.5; // slow moving breath patterns
        const oscGainParam = oscGain.gain;
        
        // Connect osc -> individual gain -> masterGain
        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start();
        oscs.push(osc);
        gains.push(oscGain);
      });

      // Lowpass filter to keep drone deeply warm and bass-heavy
      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

      masterGain.connect(droneFilter);
      droneFilter.connect(this.ctx.destination);

      this.nodes.oscillators = oscs;
      this.nodes.gainNodes = [...gains, masterGain];
      this.nodes.filterNodes = [droneFilter];
    } catch (e) {
      console.error('Failed to play zen drone synthesis:', e);
    }
  }

  public playOcean() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;

      // Bandpass for ocean swoosh
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(this.ctx.destination);

      noise.start();

      // Implement oceanic wave swelling programmatically
      const swellInterval = setInterval(() => {
        if (!this.ctx || !mainGain) return;
        const now = this.ctx.currentTime;
        // Wave swell cycle: fade in over 4 seconds, fade out over 4 seconds
        mainGain.gain.cancelScheduledValues(now);
        mainGain.gain.setValueAtTime(mainGain.gain.value, now);
        mainGain.gain.linearRampToValueAtTime(0.14, now + 3.5);
        mainGain.gain.linearRampToValueAtTime(0.01, now + 8.0);
      }, 8000);

      // Store interval as custom reference to clear it later
      (this as any).swellTimer = swellInterval;

      this.nodes.sourceNoise = noise;
      this.nodes.filterNodes = [filter];
      this.nodes.gainNodes = [mainGain];
    } catch (e) {
      console.error('Failed to play ocean synthesis:', e);
    }
  }

  public playCelebrationChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // G4, C5, E5, G5, C6 (crystal-clear C Major pentatonic chime)
      const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
      const masterChimeGain = this.ctx.createGain();
      masterChimeGain.gain.setValueAtTime(0.10, now);
      masterChimeGain.connect(this.ctx.destination);

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        // Add sparkly octave sine harmonics
        const sineOsc = this.ctx.createOscillator();
        const sineGain = this.ctx.createGain();
        sineOsc.type = 'sine';
        sineOsc.frequency.setValueAtTime(freq * 2, now + idx * 0.08);

        const noteStart = now + idx * 0.08;
        const noteDuration = 1.5;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.setValueAtTime(0, noteStart);
        gainNode.gain.linearRampToValueAtTime(0.12, noteStart + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        sineGain.gain.setValueAtTime(0, now);
        sineGain.gain.setValueAtTime(0, noteStart);
        sineGain.gain.linearRampToValueAtTime(0.04, noteStart + 0.02);
        sineGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        osc.connect(gainNode);
        gainNode.connect(masterChimeGain);

        sineOsc.connect(sineGain);
        sineGain.connect(masterChimeGain);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);

        sineOsc.start(noteStart);
        sineOsc.stop(noteStart + noteDuration);
      });
    } catch (e) {
      console.warn('Failed to play celebration chime synthesis:', e);
    }
  }

  public stop() {
    try {
      // Clear ocean interval if present
      if ((this as any).swellTimer) {
        clearInterval((this as any).swellTimer);
        (this as any).swellTimer = null;
      }

      // Stop sources
      if (this.nodes.sourceNoise) {
        if ('stop' in this.nodes.sourceNoise) {
          try { (this.nodes.sourceNoise as AudioBufferSourceNode).stop(); } catch {}
        }
        try { this.nodes.sourceNoise.disconnect(); } catch {}
      }

      // Stop oscillators
      if (this.nodes.oscillators) {
        this.nodes.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
          osc.disconnect();
        });
      }

      // Disconnect gain nodes
      if (this.nodes.gainNodes) {
        this.nodes.gainNodes.forEach(gain => gain.disconnect());
      }

      // Disconnect filters
      if (this.nodes.filterNodes) {
        this.nodes.filterNodes.forEach(filter => filter.disconnect());
      }

      this.nodes = {};
    } catch (e) {
      console.warn('Error clearing audio nodes:', e);
    }
  }
}
export const synthManager = new AmbienceSynth();
