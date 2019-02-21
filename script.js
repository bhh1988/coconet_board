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
  const sequence = model.mergeHeldNotes(board.getNoteSequence());
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