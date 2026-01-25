# 🎵 Procedural Music Engine Documentation

The **TDH Blunt Hunt** audio engine is a custom-built, procedural music generator running entirely in the browser using the **Web Audio API**. It generates unique **Reggae** and **Dub** compositions dynamically every time the game runs.

## 🧠 Core Architecture

The engine uses a **Scheduler-based** timing system (Lookahead pattern) to ensure rock-solid rhythm regardless of frame rate drops.

### Global Parameters
- **Tempo**: Randomized between **116 - 122 BPM**.
- **Key**: Fixed in **G**.
- **Mode**: Randomly selected at start:
    - **Major ("Ring of Fire")**: Happy, upbeat vibe. Uses Chords I, IV, V.
    - **Minor ("Dark Roots")**: Serious, moody vibe. Uses Chords i, VI, VII.

## 🎸 Bass Styles
The bass is the heart of the engine. One of three styles is selected randomly for the session:

| Style | Description | Musical Characteristics |
|-------|-------------|-------------------------|
| **Sparse** | The default Reggae feel. | Hits mainly on beat 1 (downbeat) or beat 3. Leaves massive space for the echo. |
| **Deep** | Anchors the low end. | Long, sustained root notes (3 seconds+) that create a sub-bass foundation. |
| **Dub** | Syncopated and tricky. | Emphasizes the "Drop" (Beat 3). Uses octave jumps and pickup notes. |

## 🎼 The Motif System
Instead of random notes, the engine generates a **Motif** (a melodic phrase) at the start of the session.
- **Generation**: A 1-2 bar phrase using the Pentatonic scale.
- **Application**: The Lead instrument uses this exact motif but **transposes** it in real-time to match the current chord in the progression.
- **Result**: The melody feels "composed" and coherent, not random, even though it's generated on the fly.

## 🎹 Instrument Breakdown

### 1. Drums
- **Kick**: Sine wave sweep (150Hz -> 0.01Hz).
- **Snare/Hi-Hat**: White noise with a high-pass filter.
- **Rhythm**: Standard "One Drop" or "Steppers" influence depending on the section.

### 2. Bass
- **Sound**: Sawtooth wave filtered heavily by a Low-pass filter.
- **Envelope**:
    - **Attack**: Soft (linear ramp).
    - **Sustain**: Steady.
    - **Release**: Quick fade out.

### 3. The "Skank" (Chords)
- **Sound**: 3 Oscillators (Square + Sawtooth) playing triads.
- **Filter**: High-pass filter at 800Hz to remove muddy low frequencies.
- **Rhythm**: Explicitly plays on the **offbeats** (the "and" of the beat).

### 4. Lead Melody
- **Sound**: Primary Triangle wave + Detuned Sine wave for thickness.
- **Filter**: Low-pass at 550Hz for a mellow, "flute-like" organic tone.
- **Role**: Plays the generated Motif.

### 5. Dub Effects (The "Sauce")
- **Delay**: A global Feedback Delay unit synced to 3/16th notes (dotted eighth).
- **Dub Throw**: Randomly sends instruments into the reverb/delay chamber.
- **The "Beep"**: A random High-pitched Square wave (2 octaves up) that hits the echo, simulating a classic Dub Siren.

## 🎚️ Mixing Guide (How to Tweak)
Volume levels are controlled via `gain.gain.setValueAtTime`. Check `static/js/audio.js`:

- **Kick**: Line ~400 (Default: 0.8)
- **Snare**: Line ~419 (Default: 0.15)
- **Bass**: Line ~442 (Default: 0.5 Attack / 0.35 Sustain)
- **Skank**: Line ~470 (Default: 0.19)
- **Lead**: Line ~492 (Default: 0.0505) *Very quiet to blend*
- **Dub Beep**: Line ~533 (Default: 0.0066)

## 🔄 Song Structure
The engine alternates between two sections:
1.  **Verse**: Simpler chord progression, establishes the groove.
2.  **Chorus**: Changes chord order (usually starts on V or VI) to lift the energy.
