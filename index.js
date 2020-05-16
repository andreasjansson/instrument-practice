var sampleRate = 8192;
var fftSize = 2048;
var a4freq = 440.0;
var c0midi = 12;
var log2 = tf.log(2);
var range = {'low': 52, 'high': 89}
var noteNames = getNoteNames();
var aCtx;
var analyzer;
var microphone;
var note;
var noteAccidental = '#';
var streak = 0;
var maxPoolSize = 7;
var avgPoolSize = 50;
var avgFactor = 3;
var smoothing = 0.01;
var debug = false;

const surface = { name: 'Spectrum', tab: 'Debugger' };
const surface2 = { name: 'Peaks', tab: 'Debugger' };

nextNote();

navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
  aCtx = new AudioContext({sampleRate: sampleRate});
  analyzer = aCtx.createAnalyser();
  analyzer.fftSize = fftSize;
  analyzer.smoothingTimeConstant = smoothing;
  microphone = aCtx.createMediaStreamSource(stream);
  microphone.connect(analyzer);
  // analyzer.connect(aCtx.destination);
  step();
}).catch(function(err) {
  console.log(err);
});

function step(){
  var timeout = 200;

  fft = new Float32Array(analyzer.frequencyBinCount);
  analyzer.getFloatFrequencyData(fft);
  t = tf.sqrt(tf.pow(10, tf.div(fft, 20))).dataSync();

  peaks = findPeaks(t);
  if (debug) {
    render(t, surface);
    render(peaks.vec, surface2);
  }

  if (peaks.idx.length > 0) {
    freq = tf.mul(peaks.idx[0], sampleRate).div(fftSize);
    midi = tf.log(freq.div(a4freq)).div(log2).mul(12).add(69);
    var actualNote = Math.round(midi.dataSync());
    displayNote(actualNote, $('#actual'), noteAccidental);
    if (actualNote == note) {
      actualGreen();
      streak += 1;
      if (streak == 2) {
        streak = 0;
        $('#nice').show();
        analyzer.smoothingTimeConstant = 0;
        microphone.disconnect(analyzer);
        analyzer.getFloatFrequencyData(fft); // clear buffer
        setTimeout(function() {
          $('#nice').hide();
          $('#actual').hide();
          nextNote();
          analyzer.getFloatFrequencyData(fft); // clear buffer
        }, 1000);
        timeout = 1500;
        setTimeout(function() {
          analyzer.smoothingTimeConstant = smoothing;
          analyzer.getFloatFrequencyData(fft); // clear buffer
          microphone.connect(analyzer);
        }, timeout);
      }
    } else {
      actualRed();
      streak = 0;
    }
  } else {
    $('#actual').hide();
  }

  setTimeout(step, timeout);
}

function render(arr, surface) {
  var data = Array.from(arr).map(function(x, i) {
    return {index: i, value: x}
  });
  tfvis.render.barchart(surface, data);
}

function findPeaks(vec) {
  var t4d = tf.reshape(vec, [1, -1, 1, 1]);
  var maxIdx = tf.maxPoolWithArgmax(t4d, [maxPoolSize, 1], [1, 1], 'same')['indexes'].dataSync();
  var avg = t4d.avgPool([avgPoolSize, 1], [1, 1], 'same').dataSync();
  var peakVec = tf.zeros([vec.length]).dataSync();
  var peaks = [];
  for (var i = 0; i < vec.length; i ++) {
    var v = vec[i];
    var a = avg[i];
    var m = maxIdx[i];
    if (m == i && v >= a * avgFactor) {
      peakVec[i] = v;
      peaks.push(i);
    }
  }
  return {idx: peaks, vec: peakVec};
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
  setNote(Math.floor(Math.random() * (range.high + 1 - range.low) + range.low));
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
  if (note < range.low || note > range.high + 1) {
    console.log("Note is out of range: ", note);
    return;
  }
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

  if (low > high) {
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
}
