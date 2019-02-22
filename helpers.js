
/***********************************
 * Board of dots
 ***********************************/
const PIXELS_WIDTH = 32;
const PIXELS_HEIGHT = 46;
const MAX_PITCH = 81;

// Soprano, Alto, Tenor, Bass.
const RANGES = [[60, 81], [52, 74], [46, 69], [36, 66]];

class Board {
  constructor() {
    this.data = [];
    this.ui = {}; // Gets populated by this.reset().
    this.reset();
    this.isPlaying = false;
  }

  reset() {
    this.data = [];
    this.ui.container = document.getElementById('container');
    this.ui.container.innerHTML = '';

    // Recreate the board.
    for (let i = 0; i < PIXELS_HEIGHT; i++) {
      this.data.push([]);
      const rowEl = document.createElement('div');
      rowEl.classList.add('row');
      this.ui.container.appendChild(rowEl);

      for (let j = 0; j < PIXELS_WIDTH; j++) {
        this.data[i][j] = {};
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'cell, empty');
        button.classList.add('pixel');
        button.dataset.row = i;
        button.dataset.col = j;

        // Add a pitch label.
        if (j === 0) {
          const span = document.createElement('span');
          span.textContent = MAX_PITCH - i;
          rowEl.appendChild(span);
        }
        rowEl.appendChild(button);
      }
      // Add a voice label.
      for (let v = 0; v < RANGES.length; v++) {
        const pitch = MAX_PITCH - i;
        if (this.isPitchInRange(pitch, v)) {
          const span = document.createElement('span');
          span.setAttribute('class', `pixel voice${v}`);
          rowEl.appendChild(span);
        }
      }
    }
    this.ui.rows = document.querySelectorAll('.container > .row');
  }

  // Toggles a particular dot from on to off.
  toggleCell(i, j, uiButton, voiceOverride) {
    const dot = this.data[i][j];
    const pitch = MAX_PITCH - i;

    // Init this cell if it's never been set before.
    if (dot.on === undefined) dot.on = -1;
    if (voiceOverride === undefined) {
      dot.on = this.getNextVoice(pitch, dot.on)
    } else if (voiceOverride === -1) {
      // Erasing!
      dot.on = -1;
    } else {
      // We have an override. We should try to use it, unless we're drawing
      // out of range, in which case default to the next available voice.
      if (this.isPitchInRange(pitch, voiceOverride)) {
        dot.on = voiceOverride;
      } else {
        const nextVoice = this.getNextVoice(pitch, voiceOverride);
        dot.on = nextVoice === -1 ? this.getNextVoice(pitch, -1) : nextVoice;
      }
    }

    if (dot.on === -1) {
      this.resetButton(uiButton);
    } else {
      this.voiceButton(uiButton, dot.on);
    }
  }

  resetButton(uiButton) {
    uiButton.setAttribute('class', 'pixel');
    uiButton.setAttribute('aria-label', 'cell, empty');
  }

  voiceButton(uiButton, voice) {
    const aria = voice === 0 ? 'soprano' : voice === 1 ? 'alto' : voice === 2 ? 'tenor' : 'bass';
    uiButton.setAttribute('aria-label', `cell, ${aria}`);
    uiButton.setAttribute('class', `pixel voice${voice}`);
  }

  getNoteSequence() {
    const sequence = {notes:[], quantizationInfo: {stepsPerQuarter: 4}};
    for (let i = 0; i < PIXELS_HEIGHT; i++) {
      for (let j = 0; j < PIXELS_WIDTH; j++) {
        // This note is on.
        if (this.data[i][j].on >= 0) {
          sequence.notes.push(
            { pitch: 81 - i,
              instrument: this.data[i][j].on,
              quantizedStartStep: j,
              quantizedEndStep: j + 1
            },
          );
        }
      }
    }
    if (sequence.notes.length !== 0) {
      sequence.totalQuantizedSteps = PIXELS_WIDTH;
    }
    return sequence;
  }

  drawNoteSequence(ns) {
    console.log(ns.totalQuantizedSteps);
    this.reset();
    for(let n = 0; n < ns.notes.length; n++) {
      const note = ns.notes[n];
      const r = MAX_PITCH - note.pitch;
      const c = note.quantizedStartStep
      const v = note.instrument
      this.data[r][c].on = v;
      const uiButton = document.querySelector(`.pixel[data-row="${r}"][data-col="${c}"]`);
      this.voiceButton(uiButton, v);
    }
  }

  getNextVoice(pitch, thisVoice) {
    for (let v = thisVoice + 1; v < RANGES.length; v++) {
      if (this.isPitchInRange(pitch, v)) {
        return v;
      }
    }
    return -1;
  }

  isPitchInRange(pitch, voice) {
    if (RANGES[voice] === undefined) {
      return false;
    }
    return RANGES[voice][0] <= pitch && RANGES[voice][1] >= pitch;
  }

  playStep(note) {
    const v = note.instrument;
    const r = MAX_PITCH - note.pitch;
    const c = note.quantizedStartStep;

    const on =  document.querySelectorAll('.pixel.active, .pixel.bar');
    for (let p = 0; p < on.length; p++) {
      on[p].classList.remove('bar');
      if (on[p].dataset.col < c) {
        on[p].classList.remove('active');
      }
    }

    // const bars = document.querySelectorAll(`.pixel[data-col="${c}"]`);
    // for (let p = 0; p < bars.length; p++) {
    //   bars[p].classList.add('bar');
    // }

    const pixels = document.querySelectorAll(`.pixel.voice${v}[data-row="${r}"][data-col="${c}"]`);
    for (let p = 0; p < pixels.length; p++) {
      pixels[p].classList.remove('bar');
      pixels[p].classList.add('active');
    }
  }

  playEnd() {
    const on =  document.querySelectorAll('.pixel.active, .pixel.bar');
    for (let p = 0; p < on.length; p++) {
      on[p].classList.remove('bar');
      on[p].classList.remove('active');
    }
  }
}
