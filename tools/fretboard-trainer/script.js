// ═══════════════════════════════════════════════════
//  MUSIC THEORY
// ═══════════════════════════════════════════════════

const NOTE_NAMES     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS    = ['#ff4444','#ff8844','#ffcc44','#aadd44',
                        '#44cc44','#44ddbb','#44aaff','#4466ff',
                        '#8844ff','#cc44ff','#ff44aa','#ff4466'];
const INTERVAL_NAMES = ['R','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
const DEGREE_NAMES   = ['Root','Minor 2nd','Major 2nd','Minor 3rd','Major 3rd',
                        'Perfect 4th','Tritone','Perfect 5th','Minor 6th',
                        'Major 6th','Minor 7th','Major 7th'];

const TUNING_PRESETS = [
  { id: 'daeacse',   name: 'DAEAC♯E',        midi: [38, 45, 52, 57, 61, 64] },
  { id: 'standard',  name: 'Standard',        midi: [40, 45, 50, 55, 59, 64] },
  { id: 'drop-d',    name: 'Drop D',          midi: [38, 45, 50, 55, 59, 64] },
  { id: 'drop-c',    name: 'Drop C',          midi: [36, 43, 48, 53, 57, 62] },
  { id: 'drop-b',    name: 'Drop B',          midi: [35, 42, 47, 52, 56, 61] },
  { id: 'd-std',     name: 'D Standard',      midi: [38, 43, 48, 53, 57, 62] },
  { id: 'half-step', name: 'Half-Step Down',  midi: [39, 44, 49, 54, 58, 63] },
  { id: 'open-g',    name: 'Open G',          midi: [38, 43, 50, 55, 59, 62] },
  { id: 'open-d',    name: 'Open D',          midi: [38, 45, 50, 54, 57, 62] },
];

// Current tuning (source of truth = MIDI per string, low→high). All consumers
// read OPEN_MIDI / OPEN_NOTES / STRING_LABELS live, so swapping the tuning is
// just re-deriving these three.
let OPEN_MIDI     = [38, 45, 52, 57, 61, 64];
let OPEN_NOTES    = OPEN_MIDI.map(m => m % 12);
let STRING_LABELS = OPEN_MIDI.map(m => NOTE_NAMES[m % 12]);

const SCALES = {
  'chromatic':        [0,1,2,3,4,5,6,7,8,9,10,11],
  'major':            [0,2,4,5,7,9,11],
  'minor':            [0,2,3,5,7,8,10],
  'dorian':           [0,2,3,5,7,9,10],
  'phrygian':         [0,1,3,5,7,8,10],
  'lydian':           [0,2,4,6,7,9,11],
  'mixolydian':       [0,2,4,5,7,9,10],
  'locrian':          [0,1,3,5,6,8,10],
  'harmonic minor':   [0,2,3,5,7,8,11],
  'major pentatonic': [0,2,4,7,9],
  'minor pentatonic': [0,3,5,7,10],
};

const SCALE_LABELS = {
  'chromatic':        'Chromatic',
  'major':            'Major (Ionian)',
  'minor':            'Natural Minor (Aeolian)',
  'dorian':           'Dorian',
  'phrygian':         'Phrygian',
  'lydian':           'Lydian',
  'mixolydian':       'Mixolydian',
  'locrian':          'Locrian',
  'harmonic minor':   'Harmonic Minor',
  'major pentatonic': 'Major Pentatonic',
  'minor pentatonic': 'Minor Pentatonic',
};

const CHORD_TYPES = {
  'maj':       [0,4,7],
  'min':       [0,3,7],
  '5':         [0,7],
  'sus2':      [0,2,7],
  'sus4':      [0,5,7],
  'add9':      [0,2,4,7],
  'add4':      [0,4,5,7],
  'sus4add9':  [0,2,5,7],
  'madd9':     [0,2,3,7],
  '6':         [0,4,7,9],
  'm6':        [0,3,7,9],
  '6/9':       [0,2,4,7,9],
  'dim':       [0,3,6],
  'aug':       [0,4,8],
  'dom7':      [0,4,7,10],
  'maj7':      [0,4,7,11],
  'min7':      [0,3,7,10],
  '7sus4':     [0,5,7,10],
  'dim7':      [0,3,6,9],
  'm7b5':      [0,3,6,10],
  '9':         [0,2,4,7,10],
  'maj9':      [0,2,4,7,11],
  'm9':        [0,2,3,7,10],
  '7b9':       [0,1,4,7,10],
  '7#9':       [0,3,4,7,10],
  '11':        [0,2,4,5,7,10],
  '13':        [0,2,4,5,6,7,9,10],
};

const CHORD_LABELS = {
  'maj': 'Major', 'min': 'Minor', '5': 'Power Chord', 'sus2': 'Sus 2', 'sus4': 'Sus 4',
  'add9': 'Add 9', 'add4': 'Add 4', 'sus4add9': 'Sus 4 Add 9', 'madd9': 'Min Add 9',
  '6': '6th', 'm6': 'Minor 6th', '6/9': '6/9', 'dim': 'Diminished', 'aug': 'Augmented',
  'dom7': 'Dominant 7', 'maj7': 'Major 7', 'min7': 'Minor 7', '7sus4': '7 Sus 4',
  'dim7': 'Dim 7', 'm7b5': 'Min 7 b5', '9': '9th', 'maj9': 'Major 9', 'm9': 'Minor 9',
  '7b9': '7 b9', '7#9': '7 #9', '11': '11th', '13': '13th',
};

const CHORD_SHORT = {
  'maj': '', 'min': 'm', '5': '5', 'sus2': 'sus2', 'sus4': 'sus4',
  'add9': 'add9', 'add4': 'add4', 'sus4add9': 'sus4add9', 'madd9': 'madd9',
  '6': '6', 'm6': 'm6', '6/9': '6/9', 'dim': 'dim', 'aug': 'aug',
  'dom7': '7', 'maj7': 'maj7', 'min7': 'm7', '7sus4': '7sus4',
  'dim7': 'dim7', 'm7b5': 'm7b5', '9': '9', 'maj9': 'maj9', 'm9': 'm9',
  '7b9': '7b9', '7#9': '7#9', '11': '11', '13': '13',
};

const PRESETS = [
  {
    id: 'nylon', label: 'Nylon Classical',
    chaos: 3,
    params: {
      pickMs: 6, noiseBlend: 0.15, hipass: 55, scoopGain: -1, presenceGain: 2,
      highshelfGain: -1, reverbDecay: 1.8, reverbWet: 0.45, chorusDepth: 0,
      chorusRate: 0, sustainScale: 1.3, strGainScale: 0.8, distBase: 0,
      compThresh: -30, compRatio: 2,
      decayMs: 0.15, susLevel: 0.8, transient: 0.5, pickBite: 0.6,
      // Nylon-specific
      bodyResFreq: 200, bodyResGain: 7, bodyResQ: 2.5,
      chaosMode: 'resonance',
    }
  },
  {
    id: 'acoustic', label: 'Steel Acoustic',
    chaos: 8,
    params: {
      pickMs: 2.5, noiseBlend: 0.4, hipass: 60, scoopGain: -2.5, presenceGain: 5,
      highshelfGain: 2.5, reverbDecay: 1.3, reverbWet: 0.3, chorusDepth: 0.002,
      chorusRate: 1.5, sustainScale: 1.0, strGainScale: 1.0, distBase: 0,
      compThresh: -24, compRatio: 3.5,
      decayMs: 0.1, susLevel: 0.82, transient: 0.6, pickBite: 0.7,
      // Acoustic-specific
      stringResGain: 3.5, stringResFreq: 400,
      chaosMode: 'rattle',
    }
  },
  {
    id: 'electric', label: 'Electric Lead',
    chaos: 22,
    params: {
      pickMs: 1.5, noiseBlend: 0.55, hipass: 80, scoopGain: -4.5, presenceGain: 7,
      highshelfGain: 4, reverbDecay: 1.6, reverbWet: 0.3, chorusDepth: 0.004,
      chorusRate: 1.8, sustainScale: 1.15, strGainScale: 1.1, distBase: 3,
      compThresh: -16, compRatio: 5,
      decayMs: 0.09, susLevel: 0.85, transient: 0.7, pickBite: 0.8,
      // Electric-specific
      vibratoDepth: 0.0015, vibratoRate: 0.6,
      bodyResFreq: 140, bodyResGain: 1.5, bodyResQ: 5,
      chaosMode: 'feedback',
    }
  },
  {
    id: 'muted', label: 'Muted Palm',
    chaos: 0,
    params: {
      pickMs: 1, noiseBlend: 0.8, hipass: 40, scoopGain: -2, presenceGain: 1,
      highshelfGain: -2, reverbDecay: 0.2, reverbWet: 0.02, chorusDepth: 0,
      chorusRate: 0, sustainScale: 0.2, strGainScale: 1.2, distBase: 0,
      compThresh: -8, compRatio: 6,
      decayMs: 0.05, susLevel: 0.7, transient: 0.5, pickBite: 0.6,
      // Muted-specific: body thump
      bodyResFreq: 90, bodyResGain: 5, bodyResQ: 4,
      chugMix: 0.6,
      chaosMode: 'tighten',
    }
  },
  {
    id: 'ambient', label: 'Ambient Swell',
    chaos: 4,
    params: {
      pickMs: 10, noiseBlend: 0.2, hipass: 40, scoopGain: -1, presenceGain: 2.5,
      highshelfGain: 2, reverbDecay: 4.5, reverbWet: 0.7, chorusDepth: 0.008,
      chorusRate: 0.3, sustainScale: 1.8, strGainScale: 0.75, distBase: 0,
      compThresh: -34, compRatio: 1.8,
      decayMs: 0.5, susLevel: 0.9, transient: 0.25, pickBite: 0.4,
      // Ambient-specific
      fadeInMs: 80,
      swellModDepth: 0.008, swellModRate: 0.5,
      chaosMode: 'wobble',
    }
  },
  {
    id: 'crunch', label: 'Crunch Rock',
    chaos: 55,
    params: {
      pickMs: 0.5, noiseBlend: 0.7, hipass: 60, scoopGain: -5, presenceGain: 6,
      highshelfGain: 1, reverbDecay: 0.9, reverbWet: 0.12, chorusDepth: 0,
      chorusRate: 0, sustainScale: 0.7, strGainScale: 0.9, distBase: 0,
      compThresh: -10, compRatio: 10,
      decayMs: 0.06, susLevel: 0.8, transient: 0.7, pickBite: 0.9,
      // Crunch-specific
      cabinetNotchFreq: 3200, cabinetNotchGain: -5, cabinetNotchQ: 2.5,
      powerSagAmount: 0.3, bodyResFreq: 110, bodyResGain: 4, bodyResQ: 2,
      chaosMode: 'saturate',
    }
  },
];

function noteAt(str, fret)           { return (OPEN_NOTES[str] + fret) % 12; }
function intervalFrom(root, str, ft) { return (noteAt(str, ft) - root + 12) % 12; }
function midiToHz(m)                 { return state.tuningRef * Math.pow(2, (m - 69) / 12); }
function noteFreq(str, fret)         { return midiToHz(OPEN_MIDI[str] + fret); }

function noteName(str, fret) {
  return NOTE_NAMES[noteAt(str, fret)];
}

function inScale(root, scaleName, str, fret) {
  const iv = intervalFrom(root, str, fret);
  return (SCALES[scaleName] || []).includes(iv);
}

function getNoteInfo(str, fret, root, scaleName) {
  const semitone = noteAt(str, fret);
  const name     = NOTE_NAMES[semitone];
  const midi     = OPEN_MIDI[str] + fret;
  const freq     = midiToHz(midi);
  const info     = { str, fret, semitone, name, midi, freq };
  if (root !== null) {
    const iv = intervalFrom(root, str, fret);
    info.intervalNum  = iv;
    info.intervalName = INTERVAL_NAMES[iv];
    info.degreeName   = DEGREE_NAMES[iv];
    info.inScale      = inScale(root, scaleName, str, fret);
    info.scaleLabel   = SCALE_LABELS[scaleName] || scaleName;
  }
  return info;
}

function findVoicings(root, chordIntervals, maxFretSpan) {
  const candidates = [];
  for (let s = 0; s < NUM_STRINGS; s++) {
    const row = [];
    for (let f = 0; f < NUM_FRETS; f++) {
      if (chordIntervals.includes(intervalFrom(root, s, f))) row.push(f);
    }
    candidates.push(row);
  }
  const results = [];
  function search(strIdx, chosen) {
    if (strIdx === NUM_STRINGS) {
      const frets = chosen.map(c => c.fret);
      const used  = frets.filter(f => f >= 0);
      if (used.length === 0) return;
      const span    = Math.max(...used) - Math.min(...used);
      const hasRoot = chosen.some(c => c.fret >= 0 && intervalFrom(root, c.str, c.fret) === 0);
      if (hasRoot && span <= maxFretSpan) {
        results.push({ strings: chosen.map(c => c.str), frets: chosen.map(c => c.fret), muted: chosen.filter(c => c.fret < 0).length, span });
      }
      return;
    }
    search(strIdx + 1, [...chosen, { str: strIdx, fret: -1 }]);
    for (const f of candidates[strIdx]) search(strIdx + 1, [...chosen, { str: strIdx, fret: f }]);
  }
  search(0, []);
  results.sort((a, b) => a.muted - b.muted || a.span - b.span
    || a.frets.reduce((s, v) => v >= 0 ? s + v : s, 0) / (NUM_STRINGS - a.muted)
    - b.frets.reduce((s, v) => v >= 0 ? s + v : s, 0) / (NUM_STRINGS - b.muted));
  return results;
}

// Identify chord from a set of fretted notes
function identifyChord(notes) {
  if (notes.length < 2) return null;
  const sorted  = [...notes].sort((a, b) => a.str - b.str);
  const pitches = sorted.map(n => noteAt(n.str, n.fret));
  // Try each note as potential root
  const candidates = [];
  for (const root of new Set(pitches)) {
    const intervals = pitches.map(p => (p - root + 12) % 12).sort((a, b) => a - b);
    const key = intervals.join(',');
    for (const [name, ivs] of Object.entries(CHORD_TYPES)) {
      if (key === [...ivs].sort((a, b) => a - b).join(',')) {
        candidates.push({ root: NOTE_NAMES[root], type: CHORD_LABELS[name], key: name });
      }
    }
  }
  if (candidates.length === 0) {
    // Basic fallback: show intervals from lowest pitch
    const root = pitches[0];
    const intervals = pitches.map(p => (p - root + 12) % 12).sort((a, b) => a - b);
    return { root: NOTE_NAMES[root], type: `${pitches.map(p => NOTE_NAMES[p]).join(' ')}`, key: null, intervals };
  }
  return candidates[0];
}

// ═══════════════════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════════════════

let audioCtx = null;
let masterGain = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function getMasterGain() {
  const ctx = getCtx();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.45;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.05;
    masterGain.connect(limiter);
    limiter.connect(ctx.destination);
  }
  return masterGain;
}

function makeDistortionCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (k === 0) { curve[i] = x; }
    else { curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x)); }
  }
  return curve;
}

function buildReverb(ctx, decaySec, wet) {
  const sr  = ctx.sampleRate;
  const len = Math.floor(sr * decaySec);
  const ir  = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.0);
  }
  const conv     = ctx.createConvolver();
  conv.buffer    = ir;
  const dryGain  = ctx.createGain();
  const wetGain  = ctx.createGain();
  dryGain.gain.value = 1 - wet * 0.5;
  wetGain.gain.value = wet;
  const inputSplit = ctx.createGain();
  const merger     = ctx.createGain();
  inputSplit.connect(dryGain);
  inputSplit.connect(conv);
  dryGain.connect(merger);
  conv.connect(wetGain);
  wetGain.connect(merger);
  return { input: inputSplit, output: merger };
}

const STRING_PROFILES = [
  { smooth: 3, sustain: 2.5 },
  { smooth: 2, sustain: 2.7 },
  { smooth: 1, sustain: 2.9 },
  { smooth: 1, sustain: 3.1 },
  { smooth: 0, sustain: 3.2 },
  { smooth: 0, sustain: 3.3 },
];

function getPresetParams() {
  const preset = PRESETS.find(p => p.id === state.preset) || PRESETS[0];
  return preset.params;
}

// Shared reverb graph — built once per preset, reused by every note
let sharedReverb      = null;
let sharedReverbKey   = null;
function getSharedReverb() {
  const ctx = getCtx();
  const pp  = getPresetParams();
  if (!sharedReverb || sharedReverbKey !== state.preset) {
    sharedReverb    = buildReverb(ctx, pp.reverbDecay, pp.reverbWet);
    sharedReverbKey = state.preset;
  }
  return sharedReverb;
}

// Track the currently-active source per string.
// When a new note is played on a string, the old one is stopped so
// frequencies on the same string never ring into each other.
const activeStringSources = new Map(); // stringIndex -> source

function playNote(stringIndex, fret) {
  const ctx   = getCtx();
  // Stop any note still ringing on this same string — it must never overlap a new one
  const prev = activeStringSources.get(stringIndex);
  if (prev) {
    try { prev.stop(); } catch (_) {}
  }

  const freq  = noteFreq(stringIndex, fret);
  const sr    = ctx.sampleRate;
  const now   = ctx.currentTime;
  const chaos = parseFloat(document.getElementById('chaosSlider').value) / 100;
  const pp    = getPresetParams();
  const prof  = STRING_PROFILES[stringIndex];
  const period  = Math.round(sr / freq);
  const presetDur = { muted: 0.4, crunch: 1.5 };
  const durSec  = presetDur[state.preset] || 3.5;
  const numSamp = Math.floor(sr * durSec);
  const buffer  = ctx.createBuffer(1, numSamp, sr);
  const data    = buffer.getChannelData(0);

  // ── Per-preset chaotic value mapping ──
  let chaosVal = chaos;
  let extraNoise = 0, extraResGain = 0, extraVibDepth = 0;
  let extraTighten = 0, extraWobble = 0, extraSaturate = 0;
  switch (pp.chaosMode) {
    case 'resonance': extraResGain = chaosVal * 8; extraNoise = chaosVal * 0.2; break;
    case 'rattle':    extraNoise = chaosVal * 0.4; break;
    case 'feedback':  extraVibDepth = chaosVal * 0.006; extraResGain = chaosVal * 6; break;
    case 'tighten':   extraTighten = chaosVal * 0.05; break;
    case 'wobble':    extraWobble = chaosVal * 0.01; break;
    case 'saturate':  extraSaturate = chaosVal; break;
  }

  // ── Per-preset synthesis ──
  const strGain    = [1.0, 0.92, 0.84, 0.78, 0.72, 0.68][stringIndex];
  const freqBoost  = Math.pow(freq / 82.41, 0.5);
  const gainFactor = 0.38 * pp.strGainScale * freqBoost * strGain;

  if (state.preset === 'crunch') {
    // Rock guitar: saturated sawtooth → amp → cab chain
    const envAttack = 0.01;
    const envDecay  = 0.5;
    for (let i = 0; i < numSamp; i++) {
      const t = i / sr;
      const phase = ((i * freq / sr) % 1.0);
      // Sawtooth with soft saturation (simulates magnetic pickup)
      let s = 2 * phase - 1;
      s = Math.tanh(s * 2.5);
      // Add noise for pick attack
      if (i < Math.round(sr * 0.002)) s += (Math.random() * 2 - 1) * 0.4;
      // Envelope: instant attack, slow decay
      const env = Math.min(1, t / envAttack) * Math.exp(-t / envDecay);
      data[i] = s * gainFactor * 1.8 * env;
    }
  } else if (state.preset === 'muted') {
    // Palm chug: KS + aggressive damping + body thump
    const pickMs  = Math.max(0.5, pp.pickMs - extraTighten * 0.5);
    const excLen  = Math.min(period, Math.round(sr * pickMs / 1000));
    const fretVar = Math.max(0, prof.smooth - Math.floor(fret / 6));
    const exc     = new Float32Array(period);
    const noiseAmt = Math.min(0.9, pp.noiseBlend + extraNoise);
    const harmAmt  = 1 - noiseAmt;
    for (let i = 0; i < excLen; i++) {
      const n    = Math.random() * 2 - 1;
      const h    = Math.sin(2 * Math.PI * freq * i / sr);
      exc[i] = n * noiseAmt + h * harmAmt;
    }
    for (let p = 0; p < fretVar; p++)
      for (let i = 1; i < excLen; i++) exc[i] = 0.5 * (exc[i] + exc[i - 1]);
    const dl = new Float32Array(period);
    for (let i = 0; i < period; i++) dl[i] = i < excLen ? exc[i] : 0;
    const sustainScale = Math.max(0.1, pp.sustainScale - extraTighten * 0.5);
    const damp = Math.min(0.999, Math.pow(0.001, 1 / (freq * prof.sustain * sustainScale)));
    // Sub-harmonic body thump mixed into KS delay line
    const bodyFreq = Math.max(40, freq * 0.35);
    for (let i = 0; i < numSamp; i++) {
      const r = i % period;
      const p = (r - 1 + period) % period;
      const s = damp * 0.5 * (dl[r] + dl[p]);
      dl[r] = s;
      const thump = Math.sin(2 * Math.PI * bodyFreq * i / sr) * Math.exp(-i / sr / 0.03);
      data[i] = (s + thump * 0.7) * gainFactor * 1.3;
    }
  } else {
    // Standard KS synthesis for nylon, acoustic, electric, ambient
    const pickMs  = Math.max(0.5, pp.pickMs - extraTighten * 0.5);
    const excLen  = Math.min(period, Math.round(sr * pickMs / 1000));
    const fretVar = Math.max(0, prof.smooth - Math.floor(fret / 6));
    const exc     = new Float32Array(period);
    const noiseAmt = Math.min(0.9, pp.noiseBlend + extraNoise);
    const harmAmt  = 1 - noiseAmt;
    for (let i = 0; i < excLen; i++) {
      const n    = Math.random() * 2 - 1;
      const h    = Math.sin(2 * Math.PI * freq * i / sr);
      exc[i] = n * noiseAmt + h * harmAmt;
    }
    if (pp.chaosMode === 'rattle' && extraNoise > 0.05) {
      const rl = Math.min(excLen, Math.round(sr * 0.001));
      for (let i = 0; i < rl; i++)
        exc[Math.floor(Math.random() * excLen)] += (Math.random() * 2 - 1) * extraNoise * 0.5;
    }
    for (let p = 0; p < fretVar; p++)
      for (let i = 1; i < excLen; i++) exc[i] = 0.5 * (exc[i] + exc[i - 1]);
    const dl = new Float32Array(period);
    for (let i = 0; i < period; i++) dl[i] = i < excLen ? exc[i] : 0;
    const sustainScale = Math.max(0.1, pp.sustainScale - extraTighten * 0.5);
    const damp = Math.min(0.9995, Math.pow(0.001, 1 / (freq * prof.sustain * sustainScale)));
    for (let i = 0; i < numSamp; i++) {
      const r = i % period;
      const p = (r - 1 + period) % period;
      const s = damp * 0.5 * (dl[r] + dl[p]);
      dl[r] = s;
      data[i] = s * gainFactor;
    }
  }

  // ── Buffer post-processing per preset ──
  // ADSR pluck envelope: fast sharp attack (pick transient) → decay → sustain → release
  const attMs   = 0.004;                 // near-instant attack to 100% (pick click)
  const decMs   = Math.max(0.02, pp.decayMs || 0.12);  // settle from transient peak
  const susLvl  = pp.susLevel || 0.85;    // sustain relative to peak
  const relMs   = 0.04;
  // Transient boost: emphasize the first ~35ms so the pluck is distinct
  const transMs = 0.035;
  const transSamp = Math.min(Math.floor(sr * transMs), numSamp);
  const attSamp  = Math.max(1, Math.floor(sr * attMs));
  const decSamp  = Math.max(1, Math.floor(sr * decMs));
  const relSamp  = Math.max(1, Math.floor(sr * relMs));
  const peak     = 1 + (pp.transient || 0.35);   // pluck peak level above sustain
  const susEnd   = numSamp - relSamp;
  for (let i = 0; i < numSamp; i++) {
    let env;
    if (i < attSamp) {
      env = (i / attSamp) * peak;                 // fast ramp up to peak
    } else if (i < attSamp + decSamp) {
      const t = (i - attSamp) / decSamp;
      env = peak - (peak - susLvl) * t;           // decay to sustain level
    } else if (i < susEnd) {
      env = susLvl;                               // sustain
    } else {
      env = susLvl * (1 - (i - susEnd) / relSamp); // release
    }
    data[i] *= env;
    // Extra sharp pick transient at the very onset (adds attack "bite")
    if (i < transSamp) data[i] *= 1 + (1 - i / transSamp) * (pp.pickBite || 0.5);
  }
  // Fade-out tail (final release smoothing)
  const fadeLen = Math.min(Math.floor(sr * 0.06), numSamp - 1);
  const fadeOff = numSamp - fadeLen;
  for (let i = fadeOff; i < numSamp; i++) data[i] *= 1 - (i - fadeOff) / fadeLen;
  // Ambient fade-in swell (kept very short so it doesn't wash out the pluck attack)
  if (pp.fadeInMs > 0) {
    const swellSamp = Math.min(Math.floor(sr * Math.min(pp.fadeInMs, 20) / 1000), numSamp);
    for (let i = 0; i < swellSamp; i++) data[i] = data[i] * Math.max(0.7, Math.pow(i / swellSamp, 0.6));
  }
  // Ambient modulation (slow volume wobble applied to buffer)
  if (extraWobble > 0) {
    for (let i = 0; i < numSamp; i++) {
      const t = i / sr;
      data[i] *= 1 - extraWobble * 0.5 * Math.sin(2 * Math.PI * pp.swellModRate * t);
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  activeStringSources.set(stringIndex, source);

  // ── Common EQ chain ──
  const hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass'; hipass.frequency.value = pp.hipass; hipass.Q.value = 0.5;
  const scoop = ctx.createBiquadFilter();
  scoop.type = 'peaking'; scoop.frequency.value = 350; scoop.gain.value = pp.scoopGain; scoop.Q.value = 1.0;
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking'; presence.frequency.value = 2800; presence.gain.value = pp.presenceGain; presence.Q.value = 1.2;
  const highshelf = ctx.createBiquadFilter();
  highshelf.type = 'highshelf'; highshelf.frequency.value = 5000; highshelf.gain.value = pp.highshelfGain;

  // ── Per-preset extra EQ nodes ──
  let extraNodes = [];
  // Nylon: body resonance
  if (pp.bodyResFreq > 0 && pp.bodyResGain > 0) {
    const body = ctx.createBiquadFilter();
    body.type = 'peaking'; body.frequency.value = pp.bodyResFreq;
    body.gain.value = pp.bodyResGain + extraResGain;
    body.Q.value = pp.bodyResQ;
    extraNodes.push(body);
  }
  // Acoustic: string resonance
  if (pp.stringResFreq > 0 && pp.stringResGain > 0) {
    const stringRes = ctx.createBiquadFilter();
    stringRes.type = 'peaking'; stringRes.frequency.value = pp.stringResFreq;
    stringRes.gain.value = pp.stringResGain + extraResGain * 0.3;
    stringRes.Q.value = 4;
    extraNodes.push(stringRes);
  }
  // Crunch: cabinet notch
  if (pp.cabinetNotchFreq > 0 && pp.cabinetNotchGain < 0) {
    const cab = ctx.createBiquadFilter();
    cab.type = 'peaking'; cab.frequency.value = pp.cabinetNotchFreq;
    cab.gain.value = pp.cabinetNotchGain;
    cab.Q.value = pp.cabinetNotchQ || 3;
    extraNodes.push(cab);
  }

  // ── Compressor ──
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = pp.compThresh; compressor.knee.value = 10; compressor.ratio.value = pp.compRatio;
  compressor.attack.value = 0.003; compressor.release.value = 0.2;

  // ── Distortion ──
  const dist = ctx.createWaveShaper();
  let totalDist = pp.distBase;
  if (pp.chaosMode === 'saturate') {
    totalDist += extraSaturate * 400;
    dist.curve = makeDistortionCurve(totalDist);
    // Asymmetric component for crunch
    if (extraSaturate > 0.3) {
      const asym = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        asym[i] = Math.tanh(x * 3 * extraSaturate) / Math.tanh(3 * extraSaturate);
      }
      for (let i = 0; i < 256; i++) dist.curve[i] = dist.curve[i] * 0.6 + asym[i] * 0.4;
    }
  } else {
    const distFromChaos = chaos < 0.2 ? 0 : Math.pow((chaos - 0.2) / 0.8, 1.5) * 350;
    totalDist += distFromChaos;
    dist.curve = makeDistortionCurve(totalDist);
  }
  dist.oversample = '2x';

  const preGain = ctx.createGain(); preGain.gain.value = 1 + chaos * 2.5;
  const postGain = ctx.createGain(); postGain.gain.value = chaos < 0.2 ? 1 : 0.8 - chaos * 0.15;

  // ── Crunch power sag (gain dip then recover) ──
  if (pp.powerSagAmount > 0) {
    const sag = ctx.createGain();
    sag.gain.setValueAtTime(1 - pp.powerSagAmount * extraSaturate, now);
    sag.gain.linearRampToValueAtTime(1, now + 0.04);
    extraNodes.push(sag);
  }

  // ── Reverb (shared, rebuilt when the preset changes) ──
  const reverb = getSharedReverb();

  // ── Chorus ──
  let chorusNodes = [];
  if (pp.chorusDepth > 0) {
    [[0.008, 1.8], [0.014, -1.5]].forEach(([dt, rate]) => {
      const del  = ctx.createDelay(0.05);
      const osc  = ctx.createOscillator();
      const lfoG = ctx.createGain();
      del.delayTime.value = dt;
      osc.frequency.value = Math.abs(rate) * pp.chorusRate * 0.3;
      lfoG.gain.value = pp.chorusDepth * 0.003;
      osc.connect(lfoG); lfoG.connect(del.delayTime); osc.start();
      const chG = ctx.createGain(); chG.gain.value = pp.chorusDepth * 0.3;
      chorusNodes.push({ del, osc, chG });
    });
  }

  // ── Vibrato (in-series for true pitch modulation) ──
  let vibratoOut = null;
  const vibratoNodes = [];
  if ((pp.vibratoDepth || 0) + extraVibDepth > 0.0005) {
    const totalVibDepth = Math.min(0.003, (pp.vibratoDepth || 0) + extraVibDepth);
    const vDel = ctx.createDelay(0.05);
    const vLfo = ctx.createOscillator();
    const vLfoG = ctx.createGain();
    vDel.delayTime.value = 0.01;
    vLfo.frequency.value = (pp.vibratoRate || 2) * 2;
    vLfoG.gain.value = totalVibDepth * 3;
    vLfo.connect(vLfoG); vLfoG.connect(vDel.delayTime); vLfo.start();
    vibratoOut = ctx.createGain();
    vDel.connect(vibratoOut);
    vibratoNodes.push({ del: vDel, osc: vLfo, lfoG: vLfoG, out: vibratoOut });
  }
  // ── Peak limiter (electric lead: prevent clipping) ──
  if (state.preset === 'electric') {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.05;
    extraNodes.push(limiter);
  }

  // ── Stereo panning (wide spread so overlapping strings separate in space) ──
  const panMap = [-0.55, -0.33, -0.11, 0.11, 0.33, 0.55];
  const panner = ctx.createStereoPanner();
  panner.pan.value = panMap[stringIndex];

  // ── Build chain ──
  // source → extra nodes → EQ → preGain → dist → postGain → comp → [vibrato] → reverb → panner
  const chain = [source, ...extraNodes, hipass, scoop, presence, highshelf, preGain, dist, postGain, compressor];
  if (vibratoOut) chain.push(vibratoOut);
  chain.push(reverb.input);
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
  reverb.output.connect(panner);
  // Chorus taps share the post-distortion compressor so they don't clip the master bus
  const compIn = ctx.createGain();
  chorusNodes.forEach(({ del, osc, chG }) => { postGain.connect(del); del.connect(chG); chG.connect(compIn); });
  compIn.connect(compressor);
  panner.connect(getMasterGain());
  source.start(now);
  const all = [...chain, reverb.output, panner, compIn,
               ...chorusNodes.flatMap(n => [n.del, n.osc, n.chG]),
               ...vibratoNodes.flatMap(n => [n.del, n.osc, n.lfoG, n.out])];
  const sharedNodes = new Set([reverb.input, reverb.output]);
  source.onended = () => {
    if (activeStringSources.get(stringIndex) === source) activeStringSources.delete(stringIndex);
    for (const n of all) {
      if (sharedNodes.has(n)) continue; // shared reverb must survive note-end
      try { n.disconnect(); if (n.stop && n !== source) n.stop(); } catch (_) {}
    }
  };
}

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════

const state = {
  mode:           'explorer',       // 'explorer' | 'chord'
  root:           null,
  scale:          'major',
  showLabels:     true,
  labelType:      'note',
  chordRoot:      null,
  chordType:      'maj',
  chordNotes:     [],               // [{str, fret}] placed by user
  selectedVoicing: null,            // index into current voicings array
  tuningRef:      440,              // 440 or 432
  tuningId:       'daeacse',        // id in TUNING_PRESETS, or 'custom'
  customMidi:     null,             // [midi × 6] when tuningId === 'custom'
  customTuningCollapsed: false,     // collapse the whole custom tuning settings panel
  presetBeforeCustom: 'daeacse',    // last non-custom tuning for the reset link
  preset:         'default',
  progression: {
    chords: [],                    // [{id,label,root,type,voicing:{strings,frets},beats}]
    bpm: 90,
    timeSig: { num: 4, den: 4 },
    loop: true,
    articulation: 'block',         // 'block' | 'strum' | 'arpeggio'
    playing: false,
    elapsedBeats: 0,
  },
  libOpen: true,
  library: { chords: [] },         // [{key,label,root,type,voicing:{strings,frets},count}]
};

// ═══════════════════════════════════════════════════
//  TUNINGS
//  Presets + a per-string custom editor. The active
//  tuning always lives in OPEN_MIDI (with OPEN_NOTES /
//  STRING_LABELS derived from it), so all consumers keep
//  working untouched — they read the shared arrays.
// ═══════════════════════════════════════════════════

const TUNING_KEY = 'daeace_tuning';

function currentTuning() {
  if (state.tuningId === 'custom' && Array.isArray(state.customMidi) && state.customMidi.length === NUM_STRINGS) {
    return { id: 'custom', name: 'Custom', midi: state.customMidi.slice() };
  }
  return TUNING_PRESETS.find(t => t.id === state.tuningId) || TUNING_PRESETS[0];
}

function midiForNoteOct(noteIdx, oct) {
  return 12 * (oct + 1) + noteIdx; // C4 = 60
}

// B1 (35) … B5 (83) — covers Drop B lows through the highest standard string.
const TUNING_OPTIONS = (() => {
  const opts = [];
  for (let oct = 1; oct <= 5; oct++) {
    for (let n = 0; n < 12; n++) {
      const midi = midiForNoteOct(n, oct);
      if (midi >= 35) opts.push({ note: n, oct, midi });
    }
  }
  return opts;
})();

// Snap an arbitrary midi to the nearest in-range option with the same pitch class.
function snapMidi(midi) {
  const note = ((midi % 12) + 12) % 12;
  let best = null, bestD = Infinity;
  for (const o of TUNING_OPTIONS) {
    if (o.note !== note) continue;
    const d = Math.abs(o.midi - midi);
    if (d < bestD) { bestD = d; best = o.midi; }
  }
  return best;
}

function applyTuning(midi, { persist = true } = {}) {
  if (!Array.isArray(midi) || midi.length !== NUM_STRINGS) return;
  OPEN_MIDI     = midi.slice();
  OPEN_NOTES    = OPEN_MIDI.map(m => m % 12);
  STRING_LABELS = OPEN_MIDI.map(m => NOTE_NAMES[m % 12]);
  updateStringLabels();
  recolorDots();
  drawChordLines();
  renderKBBar();
  updateBrand();
  renderCustomEditor();
  const sel = document.getElementById('tuningSelect');
  if (sel) sel.value = state.tuningId;
  if (state.mode === 'chord') placeBestVoicing();
  if (persist) saveTuning();
}

function updateStringLabels() {
  const layer = document.getElementById('static-layer');
  if (!layer) return;
  const nodes = layer.querySelectorAll('text.string-label');
  nodes.forEach((t, i) => { if (STRING_LABELS[i]) t.textContent = STRING_LABELS[i]; });
}

function updateBrand() {
  const t        = currentTuning();
  const isCustom = t.id === 'custom';
  const notes    = STRING_LABELS.join(' · ');
  const brand    = document.getElementById('brandName');
  const chip     = document.getElementById('tuningChip');
  if (brand) brand.textContent = isCustom ? notes : t.name;
  if (chip) {
    chip.textContent = isCustom ? 'CUSTOM' : notes;
    chip.title = isCustom ? 'Active tuning · ' + notes : 'Active tuning';
  }
  document.title = `${isCustom ? notes : t.name} — Fretboard Trainer`;
}

function saveTuning() {
  try { localStorage.setItem(TUNING_KEY, JSON.stringify({ id: state.tuningId, customMidi: state.customMidi, hidden: state.customTuningCollapsed })); } catch (_) {}
}

function loadTuning() {
  try {
    const raw = localStorage.getItem(TUNING_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s.hidden === 'boolean') state.customTuningCollapsed = s.hidden;
      const validMidi = s && s.id === 'custom' && Array.isArray(s.customMidi) && s.customMidi.length === NUM_STRINGS &&
          s.customMidi.every(m => Number.isFinite(m) && m >= 0 && m < 128);
      if (validMidi) {
        state.tuningId   = 'custom';
        state.customMidi = s.customMidi.map(m => snapMidi(m));
      } else if (s && s.id && TUNING_PRESETS.some(t => t.id === s.id)) {
        state.tuningId   = s.id;
        state.customMidi = null;
      }
    }
  } catch (_) {}
  applyTuning(currentTuning().midi, { persist: false });
}

function renderCustomEditor() {
  const wrap = document.getElementById('customTuningWrap');
  if (!wrap) return;
  const isCustom = state.tuningId === 'custom';
  wrap.style.display = isCustom ? '' : 'none';
  const headNotes = document.getElementById('tuningHeadNotes');
  const rowEl     = document.getElementById('customTuningEditor');
  const actEl     = document.getElementById('tuningActions');
  const hintEl    = document.getElementById('tuningOrderHint');
  const btn       = document.getElementById('tuningCollapseBtn');
  if (!isCustom) return;
  const collapsed = !!state.customTuningCollapsed;
  if (headNotes) {
    headNotes.textContent = STRING_LABELS.join(' · ');
    headNotes.style.display = collapsed ? 'inline' : 'none';
  }
  if (rowEl) rowEl.style.display = collapsed ? 'none' : '';
  if (actEl) actEl.style.display = collapsed ? 'none' : '';
  if (hintEl) hintEl.style.display = collapsed ? 'none' : '';
  if (btn) btn.textContent = collapsed ? '▾ show' : '▴ hide';
  if (!rowEl || collapsed) return;
  const midi = state.customMidi;
  if (!Array.isArray(midi) || midi.length !== NUM_STRINGS) return;
  let html = '';
  for (let s = 0; s < NUM_STRINGS; s++) {
    const m       = midi[s];
    const noteIdx = m % 12;
    const oct     = Math.floor(m / 12) - 1;
    html += `<div class="tuning-slot" data-slot="${s}">`;
    html += `<span class="tuning-str">${s + 1}</span>`;
    html += `<div class="tuning-field"><span class="tuning-lbl">note</span><select class="tuning-note" data-k="note">`;
    NOTE_NAMES.forEach((n, i) => html += `<option value="${i}"${i === noteIdx ? ' selected' : ''}>${n}</option>`);
    html += `</select></div>`;
    html += `<div class="tuning-field"><span class="tuning-lbl">oct</span><select class="tuning-oct" data-k="oct">`;
    const seen = new Set();
    for (const o of TUNING_OPTIONS) {
      if (o.note !== noteIdx || seen.has(o.oct)) continue;
      seen.add(o.oct);
      html += `<option value="${o.oct}"${o.oct === oct ? ' selected' : ''}>${o.oct}</option>`;
    }
    html += `</select></div>`;
    html += `<button class="tuning-note-btn" data-k="play" title="audition this string">▶</button>`;
    html += `</div>`;
  }
  rowEl.innerHTML = html;
  updateTuningHint();
}

function updateTuningHint() {
  const hint = document.getElementById('tuningOrderHint');
  if (!hint) return;
  const outOfOrder = OPEN_MIDI.some((m, i) => i < OPEN_MIDI.length - 1 && m >= OPEN_MIDI[i + 1]);
  hint.style.display = outOfOrder ? '' : 'none';
}

function buildTuningSelect() {
  const sel = document.getElementById('tuningSelect');
  if (!sel) return;
  sel.innerHTML = '';
  TUNING_PRESETS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.name;
    sel.appendChild(opt);
  });
  const cOpt = document.createElement('option');
  cOpt.value = 'custom'; cOpt.textContent = 'Custom…';
  sel.appendChild(cOpt);
  sel.value = state.tuningId;
  sel.addEventListener('change', () => {
    const v = sel.value;
    if (v === 'custom') {
      if (state.tuningId !== 'custom') state.presetBeforeCustom = state.tuningId;
      if (!Array.isArray(state.customMidi) || state.customMidi.length !== NUM_STRINGS) {
        state.customMidi = currentTuning().midi.slice();
      }
      state.tuningId = 'custom';
      applyTuning(state.customMidi);
    } else {
      state.tuningId = v;
      state.customMidi = null;
      applyTuning(TUNING_PRESETS.find(t => t.id === v).midi);
    }
  });
}

function initCustomEditor() {
  const box = document.getElementById('customTuningEditor');
  if (!box) return;
  box.addEventListener('change', (e) => {
    const slotEl = e.target.closest('.tuning-slot');
    if (!slotEl) return;
    const s      = +slotEl.dataset.slot;
    const note   = +slotEl.querySelector('[data-k="note"]').value;
    const oct    = parseInt(slotEl.querySelector('[data-k="oct"]').value, 10);
    const target = snapMidi(midiForNoteOct(note, oct));
    if (target !== OPEN_MIDI[s]) {
      if (!Array.isArray(state.customMidi) || state.customMidi.length !== NUM_STRINGS) {
        state.customMidi = currentTuning().midi.slice();
      }
      state.customMidi[s] = target;
      applyTuning(state.customMidi);
    }
  });
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-k="play"]');
    if (!btn) return;
    const s = +btn.closest('.tuning-slot').dataset.slot;
    playNote(s, 0);
  });
  const strumBtn = document.getElementById('tuningStrumBtn');
  if (strumBtn) strumBtn.addEventListener('click', () => {
    for (let s = 0; s < NUM_STRINGS; s++) setTimeout(() => { try { playNote(s, 0); } catch (_) {} }, s * 70);
  });
  const resetBtn = document.getElementById('tuningResetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    const last = (state.presetBeforeCustom && TUNING_PRESETS.some(t => t.id === state.presetBeforeCustom))
      ? state.presetBeforeCustom : 'daeacse';
    state.tuningId = last;
    state.customMidi = null;
    applyTuning(TUNING_PRESETS.find(t => t.id === last).midi);
  });
  const collapseBtn = document.getElementById('tuningCollapseBtn');
  if (collapseBtn) collapseBtn.addEventListener('click', () => {
    state.customTuningCollapsed = !state.customTuningCollapsed;
    renderCustomEditor();
    saveTuning();
  });
}

// ═══════════════════════════════════════════════════
//  FRETBOARD GEOMETRY
// ═══════════════════════════════════════════════════

const NUM_STRINGS = 6;
const NUM_FRETS   = 16;
const FRET_W      = 64;
const STR_H       = 56;
const PAD_L       = 90;
const PAD_T       = 46;
const PAD_R       = 24;
const PAD_B       = 34;
const DOT_R       = 15;

const SVG_W = PAD_L + NUM_FRETS * FRET_W + PAD_R;
const SVG_H = PAD_T + (NUM_STRINGS - 1) * STR_H + PAD_B;

const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15]);
const DOUBLE_FRETS = new Set([12]);

function dotCenterX(fret) {
  if (fret === 0) return PAD_L - FRET_W * 0.65;
  return PAD_L + (fret - 0.5) * FRET_W;
}

function fretWireX(fret) { return PAD_L + fret * FRET_W; }
function fretLabelX(fret) { return dotCenterX(fret); }

function stringY(strIdx) {
  return PAD_T + ((NUM_STRINGS - 1) - strIdx) * STR_H;
}

// ═══════════════════════════════════════════════════
//  DOT STYLE
// ═══════════════════════════════════════════════════

function dotStyle(str, fret) {
  const { root, scale } = state;
  if (root === null) {
    const semitone = noteAt(str, fret);
    return { fill: NOTE_COLORS[semitone], opacity: 0.85, labelColor: '#000' };
  }
  const interval = intervalFrom(root, str, fret);
  const inSc     = (SCALES[scale] || []).includes(interval);
  if (!inSc) return { fill: '#14141a', opacity: 0.25, labelColor: 'transparent' };
  if (interval === 0)                     return { fill: '#e8c547', opacity: 1, labelColor: '#000' };
  if (interval === 7)                     return { fill: '#4a9eff', opacity: 1, labelColor: '#000' };
  if (interval === 3 || interval === 4)   return { fill: '#c97aff', opacity: 1, labelColor: '#000' };
  if (interval === 10 || interval === 11) return { fill: '#ff7a7a', opacity: 1, labelColor: '#000' };
  return { fill: '#4ecdc4', opacity: 1, labelColor: '#000' };
}

// ═══════════════════════════════════════════════════
//  SVG HELPERS
// ═══════════════════════════════════════════════════

const svg = document.getElementById('fretboard');
svg.setAttribute('width', SVG_W);
svg.setAttribute('height', SVG_H);
svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);

function svgEl(tag, attrs = {}, text = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text) el.textContent = text;
  return el;
}

// ═══════════════════════════════════════════════════
//  DRAW STATIC
// ═══════════════════════════════════════════════════

function drawStatic() {
  const g = svgEl('g', { id: 'static-layer' });
  for (let f = 0; f < NUM_FRETS; f++)
    g.appendChild(svgEl('text', { x: fretLabelX(f), y: PAD_T - 20, class: 'fret-num', fill: f === 0 ? '#777' : '#666' }, String(f)));
  const markerY = (stringY(3) + stringY(2)) / 2;
  for (const f of MARKER_FRETS) {
    if (f === 0 || f >= NUM_FRETS) continue;
    const x = dotCenterX(f);
    if (DOUBLE_FRETS.has(f)) {
      g.appendChild(svgEl('circle', { cx: x - 9, cy: markerY, r: 4, class: 'marker-dot' }));
      g.appendChild(svgEl('circle', { cx: x + 9, cy: markerY, r: 4, class: 'marker-dot' }));
    } else {
      g.appendChild(svgEl('circle', { cx: x, cy: markerY, r: 4, class: 'marker-dot' }));
    }
  }
  const nutX = PAD_L;
  g.appendChild(svgEl('line', { x1: nutX, y1: stringY(NUM_STRINGS - 1) - 6, x2: nutX, y2: stringY(0) + 6, class: 'nut-line' }));
  for (let f = 1; f < NUM_FRETS; f++) {
    const x = fretWireX(f);
    g.appendChild(svgEl('line', { x1: x, y1: stringY(NUM_STRINGS - 1) - 3, x2: x, y2: stringY(0) + 3, class: 'fret-line' }));
  }
  for (let s = 0; s < NUM_STRINGS; s++) {
    const thickness = 1.5 + (NUM_STRINGS - 1 - s) * 0.5;
    g.appendChild(svgEl('line', { x1: PAD_L - FRET_W * 0.9, y1: stringY(s), x2: SVG_W - PAD_R, y2: stringY(s), class: 'string-line', 'stroke-width': thickness }));
  }
  for (let s = 0; s < NUM_STRINGS; s++)
    g.appendChild(svgEl('text', { x: PAD_L - FRET_W * 0.9 - 10, y: stringY(s), class: 'string-label' }, STRING_LABELS[s]));
  svg.appendChild(g);
  // Chord connection lines layer
  svg.appendChild(svgEl('g', { id: 'chord-lines' }));
}

// ═══════════════════════════════════════════════════
//  BUILD DOTS
// ═══════════════════════════════════════════════════

function buildDots() {
  const g = svgEl('g', { id: 'dot-layer' });
  for (let s = 0; s < NUM_STRINGS; s++) {
    for (let f = 0; f < NUM_FRETS; f++) {
      const cx    = dotCenterX(f);
      const cy    = stringY(s);
      const style = dotStyle(s, f);
      const group = svgEl('g', { class: 'note-dot', 'data-string': s, 'data-fret': f });
      group.appendChild(svgEl('circle', { cx, cy, r: DOT_R, fill: style.fill, opacity: style.opacity }));
      const semitone = noteAt(s, f);
      const label    = NOTE_NAMES[semitone];
      group.appendChild(svgEl('text', { x: cx, y: cy, fill: style.labelColor, 'font-family': "'Share Tech Mono', monospace", 'font-size': label.length > 2 ? 11 : 12, 'font-weight': 'bold', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' }, label));
      group.addEventListener('mouseenter', (e) => onDotHover(e, s, f));
      group.addEventListener('mouseleave', onDotLeave);
      group.addEventListener('click',  (e) => onDotClick(e, s, f));
      group.addEventListener('contextmenu', (e) => onDotRightClick(e, s, f));
      g.appendChild(group);
    }
  }
  svg.appendChild(g);
}

function recolorDots() {
  const layer = document.getElementById('dot-layer');
  if (!layer) return;
  const { root, scale, showLabels, labelType } = state;
  for (const group of layer.children) {
    const str     = +group.getAttribute('data-string');
    const fret    = +group.getAttribute('data-fret');
    const style   = dotStyle(str, fret);
    const circle  = group.querySelector('circle');
    const text    = group.querySelector('text');
    if (!circle) continue;
    circle.setAttribute('fill', style.fill);
    circle.setAttribute('opacity', style.opacity);
    // Chord mode highlight: translucent grey stroke on placed notes
    if ((state.mode === 'chord' || state.mode === 'progression') && state.chordNotes.some(n => n.str === str && n.fret === fret)) {
      circle.setAttribute('stroke', 'rgba(200,200,200,0.6)');
      circle.setAttribute('stroke-width', '4');
    } else {
      circle.removeAttribute('stroke');
    }
    const semitone = noteAt(str, fret);
    const isActive = style.opacity > 0.4;
    if (showLabels && isActive && text) {
      const itvl  = root !== null ? INTERVAL_NAMES[intervalFrom(root, str, fret)] : '';
      const label = (labelType === 'interval' && root !== null) ? itvl : NOTE_NAMES[semitone];
      text.textContent = label;
      text.setAttribute('fill', style.labelColor);
      text.removeAttribute('opacity');
    } else if (text) {
      text.textContent = '';
    }
  }
}

// ═══════════════════════════════════════════════════
//  CHORD LINES
// ═══════════════════════════════════════════════════

function drawChordLines() {
  const linesEl = document.getElementById('chord-lines');
  if (!linesEl) return;
  linesEl.innerHTML = '';
  if ((state.mode !== 'chord' && state.mode !== 'progression') || state.chordNotes.length < 2) return;
  const sorted = [...state.chordNotes].sort((a, b) => a.str - b.str);
  for (let i = 0; i < sorted.length - 1; i++) {
    const x1 = dotCenterX(sorted[i].fret);
    const y1 = stringY(sorted[i].str);
    const x2 = dotCenterX(sorted[i + 1].fret);
    const y2 = stringY(sorted[i + 1].str);
    linesEl.appendChild(svgEl('line', { x1, y1, x2, y2, class: 'chord-line' }));
  }
}

// ═══════════════════════════════════════════════════
//  INTERACTION
// ═══════════════════════════════════════════════════

const tooltip   = document.getElementById('tooltip');
const iNote     = document.getElementById('iNote');
const iInterval = document.getElementById('iInterval');
const iDegree   = document.getElementById('iDegree');

function onDotHover(e, str, fret) {
  const info = getNoteInfo(str, fret, state.root, state.scale);
  if (state.mode === 'chord' || state.mode === 'progression') {
    const isPlaced = state.chordNotes.some(n => n.str === str && n.fret === fret);
    const note = info.name;
    tooltip.innerHTML = `<strong>${note}</strong><br><span style="color:#555">${isPlaced ? 'right-click to remove' : 'right-click to add'} (str ${str+1} ft ${fret} · oct ${Math.floor(info.midi/12)-1})</span>`;
    tooltip.classList.add('visible');
    moveTooltip(e);
    return;
  }
  const note     = info.name;
  const { root } = state;
  const interval = root !== null ? intervalFrom(root, str, fret) : null;
  const inSc     = interval !== null ? (SCALES[state.scale] || []).includes(interval) : true;
  let html = `<strong>${note}</strong>`;
  if (interval !== null) {
    html += `<br><span class="t-interval">${INTERVAL_NAMES[interval]}</span> — ${DEGREE_NAMES[interval]}`;
    html += inSc ? `<br><span class="t-scale">${SCALE_LABELS[state.scale]}</span>` : `<br><span style="color:#555">outside scale</span>`;
  }
  html += `<br><span style="color:#444">str ${str + 1}  fret ${fret}  ·  oct ${Math.floor(info.midi / 12) - 1}  ·  ${info.freq.toFixed(1)} Hz</span>`;
  tooltip.innerHTML = html;
  tooltip.classList.add('visible');
  moveTooltip(e);
}

function onDotLeave() { tooltip.classList.remove('visible'); }

document.addEventListener('mousemove', (e) => {
  if (tooltip.classList.contains('visible')) moveTooltip(e);
});

function moveTooltip(e) {
  tooltip.style.left = Math.min(e.clientX + 14, window.innerWidth - 200) + 'px';
  tooltip.style.top  = (e.clientY - 10) + 'px';
}

function onDotRightClick(e, str, fret) {
  e.preventDefault();
  if (state.mode !== 'chord') return;
  const idx = state.chordNotes.findIndex(n => n.str === str && n.fret === fret);
  if (idx >= 0) {
    state.chordNotes.splice(idx, 1);
  } else {
    // Only one note per string
    const existingStr = state.chordNotes.findIndex(n => n.str === str);
    if (existingStr >= 0) state.chordNotes.splice(existingStr, 1);
    state.chordNotes.push({ str, fret });
  }
  recolorDots();
  drawChordLines();
  renderChordPanel();
}

function fireDot(str, fret) {
  const { root, scale } = state;
  const info = getNoteInfo(str, fret, root, scale);
  iNote.innerHTML     = `<span class="note-swatch" style="background:${NOTE_COLORS[info.semitone]}"></span>${info.name}`;
  iInterval.textContent = root !== null ? info.intervalName : '—';
  iDegree.textContent   = root !== null ? `${info.degreeName} — ${info.inScale ? 'in scale' : 'outside scale'}` : '—';
  // Trace panel (explorer mode only)
  if (state.mode === 'explorer') {
    const trace = document.getElementById('trace');
    if (trace) {
      let html = `<span class="trace-step">noteAt(${str},${fret})</span>`;
      html += ` <span class="trace-op">=</span> (${OPEN_NOTES[str]} + ${fret}) % 12`;
      html += ` <span class="trace-op">=</span> <span class="trace-val">${info.semitone} → ${info.name}</span>`;
      html += `<br><span class="trace-step">noteFreq(${str},${fret})</span>`;
      html += ` <span class="trace-op">=</span> midiToHz(${OPEN_MIDI[str] + fret})`;
      html += ` <span class="trace-op">=</span> <span class="trace-val">${info.freq.toFixed(1)} Hz</span>`;
      if (root !== null) {
        html += `<br><span class="trace-step">intervalFrom(${NOTE_NAMES[root]},${str},${fret})</span>`;
        html += ` <span class="trace-op">=</span> (${info.semitone} − ${root}) % 12`;
        html += ` <span class="trace-op">=</span> <span class="trace-val">${info.intervalName} (${info.degreeName})</span>`;
        html += `<br><span class="trace-step">inScale</span>`;
        html += ` <span class="trace-op">=</span> ${info.intervalNum} ${info.inScale ? '∈' : '∉'} [${(SCALES[scale] || []).join(',')}]`;
        html += ` <span class="trace-op">→</span> <span class="trace-val ${info.inScale ? 'yes' : 'no'}">${info.inScale ? 'IN SCALE' : 'OUTSIDE'}</span>`;
        const chordTests = [['maj',[0,4,7]],['min',[0,3,7]],['dom7',[0,4,7,10]],['maj7',[0,4,7,11]]];
        for (const [name, ivs] of chordTests) {
          const v = findVoicings(root, ivs, 4);
          if (v.length > 0) {
            html += `<br><span class="trace-step">${NOTE_NAMES[root]} ${name}</span>`;
            html += ` <span class="trace-op">→</span> ${v.slice(0, 2).map(vv => `[${vv.frets.map(f => f < 0 ? 'x' : f).join(' ')}]`).join('  ')}`;
          }
        }
      }
      trace.innerHTML = html;
    }
  }
  // Ripple
  const cx    = dotCenterX(fret);
  const cy    = stringY(str);
  const st    = dotStyle(str, fret);
  const ripple = svgEl('circle', { cx, cy, r: DOT_R, fill: 'none', stroke: st.fill === '#14141a' ? '#444' : st.fill, 'stroke-width': 1.5, class: 'ripple-circle' });
  document.getElementById('dot-layer').appendChild(ripple);
  setTimeout(() => ripple.remove(), 450);
  playNote(str, fret);
}

function onDotClick(e, str, fret) {
  fireDot(str, fret);
}

// ═══════════════════════════════════════════════════
//  STRUM
// ═══════════════════════════════════════════════════

let strumming = false;

function strumChord() {
  if (state.chordNotes.length < 2 || strumming) return;
  strumming = true;
  const sorted = [...state.chordNotes].sort((a, b) => a.str - b.str);
  const total = sorted.length;
  sorted.forEach((n, i) => {
    setTimeout(() => {
      try { playNote(n.str, n.fret); } finally { if (i === total - 1) strumming = false; }
    }, i * 70);
  });
}

// ═══════════════════════════════════════════════════
//  MODE SWITCHING
// ═══════════════════════════════════════════════════

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  const modeChip = document.getElementById('modeChip');
  if (modeChip) modeChip.textContent = 'MODE · ' + mode.toUpperCase();
  document.getElementById('panel-explorer').style.display = mode === 'explorer' ? '' : 'none';
  document.getElementById('panel-chord').style.display    = mode === 'chord' ? '' : 'none';
  document.getElementById('panel-progression').style.display = mode === 'progression' ? '' : 'none';
  // Show/hide scale and label controls based on mode
  document.querySelector('.ctrl-group.scale-group').style.display = mode === 'explorer' ? '' : 'none';
  document.querySelector('.ctrl-group.label-group').style.display = mode === 'explorer' ? '' : 'none';
  document.getElementById('legend').style.display = mode === 'explorer' ? '' : 'none';
  recolorDots();
  drawChordLines();
  if (mode === 'chord') renderChordPanel();
  if (mode === 'progression') renderProgression();
}

// ═══════════════════════════════════════════════════
//  CHORD BUILDER PANEL
// ═══════════════════════════════════════════════════

function applyVoicing(v, { select = false } = {}) {
  state.chordNotes = [];
  v.frets.forEach((f, si) => { if (f >= 0) state.chordNotes.push({ str: si, fret: f }); });
  if (select !== false) state.selectedVoicing = select;
  recolorDots();
  drawChordLines();
  renderChordPanel();
}

function placeBestVoicing() {
  if (state.chordRoot === null) return false;
  const voicings = findVoicings(state.chordRoot, CHORD_TYPES[state.chordType], 5);
  if (voicings.length === 0) return false;
  applyVoicing(voicings[0], { select: 0 });
  return true;
}

function addChordToProgression() {
  const notes = state.chordNotes;
  if (notes.length === 0) return false;
  const root = state.chordRoot;
  const type = state.chordType;
  let label;
  if (root !== null) {
    label = NOTE_NAMES[root] + (CHORD_SHORT[type] || type);
  } else {
    const ident = identifyChord(notes);
    label = ident ? `${ident.root}${CHORD_SHORT[ident.key] || ''}` : notes.map(n => NOTE_NAMES[noteAt(n.str, n.fret)]).join(' ');
  }
  state.progression.chords.push({
    id: Date.now() + Math.random(),
    label: label || 'Chord',
    root,
    type,
    voicing: { strings: notes.map(n => n.str), frets: notes.map(n => n.fret) },
    beats: state.progression.timeSig.num,
  });
  saveProgression();
  return true;
}

function renderChordPanel() {
  const panel = document.getElementById('panel-chord');
  if (!panel || state.mode !== 'chord') return;

  const root = state.chordRoot;
  const type = state.chordType;
  const notes = state.chordNotes;

  let html = '';

  // ── Chord root selector ──
  html += `<div class="chord-section"><div class="ctrl-label">Root</div><div class="root-btns">`;
  NOTE_NAMES.forEach((n, i) => {
    html += `<button class="root-btn${root === i ? ' active' : ''}" data-cr="${i}">${n}</button>`;
  });
  html += `</div></div>`;

  // ── Chord type selector ──
  html += `<div class="chord-section"><div class="ctrl-label">Type</div><div class="sel-wrap" style="display:inline-block">`;
  html += `<select id="chordTypeSelect">`;
  for (const [key, label] of Object.entries(CHORD_LABELS)) {
    html += `<option value="${key}"${key === type ? ' selected' : ''}>${label}</option>`;
  }
  html += `</select></div>`;
  html += ` <button class="chord-btn" id="placeChordBtn">↻ Re-place</button></div>`;

  // ── Placed notes (shown FIRST) ──
  html += `<div class="chord-section chord-notes-section">`;
  if (notes.length === 0) {
    html += `<span style="color:var(--dim)">right-click dots on the fretboard to build a chord</span>`;
  } else {
    const sorted = [...notes].sort((a, b) => a.str - b.str);
    const nameStr = sorted.map(n => NOTE_NAMES[noteAt(n.str, n.fret)]).join(' ');
    const intStr  = root !== null ? sorted.map(n => INTERVAL_NAMES[intervalFrom(root, n.str, n.fret)]).join(' ') : '';
    const ident   = identifyChord(notes);
    html += `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">`;
    html += `<strong style="color:#fff">${nameStr}</strong>`;
    if (ident) html += `<span style="color:var(--accent)">${ident.root} ${ident.type}</span>`;
    if (intStr) html += `<span style="color:var(--dim)">${intStr}</span>`;
    html += `<button class="chord-btn strum-btn" id="strumBtn">▶ Strum</button>`;
    html += `<button class="chord-btn clear-btn" id="clearChordBtn">Clear</button>`;
    html += `<button class="chord-btn save-btn" id="saveLibBtn">★ Save</button>`;
    html += `<button class="chord-btn" id="addProgBtn">+ Playlist</button>`;
    html += `</div>`;
  }
  html += `</div>`;

  // ── Computed voicings ──
  if (root !== null) {
    const intervals = CHORD_TYPES[type];
    const voicings = findVoicings(root, intervals, 5);
    html += `<div class="chord-section"><div class="ctrl-label">Voicings (${Math.min(voicings.length, 6)} shown)</div><div class="voicing-list">`;
    const shown = voicings.slice(0, 6);
    shown.forEach((v, i) => {
      const fretsStr = v.frets.map(f => f < 0 ? 'x' : String(f)).join(' ');
      const isSel = state.selectedVoicing === i;
      const intervalNames = v.frets.filter(f => f >= 0).map((f, si) => {
        const s = v.strings.filter((_, j) => v.frets[j] >= 0)[si];
        return INTERVAL_NAMES[intervalFrom(root, s, f)];
      }).join(' ');
      // Determine inversion from bass note
      const firstFrettedIdx = v.frets.findIndex(f => f >= 0);
      const bassStr = firstFrettedIdx >= 0 ? firstFrettedIdx : 0;
      const bassFret = v.frets[bassStr];
      const bassInterval = bassFret >= 0 ? intervalFrom(root, bassStr, bassFret) : -1;
      let invLabel = '';
      if (bassInterval === 0) invLabel = `${NOTE_NAMES[root]}${CHORD_LABELS[type]} (root)`;
      else if (bassInterval === 3 || bassInterval === 4) invLabel = `${NOTE_NAMES[root]}${CHORD_LABELS[type]}/${NOTE_NAMES[(root + bassInterval) % 12]} (1st inv)`;
      else if (bassInterval === 7) invLabel = `${NOTE_NAMES[root]}${CHORD_LABELS[type]}/${NOTE_NAMES[(root + bassInterval) % 12]} (2nd inv)`;
      else invLabel = `${NOTE_NAMES[root]}${CHORD_LABELS[type]}/${NOTE_NAMES[(root + bassInterval) % 12]}`;
      html += `<div class="voicing-item${isSel ? ' sel' : ''}" data-vi="${i}">`;
      html += `<span class="voicing-frets">${fretsStr}</span>`;
      html += ` <span class="voicing-detail">${intervalNames}</span>`;
      html += ` <span class="voicing-meta">${invLabel}</span>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  panel.innerHTML = html;

  // ── Wire up events ──
  panel.querySelectorAll('[data-cr]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.chordRoot = +btn.dataset.cr;
      placeBestVoicing();
    });
  });
  const typeSel = document.getElementById('chordTypeSelect');
  if (typeSel) {
    typeSel.addEventListener('change', () => {
      state.chordType = typeSel.value;
      placeBestVoicing();
    });
  }
  const placeBtn = document.getElementById('placeChordBtn');
  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      if (state.chordRoot === null) return;
      placeBestVoicing();
    });
  }
  panel.querySelectorAll('[data-vi]').forEach(el => {
    el.addEventListener('click', () => {
      const voicings = findVoicings(state.chordRoot, CHORD_TYPES[state.chordType], 5);
      const v = voicings[+el.dataset.vi];
      if (!v) return;
      applyVoicing(v, { select: +el.dataset.vi });
    });
  });
  const strumBtn = document.getElementById('strumBtn');
  if (strumBtn) strumBtn.addEventListener('click', strumChord);
  const saveLibBtn = document.getElementById('saveLibBtn');
  if (saveLibBtn) saveLibBtn.addEventListener('click', (e) => {
    if (state.chordNotes.length === 0) return;
    const voicing = { strings: state.chordNotes.map(n => n.str), frets: state.chordNotes.map(n => n.fret) };
    let label = '';
    if (state.chordRoot !== null) {
      label = NOTE_NAMES[state.chordRoot] + (CHORD_SHORT[state.chordType] || state.chordType);
    } else {
      const ident = identifyChord(state.chordNotes);
      label = (ident && ident.key) ? ident.root + (CHORD_SHORT[ident.key] || '') : state.chordNotes.map(n => NOTE_NAMES[noteAt(n.str, n.fret)]).join(' ');
    }
    addToLibrary(state.chordRoot, state.chordType, voicing, label || 'Chord');
    const b = e.currentTarget;
    b.textContent = 'Saved ★';
    setTimeout(() => { b.textContent = '★ Save'; }, 900);
  });
  const addProgBtn = document.getElementById('addProgBtn');
  if (addProgBtn) addProgBtn.addEventListener('click', (e) => {
    if (state.chordNotes.length === 0) return;
    addChordToProgression();
    const b = e.currentTarget;
    b.textContent = 'Added ✓';
    setTimeout(() => { b.textContent = '+ Playlist'; }, 900);
  });
  const clearBtn = document.getElementById('clearChordBtn');
  if (clearBtn) { clearBtn.addEventListener('click', () => {
    state.chordNotes = [];
    recolorDots();
    drawChordLines();
    renderChordPanel();
  });}
}

// ═══════════════════════════════════════════════════
//  CHORD PROGRESSION PLAYER
// ═══════════════════════════════════════════════════

const PROG_KEY     = 'daeace_progression';
const PROG_BEAT_PX = 64;

const PROG_SIGS = [
  { label: '4/4', num: 4, den: 4 },
  { label: '3/4', num: 3, den: 4 },
  { label: '2/4', num: 2, den: 4 },
  { label: '5/4', num: 5, den: 4 },
  { label: '6/8', num: 6, den: 8 },
  { label: '7/8', num: 7, den: 8 },
  { label: '9/8', num: 9, den: 8 },
];

let progTimers    = [];
let progClock     = null;
let playAnchorMs  = 0;
let playStartBeat = 0;
let unfoldedFired = 0;
let progEls       = null;   // { track, blocks, playhead }
let dragState     = null;
let dragMoved     = false;

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function beatDuration() {
  const { bpm, timeSig } = state.progression;
  return (60 / bpm) * (4 / timeSig.den);
}

function progTotalBeats() {
  return state.progression.chords.reduce((s, c) => s + c.beats, 0);
}

function progressionEvents() {
  const list = [];
  let acc = 0;
  for (const c of state.progression.chords) {
    list.push({ start: acc, chord: c });
    acc += c.beats;
  }
  return { list, total: acc };
}

function progStartBeat(idx) {
  const evts = progressionEvents().list[idx];
  return evts ? evts.start : 0;
}

function saveProgression() {
  const p = state.progression;
  try {
    localStorage.setItem(PROG_KEY, JSON.stringify({
      chords: p.chords, bpm: p.bpm, timeSig: p.timeSig,
      loop: p.loop, articulation: p.articulation,
    }));
  } catch (_) {}
}

function loadProgression() {
  try {
    const raw = localStorage.getItem(PROG_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Array.isArray(s.chords)) {
      state.progression.chords = s.chords.map(c => ({
        id: (typeof c.id === 'number' || typeof c.id === 'string') ? c.id : Date.now() + Math.random(),
        label: c.label || 'Chord',
        root: (typeof c.root === 'number') ? c.root : null,
        type: c.type || 'maj',
        voicing: (c.voicing && Array.isArray(c.voicing.frets)) ? c.voicing : { strings: [], frets: [] },
        beats: (typeof c.beats === 'number' && c.beats > 0) ? c.beats : 4,
      })).filter(c => c.voicing.frets.length > 0);
    }
    if (typeof s.bpm === 'number' && s.bpm >= 20 && s.bpm <= 300) state.progression.bpm = s.bpm;
    if (s.timeSig && s.timeSig.num && s.timeSig.den) state.progression.timeSig = { num: +s.timeSig.num, den: +s.timeSig.den };
    if (typeof s.loop === 'boolean') state.progression.loop = s.loop;
    if (s.articulation) state.progression.articulation = s.articulation;
  } catch (_) {}
}

function showProgressionOnBoard(c) {
  state.chordNotes = [];
  c.voicing.frets.forEach((f, si) => { if (f >= 0) state.chordNotes.push({ str: si, fret: f }); });
  recolorDots();
  drawChordLines();
}

function playChordVoicing(c) {
  const art = state.progression.articulation;
  const notes = [];
  c.voicing.frets.forEach((f, si) => { if (f >= 0) notes.push({ str: si, fret: f }); });
  if (notes.length === 0) return;
  const stagger = art === 'block' ? 8 : art === 'strum' ? 70 : 140;
  notes.forEach((n, i) => {
    progTimers.push(setTimeout(() => { try { playNote(n.str, n.fret); } catch (_) {} }, i * stagger));
  });
}

function fireProgressionChord(idx) {
  const c = state.progression.chords[idx];
  if (!c) return;
  showProgressionOnBoard(c);
  playChordVoicing(c);
}

function clearProgTimers() {
  progTimers.forEach(t => clearTimeout(t));
  progTimers = [];
}

function stopClock() {
  if (progClock) { clearInterval(progClock); progClock = null; }
}

function nextEventIndex(cursor) {
  const { list, total } = progressionEvents();
  if (list.length === 0) return null;
  let rot = Math.floor(cursor / total);
  let pos = cursor - rot * total;
  for (let i = 0; i < list.length; i++) {
    if (list[i].start > pos) return { start: rot * total + list[i].start, idx: i };
  }
  return { start: (rot + 1) * total + list[0].start, idx: 0 };
}

function updateProgPlayheadVisual(localBeats) {
  if (!progEls) return;
  const total = progTotalBeats();
  progEls.playhead.style.left = (Math.max(0, localBeats) * PROG_BEAT_PX) + 'px';
  let acc = 0, active = -1;
  state.progression.chords.forEach((c, i) => {
    if (localBeats >= acc && localBeats < acc + c.beats) active = i;
    acc += c.beats;
  });
  progEls.blocks.forEach((el, i) => el.classList.toggle('playing', i === active));
}

function updateTransportButton() {
  const btn = document.getElementById('pPlay');
  if (btn) btn.textContent = state.progression.playing ? '⏸ Pause' : '▶ Play';
}

function progTick() {
  const prog = state.progression;
  if (prog.chords.length === 0) { stopPlayback(); return; }
  const { total } = progressionEvents();
  if (total <= 0) return;
  const nowUnfolded = playStartBeat + (performance.now() - playAnchorMs) / 1000 / beatDuration();
  const limit = prog.loop ? Infinity : playStartBeat + total;
  if (!prog.loop && nowUnfolded - playStartBeat >= total) { stopPlayback(); return; }
  let e = nextEventIndex(unfoldedFired);
  while (e && e.start <= nowUnfolded && e.start < limit) {
    fireProgressionChord(e.idx);
    unfoldedFired = e.start;
    e = nextEventIndex(unfoldedFired);
  }
  updateProgPlayheadVisual(nowUnfolded % total);
}

function startPlayback(fromBeat) {
  const prog = state.progression;
  if (prog.chords.length === 0) return;
  stopClock();
  clearProgTimers();
  const total = progTotalBeats();
  let b = fromBeat !== undefined ? fromBeat : prog.elapsedBeats;
  b = Math.max(0, Math.min(b, Math.max(0, total - 0.001)));
  prog.playing = true;
  prog.elapsedBeats = b;
  playStartBeat = b;
  playAnchorMs = performance.now();
  unfoldedFired = b - 1e-6;
  progClock = setInterval(progTick, 40);
  updateTransportButton();
  progTick();
}

function pausePlayback() {
  const prog = state.progression;
  if (!prog.playing) return;
  stopClock();
  clearProgTimers();
  const nowUnfolded = playStartBeat + (performance.now() - playAnchorMs) / 1000 / beatDuration();
  const total = progTotalBeats();
  prog.elapsedBeats = total > 0 ? nowUnfolded % total : 0;
  prog.playing = false;
  updateProgPlayheadVisual(prog.elapsedBeats);
  updateTransportButton();
}

function stopPlayback() {
  const prog = state.progression;
  stopClock();
  clearProgTimers();
  prog.playing = false;
  prog.elapsedBeats = 0;
  updateProgPlayheadVisual(0);
  updateTransportButton();
}

function seekProgression(beat) {
  const prog = state.progression;
  prog.elapsedBeats = beat;
  if (prog.playing) {
    stopClock();
    clearProgTimers();
    playStartBeat = beat;
    playAnchorMs = performance.now();
    unfoldedFired = beat - 1e-6;
    progClock = setInterval(progTick, 40);
    progTick();
  } else {
    updateProgPlayheadVisual(beat);
  }
}

function previewProgressionChord(idx, doSeek) {
  const c = state.progression.chords[idx];
  if (!c) return;
  showProgressionOnBoard(c);
  if (doSeek) seekProgression(progStartBeat(idx));
}

function startDrag(e, type, idx) {
  dragState = { type, idx, startX: e.clientX };
  dragMoved = false;
  if (type === 'resize') {
    dragState.origBeats = state.progression.chords[idx].beats;
  } else {
    dragState.origLeft = progStartBeat(idx) * PROG_BEAT_PX;
    const el = progEls.blocks[idx];
    if (el) el.classList.add('dragging');
  }
  document.body.classList.add('prog-dragging');
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
}

function onDragMove(e) {
  if (!dragState || !progEls) return;
  const dx = e.clientX - dragState.startX;
  if (Math.abs(dx) > 2) dragMoved = true;
  const el = progEls.blocks[dragState.idx];
  if (!el) return;
  if (dragState.type === 'resize') {
    const nb = Math.max(1, Math.min(32, Math.round(dragState.origBeats + dx / PROG_BEAT_PX)));
    el.style.width = (nb * PROG_BEAT_PX) + 'px';
  } else {
    el.style.left = (dragState.origLeft + dx) + 'px';
  }
}

function onDragEnd(e) {
  if (!dragState || !progEls) return;
  if (state.progression.playing) stopPlayback();
  const { type, idx } = dragState;
  if (type === 'resize') {
    const el = progEls.blocks[idx];
    const nb = el ? Math.max(1, Math.min(32, Math.round(parseFloat(el.style.width) / PROG_BEAT_PX))) : state.progression.chords[idx].beats;
    state.progression.chords[idx].beats = nb;
    saveProgression();
  } else {
    const chords = state.progression.chords;
    // Drop on the Chord Library → remove from playlist and stack into a single entry
    const libBox = document.getElementById('libraryBox');
    if (libBox) {
      const libRect = libBox.getBoundingClientRect();
      if (e.clientX > libRect.left && e.clientX < libRect.right &&
          e.clientY > libRect.top && e.clientY < libRect.bottom) {
        const c = chords[idx];
        chords.splice(idx, 1);
        if (c) bumpLibrary(libFingerprint(c.root, c.type, c.voicing), c);
        saveProgression();
        dragState = null;
        document.body.classList.remove('prog-dragging');
        document.removeEventListener('pointermove', onDragMove);
        document.removeEventListener('pointerup', onDragEnd);
        renderProgression();
        renderLibrary();
        return;
      }
    }
    const trackRect = progEls.track.getBoundingClientRect();
    let insertion = 0;
    chords.forEach((c, i) => {
      if (i === idx) return;
      const midAbs = trackRect.left + (progStartBeat(i) + c.beats / 2) * PROG_BEAT_PX;
      if (e.clientX > midAbs) insertion++;
    });
    const moved = [...chords];
    const [movedChord] = moved.splice(idx, 1);
    if (insertion > idx) insertion--;
    moved.splice(insertion, 0, movedChord);
    const changed = moved.some((c, i) => c !== chords[i]);
    if (changed) {
      state.progression.chords = moved;
      saveProgression();
    }
  }
  dragState = null;
  document.body.classList.remove('prog-dragging');
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);
  renderProgression();
}

function bindProgInteractions() {
  if (!progEls) return;
  const { blocks } = progEls;
  blocks.forEach(el => {
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.prog-resize') || e.target.closest('.prog-del')) return;
      e.preventDefault();
      startDrag(e, 'move', +el.dataset.idx);
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('.prog-resize') || e.target.closest('.prog-del') || dragMoved) {
        dragMoved = false;
        return;
      }
      previewProgressionChord(+el.dataset.idx, true);
    });
    const resEl = el.querySelector('.prog-resize');
    if (resEl) resEl.addEventListener('pointerdown', (e) => {
      if (state.progression.playing) return;
      e.stopPropagation();
      e.preventDefault();
      startDrag(e, 'resize', +el.dataset.idx);
    });
    const delEl = el.querySelector('.prog-del');
    if (delEl) delEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.progression.playing) stopPlayback();
      state.progression.chords.splice(+el.dataset.idx, 1);
      saveProgression();
      renderProgression();
    });
  });
}

function renderProgression() {
  const panel = document.getElementById('panel-progression');
  if (!panel || state.mode !== 'progression') return;
  const prog = state.progression;
  const { num, den } = prog.timeSig;
  const chords = prog.chords;
  const total = progTotalBeats();
  const curSig = `${num}/${den}`;
  const isCustom = !PROG_SIGS.some(s => s.label === curSig);

  let html = '';

  // ── Transport ──
  html += `<div class="prog-transport">`;
  html += `<button class="prog-btn" id="pPlay">${prog.playing ? '⏸ Pause' : '▶ Play'}</button>`;
  html += `<button class="prog-btn" id="pStop">⏹ Stop</button>`;
  html += `<button class="prog-btn${prog.loop ? ' on' : ''}" id="pLoop">LOOP ${prog.loop ? 'ON' : 'OFF'}</button>`;
  html += `<div class="prog-setting"><label>BPM</label><input type="number" id="pBpm" value="${prog.bpm}" min="20" max="300" step="1"></div>`;
  html += `<div class="prog-setting"><label>Time Sig</label><select id="pSig">`;
  for (const s of PROG_SIGS) html += `<option value="${s.label}"${curSig === s.label ? ' selected' : ''}>${s.label}</option>`;
  html += `<option value="custom"${isCustom ? ' selected' : ''}>Custom…</option>`;
  html += `</select></div>`;
  html += `<div class="prog-setting custom-sig${isCustom ? '' : ' hidden'}"><label>Num</label><input type="number" id="pSigNum" value="${num}" min="1" max="16"></div>`;
  html += `<div class="prog-setting custom-sig${isCustom ? '' : ' hidden'}"><label>Den</label><input type="number" id="pSigDen" value="${den}" min="1" max="16"></div>`;
  html += `<div class="prog-setting"><label>Sound</label><select id="pArt">`;
  html += `<option value="block"${prog.articulation === 'block' ? ' selected' : ''}>Block</option>`;
  html += `<option value="strum"${prog.articulation === 'strum' ? ' selected' : ''}>Strum</option>`;
  html += `<option value="arpeggio"${prog.articulation === 'arpeggio' ? ' selected' : ''}>Arpeggio</option>`;
  html += `</select></div>`;
  html += `<div class="prog-count">${chords.length} chord${chords.length === 1 ? '' : 's'} · ${total} beats</div>`;
  html += `</div>`;

  if (chords.length === 0) {
    html += `<div class="prog-empty">No chords yet — build one in the <b>Chord Builder</b> tab, hit <b>★ Save</b>, then drag it from the <b>Chord Library</b> onto this track.</div>`;
  } else {
    html += `<div class="prog-scroll">`;
    html += `<div class="prog-inner" style="width:${total * PROG_BEAT_PX}px">`;
    html += `<div class="prog-ruler">`;
    for (let b = 0; b <= total; b++) {
      const strong = b % num === 0;
      html += `<div class="prog-tick${strong ? ' strong' : ''}" style="left:${b * PROG_BEAT_PX}px"></div>`;
    }
    for (let m = 0; m * num <= total; m++) {
      html += `<div class="prog-measure-label" style="left:${m * num * PROG_BEAT_PX + 6}px">${m + 1}</div>`;
    }
    html += `</div>`;
    html += `<div class="prog-track" id="progTrack">`;
    chords.forEach((c, i) => {
      const left = progStartBeat(i) * PROG_BEAT_PX;
      const w = c.beats * PROG_BEAT_PX;
      html += `<div class="prog-block" data-idx="${i}" style="left:${left}px;width:${w}px">`;
      html += `<span class="prog-block-label">${escapeHTML(c.label)}</span>`;
      html += `<span class="prog-block-frets">${c.voicing.frets.map(f => f < 0 ? '×' : f).join(' ')}</span>`;
      html += `<button class="prog-del" title="remove">×</button>`;
      html += `<div class="prog-resize" title="drag to change length"><div></div></div>`;
      html += `</div>`;
    });
    html += `<div class="prog-playhead" id="progPlayhead"></div>`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;
    html += `<div class="prog-hint">drag the right edge to change chord length · drag the body to reorder · click to preview / jump</div>`;
  }

  panel.innerHTML = html;

  const track = panel.querySelector('#progTrack');
  progEls = track ? {
    track,
    blocks: [...track.querySelectorAll('.prog-block')],
    playhead: track.querySelector('#progPlayhead'),
  } : null;

  updateProgPlayheadVisual(prog.elapsedBeats);

  const pPlay = document.getElementById('pPlay');
  if (pPlay) pPlay.addEventListener('click', () => {
    if (state.progression.playing) pausePlayback();
    else startPlayback();
  });
  const pStop = document.getElementById('pStop');
  if (pStop) pStop.addEventListener('click', () => stopPlayback());
  const pLoop = document.getElementById('pLoop');
  if (pLoop) pLoop.addEventListener('click', () => {
    state.progression.loop = !state.progression.loop;
    pLoop.classList.toggle('on', state.progression.loop);
    pLoop.textContent = `LOOP ${state.progression.loop ? 'ON' : 'OFF'}`;
    saveProgression();
  });
  const pBpm = document.getElementById('pBpm');
  if (pBpm) pBpm.addEventListener('input', () => {
    const v = parseInt(pBpm.value, 10);
    if (v >= 20 && v <= 300) { state.progression.bpm = v; saveProgression(); }
  });
  const pSig = document.getElementById('pSig');
  if (pSig) pSig.addEventListener('change', () => {
    const s = PROG_SIGS.find(x => x.label === pSig.value);
    if (s) {
      state.progression.timeSig = { num: s.num, den: s.den };
      saveProgression();
      renderProgression();
    } else {
      panel.querySelectorAll('.custom-sig').forEach(el2 => el2.classList.remove('hidden'));
    }
  });
  const pSigNum = document.getElementById('pSigNum');
  const pSigDen = document.getElementById('pSigDen');
  if (pSigNum) pSigNum.addEventListener('change', () => {
    const v = parseInt(pSigNum.value, 10);
    if (v >= 1 && v <= 16) { state.progression.timeSig.num = v; saveProgression(); renderProgression(); }
  });
  if (pSigDen) pSigDen.addEventListener('change', () => {
    const v = parseInt(pSigDen.value, 10);
    if (v >= 1 && v <= 16) { state.progression.timeSig.den = v; saveProgression(); renderProgression(); }
  });
  const pArt = document.getElementById('pArt');
  if (pArt) pArt.addEventListener('change', () => {
    state.progression.articulation = pArt.value;
    saveProgression();
  });

  bindProgInteractions();
}

// ═══════════════════════════════════════════════════
//  KEYBOARD PLAY (rows → strings, keys → scale notes)
//  Each letter-row controls ONE string. In scale-snap
//  mode every key maps to a DISTINCT scale note on that
//  string (open strings stay reserved for keys 1–6).
//  When a row runs out of scale notes on its string it
//  spills onto the next string to keep each key unique.
// ═══════════════════════════════════════════════════

const KB_ROWS = [
  { id: 'q', keys: 'qwertyuio', string: 2 },
  { id: 'a', keys: 'asdfghjkl', string: 1 },
  { id: 'z', keys: 'zxcvbnm,.', string: 0 },
];
const KB_KEY   = 'daeace_kb';
let   KB_SNAP  = true;

function saveKB() {
  try {
    localStorage.setItem(KB_KEY, JSON.stringify({
      rows: KB_ROWS.map(r => ({ string: r.string })),
      snap: KB_SNAP,
    }));
  } catch (_) {}
}

function loadKB() {
  try {
    const raw = localStorage.getItem(KB_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Array.isArray(s.rows)) s.rows.forEach((x, i) => {
      if (!KB_ROWS[i]) return;
      if (typeof x.string === 'number') KB_ROWS[i].string = Math.max(0, Math.min(NUM_STRINGS - 1, Math.round(x.string)));
    });
    if (typeof s.snap === 'boolean') KB_SNAP = s.snap;
  } catch (_) {}
}

// Builds, per row, the (str, fret) target for each key.
// In snap mode each key is one distinct in-scale note;
// once a string's scale notes run out it spills to the
// next-higher string (open note included there).
function buildRowKeymap(row) {
  const sc   = state.root === null ? null : (SCALES[state.scale] || SCALES.major);
  const cmap = [];
  let str    = row.string;
  while (cmap.length < row.keys.length && str < NUM_STRINGS) {
    // First string skips fret 0 (open, reserved for keys 1–6);
    // spill strings include the open note as their first step.
    const start = (str === row.string) ? 1 : 0;
    for (let f = start; f < NUM_FRETS; f++) {
      if (cmap.length >= row.keys.length) break;
      if (sc === null || sc.includes(intervalFrom(state.root, str, f))) {
        cmap.push({ str, fret: f });
      }
    }
    str++;
  }
  return cmap;
}

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k >= '1' && k <= '6') { e.preventDefault(); fireDot(+k - 1, 0); return; }
  if (k === ' ') {
    e.preventDefault();
    if (state.mode === 'progression') {
      if (state.progression.playing) pausePlayback(); else startPlayback();
    } else {
      strumChord();
    }
    return;
  }
  if (k === 'Enter' && state.mode === 'progression') {
    e.preventDefault();
    if (state.progression.playing) pausePlayback(); else startPlayback();
    return;
  }
  const low = k.toLowerCase();
  for (const r of KB_ROWS) {
    const idx = r.keys.indexOf(low);
    if (idx < 0) continue;
    if (e.repeat) return;
    e.preventDefault();
    if (KB_SNAP) {
      const cmap = buildRowKeymap(r);
      const hit  = cmap[idx];
      if (!hit) return;
      fireDot(hit.str, hit.fret);
    } else {
      const fret = Math.max(1, Math.min(NUM_FRETS - 1, 1 + idx));
      fireDot(r.string, fret);
    }
    return;
  }
});

// ── PLAY bar (keyboard row → string assignment) ────
function renderKBBar() {
  const bar = document.getElementById('kbBar');
  if (!bar) return;
  const snapLabel = KB_SNAP
    ? (state.root === null ? 'CHROMATIC' : NOTE_NAMES[state.root] + ' ' + (SCALE_LABELS[state.scale] || state.scale))
    : 'OFF';
  let html = `<div class="kb-title">PLAY</div>`;
  html += `<div class="kb-zone" id="kbZone">`;
  html += `<div class="kb-lanes">`;
  for (let s = NUM_STRINGS - 1; s >= 0; s--) {
    html += `<div class="kb-lane${KB_ROWS.some(r => r.string === s) ? ' used' : ''}" data-lane="${s}">${STRING_LABELS[s]}</div>`;
  }
  html += `</div>`;
  html += `<div class="kb-chips">`;
  KB_ROWS.forEach((r, i) => {
    const lane = NUM_STRINGS - 1 - r.string;
    const top = (lane + 0.5) * (100 / NUM_STRINGS);
    html += `<div class="kb-chip" data-row="${i}" style="top:${top}%" title="drag to another string">`;
    html += `<div class="kb-chip-keys">${r.keys.toUpperCase()}</div>`;
    html += `<div class="kb-chip-string">${STRING_LABELS[r.string]} STR</div>`;
    html += `</div>`;
  });
  html += `</div>`;
  html += `</div>`;
  html += `<button class="kb-snap${KB_SNAP ? ' on' : ''}" id="kbSnapToggle">SNAP<br>${snapLabel}</button>`;
  bar.innerHTML = html;

  const zone = bar.querySelector('.kb-zone');
  const laneH = () => (zone ? zone.clientHeight / NUM_STRINGS : 60);

  bar.querySelectorAll('.kb-chip').forEach(chip => {
    const rowIdx = +chip.dataset.row;
    chip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const ghost = chip.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.width = '108px';
      ghost.style.zIndex = '300';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.92';
      ghost.style.left = (e.clientX + 14) + 'px';
      ghost.style.top = (e.clientY + 6) + 'px';
      document.body.appendChild(ghost);
      const move = (ev) => {
        const rect = zone.getBoundingClientRect();
        let lane = Math.floor((ev.clientY - rect.top) / laneH());
        lane = Math.max(0, Math.min(NUM_STRINGS - 1, lane));
        KB_ROWS[rowIdx].string = NUM_STRINGS - 1 - lane;
        ghost.style.left = (ev.clientX + 14) + 'px';
        ghost.style.top = (ev.clientY + 6) + 'px';
        bar.querySelectorAll('.kb-lane').forEach(l => l.classList.toggle('used', KB_ROWS.some(r => r.string === +l.dataset.lane)));
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        ghost.remove();
        saveKB();
        renderKBBar();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  });
  const snapBtn = document.getElementById('kbSnapToggle');
  if (snapBtn) snapBtn.addEventListener('click', () => {
    KB_SNAP = !KB_SNAP;
    saveKB();
    renderKBBar();
  });
}

// ═══════════════════════════════════════════════════
//  CHORD LIBRARY
//  Persistent box pinned to the bottom of the sidebar.
//  Drag tiles onto the progression playlist; dropping a
//  playlist block onto the library stacks it back to one.
// ═══════════════════════════════════════════════════

const LIB_KEY = 'daeace_library';

function libFingerprint(root, type, voicing) {
  return `${root === null ? '?' : root}:${type || '?'}:${(voicing && voicing.frets ? voicing.frets : []).join(',')}`;
}

function saveLibrary() {
  try { localStorage.setItem(LIB_KEY, JSON.stringify({ chords: state.library.chords })); } catch (_) {}
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Array.isArray(s.chords)) {
      state.library.chords = s.chords
        .filter(c => c && c.label && c.voicing && Array.isArray(c.voicing.frets))
        .map(c => ({
          key: c.key || libFingerprint(c.root, c.type, c.voicing),
          label: c.label, root: c.root, type: c.type,
          voicing: { strings: c.voicing.strings || [], frets: c.voicing.frets },
          count: typeof c.count === 'number' ? c.count : 1,
        }));
    }
  } catch (_) {}
}

function addToLibrary(root, type, voicing, label) {
  const key = libFingerprint(root, type, voicing);
  let c = state.library.chords.find(x => x.key === key);
  if (c) c.count = (c.count || 1) + 1;
  else state.library.chords.push({ key, label: label || 'Chord', root, type, voicing: { strings: voicing.strings || [], frets: voicing.frets || [] }, count: 1 });
  saveLibrary();
  renderLibrary();
}

function bumpLibrary(key, fallback) {
  let c = state.library.chords.find(x => x.key === key);
  if (c) c.count = (c.count || 1) + 1;
  else if (fallback) state.library.chords.push({
    key,
    label: fallback.label || 'Chord',
    root: fallback.root,
    type: fallback.type,
    voicing: { strings: fallback.voicing.strings || [], frets: fallback.voicing.frets || [] },
    count: 1,
  });
  saveLibrary();
  renderLibrary();
}

function removeFromLibrary(index) {
  state.library.chords.splice(index, 1);
  saveLibrary();
  renderLibrary();
}

// Play any stored voicing. articulation: 'block' (all at once) or 'strum'
function playVoicing(voicing, articulation) {
  const notes = [];
  ((voicing && voicing.frets) || []).forEach((f, si) => { if (f >= 0) notes.push({ str: si, fret: f }); });
  if (notes.length === 0) return;
  const stagger = articulation === 'strum' ? 70 : 8;
  notes.forEach((n, i) => { setTimeout(() => { try { playNote(n.str, n.fret); } catch (_) {} }, i * stagger); });
}

let libHoldTimer = null;
let libHeld = false;

function renderLibrary() {
  const box = document.getElementById('libraryBox');
  if (!box) return;
  const countEl = document.getElementById('libCount');
  const chords = state.library.chords;
  if (countEl) countEl.textContent = String(chords.length);
  if (chords.length === 0) {
    box.innerHTML = `<div class="lib-empty">nothing saved yet — press <b>★ Save</b> in the chord builder to keep a voicing here</div>`;
    return;
  }
  box.innerHTML = '';
  chords.forEach((c, i) => {
    const tile = document.createElement('div');
    tile.className = 'lib-tile';
    tile.dataset.idx = i;
    tile.innerHTML =
      `<span class="lib-label">${escapeHTML(c.label)}</span>` +
      `<span class="lib-frets">${c.voicing.frets.map(f => f < 0 ? '×' : f).join(' ')}</span>` +
      `<span class="lib-count">×${c.count || 1}</span>` +
      `<button class="lib-del" title="remove from library">×</button>`;
    box.appendChild(tile);

    tile.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.lib-del')) return;
      libHeld = false;
      libHoldTimer = setTimeout(() => { libHeld = true; playVoicing(c.voicing, 'strum'); }, 300);
      startLibDrag(e, tile, i);
    });
    tile.addEventListener('click', (e) => {
      if (e.target.closest('.lib-del')) return;
      if (libHoldTimer) { clearTimeout(libHoldTimer); libHoldTimer = null; }
      if (libHeld) { libHeld = false; return; }
      playVoicing(c.voicing, 'block');
    });
    const del = tile.querySelector('.lib-del');
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromLibrary(i);
    });
  });
}

// Library tile → progression track (insert at drop position)
function startLibDrag(e, tile, idx) {
  const startX = e.clientX, startY = e.clientY;
  let ghost = null;
  const onMove = (ev) => {
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if (!ghost && Math.hypot(dx, dy) > 4) {
      if (libHoldTimer) { clearTimeout(libHoldTimer); libHoldTimer = null; }
      libHeld = true; // suppress the click that fires after a drag-drop
      ghost = document.createElement('div');
      ghost.className = 'lib-drag-ghost';
      ghost.innerHTML = `<span class="ghost-label">${escapeHTML(state.library.chords[idx].label)}</span><span class="ghost-frets">${state.library.chords[idx].voicing.frets.map(f => f < 0 ? '×' : f).join(' ')}</span>`;
      document.body.appendChild(ghost);
    }
    if (ghost) {
      ghost.style.left = (ev.clientX + 14) + 'px';
      ghost.style.top = (ev.clientY + 6) + 'px';
    }
  };
  const onUp = (ev) => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    if (ghost) {
      ghost.remove();
      const c = state.library.chords[idx];
      const { index, ok } = libDropIndex(ev.clientX, ev.clientY);
      if (ok && c) {
        if (state.progression.playing) stopPlayback();
        state.progression.chords.splice(index, 0, {
          id: Date.now() + Math.random(),
          label: c.label, root: c.root, type: c.type,
          voicing: { strings: c.voicing.strings || [], frets: c.voicing.frets || [] },
          beats: state.progression.timeSig.num,
        });
        saveProgression();
        if (state.mode === 'progression') renderProgression();
      }
    }
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

function libDropIndex(clientX, clientY) {
  if (!progEls) return { index: 0, ok: false };
  const trackRect = progEls.track.getBoundingClientRect();
  if (clientX < trackRect.left - 4 || clientX > trackRect.right + 4 ||
      clientY < trackRect.top - 24 || clientY > trackRect.bottom + 24) return { index: 0, ok: false };
  const chords = state.progression.chords;
  for (let i = 0; i < chords.length; i++) {
    const startAbs = trackRect.left + progStartBeat(i) * PROG_BEAT_PX;
    const endAbs = startAbs + chords[i].beats * PROG_BEAT_PX;
    if (clientX > startAbs && clientX < endAbs) return { index: i, ok: true };
  }
  let bestPos = chords.length, bestDist = Infinity;
  for (let i = 0; i <= chords.length; i++) {
    const mid = i < chords.length ? (progStartBeat(i) + chords[i].beats / 2) : progTotalBeats();
    const absX = trackRect.left + mid * PROG_BEAT_PX;
    const d = Math.abs(clientX - absX);
    if (d < bestDist) { bestDist = d; bestPos = i; }
  }
  return { index: (bestDist <= PROG_BEAT_PX ? bestPos : chords.length), ok: true };
}

// ═══════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════

// Mode tabs
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

const rootBtns = document.getElementById('rootBtns');
NOTE_NAMES.forEach((n, i) => {
  const btn = document.createElement('button');
  btn.className = 'root-btn';
  btn.textContent = n;
  btn.addEventListener('click', () => {
    state.root = state.root === i ? null : i;
    document.querySelectorAll('.root-btn').forEach((b, j) => b.classList.toggle('active', j === state.root));
    recolorDots();
    updateLegend();
    renderKBBar();
  });
  rootBtns.appendChild(btn);
});

const scaleSelect = document.getElementById('scaleSelect');
Object.entries(SCALE_LABELS).forEach(([key, label]) => {
  const opt = document.createElement('option');
  opt.value = key; opt.textContent = label;
  if (key === state.scale) opt.selected = true;
  scaleSelect.appendChild(opt);
});
scaleSelect.addEventListener('change', () => { state.scale = scaleSelect.value; recolorDots(); renderKBBar(); });

const labelToggle = document.getElementById('labelToggle');
labelToggle.addEventListener('click', () => {
  if (!state.showLabels) {
    state.showLabels = true; state.labelType = 'note';
    labelToggle.textContent = 'NOTE NAMES'; labelToggle.classList.add('active');
  } else if (state.labelType === 'note') {
    state.labelType = 'interval'; labelToggle.textContent = 'INTERVALS';
  } else {
    state.showLabels = false; labelToggle.textContent = 'HIDDEN';
    labelToggle.classList.remove('active');
  }
  recolorDots();
});

// Preset select
const presetSelect = document.getElementById('presetSelect');
PRESETS.forEach(p => {
  const opt = document.createElement('option');
  opt.value = p.id; opt.textContent = p.label;
  if (p.id === state.preset) opt.selected = true;
  presetSelect.appendChild(opt);
});
presetSelect.addEventListener('change', () => {
  const p = PRESETS.find(x => x.id === presetSelect.value);
  if (!p) return;
  state.preset = p.id;
  const slider = document.getElementById('chaosSlider');
  slider.value = p.chaos;
  document.getElementById('chaosVal').textContent = p.chaos;
});

// Tuning toggle
const tuningBtn = document.getElementById('tuningBtn');
tuningBtn.addEventListener('click', () => {
  state.tuningRef = state.tuningRef === 440 ? 432 : 440;
  tuningBtn.textContent = `A=${state.tuningRef}Hz`;
  tuningBtn.classList.toggle('alt', state.tuningRef === 432);
});

const chaosSlider = document.getElementById('chaosSlider');
const chaosVal    = document.getElementById('chaosVal');
chaosSlider.addEventListener('input', () => { chaosVal.textContent = chaosSlider.value; });

// ═══════════════════════════════════════════════════
//  LEGEND
// ═══════════════════════════════════════════════════

const SCALE_LEGEND = [
  { color: '#e8c547', label: 'Root' },
  { color: '#4a9eff', label: 'Perfect 5th' },
  { color: '#c97aff', label: '3rd' },
  { color: '#ff7a7a', label: '7th' },
  { color: '#4ecdc4', label: 'Other degrees' },
  { color: '#14141a', label: 'Outside scale' },
];
const CHROMA_LEGEND = NOTE_NAMES.map((n, i) => ({ color: NOTE_COLORS[i], label: n }));

const legendEl = document.getElementById('legend');
function updateLegend() {
  legendEl.innerHTML = (state.root === null ? CHROMA_LEGEND : SCALE_LEGEND).map(({ color, label }) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${color};border:1px solid #333"></div>${label}</div>`
  ).join('');
}
updateLegend();

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════

loadTuning();
buildTuningSelect();
initCustomEditor();
updateBrand();
drawStatic();
buildDots();
loadProgression();
loadKB();
loadLibrary();
renderKBBar();
renderLibrary();
setMode('explorer');
