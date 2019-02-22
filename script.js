const board = new Board();
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');
const model = new mm.Coconet('https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach');
model.initialize();

let isMouseDown = false;
let isAnimating = false;
let forceVoiceDrawing = undefined;

init();

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

  // Set up event listeners.
  const container = document.getElementById('container');
  container.addEventListener('mousedown', (event) => { isMouseDown = true; clickCell(event) });
  container.addEventListener('mouseup', () => isMouseDown = false);
  container.addEventListener('mouseover', clickCell);
  
  const defaultNoteSequence = '{"notes":[{"pitch":77,"instrument":0,"quantizedStartStep":8,"quantizedEndStep":9},{"pitch":77,"instrument":0,"quantizedStartStep":9,"quantizedEndStep":10},{"pitch":77,"instrument":0,"quantizedStartStep":10,"quantizedEndStep":11},{"pitch":77,"instrument":0,"quantizedStartStep":11,"quantizedEndStep":12},{"pitch":77,"instrument":0,"quantizedStartStep":12,"quantizedEndStep":13},{"pitch":77,"instrument":0,"quantizedStartStep":13,"quantizedEndStep":14},{"pitch":76,"instrument":0,"quantizedStartStep":0,"quantizedEndStep":1},{"pitch":76,"instrument":0,"quantizedStartStep":1,"quantizedEndStep":2},{"pitch":76,"instrument":0,"quantizedStartStep":2,"quantizedEndStep":3},{"pitch":76,"instrument":0,"quantizedStartStep":3,"quantizedEndStep":4},{"pitch":76,"instrument":0,"quantizedStartStep":4,"quantizedEndStep":5},{"pitch":76,"instrument":0,"quantizedStartStep":5,"quantizedEndStep":6},{"pitch":76,"instrument":0,"quantizedStartStep":6,"quantizedEndStep":7},{"pitch":76,"instrument":0,"quantizedStartStep":7,"quantizedEndStep":8},{"pitch":76,"instrument":0,"quantizedStartStep":14,"quantizedEndStep":15},{"pitch":76,"instrument":0,"quantizedStartStep":15,"quantizedEndStep":16},{"pitch":76,"instrument":0,"quantizedStartStep":24,"quantizedEndStep":25},{"pitch":76,"instrument":0,"quantizedStartStep":25,"quantizedEndStep":26},{"pitch":76,"instrument":0,"quantizedStartStep":26,"quantizedEndStep":27},{"pitch":76,"instrument":0,"quantizedStartStep":27,"quantizedEndStep":28},{"pitch":76,"instrument":0,"quantizedStartStep":28,"quantizedEndStep":29},{"pitch":76,"instrument":0,"quantizedStartStep":29,"quantizedEndStep":30},{"pitch":76,"instrument":0,"quantizedStartStep":30,"quantizedEndStep":31},{"pitch":76,"instrument":0,"quantizedStartStep":31,"quantizedEndStep":32},{"pitch":74,"instrument":0,"quantizedStartStep":16,"quantizedEndStep":17},{"pitch":74,"instrument":0,"quantizedStartStep":17,"quantizedEndStep":18},{"pitch":74,"instrument":0,"quantizedStartStep":18,"quantizedEndStep":19},{"pitch":74,"instrument":0,"quantizedStartStep":19,"quantizedEndStep":20},{"pitch":74,"instrument":0,"quantizedStartStep":22,"quantizedEndStep":23},{"pitch":74,"instrument":0,"quantizedStartStep":23,"quantizedEndStep":24},{"pitch":72,"instrument":0,"quantizedStartStep":20,"quantizedEndStep":21},{"pitch":72,"instrument":0,"quantizedStartStep":21,"quantizedEndStep":22}],"quantizationInfo":{"stepsPerQuarter":4},"totalQuantizedSteps":22}';
  board.drawNoteSequence(JSON.parse(defaultNoteSequence));
}

function clickCell(event) {
  const button = event.target;

  // We only care about clicking on the buttons, not the container itself.
  if (button.localName !== 'button' || !isMouseDown) {
    return;
  }
  const x = parseInt(button.dataset.row);
  const y = parseInt(button.dataset.col);
  board.toggleCell(x, y, button, forceVoiceDrawing);
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
  
  model.infill(sequence).then((output) => {
    board.drawNoteSequence(output);
    error.textContent = '';
    controls.removeAttribute('disabled');
  });
}

function merge() {
  const sequence = mm.sequences.mergeConsecutiveNotes(board.getNoteSequence());
  const container = document.getElementById('container');
  container.classList.add('playing');
  player.start(sequence);
}

function activateVoice(event, voice) {
  const parentLabel = event.target.parentElement;

  // If we're clicking an activated button, then we're really deactivating it.
  if (parentLabel && parentLabel.classList.contains('active')) {
    parentLabel.classList.remove('active');
    forceVoiceDrawing = undefined;
  } else {
    // Deactivate the previous label.
    const prevButton = document.querySelector('label.active');
    if (prevButton) {
      prevButton.classList.remove('active');
    }
    // Activate this one.
    parentLabel.classList.add('active');
    forceVoiceDrawing = voice;
  }
}

function showEmptyNoteSequenceError() {
  error.textContent = 'Draw some 🎵 first!';
  setTimeout(clearError, 2000);
}

function clearError() {
  error.textContent = '';
}