// Web Audio API Sound Synthesizer for Pokémon Battle Game

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private bgmOscillators: OscillatorNode[] = [];
  private isBgmPlaying: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleSound(enabled?: boolean): boolean {
    if (enabled !== undefined) {
      this.soundEnabled = enabled;
    } else {
      this.soundEnabled = !this.soundEnabled;
    }
    if (!this.soundEnabled && this.isBgmPlaying) {
      this.stopBgm();
    }
    return this.soundEnabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public playGlitchSound() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, t);
    osc1.frequency.setValueAtTime(800, t + 0.05);
    osc1.frequency.setValueAtTime(120, t + 0.1);
    osc1.frequency.setValueAtTime(1200, t + 0.15);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(900, t);
    osc2.frequency.setValueAtTime(200, t + 0.08);
    osc2.frequency.setValueAtTime(1500, t + 0.18);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  public playCry(pokedexId: number) {
    if (!this.soundEnabled) return;
    this.initCtx();

    if (pokedexId === 0) {
      this.playGlitchSound();
      return;
    }

    try {
      const audio = new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokedexId}.ogg`);
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback synthesized cry if network fails
          this.playSynthCry(pokedexId);
        });
      }
    } catch (e) {
      this.playSynthCry(pokedexId);
    }
  }

  private playSynthCry(pokedexId: number) {
    if (!this.soundEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 200 + (pokedexId % 30) * 20;
    osc.type = (pokedexId % 2 === 0) ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playClick() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playHit(type: 'physical' | 'special' | 'super' | 'notVery' | 'critical') {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'super' || type === 'critical') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.3);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === 'notVery') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  }

  public playBallThrow() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playBallShake() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.1);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playCatchSuccess() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.1;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playLevelUp() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playVictory() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const fanfare = [
      { f: 523.25, d: 0.12 },
      { f: 523.25, d: 0.12 },
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.25 },
      { f: 783.99, d: 0.25 },
      { f: 1046.5, d: 0.5 },
    ];

    let currentOffset = 0;
    fanfare.forEach((note) => {
      const t = this.ctx!.currentTime + currentOffset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + note.d);

      currentOffset += note.d + 0.03;
    });
  }

  public playFaint() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public stopBgm() {
    this.bgmOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.bgmOscillators = [];
    this.isBgmPlaying = false;
  }
}

export const soundEngine = new SoundEngine();
