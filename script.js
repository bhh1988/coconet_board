const board = new Board();
let player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');
let model;

// State of the world. Sorry about this.
let isMouseDown = false;
let previousSequence;  // So that you can re-infill.

// What's selected.
let paletteVoice = 0;
let brushSize = 1;
let paletteScale = -1;
let shouldReInfill = false;

// Actually stop the player from re-looping.
let playerHardStop = false;

init();

function init() {
  resize();
  
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
  
  // Let the user move in to the next page.
  btnReady.disabled = false;

  // Set up event listeners.
  document.addEventListener('keydown', onKeyDown);
  fileInput.addEventListener('change', loadMidi);
  window.addEventListener('resize', resize);
  
  // Set up touch events.
  const container = document.getElementById('container');
  container.addEventListener('touchstart', (event) => { isMouseDown = true; clickCell(event) }, {passive: true});
  container.addEventListener('touchend', (event) => { isMouseDown = false}, {passive: true});
  container.addEventListener('touchmove', clickCell, {passive: true});
  container.addEventListener('mouseover', clickCell);
  
  // But don't double fire events on desktop.
  const hasTouchEvents = ('ontouchstart' in window);
  if (!hasTouchEvents) {
    container.addEventListener('mousedown', (event) => { isMouseDown = true; clickCell(event) });
    container.addEventListener('mouseup', () => isMouseDown = false);
  }
}

function resize() {
  // If this is a small screen, reorganize the layout.
  if (window.innerWidth < 700 && sectionControls.parentNode !== sectionInstruments.parentNode) {
    sectionControls.parentNode.insertBefore(sectionBrush, sectionControls);
    sectionInstruments.parentNode.appendChild(sectionControls);
  } else if (window.innerWidth > 700 && sectionControls.parentNode === sectionInstruments.parentNode){
    sectionBrush.parentNode.insertBefore(sectionControls, sectionBrush);
    sectionInstruments.parentNode.appendChild(sectionBrush);
  }
}

function userSaidGo() {
  model = new coconet.Coconet('https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach');
  model.initialize();
  
  // Load all SoundFonts so that they're ready for clicking.
  const allNotes = [];
  for (let i = 36; i < 82; i++) {
    allNotes.push({pitch: i, velocity: 80});
  }
  player.loadSamples({notes: allNotes});
  
  // Load a saved melody, or the default one.
  //const defaultHash = '77:8:0,77:9:0,77:10:0,77:11:0,77:12:0,77:13:0,76:0:0,76:1:0,76:2:0,76:3:0,76:4:0,76:5:0,76:6:0,76:7:0,76:14:0,76:15:0,76:24:0,76:25:0,76:26:0,76:27:0,76:28:0,76:29:0,76:30:0,76:31:0,74:16:0,74:17:0,74:18:0,74:19:0,74:22:0,74:23:0,72:20:0,72:21:0';
  const defaultHash = '80:4:0,80:25:0,80:26:0,80:27:0,79:3:0,79:4:0,79:5:0,79:6:0,79:24:0,79:25:0,79:27:0,78:3:0,78:6:0,78:7:0,78:8:0,78:23:0,78:24:0,78:28:0,77:2:0,77:8:0,77:12:0,77:13:0,77:14:0,77:15:0,77:16:0,77:17:0,77:18:0,77:22:0,77:23:0,77:28:0,76:2:0,76:9:0,76:10:0,76:11:0,76:12:0,76:18:0,76:19:0,76:22:0,76:28:0,75:2:0,75:9:0,75:19:0,75:20:0,75:21:0,75:22:0,75:28:0,74:2:0,74:27:0,74:28:0,73:2:0,73:3:0,73:27:0,72:3:0,72:12:0,72:19:0,72:20:0,72:27:0,71:3:0,71:11:0,71:12:0,71:13:0,71:18:0,71:19:0,71:20:0,71:26:0,71:27:0,70:3:0,70:11:0,70:12:0,70:13:0,70:19:0,70:20:0,70:25:0,70:26:0,69:4:0,69:6:2,69:7:2,69:23:2,69:24:2,69:26:0,68:4:0,68:7:2,68:8:2,68:9:2,68:10:2,68:11:2,68:14:0,68:18:0,68:21:2,68:22:2,68:23:2,68:26:0,68:27:1,67:2:1,67:3:1,67:4:0,67:5:0,67:11:2,67:12:2,67:14:0,67:18:0,67:20:2,67:26:0,67:27:1,67:28:1,66:2:1,66:5:0,66:8:2,66:9:2,66:10:2,66:11:2,66:12:2,66:14:0,66:15:0,66:16:0,66:17:0,66:18:0,66:21:2,66:22:2,66:23:2,66:24:2,66:26:0,66:28:1,66:29:1,65:1:1,65:5:2,65:6:2,65:7:2,65:10:2,65:11:2,65:12:2,65:20:2,65:21:2,65:25:2,65:26:2,65:29:1,64:1:1,64:5:2,64:6:0,64:7:0,64:9:2,64:10:2,64:15:1,64:16:1,64:17:1,64:18:1,64:23:2,64:24:2,64:25:0,64:27:2,64:29:1,63:1:1,63:7:0,63:8:2,63:9:2,63:14:1,63:18:1,63:24:0,63:25:2,63:29:1,62:1:1,62:8:2,62:9:0,62:14:1,62:15:1,62:16:1,62:17:1,62:18:1,62:23:0,62:24:0,62:26:2,62:30:1,61:1:1,61:6:2,61:7:2,61:9:0,61:10:0,61:11:0,61:12:0,61:22:0,61:23:0,61:27:2,61:30:1,60:2:1,60:6:2,60:12:0,60:13:0,60:14:0,60:15:0,60:16:0,60:17:0,60:18:0,60:19:0,60:20:0,60:21:0,60:22:0,60:27:2,60:30:1,59:1:1,59:30:1,58:1:1,58:30:1,57:1:1,57:30:1,56:1:1,56:2:1,56:29:1,55:2:1,55:29:1,54:2:1,54:3:1,54:23:3,54:24:3,54:25:3,54:26:3,54:27:3,54:29:1,53:3:1,53:5:3,53:6:3,53:7:3,53:8:3,53:9:3,53:10:3,53:11:3,53:22:3,53:23:3,53:27:3,53:28:3,52:4:3,52:5:3,52:11:3,52:12:3,52:21:3,52:29:3,51:4:3,51:13:3,51:20:3,51:21:3,51:29:3,50:3:3,50:4:3,50:13:3,50:20:3,50:29:3,49:3:3,49:13:3,49:20:3,49:21:3,49:29:3,48:4:3,48:12:3,48:13:2,48:19:2,48:20:2,48:21:3,48:29:3,47:4:3,47:5:3,47:6:3,47:11:3,47:12:3,47:14:2,47:15:2,47:16:2,47:17:2,47:18:2,47:19:2,47:21:3,47:22:3,47:28:3,46:6:3,46:7:3,46:8:3,46:9:3,46:10:3,46:11:3,46:22:3,46:23:3,46:24:3,46:25:3,46:26:3,46:27:3';
  if (window.location.hash === '') {
    board.loadHash(defaultHash);
  } else {
    board.loadHash(window.location.hash.substring(1));
  }
  
  // Close the screen.
  toggleHelp();
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
  shouldReInfill = false;
}

function reset() {
  board.reset();
  board.showScale(paletteScale);
  // Stop the player if it's playing.
  if (player.isPlaying()) {
    playOrPause();
  }
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
  // Program indicates the instrument to use
  sequence.notes.forEach(n => {
    switch (Number(n.instrument)) {
      case 0:
        n.program = 0;
        return;
      case 1:
        n.program = 40;
        return;
      case 2:
        n.program = 71;
        return;
      case 3:
        n.program = 42;
        return;
      default:
        return;
    }
  });
  player.start(sequence);
}

function stop() {
  btnPlay.hidden = false;
  btnStop.hidden = true;
  board.playEnd();
  document.getElementById('container').classList.remove('playing');
}

function infill() {
  if (shouldReInfill) {
    board.drawNoteSequence(previousSequence);
  }
  shouldReInfill = true;
  
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
    numIterations: 96,
    infillMask: mask
  }).then((output) => {
    clearError();
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
  const prevButton = document.querySelector('.scale.active');
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
  } else if (event.keyCode === 80) {   // p for piano and pablo bc he asked for it.
    // Toggle the piano keys on or off.
    const keys = container.querySelectorAll('.piano-key');
    if (keys[0].classList.contains('off')) {
      for (let i = 0; i < keys.length; i++) {keys[i].classList.remove('off'); }
    } else {
      for (let i = 0; i < keys.length; i++) {keys[i].classList.add('off'); }
    }
  }
}

function loadMidi(event) {
  mm.blobToNoteSequence(event.target.files[0]).then((ns) => {
    const q = mm.sequences.quantizeNoteSequence(ns, 4);
    board.drawNoteSequence(q);
  });
}

/* 
 * Error message ui.
 */
function showEmptyNoteSequenceError() {
  main.classList.add('blur');
  error.textContent = 'Draw some 🎵 first!';
  error.hidden = false;
  error.focus();
  setTimeout(clearError, 2000);
}
function showLoadingMessage() {
  main.classList.add('blur');
  error.textContent = 'The robots are working...';
  error.focus();
  error.hidden = false;
}
function clearError() {
  main.classList.remove('blur');
  error.textContent = '';
  error.hidden = true;
}