/**
 * audio.js
 * Handles procedural sound effects using Web Audio API.
 * Features: Procedural Reggae Generator (Major/Minor Modes), Dub Bass, Motif-Based Lead.
 */
class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.musicVolume = 1.0;
        this.sfxVolume = 1.0;

        // Resume AudioContext on first interaction
        window.addEventListener('click', () => {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }, { once: true });
    }

    setMusicVolume(percent) {
        this.musicVolume = percent / 100;
        // Apply immediate change if needed (not strictly needed for procedural sequencer unless we have a master bus, 
        // but note playback will pick it up on next note).
        // For a more immediate effect, we'd need a master gain node for music.
        // But per-note check is fine for this style.
    }

    setSfxVolume(percent) {
        this.sfxVolume = percent / 100;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (this.sfxVolume <= 0 || this.ctx.state === 'suspended') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const masterVol = vol * this.sfxVolume;
        gain.gain.setValueAtTime(masterVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    shoot() {
        if (this.sfxVolume <= 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);

        const masterVol = 0.15 * this.sfxVolume;
        gain.gain.setValueAtTime(masterVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    hit() {
        this.playTone(150, 'sawtooth', 0.1, 0.2);
    }

    goldHit() {
        if (this.sfxVolume <= 0) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

        const masterVol = 0.25 * this.sfxVolume;
        gain1.gain.setValueAtTime(masterVol, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start();
        osc1.stop(now + 0.8);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108.73, now);
        gain2.gain.setValueAtTime(masterVol, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start();
        osc2.stop(now + 0.8);
    }

    clink() {
        if (this.sfxVolume <= 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);

        const masterVol = 0.2 * this.sfxVolume;
        gain.gain.setValueAtTime(masterVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    explosion() {
        this.playTone(80, 'sawtooth', 0.3, 0.3);
        this.playTone(60, 'square', 0.3, 0.3);
    }

    // --- Music Sequencer with Motif Engine ---

    initMusic() {
        // Randomize Tempo: 116 - 122 BPM
        this.tempo = 116 + Math.floor(Math.random() * 6);

        // Randomize Mode: Major (Ring of Fire) or Minor (Dark Roots)
        this.mode = Math.random() > 0.5 ? 'MAJOR' : 'MINOR';

        console.log(`Music Initialized: MOOD=${this.mode}, BPM=${this.tempo}`);

        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.nextNoteTime = 0.0;
        this.current16thNote = 0;
        this.isPlaying = false;
        this.timerID = null;

        this.loopLength = 128; // 8 bars
        this.createDubDelay();
    }

    createDubDelay() {
        if (this.delayNode) return; // reused?

        this.delayNode = this.ctx.createDelay();
        // Tempo synced delay (3/16th note, dotted eighth) - Tempo dependent, update if tempo changes
        const secondsPerBeat = 60 / this.tempo;
        const delayTime = secondsPerBeat * 0.75;
        this.delayNode.delayTime.value = delayTime;

        this.feedbackGain = this.ctx.createGain();
        this.feedbackGain.gain.value = 0.6; // No master volume on feedback itself, only output

        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.value = 1000;

        this.delayNode.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayFilter);
        this.delayFilter.connect(this.delayNode);

        // Connect delay to a gain node controlled by Music Volume? Or SFX? Dub effects are part of music/theme.
        // Let's call them part of Music.
        this.delayOutputGain = this.ctx.createGain();
        this.delayOutputGain.gain.value = 1.0;

        this.delayNode.connect(this.delayOutputGain);
        this.delayOutputGain.connect(this.ctx.destination);
    }

    generateComposition() {
        this.verse = this.generateSection('verse');
        this.chorus = this.generateSection('chorus');
        this.currentSection = 'verse';
    }

    // --- Motif Generator ---
    generateMotif() {
        // Creates a 1 or 2 bar rhythmic/melodic phrase
        // Stored as relative scale indices (0=Root, 2=Third, 4=Fifth etc in Pentatonic)
        // and rhythm steps.
        const motif = [];
        const length = 32; // 2 bars of 16ths

        // Pentatonic Scale Degrees (Relative): 0, 1, 2, 3, 4 (Root, 2nd, 3rd, 5th, 6th)
        // We will map these later to actual intervals based on chord quality.

        const numNotes = Math.floor(Math.random() * 5) + 3; // 3-7 notes in the phrase
        const validSteps = [0, 2, 4, 6, 7, 8, 10, 12, 14]; // Rhythmic grid

        for (let i = 0; i < numNotes; i++) {
            const step = validSteps[Math.floor(Math.random() * validSteps.length)];
            // Relative pitch: 0 (Root), 2 (Third), 3 (Fifth) - Clean Triads only
            const pitch = [0, 2, 3, 0, 3][Math.floor(Math.random() * 5)];

            // Avoid collisions (rudimentary)
            if (!motif.find(n => n.step === step)) {
                motif.push({ step: step, pitch: pitch });
            }
        }
        return motif;
    }

    generateSection(type) {
        // Frequency Constants (Key of G)
        const G = 196.00;
        const Bb = 233.08;
        const C = 261.63;
        const D = 293.66;
        const Eb = 311.13;
        const F = 349.23;

        let chords = {};
        let progNames = [];

        if (this.mode === 'MAJOR') {
            // Ring of Fire 
            chords = {
                'I': { freq: G, isMinor: false },
                'IV': { freq: C, isMinor: false },
                'V': { freq: D, isMinor: false }
            };
            if (type === 'verse') {
                progNames = ['I', 'IV', 'I', 'I', 'I', 'IV', 'I', 'I'];
            } else {
                progNames = ['V', 'IV', 'I', 'I', 'V', 'IV', 'I', 'I'];
            }
        } else {
            // Dark Roots 
            chords = {
                'i': { freq: G, isMinor: true },
                'VI': { freq: Eb, isMinor: false },
                'VII': { freq: F, isMinor: false }
            };
            if (type === 'verse') {
                progNames = ['i', 'VII', 'i', 'VII', 'i', 'VII', 'i', 'i'];
            } else {
                progNames = ['VI', 'VII', 'i', 'i', 'VI', 'VII', 'i', 'i'];
            }
        }

        const chordMap = [];
        for (let i = 0; i < 8; i++) {
            const name = progNames[i % progNames.length];
            chordMap.push(chords[name]);
        }

        // --- Generative Logic ---
        const bassLine = new Array(128).fill(null);
        const skankPattern = new Array(128).fill(0);
        const leadLine = new Array(128).fill(null);

        const bassStyles = ['sparse', 'deep', 'dub'];
        const style = bassStyles[Math.floor(Math.random() * bassStyles.length)];

        // MOTIF Application
        // Generate one good motif for this entire section
        const motif = this.generateMotif();

        // Lead Melody Settings modeled on Bass Style
        let melodyDensity = 0.9; // Default to strong lead for sparse bass styles
        if (style === 'dub') melodyDensity = 0.8; // Slightly less dense for dub

        melodyDensity += (Math.random() * 0.2 - 0.1);

        for (let bar = 0; bar < 8; bar++) {
            const chord = chordMap[bar];
            const root = chord.freq / 4;
            const offset = bar * 16;

            // --- Bass Generation (Same as before) ---
            const isMinor = chord.isMinor;
            const third = isMinor ? 1.1892 : 1.2599;
            const fifth = 1.4983;
            const seven = isMinor ? 1.7818 : 1.8877;
            const octave = 2.0;

            if (style === 'deep') {
                // Deep Style: Long sustained root notes anchoring the track
                bassLine[offset] = { note: root, len: 3.0 };
            } else if (style === 'sparse') {
                if (bar % 2 === 0) {
                    bassLine[offset] = { note: root, len: 1.5 };
                } else {
                    bassLine[offset + 8] = { note: root * fifth, len: 0.8 };
                    if (Math.random() > 0.5) bassLine[offset + 12] = { note: root, len: 0.4 };
                }
            } else if (style === 'dub') {
                // Dub Style: Play with space, emphasis on beat 3 (step 8)
                if (bar % 2 === 0) {
                    bassLine[offset] = { note: root, len: 0.4 }; // Beat 1
                    bassLine[offset + 8] = { note: root, len: 1.2 }; // Beat 3 (Drop)
                } else {
                    bassLine[offset + 4] = { note: root * fifth, len: 0.4 }; // Beat 2
                    bassLine[offset + 8] = { note: root * octave, len: 0.8 }; // Beat 3
                    if (Math.random() > 0.6) bassLine[offset + 14] = { note: root, len: 0.2 }; // Pickup
                }
            }

            skankPattern[offset + 4] = 1;
            skankPattern[offset + 12] = 1;
            if (Math.random() > 0.92) skankPattern[offset + 14] = 1;

            // --- Apply Motif (The Fix) ---
            // Only play melody if density check passes (Probabilistic Phrasing)
            // But we use the SAME Motif pattern!
            if (Math.random() < melodyDensity) {
                // Transpose Motif to current Chord
                // Pentatonic Scale: Root, 2nd, 3rd, 5th, 6th 
                // We map indices 0,1,2,3,4 to multipliers
                const scaleMultipliers = [
                    1.0,           // 0: Root
                    1.1224,        // 1: Major 2nd (approx)
                    third,         // 2: 3rd (Min/Maj)
                    fifth,         // 3: 5th
                    seven          // 4: 7th (using 7th instead of 6th for reggae feel)
                ];

                motif.forEach(m => {
                    if (m.step < 16) { // Ensure it fits in one bar for now (repeating motif)
                        // Variation: octave jump?
                        let mult = scaleMultipliers[m.pitch % 5] || 1.0;
                        if (Math.random() > 0.9) mult *= 2;

                        leadLine[offset + m.step] = { note: root * 4 * mult, len: 0.2 };
                    }
                });
            }
        }

        return { chordMap, bassLine, skankPattern, leadLine };
    }

    startMusic() {
        if (this.isPlaying) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.initMusic();
        this.generateComposition();

        this.isPlaying = true;
        this.current16thNote = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isPlaying) return;

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.current16thNote++;

        if (this.current16thNote === this.loopLength) {
            this.current16thNote = 0;
            this.currentSection = (this.currentSection === 'verse') ? 'chorus' : 'verse';
        }
    }

    scheduleNote(beatNumber, time) {
        const sectionData = this.currentSection === 'chorus' ? this.chorus : this.verse;
        const stepInBar = beatNumber % 16;

        // --- 1. Drums ---
        if (stepInBar % 4 === 0) {
            this.playNoise(time, 0.03, 3000);
        }

        if (this.currentSection === 'chorus' && stepInBar === 0) {
            this.playKick(time);
        }

        if (stepInBar === 8) {
            this.playKick(time);
            this.playNoise(time, 0.08, 800);
            if (Math.random() > 0.7) this.playDubThrow(time, 800);
        }

        // --- 2. Bass ---
        const bassNote = sectionData.bassLine[beatNumber];
        if (bassNote) {
            this.playBass(time, bassNote.note, bassNote.len);
        }

        // --- 3. Skank ---
        if (sectionData.skankPattern[beatNumber]) {
            const barIndex = Math.floor(beatNumber / 16);
            const chord = sectionData.chordMap[barIndex] || { freq: 196.00, isMinor: false };
            this.playSkank(time, chord);
            if (Math.random() > 0.8) this.playDubThrow(time, null, chord.freq);
        }

        // --- 4. Lead Melody ---
        const leadNote = sectionData.leadLine[beatNumber];
        if (leadNote) {
            this.playLead(time, leadNote.note, leadNote.len);
            if (Math.random() > 0.95) this.playDubThrow(time, null, leadNote.note * 0.5);
        }
    }

    // --- Sound Synthesis ---

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        const masterVol = 0.8 * this.musicVolume;
        gain.gain.setValueAtTime(masterVol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playNoise(time, duration, filterFreq) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = filterFreq;
        const gain = this.ctx.createGain();
        const masterVol = 0.15 * this.musicVolume;
        gain.gain.value = masterVol;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(time);
    }

    playBass(time, freq, length) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 5;

        // Deeper Filter Envelope
        filter.frequency.setValueAtTime(80, time); // Start lower
        filter.frequency.exponentialRampToValueAtTime(400, time + 0.02); // Lower peak (was 600)
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.2); // Settle lower (was 150)

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);

        // Scale gain envelope points by musicVolume
        const attackVal = 0.5 * this.musicVolume;
        const sustainVal = 0.35 * this.musicVolume;

        gain.gain.linearRampToValueAtTime(attackVal, time + 0.02); // Quieter attack (was 0.7)
        gain.gain.linearRampToValueAtTime(sustainVal, time + 0.1);  // Quieter sustain (was 0.5)
        gain.gain.linearRampToValueAtTime(0.01, time + length);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + length + 0.1);
    }

    playSkank(time, chord) {
        const duration = 0.08;
        const rootFreq = chord.freq;
        const thirdRatio = chord.isMinor ? 1.1892 : 1.2599;

        [rootFreq, rootFreq * thirdRatio, rootFreq * 1.4983].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = idx === 2 ? 'sawtooth' : 'square';

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 800;

            const gain = this.ctx.createGain();
            osc.frequency.value = freq;

            const masterVol = 0.19 * this.musicVolume;
            gain.gain.setValueAtTime(masterVol, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + duration);
        });
    }

    playLead(time, freq, length) {
        // "Clean" Flute/Organ Synth
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle'; // Smoother base
        osc1.frequency.value = freq;

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine'; // Pure tone reinforcement
        osc2.frequency.value = freq * 1.005; // Slight detune for thickness without wobble

        const gain = this.ctx.createGain();
        const masterVol = 0.0505 * this.musicVolume;
        gain.gain.setValueAtTime(masterVol, time); // Boosted as Tri/Sine have less perceived volume
        gain.gain.exponentialRampToValueAtTime(0.00005, time + length);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 550; // Mellow cutoff

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(time);
        osc1.stop(time + length);
        osc2.start(time);
        osc2.stop(time + length);
    }

    playDubThrow(time, noiseFreq, chordRoot) {
        if (!this.delayNode) return;
        if (noiseFreq) {
            const bufferSize = this.ctx.sampleRate * 0.2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = noiseFreq;
            const gain = this.ctx.createGain();
            gain.gain.value = 0.4;
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.delayNode);
            noise.start(time);
        } else if (chordRoot) {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = chordRoot * 4;
            const gain = this.ctx.createGain();

            const masterVol = 0.0066 * this.musicVolume;
            const rampVol = 0.0075 * this.musicVolume;

            gain.gain.setValueAtTime(masterVol, time);
            gain.gain.exponentialRampToValueAtTime(rampVol, time + 0.15);
            osc.connect(gain);
            gain.connect(this.delayNode);
            osc.start(time);
            osc.stop(time + 0.15);
        }
    }
}
