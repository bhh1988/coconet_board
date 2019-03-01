
/***********************************
 * Board of dots
 ***********************************/
const PIXELS_WIDTH = 32;
const PIXELS_HEIGHT = 46;
const MAX_PITCH = 81;

// Soprano, Alto, Tenor, Bass.
const RANGES = [[60, 81], [52, 74], [46, 69], [36, 66]];
const SCALES = [
  {name: 'C', notes: [81,79,77,76,74,72,71,69,67,65,64,62,60,59,57,55,53,52,50,48,47,45,43,41,40,38,36] }
];

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
      const pitch = MAX_PITCH - i;
      
      this.data.push([]);
      const rowEl = document.createElement('div');
      rowEl.classList.add('row');
      rowEl.dataset.pitch = pitch;
      this.ui.container.appendChild(rowEl);

      for (let j = 0; j < PIXELS_WIDTH; j++) {
        this.data[i][j] = {};
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'cell, empty');
        button.classList.add('pixel');
        button.dataset.row = i;
        button.dataset.col = j;
        button.dataset.pitch = pitch;

        // Add a pitch label.
        if (j === 0) {
          const span = document.createElement('span');
          span.textContent = pitch;
          rowEl.appendChild(span);
        }
        rowEl.appendChild(button);
      }
      // Add a voice label.
      for (let v = 0; v < RANGES.length; v++) {
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
  toggleCell(i, j, voice) {
    const uiButton = document.querySelector(`.pixel[data-row="${i}"][data-col="${j}"]`);
          
    if (!uiButton) {
      return;
    }
    
    const dot = this.data[i][j];
    const pitch = MAX_PITCH - i;

    // Init this cell if it's never been set before.
    if (dot.on === undefined) dot.on = -1;
    
    if (voice === undefined) {
      dot.on = this.getNextVoice(pitch, dot.on)
    } else if (voice === -1) {
      // Erasing!
      dot.on = -1;
    } else if (voice === -2) {
      // Masking!
      dot.on = -2;
    } else {
      // We are drawing a voice. We should try to use it, unless we're drawing
      // out of range, in which case default to the next available voice.
      if (this.isPitchInRange(pitch, voice)) {
        dot.on = voice;
      } else {
        const nextVoice = this.getNextVoice(pitch, voice);
        dot.on = nextVoice === -1 ? this.getNextVoice(pitch, -1) : nextVoice;
      }
    }

    if (dot.on === -1) {
      this.resetButton(uiButton);
    } else if (dot.on === -2) {
      this.maskButton(uiButton);
    } else {
      this.voiceButton(uiButton, dot.on);
    }
  }

  resetButton(uiButton) {
    uiButton.setAttribute('class', 'pixel');
    uiButton.setAttribute('aria-label', 'cell, empty');
  }
  
  maskButton(uiButton) {
    uiButton.setAttribute('class', 'pixel masked');
    uiButton.setAttribute('aria-label', 'cell, masked');
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
  
  noScale() {
    const rows = document.querySelectorAll(`#container .row`);
    for (let i = 0; i < rows.length; i++) {
      rows[i].hidden = false;
    }
  }
  
  showScale(scale) {
    this.noScale();
    if (scale === -1) {
      return;
    }
    
    const notes = SCALES[scale].notes;
    
    // Hide the pixels that aren't in this scale.
    const rows = document.querySelectorAll(`#container .row`);
    for (let i = 0; i < rows.length; i++) {
      const pitch = parseInt(rows[i].dataset.pitch);
      if (notes.indexOf(pitch) === -1) {
        rows[i].hidden = true;
      }
    }
    
  }
}
