const board = window.board;
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');

// State of the world. Sorry.
let isMouseDown = false;
let previousSequence;  // So that you can re-infill.
// What's selected.
let paletteVoice = 0;
let brushSize = 1;
let paletteScale = -1;
// Actually stop the player from re-looping.
let playerHardStop = false;

init();

const model = new mm.Coconet('https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach');
model.initialize();

function init() {
  // Set up the player.
  player.callbackObject = {
    run: (note) => board.playStep(note),
    stop: () => {
      if (playerHardStop) {
        stop();
      } else {
        play();
      }
    }
  };
  
  // Load all SoundFonts so that they're ready for clicking.
  const allNotes = [];
  for (let i = 36; i < 82; i++) {
    allNotes.push({pitch: i, velocity: 80});
  }
  player.loadSamples({notes: allNotes});

  // Set up event listeners.
  document.addEventListener('keydown', onKeyDown);
  fileInput.addEventListener('change', loadMidi);
  
  const container = document.getElementById('container');
  container.addEventListener('touchstart', (event) => { isMouseDown = true; clickCell(event) }, {passive: true});
  container.addEventListener('touchend', (event) => { isMouseDown = false}, {passive: true});
  container.addEventListener('touchmove', clickCell);
  
  // Don't double fire events on desktop.
  const hasTouchEvents = ('ontouchstart' in window);
  if (!hasTouchEvents) {
    container.addEventListener('mousedown', (event) => { isMouseDown = true; clickCell(event) });
    container.addEventListener('mouseup', () => isMouseDown = false);
  }
  container.addEventListener('mouseover', clickCell);
  
  // Load a saved melody, or the default one.
  const defaultHash = '77:8:0,77:9:0,77:10:0,77:11:0,77:12:0,77:13:0,76:0:0,76:1:0,76:2:0,76:3:0,76:4:0,76:5:0,76:6:0,76:7:0,76:14:0,76:15:0,76:24:0,76:25:0,76:26:0,76:27:0,76:28:0,76:29:0,76:30:0,76:31:0,74:16:0,74:17:0,74:18:0,74:19:0,74:22:0,74:23:0,73:20:0,73:21:0';
  if (window.location.hash === '') {
    board.loadHash(defaultHash);
  } else {
    board.loadHash(window.location.hash.substring(1));
  }
}

function clickCell(event) {
  let button;
  
  // Check if this is a touch event or a mouse event.
  if (event.changedTouches) {
    button = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
  } else {
    button = event.target;
  }
  
  if (!button || button.localName !== 'button' || !isMouseDown) {
    return;
  }
  
  const x = parseInt(button.dataset.row);
  const y = parseInt(button.dataset.col);
  
  // If we're not erasing, sound it out.
  if (paletteVoice > -1) {
    player.playNoteDown({pitch: 81 - x, velocity: 80});
    setTimeout(() => player.playNoteUp({pitch: 81 - x, velocity: 80}), 150);
  }
  
  // Masking masks the whole column.
  if (paletteVoice === -2) {
    for (let j = 0; j < brushSize; j++) {
      board.maskColumn(y + j);
    }
  } else {
    // Draw with the correct brush size.
    for (let i = 0; i < brushSize; i++) {
      for (let j = 0; j < brushSize; j++) {
        board.toggleCell(x + i, y + j, paletteVoice);
      }
    }
  }
}

function reset() {
  board.reset();
  board.showScale(paletteScale);
}

function playOrPause() {
  const container = document.getElementById('container');
  // If we're playing, stop playing.
  if (player.isPlaying()) {
    playerHardStop = true;
    player.stop();
    stop();
  } else {
    // If we're stopped, start playing.
    playerHardStop = false;
    const sequence = board.getNoteSequence();
    if (sequence.notes.length === 0) {
      showEmptyNoteSequenceError();
      return;
    }
    play();
  }
}

function play() {
  btnPlay.hidden = true;
  btnStop.hidden = false;
  board.playEnd();
  document.getElementById('container').classList.add('playing');
  
  // Merge the current notes and start the player.
  const sequence = mm.sequences.mergeConsecutiveNotes(board.getNoteSequence());
  player.start(sequence);
}

function stop() {
  btnPlay.hidden = false;
  btnStop.hidden = true;
  board.playEnd();
  document.getElementById('container').classList.remove('playing');
}

function infill() {
  const sequence = previousSequence = board.getNoteSequence();
  const mask = board.getMaskSequence();
  
  if (sequence.notes.length === 0) {
    showEmptyNoteSequenceError();
    return;
  }
  
  // Stop the player if it's playing.
  if (player.isPlaying()) {
    playOrPause();
  }
  
  showLoadingMessage();
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
  
  model.infill(sequence, {
    temperature: parseFloat(inputTemp.value),
    infillMask: mask
  }).then((output) => {
    clearError();
    controls.removeAttribute('disabled');
    board.drawNoteSequence(output);
    
    // Pop out.
    defaultScale.click();
    
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

function activateVoice(event, voice) {
  const btn = event.target.localName === 'button' ? event.target : event.target.parentNode;
  
  // Deactivate the previous button.
  const prevButton = document.querySelector('.palette.voice.active');
  if (prevButton) {
    prevButton.classList.remove('active');
  }
  // Activate this one.
  btn.classList.add('active');
  
  // Switch back to a small brush if we were erasing
  if (voice > -1 && paletteVoice < 0) {
    defaultBrush.click();
  }
  
  paletteVoice = voice;
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

function activateScale(event, scale) {
  const btn = event.target.localName === 'button' ? event.target : event.target.parentNode;
  
  // Deactivate the previous button.
  const prevButton = document.querySelector('.palette.scale.active');
  if (prevButton) {
    prevButton.classList.remove('active');
  }
  // Activate this one.
  btn.classList.add('active');
  paletteScale = scale;
  board.showScale(scale);
}

function save() {
  const seq = mm.sequences.mergeConsecutiveNotes(board.getNoteSequence());
  saveAs(new File([mm.sequenceProtoToMidi(seq)], 'bach.mid'));
}

function toggleHelp() {
  if (help.classList.contains('hidden')) {
    help.classList.remove('hidden');
    main.classList.add('hidden');
  } else {
    help.classList.add('hidden');
    main.classList.remove('hidden');
  }
}

/* 
 * For testing.
 */
function onKeyDown(event) {
  if (event.keyCode === 82) {  // r for reload.
    board.drawNoteSequence(previousSequence);
    infill();
  } else if (event.keyCode === 76) {  // l for load.
    fileInput.click();
  } else if (event.keyCode === 83) {   // s for save.
    const seq = board.getNoteSequence();
    saveAs(new File([mm.sequenceProtoToMidi(seq)], 'bach.mid'));
  } else if (event.keyCode === 72) {   // h for help.
    toggleHelp();
  }
}

function loadMidi(event) {
  mm.blobToNoteSequence(event.target.files[0]).then((ns) => {
    const q = mm.sequences.quantizeNoteSequence(ns, 4);
    board.drawNoteSequence(q);
  });
}

/* 
 * Error messages.
 */
function showEmptyNoteSequenceError() {
  error.textContent = 'Draw some 🎵 first!';
  setTimeout(clearError, 2000);
}
function showLoadingMessage() {
  error.textContent = 'The robots are working...';
}
function clearError() {
  error.textContent = '';
}