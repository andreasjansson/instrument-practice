var sampleRate = 22050;
var a4freq = 440.0;
var c0midi = 12;
var a4midi = 69;
var log2 = tf.log(2);
var range = {'low': 52, 'high': 89}
var noteNames = getNoteNames();
var instrumentRanges = getInstrumentRanges();
var audioContext;
var analyzer;
var microphone;
var note;
var noteAccidental = '#';
var streak = 0;
var maxPoolSize = 7;
var avgPoolSize = 30;
var avgFactor = 3;
var debug = false;
var CHROMATIC = 'Chromatic';
var DIATONIC = 'Diatonic';
var scales = [CHROMATIC, DIATONIC];
var scale = CHROMATIC;

var bufferSize = 4096;
var pitchDetector;
var scriptProcessor;

$(function() {
  $('#range-low').change(updateRange);
  $('#range-high').change(updateRange);
  $('#range-instrument').change(updateInstrument);
  $('#scale').change(updateScale);
  $('#skip a').on('click', function() { nextNote(); return false });

  setDefaults();

  start();
});

function start() {
  audioContext = new AudioContext({sampleRate: sampleRate});
  analyzer = audioContext.createAnalyser();
  scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  $(window).on('click', startAubio);
  $(window).on('keydown', startAubio);
}

function startAubio() {
  $(window).off('click', startAubio);
  $(window).off('keydown', startAubio);

  $('#start').hide();
  $('#contents').show();
  audioContext.resume();
  Aubio().then(function(aubio) {
    pitchDetector = new aubio.Pitch(
      //'default',
      'yin',
      self.bufferSize,
      1,
      audioContext.sampleRate
    );
    pitchDetector.setSilence(-30);
    startRecord();
  });
}

function startRecord() {
  console.log('here');
  navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
    audioContext.createMediaStreamSource(stream).connect(analyzer);
    analyzer.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = audioProcess;
  }).catch(function(err) {
    alert(err.name + '\n\n' + err.message);
  });
  nextNote();
}

function audioProcess(event) {
  var freq = self.pitchDetector.do(
    event.inputBuffer.getChannelData(0)
  );
  if (freq && pitchDetector.getConfidence() > .5) {
    var actualNote = Math.round(Math.log2(freq / a4freq) * 12 + a4midi);
    displayNote(actualNote, $('#actual'), noteAccidental);
    checkNote(actualNote);
  } else {
    $('#actual').hide();
  }
}

function checkNote(actualNote) {
  if (actualNote == note) {
    actualGreen();
    streak += 1;
    if (streak == 2) {
      streak = 0;
      $('#nice').show();
      audioContext.suspend();
      setTimeout(function() {
        $('#nice').hide();
        $('#actual').hide();
        console.log('nextnote');
        audioContext.resume();
        nextNote();
      }, 1000);
    }
  } else {
    actualRed();
    streak = 0;
  }
}

function getNoteNames() {
  var map = {
    0: ['C'],
    1: ['C#', 'Db'],
    2: ['D'],
    3: ['D#', 'Eb'],
    4: ['E'],
    5: ['F'],
    6: ['F#', 'Gb'],
    7: ['G'],
    8: ['G#', 'Ab'],
    9: ['A'],
    10: ['A#', 'Bb'],
    11: ['B'],
  }

  var names = {}
  for (var oct = 0; oct < 9; oct ++) {
    for (var i = 0; i < 12; i ++) {
      var midi = c0midi + oct * 12 + i;
      var n = [];
      for (var j = 0; j < map[i].length; j ++) {
        var base = map[i][j];
        n.push(base + oct);
      }
      names[midi] = n;
    }
  }
  return names;
}

function nextNote() {
  var newNote = note;
  while (newNote == note || (scale == DIATONIC && !isDiatonic(newNote))) {
    newNote = Math.floor(Math.random() * (range.high + 1 - range.low) + range.low);
  }
  setNote(newNote);
}

function setNote(n) {
  note = n;
  displayNote(note, $('#expected'));
}

function displayNote(note, parent, useAccidental) {
  var names = noteNames[note];
  if (names == null) {
    if (note != 108) {
      console.log("Bad note:", note);
    }
    return;
  }
  /*
  if (note < range.low || note > range.high + 1) {
    console.log("Note is out of range: ", note);
    return;
  }
*/
  parent.show();

  var name;
  if (!useAccidental) {
    name = names[Math.floor(Math.random() * names.length)];
  } else {
    if (useAccidental == '#') {
      name = names[0];
    } else {
      name = names[names.length - 1];
    }
  }

  var offset = {
    'C': 0,
    'D': 1,
    'E': 2,
    'F': 3,
    'G': 4,
    'A': 5,
    'B': 6,
  }[name[0]];

  var accidental = '';
  if (name[1] == 'b') {
    accidental = '♭';
    noteAccidental = 'b';
  } else if (name[1] == '#') {
    accidental = '♯';
    noteAccidental = '#';
  }

  var oct = 1 * name.substr(-1);
  offset += (oct - 4) * 7;

  $('.octava', parent).css('visibility', 'hidden');

  var shift = 0;
  if (offset < -5) {
    shift = 7;
    $('.octava-below', parent).css('visibility', 'visible');
  } else if (offset > 17) {
    shift = -7;
    $('.octava-above', parent).css('visibility', 'visible');
  }

  var displayOffset = offset + shift;

  $('.ledger', parent).css('visibility', 'hidden');

  if (displayOffset > 11) {
    $('.ledger.above-1', parent).css('visibility', 'visible');
  }
  if (displayOffset > 13) {
    $('.ledger.above-2', parent).css('visibility', 'visible');
  }
  if (displayOffset > 15) {
    $('.ledger.above-3', parent).css('visibility', 'visible');
  }
  if (displayOffset < 1) {
    $('.ledger.below-1', parent).css('visibility', 'visible');
  }
  if (displayOffset < -1) {
    $('.ledger.below-2', parent).css('visibility', 'visible');
  }
  if (displayOffset < -3) {
    $('.ledger.below-3', parent).css('visibility', 'visible');
  }

  $('.note', parent).css('visibility', 'visible');

  var topPx = 2 + 22 * 16 - 22 * displayOffset;
  $('.note', parent).css('top', topPx + 'px');

  $('.note-name', parent).text(name);
  $('.accidental', parent).text(accidental);
}

function actualGreen() {
  actualColor("#22FF61");
  $('#actual .breve').attr('src', 'whole-note-green.png');
}

function actualRed() {
  actualColor("#FF225F");
  $('#actual .breve').attr('src', 'whole-note-red.png');
}

function actualColor(hex) {
  $('#actual .note-name').css('color', hex);
  $('#actual .accidental').css('color', hex);
}

function updateRange() {
  var low = 1 * $('#range-low').val();
  var high = 1 * $('#range-high').val();
  Cookies.set('range-low', low);
  Cookies.set('range-high', high);

  if (high < low + 1) {
    alert("High must be > low");
    $('#range-low').val('' + range.low);
    $('#range-high').val('' + range.high);
    return;
  }

  range.low = low;
  range.high = high;
  if (note < range.low || note > range.high + 1) {
    nextNote();
  }

  var instr = 'custom';
  for (var name in instrumentRanges) {
    var r = instrumentRanges[name];
    if (r[0] == low && r[1] == high) {
      instr = name;
      break;
    }
  }
  $('#range-instrument').val(instr);
}

function updateInstrument() {
  var name = $('#range-instrument').val();
  if (name == 'custom') {
    return;
  }
  var low = instrumentRanges[name][0];
  var high = instrumentRanges[name][1];
  $('#range-low').val(low);
  $('#range-high').val(high);
  updateRange();
}

function updateScale() {
  scale = $('#scale').val();
  console.log('scale', scale);
  Cookies.set('scale', scale);
  if (scale == DIATONIC) {
    if (note && !isDiatonic(note)) {
      nextNote();
    }
  }
}

function isDiatonic(n) {
  return noteNames[n].length == 1;
}

function getInstrumentRanges() {
  var nn = {}
  for (var i in noteNames) {
    var name = noteNames[i][0];
    nn[name] = i;
  }

  return {
    'Accordion': [nn['E3'], nn['F6']],
    'Guitar': [nn['E2'], nn['E5']],
    'Piano': [nn['A0'], nn['C8']],
    'Clarinet': [nn['E3'], nn['C7']],
    'Voice (bass)': [nn['E2'], nn['E4']],
    'Voice (tenor)': [nn['C3'], nn['C5']],
    'Voice (alto)': [nn['F3'], nn['F5']],
    'Voice (soprano)': [nn['C4'], nn['C6']],
    'Single octave (4)': [nn['C4'], nn['B4']],
    'Single octave (5)': [nn['C5'], nn['B5']],
  }
}

function setDefaults() {
  var rangeLow = Cookies.get('range-low');
  if (rangeLow) {
    $('#range-low').val(rangeLow);
  }
  var rangeHigh = Cookies.get('range-high');
  if (rangeHigh) {
    $('#range-high').val(rangeHigh);
  }
  if (rangeLow || rangeHigh) {
    updateRange();
  }

  var scale = Cookies.get('scale');
  if (scale) {
    $('#scale').val(scale);
    updateScale();
  }
}
