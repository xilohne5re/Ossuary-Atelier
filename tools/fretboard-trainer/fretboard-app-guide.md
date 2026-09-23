# DAEAC#E Fretboard Learning App — Development Guide

---

## 0. Concept

This is a single-file interactive fretboard tool built specifically for the DAEAC#E open tuning. There are no existing apps that handle this tuning natively — most fretboard trainers are hardcoded to EADGBE and have no architecture for alternate tunings. This app computes everything from first principles: given the open string pitches and a fret number, every note, interval, scale degree, and chord voicing is derived mathematically rather than pulled from a lookup table. That means the tuning can technically be changed to anything by editing six numbers.

The app has three interconnected modes that share the same fretboard component: **Explorer** (free navigation, see note names and intervals on click), **Scale Overlay** (visualize how a chosen scale lays across the board), and **Quiz** (spaced-repetition fret identification). A fourth **Chord Builder** panel sits alongside the fretboard and computes playable voicings for any chord type in this tuning.

Everything lives in one `index.html` with no external dependencies. It should be openable locally and deployable to GitHub Pages as-is.

---

## 1. Base Fretboard — Static Render

**What it is:** The visual skeleton of the app. An SVG element that draws the six strings and N frets, with open-string labels on the left and fret numbers along the top or bottom. At this stage it's static — no interactivity, just correct geometry.

**What to build:**
- A JS function `renderFretboard(svgEl, config)` that takes an SVG element and a config object and draws everything
- The config holds: number of frets to show (default 15), pixel dimensions, string labels, whether to show fret markers (dots at 3, 5, 7, 9, 12, 15)
- Strings are drawn as horizontal lines, frets as vertical lines, nut as a thicker leftmost vertical line
- Fret marker dots go on the correct fret positions (single dots at 3, 5, 7, 9; double at 12)
- Open string labels (D A E A C# E, low to high) go in a column left of the nut

**Layout math:**
```
fretWidth[i] = totalWidth / numFrets   // equal temperament simplification — fine for a UI
stringSpacing = totalHeight / (numStrings - 1)
fretX[i] = leftPad + i * fretWidth
stringY[s] = topPad + s * stringSpacing
```

A real guitar uses non-equal fret spacing (each fret is 1/17.817 of the remaining scale length) but for a learning UI, equal spacing is cleaner and doesn't affect correctness. Add a config flag `realisticSpacing: false` so it can be toggled later.

**Output:** A clean SVG fretboard, no note dots yet, correct string labels, fret markers in right positions. This is the canvas everything else is painted onto.

---

## 2. Note Layout Calculation

**What it is:** The core logic layer. A pure JS module (no DOM, no SVG) that can answer: given a string index and a fret number, what MIDI pitch is this? What note name? What interval relative to a root?

**The tuning definition:**
```js
const OPEN_NOTES = [2, 9, 4, 9, 1, 4];
// D   A  E  A  C# E   (semitones, where C=0, C#=1, D=2 ... B=11)
// index 0 = lowest string (D), index 5 = highest (E)
```

**Core functions:**

```js
function noteAt(stringIndex, fret) {
  return (OPEN_NOTES[stringIndex] + fret) % 12;
}

function intervalFrom(root, stringIndex, fret) {
  return (noteAt(stringIndex, fret) - root + 12) % 12;
}

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function noteName(stringIndex, fret) {
  return NOTE_NAMES[noteAt(stringIndex, fret)];
}
```

**Interval names:** Map the 12 intervals to labels: `['R','b2','2','b3','3','4','b5','5','b6','6','b7','7']`. These are used in the scale overlay and quiz modes.

**Scale definitions:** Each scale is just a set of intervals (semitones from root) that are "in":
```js
const SCALES = {
  major:           [0,2,4,5,7,9,11],
  minor:           [0,2,3,5,7,8,10],
  dorian:          [0,2,3,5,7,9,10],
  phrygian:        [0,1,3,5,7,8,10],
  lydian:          [0,2,4,6,7,9,11],
  mixolydian:      [0,2,4,5,7,9,10],
  locrian:         [0,1,3,5,6,8,10],
  harmonicMinor:   [0,2,3,5,7,8,11],
  majorPentatonic: [0,2,4,7,9],
  minorPentatonic: [0,3,5,7,10],
};
```

`inScale(root, scaleName, stringIndex, fret)` returns true if `intervalFrom(root, stringIndex, fret)` is in `SCALES[scaleName]`.

**Why this structure matters:** Every visual feature downstream — dot colors, quiz answers, chord voicings — calls these same three functions. There's no separate data per feature. Getting this right means the rest of the app is just presentation.

---

## 3. Interactive Dot Layer

**What it is:** A second SVG layer (or group) of clickable circles rendered over the fretboard grid, one per string/fret cell. This is what the user actually interacts with.

**How it works:**
- For each string `s` and fret `f`, place a transparent circle centered at `(fretX[f] + fretWidth/2, stringY[s])`
- On hover: highlight the circle, show a tooltip with note name and (if a root is selected) interval
- On click: fire a `selectNote(s, f)` event that the current mode listens to
- this feature will be later used in step 8. chord mode to set the notes of a chord. 

**Rendering the dots:**
In Explorer and Scale Overlay modes, dots are visible (filled circles), colored by their role:
- Root note → accent color (red/amber)
- In scale, not root → secondary color (muted blue/green, by interval group)
- Out of scale → invisible or very faint
- No scale selected → all dots visible, colored by note name (chromatic color wheel)

Dots are SVG `<circle>` elements with `data-string` and `data-fret` attributes. JS selects and recolors them rather than re-rendering the whole SVG.

**Tooltip:**
A floating `<div>` (not SVG) that tracks mouse position. Contents:
```
G#
b6 of C
Aeolian — degree 6
```
Shows more info as more context is set (root selected → shows interval; scale selected → shows degree name).

**Performance note:** With 6 strings × 16 frets = 96 dots, there's no performance concern. Add all 96 to the DOM once on init, update their `fill` and `opacity` attributes when state changes rather than removing/recreating elements.

---

## 4. State Management

**What it is:** A single global state object that all UI and rendering code reads from. No framework — just a plain object and a `render()` function that syncs the DOM to the state.

```js
const state = {
  mode: 'explorer',       // 'explorer' | 'scale' | 'quiz' | 'chord'
  root: null,             // 0–11, or null
  scale: null,            // key of SCALES, or null
  highlightedDots: [],    // [{string, fret}] for quiz/chord mode
  quizQuestion: null,     // current quiz state
  chordType: null,        // current chord type being displayed
};

function setState(patch) {
  Object.assign(state, patch);
  render();
}
```

`render()` reads `state` and updates:
1. Dot colors and visibility on the fretboard SVG
2. Which mode tab is active
3. The chord panel or quiz panel content

This pattern keeps everything in sync without event spaghetti. Any function can call `setState({root: 5})` and the fretboard recolors automatically.

---

## 5. Scale Overlay Mode

**What it is:** The user selects a root note and a scale/mode from dropdowns. The fretboard immediately recolors to show which dots are in the scale, with the root highlighted distinctly. This is the primary learning tool for improvisation.

**UI elements:**
- Root selector: 12 buttons (C through B), or a dropdown
- Scale selector: dropdown of scale names
- A small legend showing interval → color mapping
- Toggle: "show note names" vs "show interval names" on the dots themselves

**Dot label rendering:**
When "show labels" is on, each in-scale dot renders a small text label inside it. The label is either the note name (`G#`) or the interval (`b6`). This is the most useful mode for internalizing the fretboard — you can switch between name view and interval view to connect the abstract interval to the physical position.

**Position patterns:**
An optional overlay that draws lines or brackets connecting all instances of the same interval across strings. Shows you visually that "the 5th always appears in this diagonal pattern" for this tuning — which is the core muscle memory insight for DAEAC#E.

---

## 6. Explorer Mode

**What it is:** The simplest mode. No scale selected, no quiz. Click any dot to pin it and see its full info. Click another to compare. Useful for free exploration and "what is this chord I stumbled into?"

**Behavior:**
- Clicking a dot pins it (stays highlighted after mouse leaves)
- A sidebar panel shows: note name, all intervals it could be depending on root, its position on the chromatic circle
- Up to 6 dots can be pinned simultaneously (one full chord's worth)
- A "clear all" button resets
- If 3+ dots are pinned, the panel attempts to identify the chord: checks the pinned notes against known chord interval patterns and lists matches ("looks like Am7, or C6")

**Chord identification logic:**
Collect the set of intervals between all pinned notes (relative to the lowest-pitch pinned note as assumed root). Match against chord interval sets. Show top 2–3 matches with the implied root.

This is the "what did I just play" feature — extremely useful when improvising in an open tuning where you stumble into things you don't have names for yet.

---

## 7. Quiz Mode

**What it is:** A spaced-repetition fret identification game. The app picks a fret position, highlights it on the board, and asks a question. The user answers. The app tracks accuracy per string and per fret region and uses that to weight which positions get asked more.

**Two question types:**

1. **Name this note:** A dot glows. Type or click the note name. Correct/wrong feedback, then next question.
2. **Find this note:** Given a note name (and optionally a scale context), click the correct dot(s) on the fretboard. Multiple correct answers possible (same note appears on multiple strings).

**Difficulty progression:**
- Level 1: Open strings only (6 notes, D A E A C# E)
- Level 2: Frets 0–4 (most common cowboy chord territory)
- Level 3: Frets 5–9
- Level 4: Full board
- Level 5: Interval naming (not just note names — "what interval is this relative to D?")

**Scoring/weighting:**
```js
// per-position accuracy tracker
accuracy[`${string}-${fret}`] = { correct: 0, total: 0 };

// weight = inverse of accuracy, so weak spots get asked more
function pickNextQuestion() {
  // weighted random selection from all positions in current level
}
```

The accuracy data lives in `localStorage` so it persists across sessions. A small heatmap (grid of colored cells matching the fretboard layout) shows your accuracy visually — red = weak, green = strong.

---

## 8. Chord Builder

**What it is:** Select a chord type, select a root. The app finds and displays every reasonable voicing on the fretboard for that chord in DAEAC#E tuning.

**Chord types to support:**
Major, minor, dominant 7, major 7, minor 7, sus2, sus4, diminished, augmented, power chord (5), add9.

**Voicing computation:**
A voicing is a set of (string, fret) pairs — one per string used — where the resulting notes form the target chord's interval set, with the root present at least once.

```js
function findVoicings(root, chordIntervals, maxFretSpan = 4) {
  // for each string, collect all frets (0–15) that produce a chord tone
  // then find combinations (one fret per string, or string muted) where:
  //   - root appears at least once
  //   - all notes are chord tones
  //   - max fret used - min fret used <= maxFretSpan (playability)
  // sort by: fewest muted strings first, then lowest fret position
}
```

This brute-force approach over 6 strings × 16 frets is fine — the search space is small.

**Display:**
Show the top 2-3 voicings. Each voicing highlights the relevant dots on the fretboard. A small fingering diagram (classic chord box) is generated alongside each voicing. User can click between voicings to see them on the board.

---

## 9. Persistence + Settings

**localStorage keys:**
- `quiz_accuracy` — the per-position accuracy object from Quiz mode
- `last_root` — restore the last selected root on load
- `last_scale` — restore the last selected scale
- `settings` — object with: `numFrets`, `showLabels`, `labelType` (note vs interval), `colorScheme`

**Settings panel (minimal):**
- Number of frets shown (12 / 15 / 17 / 22)
- Label display toggle
- Color scheme (default dark terminal / high contrast / light)
- Reset quiz progress button

---

## 10. Build Order

Build in this sequence — each step is testable before moving to the next:

1. Static fretboard SVG render (Section 1)
2. Note calculation functions — test in console (Section 2)
3. Dot layer with hover tooltips, no coloring yet (Section 3)
4. State object + basic root/scale selector wired up (Section 4 + 5)
5. Scale overlay coloring working end-to-end (Section 5)
6. Explorer pin mode + chord identification (Section 6)
7. Quiz mode, question types 1 and 2, no weighting yet (Section 7)
8. Quiz accuracy tracking + localStorage persistence (Section 7 + 9)
9. Chord builder voicing computation + display (Section 8)
10. Settings panel + polish (Section 9)

Each step except 9 and 10 adds a feature visible enough to be satisfying on its own. Stop at any point and have a working, useful tool.
