export class AmbienceSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5; // Default 50% volume
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
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public resume() {
    this.initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('Failed to resume AudioContext:', e));
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  private getDestination(): AudioNode {
    this.initCtx();
    return this.masterGain || this.ctx!.destination;
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

  // Generate a 2-second buffer of brown noise
  private createBrownNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialised');
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // First-order integrator to produce a brown/red spectral roll-off (1/f^2)
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }
    return noiseBuffer;
  }

  public playRain() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Heavy continuous rain base wash (pink/white filtered noise)
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;

      // Bandpass filter to sculpt white noise into a gentle rain pitter-patter
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(950, now);
      bandpass.Q.setValueAtTime(1.0, now);

      // Lowpass filter to smooth the high-end hiss
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(2800, now);

      // High-frequency "crackle" band for individual droplet impact realism
      const sizzleNoise = this.ctx.createBufferSource();
      sizzleNoise.buffer = this.createNoiseBuffer();
      sizzleNoise.loop = true;

      const sizzleFilter = this.ctx.createBiquadFilter();
      sizzleFilter.type = 'peaking';
      sizzleFilter.frequency.setValueAtTime(6500, now);
      sizzleFilter.Q.setValueAtTime(3.0, now);
      sizzleFilter.gain.setValueAtTime(4.0, now);

      const sizzleGain = this.ctx.createGain();
      sizzleGain.gain.setValueAtTime(0.018, now); // soft high impact sizzle

      // Master volume with gentle tremolo for a natural rainy breeze flutter
      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.12, now); // richer downpour level

      // Connect nodes: rain -> filters -> mainGain
      noise.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(mainGain);

      // Connect sizzle -> sizzle filter -> sizzle gain -> main gain
      sizzleNoise.connect(sizzleFilter);
      sizzleFilter.connect(sizzleGain);
      sizzleGain.connect(mainGain);

      mainGain.connect(this.getDestination());

      noise.start();
      sizzleNoise.start();

      // NEW: Add random dripping water drops to enhance the natural rain feel
      const triggerDrip = () => {
        if (!this.ctx) return;
        const dripTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600 + Math.random() * 500, dripTime);
        osc.frequency.exponentialRampToValueAtTime(150, dripTime + 0.08);

        gainNode.gain.setValueAtTime(0, dripTime);
        gainNode.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.008, dripTime + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, dripTime + 0.08);

        osc.connect(gainNode);
        gainNode.connect(this.getDestination());
        osc.start(dripTime);
        osc.stop(dripTime + 0.1);
      };

      const rainDripInterval = setInterval(() => {
        if (!this.ctx) return;
        if (Math.random() > 0.3) {
          triggerDrip();
        }
      }, 450);

      // DISTANT THUNDER IN RAIN
      const triggerDistantThunder = () => {
        if (!this.ctx) return;
        const clickTime = this.ctx.currentTime;
        const thunderNoise = this.ctx.createBufferSource();
        thunderNoise.buffer = this.createNoiseBuffer();
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, clickTime); // deep sub bass rumble
        filter.Q.setValueAtTime(2.0, clickTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, clickTime);
        gain.gain.linearRampToValueAtTime(0.045, clickTime + 1.2); // soft/distant rumble
        gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 9.0);

        thunderNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.getDestination());
        
        thunderNoise.start(clickTime);
        thunderNoise.stop(clickTime + 9.5);
      };

      // Trigger a distant thunder roll every 35 seconds
      const distantThunderLoop = setInterval(() => {
        triggerDistantThunder();
      }, 35000);

      // Trigger one near start for immediate satisfaction
      const initThunder = setTimeout(() => {
        triggerDistantThunder();
      }, 3000);

      (this as any).distantThunderTimer = distantThunderLoop;
      (this as any).initThunderTimer = initThunder;
      (this as any).rainDripInterval = rainDripInterval;

      // Slow breathing windy volume tremolo
      const tremoloTimer = setInterval(() => {
        if (!this.ctx || !mainGain) return;
        const nowTime = this.ctx.currentTime;
        // Breeze swell every 6 seconds
        mainGain.gain.cancelScheduledValues(nowTime);
        mainGain.gain.setValueAtTime(mainGain.gain.value, nowTime);
        mainGain.gain.linearRampToValueAtTime(0.15, nowTime + 2.5);
        mainGain.gain.linearRampToValueAtTime(0.09, nowTime + 6.0);
      }, 6000);

      (this as any).rainTremoloTimer = tremoloTimer;
      (this as any).rainSizzleNode = sizzleNoise;

      this.nodes.sourceNoise = noise;
      this.nodes.filterNodes = [bandpass, lowpass, sizzleFilter];
      this.nodes.gainNodes = [sizzleGain, mainGain];
    } catch (e) {
      console.error('Failed to play rain synthesis:', e);
    }
  }

  public playThunderstorm() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Heavy Downpour base rain noise
      const rainNoise = this.ctx.createBufferSource();
      rainNoise.buffer = this.createNoiseBuffer();
      rainNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(750, now);
      bandpass.Q.setValueAtTime(0.8, now);

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(2000, now);

      const rainGain = this.ctx.createGain();
      rainGain.gain.setValueAtTime(0.14, now); // louder, heavy downpour level

      rainNoise.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(rainGain);
      rainGain.connect(this.getDestination());

      rainNoise.start();

      // NEW: Heavy, random natural rain drips for the storm environment
      const triggerStormDrip = () => {
        if (!this.ctx) return;
        const dripTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500 + Math.random() * 600, dripTime);
        osc.frequency.exponentialRampToValueAtTime(120, dripTime + 0.07);

        gainNode.gain.setValueAtTime(0, dripTime);
        gainNode.gain.linearRampToValueAtTime(0.018 + Math.random() * 0.012, dripTime + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, dripTime + 0.07);

        osc.connect(gainNode);
        gainNode.connect(this.getDestination());
        osc.start(dripTime);
        osc.stop(dripTime + 0.09);
      };

      const stormDripInterval = setInterval(() => {
        if (!this.ctx) return;
        if (Math.random() > 0.2) {
          triggerStormDrip();
        }
      }, 350);

      // NEW: Procedural Storm Wind Generation (modulated bandpass filter sweeps on white noise)
      const windNoise = this.ctx.createBufferSource();
      windNoise.buffer = this.createNoiseBuffer();
      windNoise.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(250, now);
      windFilter.Q.setValueAtTime(1.5, now);

      const windGain = this.ctx.createGain();
      windGain.gain.setValueAtTime(0.015, now);

      windNoise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.getDestination());
      windNoise.start();

      const stormWindInterval = setInterval(() => {
        if (!this.ctx || !windFilter || !windGain) return;
        const windNow = this.ctx.currentTime;
        const randomFreq = 180 + Math.random() * 250;
        const randomGain = 0.01 + Math.random() * 0.025;
        windFilter.frequency.cancelScheduledValues(windNow);
        windFilter.frequency.linearRampToValueAtTime(randomFreq, windNow + 3.0);
        windGain.gain.cancelScheduledValues(windNow);
        windGain.gain.linearRampToValueAtTime(randomGain, windNow + 3.0);
      }, 4000);

      // Trigger rolling thunderclaps synthetically
      const triggerThunder = () => {
        if (!this.ctx) return;
        const clickTime = this.ctx.currentTime;

        const thunderNoise = this.ctx.createBufferSource();
        thunderNoise.buffer = this.createNoiseBuffer();

        // High resonance low-pass filter to model the deep pressure wave
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(110, clickTime); // sub bass boom
        filter.Q.setValueAtTime(3.0, clickTime);

        // Low shelf filter to enrich structural rumbles
        const shelf = this.ctx.createBiquadFilter();
        shelf.type = 'lowshelf';
        shelf.frequency.setValueAtTime(80, clickTime);
        shelf.gain.setValueAtTime(8.0, clickTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, clickTime);

        // Thunder envelope: Lightning impact crests instantly, then rumbles echo out
        const duration = 7 + Math.random() * 6; // 7 to 13 seconds long rumble
        const peakVolume = 0.28 + Math.random() * 0.25;

        gain.gain.linearRampToValueAtTime(peakVolume, clickTime + 0.3);

        // Procedural rumbles via volume modulation steps
        const stages = 10;
        for (let i = 1; i <= stages; i++) {
          const stepTime = clickTime + 0.3 + (i / stages) * (duration - 0.3);
          const rumbleLevel = peakVolume * Math.pow(0.58, i) * (0.5 + Math.random() * 0.6);
          gain.gain.linearRampToValueAtTime(rumbleLevel, stepTime);
        }
        gain.gain.linearRampToValueAtTime(0.0, clickTime + duration);

        thunderNoise.connect(filter);
        filter.connect(shelf);
        shelf.connect(gain);
        gain.connect(this.getDestination());

        thunderNoise.start(clickTime);
        thunderNoise.stop(clickTime + duration);
      };

      // Initial roll
      const firstThunder = setTimeout(() => {
        triggerThunder();
      }, 1500);

      // Periodically trigger heavy rolling thunder every 16 - 28 seconds
      const thunderLoop = setInterval(() => {
        triggerThunder();
      }, 20000);

      (this as any).thunderTimeoutRef = firstThunder;
      (this as any).thunderIntervalRef = thunderLoop;
      (this as any).stormDripInterval = stormDripInterval;
      (this as any).stormWindInterval = stormWindInterval;
      (this as any).stormWindNode = windNoise;

      this.nodes.sourceNoise = rainNoise;
      this.nodes.filterNodes = [bandpass, lowpass, windFilter];
      this.nodes.gainNodes = [rainGain, windGain];
    } catch (e) {
      console.error('Failed to play thunderstorm synthesis:', e);
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
      droneFilter.connect(this.getDestination());

      this.nodes.oscillators = oscs;
      this.nodes.gainNodes = [...gains, masterGain];
      this.nodes.filterNodes = [droneFilter];
    } catch (e) {
      console.error('Failed to play zen drone synthesis:', e);
    }
  }

  public playBrownNoise() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createBrownNoiseBuffer();
      noise.loop = true;
      
      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // gentle volume
      
      noise.connect(mainGain);
      mainGain.connect(this.getDestination());
      noise.start();
      
      this.nodes.sourceNoise = noise;
      this.nodes.gainNodes = [mainGain];
    } catch (e) {
      console.error('Failed to play brown noise:', e);
    }
  }

  public playLofi() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Cozy vinyl crackle background
      const crackleNoise = this.ctx.createBufferSource();
      crackleNoise.buffer = this.createNoiseBuffer();
      crackleNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000, now);
      bandpass.Q.setValueAtTime(1.5, now);

      const crackleGain = this.ctx.createGain();
      crackleGain.gain.setValueAtTime(0.008, now);

      crackleNoise.connect(bandpass);
      bandpass.connect(crackleGain);
      crackleGain.connect(this.getDestination());
      crackleNoise.start();

      // 2. Continuous mellow low-frequency pad
      const padOsc1 = this.ctx.createOscillator();
      const padOsc2 = this.ctx.createOscillator();
      const padGain = this.ctx.createGain();

      padOsc1.type = 'triangle';
      padOsc1.frequency.setValueAtTime(130.81, now); // C3
      padOsc2.type = 'triangle';
      padOsc2.frequency.setValueAtTime(164.81, now); // E3

      padGain.gain.setValueAtTime(0.03, now);

      const lpFilter = this.ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(300, now); // filter out highs for that warm muffled lofi feel

      padOsc1.connect(lpFilter);
      padOsc2.connect(lpFilter);
      lpFilter.connect(padGain);
      padGain.connect(this.getDestination());

      padOsc1.start();
      padOsc2.start();

      // 3. Simple slow rhythmic lofi piano/Rhodes chord generator
      const triggerLofiChord = () => {
        if (!this.ctx) return;
        const playTime = this.ctx.currentTime;
        const chords = [
          [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
          [349.23, 440.00, 523.25, 659.25], // Fmaj7 (F4, A4, C5, E5)
          [293.66, 349.23, 440.00, 523.25], // Dmin7 (D4, F4, A4, C5)
          [329.63, 392.00, 493.88, 587.33]  // Emin7 (E4, G4, B4, D5)
        ];
        const chord = chords[Math.floor(Math.random() * chords.length)];

        chord.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, playTime);

          // Warm filter for Rhodes keyboard vibe
          const rhodesFilter = this.ctx.createBiquadFilter();
          rhodesFilter.type = 'lowpass';
          rhodesFilter.frequency.setValueAtTime(600, playTime);

          gain.gain.setValueAtTime(0, playTime);
          gain.gain.linearRampToValueAtTime(0.015, playTime + 0.1); // slow soft attack
          gain.gain.exponentialRampToValueAtTime(0.0001, playTime + 3.8); // long tail decay

          osc.connect(rhodesFilter);
          rhodesFilter.connect(gain);
          gain.connect(this.getDestination());

          osc.start(playTime);
          osc.stop(playTime + 4.0);
        });
      };

      // Trigger lofi chord every 5 seconds
      triggerLofiChord();
      const chordLoop = setInterval(() => {
        triggerLofiChord();
      }, 5000);

      (this as any).lofiChordInterval = chordLoop;
      (this as any).lofiCrackleSource = crackleNoise;

      this.nodes.oscillators = [padOsc1, padOsc2];
      this.nodes.gainNodes = [crackleGain, padGain];
      this.nodes.filterNodes = [bandpass, lpFilter];
    } catch (e) {
      console.error('Failed to play lofi:', e);
    }
  }

  public playLofi2() {
    try {
      this.stop();
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Tape Hiss / Vinyl Crackle Background
      // Low volume warm hiss using brown noise filtered
      const hissSource = this.ctx.createBufferSource();
      hissSource.buffer = this.createBrownNoiseBuffer();
      hissSource.loop = true;

      const hissFilter = this.ctx.createBiquadFilter();
      hissFilter.type = 'bandpass';
      hissFilter.frequency.setValueAtTime(1200, now);
      hissFilter.Q.setValueAtTime(0.5, now);

      const hissGain = this.ctx.createGain();
      hissGain.gain.setValueAtTime(0.012, now); // soft warm hum

      hissSource.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(this.getDestination());
      hissSource.start();

      (this as any).lofi2HissSource = hissSource;

      // Vinyl crackle generator helper
      const triggerCrackle = (time: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        // Random dusty frequency pop
        osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(1500 + Math.random() * 3000, time);

        gainNode.gain.setValueAtTime(0, time);
        const popVolume = 0.003 + Math.random() * 0.006;
        gainNode.gain.linearRampToValueAtTime(popVolume, time + 0.001);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.005 + Math.random() * 0.01);

        osc.connect(gainNode);
        gainNode.connect(this.getDestination());
        osc.start(time);
        osc.stop(time + 0.02);
      };

      // Periodic vinyl crackle timer
      const crackleInterval = setInterval(() => {
        if (!this.ctx) return;
        const delay = Math.random() * 800;
        setTimeout(() => {
          if (!this.ctx) return;
          triggerCrackle(this.ctx.currentTime);
        }, delay);
      }, 900);

      (this as any).lofi2CrackleInterval = crackleInterval;

      // 2. Drum & Chord Sequencer (82 BPM)
      // Step duration (1/8 note): 60 / 82 / 2 = 0.36585 seconds (365.85 ms)
      const stepTimeSec = 60 / 82 / 2;
      let currentStep = 0;

      const triggerKick = (time: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.38, time + 0.004);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

        osc.connect(gainNode);
        gainNode.connect(this.getDestination());
        osc.start(time);
        osc.stop(time + 0.2);
      };

      const triggerSnare = (time: number) => {
        if (!this.ctx) return;
        // Muffled warm lofi snare: bandpassed noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, time);
        filter.Q.setValueAtTime(1.8, time);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.14, time + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

        // Triangle body
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(175, time);
        oscGain.gain.setValueAtTime(0, time);
        oscGain.gain.linearRampToValueAtTime(0.08, time + 0.008);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.getDestination());

        osc.connect(oscGain);
        oscGain.connect(this.getDestination());

        noise.start(time);
        noise.stop(time + 0.2);
        osc.start(time);
        osc.stop(time + 0.1);
      };

      const triggerHihat = (time: number, isSubtle = false) => {
        if (!this.ctx) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, time);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(isSubtle ? 0.025 : 0.065, time + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.getDestination());

        noise.start(time);
        noise.stop(time + 0.05);
      };

      const triggerRhodesChord = (time: number, chordType: 'Dm9' | 'Gm9') => {
        if (!this.ctx) return;
        // Notes frequencies:
        // Dm9: D3 (146.83), F3 (174.61), A3 (220.00), C4 (261.63), E4 (329.63)
        // Gm9: G3 (196.00), Bb3 (233.08), D4 (293.66), F4 (349.23), A4 (440.00)
        const notes = chordType === 'Dm9' 
          ? [146.83, 174.61, 220.00, 261.63, 329.63]
          : [196.00, 233.08, 293.66, 349.23, 440.00];

        // Sweep (arpeggio) with 80ms stagger
        notes.forEach((freq, index) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          const lpFilter = this.ctx.createBiquadFilter();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time + index * 0.08);

          lpFilter.type = 'lowpass';
          lpFilter.frequency.setValueAtTime(500, time + index * 0.08); // warm muffled lowpass

          const noteStartTime = time + index * 0.08;
          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.setValueAtTime(0, noteStartTime);
          gainNode.gain.linearRampToValueAtTime(0.016, noteStartTime + 0.2); // soft attack
          gainNode.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + 4.0); // long decay

          osc.connect(lpFilter);
          lpFilter.connect(gainNode);
          gainNode.connect(this.getDestination());

          osc.start(noteStartTime);
          osc.stop(noteStartTime + 4.2);
        });
      };

      // Play immediate first chord & beat
      triggerRhodesChord(now, 'Dm9');

      // Sequencer loop running every 365.85 ms
      const intervalMs = stepTimeSec * 1000;
      const lofi2Interval = setInterval(() => {
        if (!this.ctx) return;
        const schedTime = this.ctx.currentTime + 0.02; // slight pre-schedule window

        // Hi-hat on every step, subtle on off-beats
        const isOffbeat = currentStep % 2 !== 0;
        triggerHihat(schedTime, isOffbeat);

        // Kick drum
        if (currentStep === 0 || currentStep === 4) {
          triggerKick(schedTime);
        } else if (currentStep === 7) {
          triggerKick(schedTime); // subtle ghost kick
        }

        // Snare drum
        if (currentStep === 2 || currentStep === 6) {
          triggerSnare(schedTime);
        }

        // Warm chords on steps 0 (Dm9) and 8 (Gm9) in a 16-step grid
        if (currentStep === 0) {
          triggerRhodesChord(schedTime, 'Dm9');
        } else if (currentStep === 8) {
          triggerRhodesChord(schedTime, 'Gm9');
        }

        currentStep = (currentStep + 1) % 16;
      }, intervalMs);

      (this as any).lofi2Interval = lofi2Interval;

      this.nodes.gainNodes = [hissGain];
      this.nodes.filterNodes = [hissFilter];
    } catch (e) {
      console.error('Failed to play lofi beats 2:', e);
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
      masterChimeGain.connect(this.getDestination());

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

      // Clear rain tremolo timer, drips and auxiliary nodes
      if ((this as any).rainTremoloTimer) {
        clearInterval((this as any).rainTremoloTimer);
        (this as any).rainTremoloTimer = null;
      }
      if ((this as any).rainDripInterval) {
        clearInterval((this as any).rainDripInterval);
        (this as any).rainDripInterval = null;
      }
      if ((this as any).rainSizzleNode) {
        try { (this as any).rainSizzleNode.stop(); } catch {}
        try { (this as any).rainSizzleNode.disconnect(); } catch {}
        (this as any).rainSizzleNode = null;
      }
      if ((this as any).distantThunderTimer) {
        clearInterval((this as any).distantThunderTimer);
        (this as any).distantThunderTimer = null;
      }
      if ((this as any).initThunderTimer) {
        clearTimeout((this as any).initThunderTimer);
        (this as any).initThunderTimer = null;
      }

      // Clear thunderstorm timers and drips
      if ((this as any).thunderTimeoutRef) {
        clearTimeout((this as any).thunderTimeoutRef);
        (this as any).thunderTimeoutRef = null;
      }
      if ((this as any).thunderIntervalRef) {
        clearInterval((this as any).thunderIntervalRef);
        (this as any).thunderIntervalRef = null;
      }
      if ((this as any).stormDripInterval) {
        clearInterval((this as any).stormDripInterval);
        (this as any).stormDripInterval = null;
      }
      if ((this as any).stormWindInterval) {
        clearInterval((this as any).stormWindInterval);
        (this as any).stormWindInterval = null;
      }
      if ((this as any).stormWindNode) {
        try { (this as any).stormWindNode.stop(); } catch {}
        try { (this as any).stormWindNode.disconnect(); } catch {}
        (this as any).stormWindNode = null;
      }

      // Clear cafe timers and steam nodes
      if ((this as any).cafeSteamInterval) {
        clearInterval((this as any).cafeSteamInterval);
        (this as any).cafeSteamInterval = null;
      }
      if ((this as any).cafeClinkInterval) {
        clearInterval((this as any).cafeClinkInterval);
        (this as any).cafeClinkInterval = null;
      }
      if ((this as any).steamSourceNode) {
        try { (this as any).steamSourceNode.stop(); } catch {}
        try { (this as any).steamSourceNode.disconnect(); } catch {}
        (this as any).steamSourceNode = null;
      }
      if ((this as any).cafeRainNode) {
        try { (this as any).cafeRainNode.stop(); } catch {}
        try { (this as any).cafeRainNode.disconnect(); } catch {}
        (this as any).cafeRainNode = null;
      }

      // Clear lofi timers and sources
      if ((this as any).lofiChordInterval) {
        clearInterval((this as any).lofiChordInterval);
        (this as any).lofiChordInterval = null;
      }
      if ((this as any).lofiCrackleSource) {
        try { (this as any).lofiCrackleSource.stop(); } catch {}
        try { (this as any).lofiCrackleSource.disconnect(); } catch {}
        (this as any).lofiCrackleSource = null;
      }

      // Clear lofi2 timers and sources
      if ((this as any).lofi2Interval) {
        clearInterval((this as any).lofi2Interval);
        (this as any).lofi2Interval = null;
      }
      if ((this as any).lofi2CrackleInterval) {
        clearInterval((this as any).lofi2CrackleInterval);
        (this as any).lofi2CrackleInterval = null;
      }
      if ((this as any).lofi2HissSource) {
        try { (this as any).lofi2HissSource.stop(); } catch {}
        try { (this as any).lofi2HissSource.disconnect(); } catch {}
        (this as any).lofi2HissSource = null;
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
