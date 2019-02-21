const board = new Board();
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');
const model = new mm.Coconet('https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach');
model.initialize();

let isMouseDown = false;
let isAnimating = false;
let forceVoiceDrawing = -1;

init();

function init() {
  player.callbackObject = {
    run: (note) => board.playStep(note),
    stop: () => {
      btnPlay.textContent = 'Play';
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
    container.classList.add('playing');
    const sequence = board.getNoteSequence();
  //  player.setTempo(parseFloat(inputTempo.value));
    player.loadSamples(sequence).then(() => {
      player.start(sequence);
    });
  }
  isAnimating = !isAnimating;
  btnPlay.textContent = isAnimating? 'Stop' : 'Play';
}

function infill() {
  const sequence = board.getNoteSequence();
  model.infill(sequence).then((output) => board.drawNoteSequence(output));
}

function merge() {
  const sequence = model.mergeHeldNotes(board.getNoteSequence());
  player.start(sequence);
}

function activateVoice(event, voice) {
  const parentLabel = event.target.parentElement;

  // If we're clicking an activated button, then we're really deactivating it.
  if (parentLabel && parentLabel.classList.contains('active')) {
    parentLabel.classList.remove('active');
    forceVoiceDrawing = -1;
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
