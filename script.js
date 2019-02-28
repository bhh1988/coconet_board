const board = window.board;
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');
let isMouseDown = false;
let isAnimating = false;
let forceVoiceDrawing = 0;
let brushSize = 1;

init();

const model = new mm.Coconet('https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach');
model.initialize();

function init() {
  player.callbackObject = {
    run: (note) => board.playStep(note),
    stop: () => {
      btnPlay.textContent = 'Play';
      isAnimating = false;
      board.playEnd();
      document.getElementById('container').classList.remove('playing');
    }
  };
  
  // Load all SoundFonts so that they're ready for clicking.
  const allNotes = [];
  for (let i = 36; i < 82; i++) {
    allNotes.push({pitch: i, velocity: 80});
  }
  player.loadSamples({notes: allNotes});

  // Set up event listeners.
  const container = document.getElementById('container');
  
  container.addEventListener('touchstart', (event) => { console.log('start'); isMouseDown = true; clickCell(event) }, {passive: true});
  container.addEventListener('touchend', (event) => { console.log('end'); isMouseDown = false}, {passive: true});
  container.addEventListener('touchmove', clickCellMove);
  
  const hasTouchEvents = ('ontouchstart' in window);
  
  if (!hasTouchEvents) {
    container.addEventListener('mousedown', (event) => { isMouseDown = true; clickCell(event) });
    container.addEventListener('mouseup', () => isMouseDown = false);
    
  }
  container.addEventListener('mouseover', clickCell);
  
  const defaultNoteSequence = '{"notes":[{"pitch":77,"instrument":0,"quantizedStartStep":8,"quantizedEndStep":9},{"pitch":77,"instrument":0,"quantizedStartStep":9,"quantizedEndStep":10},{"pitch":77,"instrument":0,"quantizedStartStep":10,"quantizedEndStep":11},{"pitch":77,"instrument":0,"quantizedStartStep":11,"quantizedEndStep":12},{"pitch":77,"instrument":0,"quantizedStartStep":12,"quantizedEndStep":13},{"pitch":77,"instrument":0,"quantizedStartStep":13,"quantizedEndStep":14},{"pitch":76,"instrument":0,"quantizedStartStep":0,"quantizedEndStep":1},{"pitch":76,"instrument":0,"quantizedStartStep":1,"quantizedEndStep":2},{"pitch":76,"instrument":0,"quantizedStartStep":2,"quantizedEndStep":3},{"pitch":76,"instrument":0,"quantizedStartStep":3,"quantizedEndStep":4},{"pitch":76,"instrument":0,"quantizedStartStep":4,"quantizedEndStep":5},{"pitch":76,"instrument":0,"quantizedStartStep":5,"quantizedEndStep":6},{"pitch":76,"instrument":0,"quantizedStartStep":6,"quantizedEndStep":7},{"pitch":76,"instrument":0,"quantizedStartStep":7,"quantizedEndStep":8},{"pitch":76,"instrument":0,"quantizedStartStep":14,"quantizedEndStep":15},{"pitch":76,"instrument":0,"quantizedStartStep":15,"quantizedEndStep":16},{"pitch":76,"instrument":0,"quantizedStartStep":24,"quantizedEndStep":25},{"pitch":76,"instrument":0,"quantizedStartStep":25,"quantizedEndStep":26},{"pitch":76,"instrument":0,"quantizedStartStep":26,"quantizedEndStep":27},{"pitch":76,"instrument":0,"quantizedStartStep":27,"quantizedEndStep":28},{"pitch":76,"instrument":0,"quantizedStartStep":28,"quantizedEndStep":29},{"pitch":76,"instrument":0,"quantizedStartStep":29,"quantizedEndStep":30},{"pitch":76,"instrument":0,"quantizedStartStep":30,"quantizedEndStep":31},{"pitch":76,"instrument":0,"quantizedStartStep":31,"quantizedEndStep":32},{"pitch":74,"instrument":0,"quantizedStartStep":16,"quantizedEndStep":17},{"pitch":74,"instrument":0,"quantizedStartStep":17,"quantizedEndStep":18},{"pitch":74,"instrument":0,"quantizedStartStep":18,"quantizedEndStep":19},{"pitch":74,"instrument":0,"quantizedStartStep":19,"quantizedEndStep":20},{"pitch":74,"instrument":0,"quantizedStartStep":22,"quantizedEndStep":23},{"pitch":74,"instrument":0,"quantizedStartStep":23,"quantizedEndStep":24},{"pitch":72,"instrument":0,"quantizedStartStep":20,"quantizedEndStep":21},{"pitch":72,"instrument":0,"quantizedStartStep":21,"quantizedEndStep":22}],"quantizationInfo":{"stepsPerQuarter":4},"totalQuantizedSteps":22}';
  board.drawNoteSequence(JSON.parse(defaultNoteSequence));
}

function clickCell(event) {
  const button = event.target;
  if (button.localName !== 'button' || !isMouseDown) {
    return;
  }
  
  const x = parseInt(button.dataset.row);
  const y = parseInt(button.dataset.col);
  
  // If we're not erasing, sound it out.
  if (forceVoiceDrawing > -1) {
    player.playNoteDown({pitch: 81 - x, velocity: 80});
    setTimeout(() => player.playNoteUp({pitch: 81 - x, velocity: 80}), 150);
  }
  
  // Draw with the correct brush size.
  for (let i = 0; i < brushSize; i++) {
    for (let j = 0; j < brushSize; j++) {
      board.toggleCell(x + i, y + j, forceVoiceDrawing);
    }
  }
}

// TODO: refactor this.
function clickCellMove(event) {
  const button = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
  if (button.localName !== 'button' || !isMouseDown) {
    return;
  }
  
  const x = parseInt(button.dataset.row);
  const y = parseInt(button.dataset.col);
  
  // If we're not erasing, sound it out.
  if (forceVoiceDrawing > -1) {
    player.playNoteDown({pitch: 81 - x, velocity: 80});
    setTimeout(() => player.playNoteUp({pitch: 81 - x, velocity: 80}), 150);
  }
  
  // Draw with the correct brush size.
  for (let i = 0; i < brushSize; i++) {
    for (let j = 0; j < brushSize; j++) {
      board.toggleCell(x + i, y + j, forceVoiceDrawing);
    }
  }
}

function reset() {
  board.reset();
}

function playOrPause() {
  const container = document.getElementById('container');
  if (isAnimating) {
    container.classList.remove('playing');
    player.stop();
  } else {
    const sequence = board.getNoteSequence();
    if (sequence.notes.length === 0) {
      showEmptyNoteSequenceError();
      return;
    }
    container.classList.add('playing');
    player.loadSamples(sequence).then(() => {
      player.start(sequence);
    });
  }
  isAnimating = !isAnimating;
  btnPlay.textContent = isAnimating? 'Stop' : 'Play';
}

function infill() {
  const sequence = board.getNoteSequence();
  if (sequence.notes.length === 0) {
    showEmptyNoteSequenceError();
    return;
  }
  error.textContent = 'The robots are working...';
  controls.setAttribute('disabled', true);
  
  // Put the original sequence in a map so we can diff it later.
  const pitchToTime = {};
  for (let i = 0; i < sequence.notes.length; i++) {
    const note = sequence.notes[i];
    if (!pitchToTime[note.pitch]) {
      pitchToTime[note.pitch] = [];
    }
    pitchToTime[note.pitch].push(note.quantizedStartStep);
  }
  
  // Clear all the previous "infill" ui.
  const els = document.querySelectorAll('.pixel.infilled');
  for (let i = 0; i < els.length; i++) {els[i].classList.remove('infilled'); }
  
  model.infill(sequence, parseFloat(inputTemp.value)).then((output) => {
    error.textContent = '';
    controls.removeAttribute('disabled');
    board.drawNoteSequence(output);
    
    // Style the Coconet notes differently.
    for (let i = 0; i < output.notes.length; i++) {
      const note = output.notes[i];
      
      // If we didn't have this note before, it's infilled.
      if (!pitchToTime[note.pitch] || (pitchToTime[note.pitch] && pitchToTime[note.pitch].indexOf(note.quantizedStartStep) === -1)) {
        const uiButton = document.querySelector(`.pixel[data-row="${81 - note.pitch}"][data-col="${note.quantizedStartStep}"]`);
        uiButton.classList.add('infilled');
      }
    }
  });
}

function merge() {
  const sequence = mm.sequences.mergeConsecutiveNotes(board.getNoteSequence());
  const container = document.getElementById('container');
  container.classList.add('playing');
  player.start(sequence);
}

function activateVoice(event, voice) {
  const btn = event.target.localName === 'button' ? event.target : event.target.parentNode;
  
  // Deactivate the previous button.
  const prevButton = document.querySelector('.palette.active');
  if (prevButton) {
    prevButton.classList.remove('active');
  }
  // Activate this one.
  btn.classList.add('active');
  
  // Switch back to a small brush if we were erasing
  if (voice > -1 && forceVoiceDrawing < 0) {
    defaultBrush.click();
  }
  
  forceVoiceDrawing = voice;
}

function activateMask(event) {
  const btn = event.target.localName === 'button' ? event.target : event.target.parentNode;
  
  // Deactivate the previous button.
  const prevButton = document.querySelector('.palette.active');
  if (prevButton) {
    prevButton.classList.remove('active');
  }
  
  // Activate this one.
  btn.classList.add('active');
  forceVoiceDrawing = -2;
}

function activateBrush(event, brush) {
  const btn = event.target.localName === 'button' ? event.target : event.target.parentNode;
  
  // Deactivate the previous button.
  const prevButton = document.querySelector('.brush.active');
  if (prevButton) {
    prevButton.classList.remove('active');
  }
  // Activate this one.
  btn.classList.add('active');
  brushSize = brush;
}

/* 
 * Error messages
 */
function showEmptyNoteSequenceError() {
  error.textContent = 'Draw some 🎵 first!';
  setTimeout(clearError, 2000);
}

function clearError() {
  error.textContent = '';
}