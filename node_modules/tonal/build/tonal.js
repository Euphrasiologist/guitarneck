'use strict';

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-note.svg)](https://www.npmjs.com/package/tonal-note)
 * [![tonal](https://img.shields.io/badge/tonal-note-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-note` is a collection of functions to manipulate musical notes in scientific notation
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * import * as Note from "tonal-note"
 * // or const Note = require("tonal-note")
 * Note.name("bb2") // => "Bb2"
 * Note.chroma("bb2") // => 10
 * Note.midi("a4") // => 69
 * Note.freq("a4") // => 440
 * Note.oct("G3") // => 3
 *
 * // part of tonal
 * const Tonal = require("tonal")
 * // or import Note from "tonal"
 * Tonal.Note.midi("d4") // => 62
 * ```
 *
 * ## Install
 *
 * [![npm install tonal-note](https://nodei.co/npm/tonal-note.png?mini=true)](https://npmjs.org/package/tonal-note/)
 *
 * ## API Documentation
 *
 * @module Note
 */

var NAMES = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(" ");

/**
 * Get a list of note names (pitch classes) within a octave
 *
 * @param {string} accTypes - (Optional, by default " b#"). A string with the
 * accidentals types: " " means no accidental, "#" means sharps, "b" mean flats,
 * can be combined (see examples)
 * @return {Array}
 * @example
 * Note.names(" b") // => [ "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B" ]
 * Note.names(" #") // => [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ]
 */
var names = function (accTypes) { return typeof accTypes !== "string"
    ? NAMES.slice()
    : NAMES.filter(function (n) {
        var acc = n[1] || " ";
        return accTypes.indexOf(acc) !== -1;
      }); };

var SHARPS = names(" #");
var FLATS = names(" b");
var REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;

/**
 * Split a string into tokens related to note parts.
 * It returns an array of strings `[letter, accidental, octave, modifier]`
 *
 * It always returns an array
 *
 * @param {string} str
 * @return {Array} an array of note tokens
 * @example
 * Note.tokenize("C#2") // => ["C", "#", "2", ""]
 * Note.tokenize("Db3 major") // => ["D", "b", "3", "major"]
 * Note.tokenize("major") // => ["", "", "", "major"]
 * Note.tokenize("##") // => ["", "##", "", ""]
 * Note.tokenize() // => ["", "", "", ""]
 */
function tokenize(str) {
  if (typeof str !== "string") { str = ""; }
  var m = REGEX.exec(str);
  if (!m) { return null; }
  return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
}

var NO_NOTE = Object.freeze({
  pc: null,
  name: null,
  step: null,
  alt: null,
  oct: null,
  octStr: null,
  chroma: null,
  midi: null,
  freq: null
});

var SEMI = [0, 2, 4, 5, 7, 9, 11];
var properties = function (str) {
  var tokens = tokenize(str);
  if (tokens[0] === "" || tokens[3] !== "") { return NO_NOTE; }
  var letter = tokens[0];
  var acc = tokens[1];
  var octStr = tokens[2];
  var p = { letter: letter, acc: acc, octStr: octStr };
  p.pc = p.letter + p.acc;
  p.name = p.pc + octStr;
  p.step = (p.letter.charCodeAt(0) + 3) % 7;
  p.alt = p.acc[0] === "b" ? -p.acc.length : p.acc.length;
  p.oct = octStr.length ? +octStr : null;
  p.chroma = (SEMI[p.step] + p.alt + 120) % 12;
  p.midi = p.oct !== null ? SEMI[p.step] + p.alt + 12 * (p.oct + 1) : null;
  p.freq = midiToFreq(p.midi);
  return Object.freeze(p);
};

var memo = function (fn, cache) {
  if ( cache === void 0 ) cache = {};

  return function (str) { return cache[str] || (cache[str] = fn(str)); };
};

/**
 * Get note properties. It returns an object with the following information:
 *
 * - name {string}: the note name. The letter is always in uppercase
 * - letter {string}: the note letter, always in uppercase
 * - acc {string}: the note accidentals
 * - octave {number}: the octave or null if not present
 * - pc {string}: the pitch class (letter + accidentals)
 * - step {number}: number equivalent of the note letter. 0 means C ... 6 means B.
 * - alt {number}: number equivalent of accidentals (negative are flats, positive sharps)
 * - chroma {number}: number equivalent of the pitch class, where 0 is C, 1 is C# or Db, 2 is D...
 * - midi {number}: the note midi number (IMPORTANT! it can be outside 0 to 127 range)
 * - freq {number}: the frequency using an equal temperament at 440Hz
 *
 * This function *always* returns an object with all this properties, but if it"s
 * not a valid note all properties will be null.
 *
 * The returned object can"t be mutated.
 *
 * @param {string} note - the note name in scientific notation
 * @return {Object} an object with the properties (or an object will all properties
 * set to null if not valid note)
 * @example
 * Note.props("fx-3").name // => "F##-3"
 * Note.props("invalid").name // => null
 * Note.props("C#3").oct // => 3
 * Note.props().oct // => null
 */
var props = memo(properties);

/**
 * Given a note name, return the note name or null if not valid note.
 * The note name will ALWAYS have the letter in upercase and accidentals
 * using # or b
 *
 * Can be used to test if a string is a valid note name.
 *
 * @function
 * @param {Pitch|string}
 * @return {string}
 *
 * @example
 * Note.name("cb2") // => "Cb2"
 * ["c", "db3", "2", "g+", "gx4"].map(Note.name) // => ["C", "Db3", null, null, "G##4"]
 */
var name = function (str) { return props(str).name; };

/**
 * Get pitch class of a note. The note can be a string or a pitch array.
 *
 * @function
 * @param {string|Pitch}
 * @return {string} the pitch class
 * @example
 * Note.pc("Db3") // => "Db"
 * ["db3", "bb6", "fx2"].map(Note.pc) // => [ "Db", "Bb", "F##"]
 */
var pc = function (str) { return props(str).pc; };

var isMidiRange = function (m) { return m >= 0 && m <= 127; };
/**
 * Get the note midi number. It always return a number between 0 and 127
 *
 * @function
 * @param {string|Number} note - the note to get the midi number from
 * @return {Integer} the midi number or null if not valid pitch
 * @example
 * Note.midi("C4") // => 60
 * Note.midi(60) // => 60
 * @see midi.toMidi
 */
var midi = function (note) {
  if (typeof note !== "number" && typeof note !== "string") {
    return null;
  }
  var midi = props(note).midi;
  var value = midi || midi === 0 ? midi : +note;
  return isMidiRange(value) ? value : null;
};

/**
 * Get the frequency from midi number
 *
 * @param {number} midi - the note midi number
 * @param {number} tuning - (Optional) 440 by default
 * @return {number} the frequency or null if not valid note midi
 */
var midiToFreq = function (midi, tuning) {
    if ( tuning === void 0 ) tuning = 440;

    return typeof midi === "number" ? Math.pow(2, (midi - 69) / 12) * tuning : null;
};

/**
 * Get the frequency of a note
 *
 * @function
 * @param {string|Number} note - the note name or midi note number
 * @return {number} the frequency
 * @example
 * Note.freq("A4") // => 440
 * Note.freq(69) // => 440
 */
var freq = function (note) { return props(note).freq || midiToFreq(note); };

var L2 = Math.log(2);
var L440 = Math.log(440);
/**
 * Get the midi number from a frequency in hertz. The midi number can
 * contain decimals (with two digits precission)
 *
 * @param {number} frequency
 * @return {number}
 * @example
 * Note.freqToMidi(220)); //=> 57;
 * Note.freqToMidi(261.62)); //=> 60;
 * Note.freqToMidi(261)); //=> 59.96;
 */
var freqToMidi = function (freq) {
  var v = (12 * (Math.log(freq) - L440)) / L2 + 69;
  return Math.round(v * 100) / 100;
};

/**
 * Return the chroma of a note. The chroma is the numeric equivalent to the
 * pitch class, where 0 is C, 1 is C# or Db, 2 is D... 11 is B
 *
 * @param {string} note - the note name
 * @return {Integer} the chroma number
 * @example
 * Note.chroma("Cb") // => 11
 * ["C", "D", "E", "F"].map(Note.chroma) // => [0, 2, 4, 5]
 */
var chroma = function (str) { return props(str).chroma; };

/**
 * Get the octave of the given pitch
 *
 * @function
 * @param {string} note - the note
 * @return {Integer} the octave or null if doesn"t have an octave or not a valid note
 * @example
 * Note.oct("C#4") // => 4
 * Note.oct("C") // => null
 * Note.oct("blah") // => undefined
 */
var oct = function (str) { return props(str).oct; };

var LETTERS = "CDEFGAB";
/**
 * Given a step number return it's letter (0 = C, 1 = D, 2 = E)
 * @param {number} step
 * @return {string} the letter
 * @example
 * Note.stepToLetter(3) // => "F"
 */
var stepToLetter = function (step) { return LETTERS[step]; };

var fillStr = function (s, n) { return Array(n + 1).join(s); };
var numToStr = function (num, op) { return (typeof num !== "number" ? "" : op(num)); };

/**
 * Given an alteration number, return the accidentals
 * @param {number} alt
 * @return {string}
 * @example
 * Note.altToAcc(-3) // => "bbb"
 */
var altToAcc = function (alt) { return numToStr(alt, function (alt) { return (alt < 0 ? fillStr("b", -alt) : fillStr("#", alt)); }); };

/**
 * Creates a note name in scientific notation from note properties,
 * and optionally another note name.
 * It receives an object with:
 * - step: the note step (0 = C, 1 = D, ... 6 = B)
 * - alt: (optional) the alteration. Negative numbers are flats, positive sharps
 * - oct: (optional) the octave
 *
 * Optionally it receives another note as a "base", meaning that any prop not explicitly
 * received on the first parameter will be taken from that base note. That way it can be used
 * as an immutable "set" operator for a that base note
 *
 * @function
 * @param {Object} props - the note properties
 * @param {string} [baseNote] - note to build the result from. If given, it returns
 * the result of applying the given props to this note.
 * @return {string} the note name in scientific notation or null if not valid properties
 * @example
 * Note.from({ step: 5 }) // => "A"
 * Note.from({ step: 1, acc: -1 }) // => "Db"
 * Note.from({ step: 2, acc: 2, oct: 2 }) // => "E##2"
 * Note.from({ step: 7 }) // => null
 * Note.from({alt: 1, oct: 3}, "C4") // => "C#3"
 */
var from = function (fromProps, baseNote) {
  if ( fromProps === void 0 ) fromProps = {};
  if ( baseNote === void 0 ) baseNote = null;

  var ref = baseNote
    ? Object.assign({}, props(baseNote), fromProps)
    : fromProps;
  var step = ref.step;
  var alt = ref.alt;
  var oct = ref.oct;
  var letter = stepToLetter(step);
  if (!letter) { return null; }
  var pc = letter + altToAcc(alt);
  return oct || oct === 0 ? pc + oct : pc;
};

/**
 * Deprecated. This is kept for backwards compatibility only.
 * Use Note.from instead
 */
var build = from;

/**
 * Given a midi number, returns a note name. The altered notes will have
 * flats unless explicitly set with the optional `useSharps` parameter.
 *
 * @function
 * @param {number} midi - the midi note number
 * @param {boolean} useSharps - (Optional) set to true to use sharps instead of flats
 * @return {string} the note name
 * @example
 * Note.fromMidi(61) // => "Db4"
 * Note.fromMidi(61, true) // => "C#4"
 * // it rounds to nearest note
 * Note.fromMidi(61.7) // => "D4"
 */
function fromMidi(num, sharps) {
  num = Math.round(num);
  var pcs = sharps === true ? SHARPS : FLATS;
  var pc = pcs[num % 12];
  var o = Math.floor(num / 12) - 1;
  return pc + o;
}

/**
 * Simplify the note: find an enhramonic note with less accidentals.
 *
 * @param {string} note - the note to be simplified
 * @param {boolean} useSameAccType - (optional, true by default) set to true
 * to ensure the returned note has the same accidental types that the given note
 * @return {string} the simplfiied note or null if not valid note
 * @example
 * Note.simplify("C##") // => "D"
 * Note.simplify("C###") // => "D#"
 * Note.simplify("C###", false) // => "Eb"
 * Note.simplify("B#4") // => "C5"
 */
var simplify = function (note, sameAcc) {
  var ref = props(note);
  var alt = ref.alt;
  var chroma = ref.chroma;
  var midi = ref.midi;
  if (chroma === null) { return null; }
  var useSharps = sameAcc === false ? alt < 0 : alt > 0;
  return midi === null
    ? pc(fromMidi(chroma, useSharps))
    : fromMidi(midi, useSharps);
};

/**
 * Get the simplified and enhramonic note of the given one.
 *
 * @param {string} note
 * @return {string} the enhramonic note
 * @example
 * Note.enharmonic("Db") // => "C#"
 * Note.enhramonic("C") // => "C"
 */
var enharmonic = function (note) { return simplify(note, false); };

var Note = /*#__PURE__*/Object.freeze({
  names: names,
  tokenize: tokenize,
  props: props,
  name: name,
  pc: pc,
  midi: midi,
  midiToFreq: midiToFreq,
  freq: freq,
  freqToMidi: freqToMidi,
  chroma: chroma,
  oct: oct,
  stepToLetter: stepToLetter,
  altToAcc: altToAcc,
  from: from,
  build: build,
  fromMidi: fromMidi,
  simplify: simplify,
  enharmonic: enharmonic
});

/**
 * Convert note strings between ABC and scientific notation
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * @example
 * const Tonal = require('tonal')
 * Tonal.Abc.toNote("c") // => "C5"
 * Tonal.Abc.toAbc("Db2") // =>  "_D,,"
 *
 * @example
 * const { Abc } = require('tonal')
 * const Abc = require('tonal/abc-notation')
 * const { toAbc }= require('tonal/abc-notation')
 *
 * @example
 * import { Abc } from 'tonal'
 * import * as Abc from "tonal/abc-notation"
 * import { toAbc } from "tonal/abc-notation"
 *
 * @module Abc
 */

var REGEX$1 = /^(_{1,}|=|\^{1,}|)([abcdefgABCDEFG])([,']*)$/;
var fillStr$1 = function (s, n) { return Array(n + 1).join(s); };

function tokenize$1(str) {
  var m = REGEX$1.exec(str);
  if (!m) { return ["", "", ""]; }
  return [m[1], m[2], m[3]];
}

/**
 * Convert a (string) note in ABC notation into a (string) note in scientific notation
 *
 * @function
 * @param {string} abcNote - the note in ABC notation
 * @return {string} the note in scientific notation of null if not valid
 *
 * @example
 * Abc.toNote("c") // => "C5"
 */
function toNote(str) {
  var ref = tokenize$1(str);
  var acc = ref[0];
  var letter = ref[1];
  var oct = ref[2];
  if (letter === "") { return null; }
  var o = 4;
  for (var i = 0; i < oct.length; i++) { o += oct[i] === "," ? -1 : 1; }
  var a =
    acc[0] === "_"
      ? acc.replace(/_/g, "b")
      : acc[0] === "^"
      ? acc.replace(/\^/g, "#")
      : "";
  return letter.charCodeAt(0) > 96
    ? letter.toUpperCase() + a + (o + 1)
    : letter + a + o;
}

/**
 * Convert a (string) note in scientific notation into a (string) note in ABC notation
 *
 * @function
 * @param {string} note - a note in scientific notation
 * @return {string} the note in ABC notation or null if not valid note
 *
 * @example
 * Abc.toAbc("C#4") // => "^C"
 */
function toAbc(str) {
  var ref = props(str);
  var letter = ref.letter;
  var acc = ref.acc;
  var oct = ref.oct;
  var a = acc[0] === "b" ? acc.replace(/b/g, "_") : acc.replace(/#/g, "^");
  var l = oct > 4 ? letter.toLowerCase() : letter;
  var o =
    oct === 5 ? "" : oct > 4 ? fillStr$1("'", oct - 5) : fillStr$1(",", 4 - oct);
  return a + l + o;
}

var Abc = /*#__PURE__*/Object.freeze({
  tokenize: tokenize$1,
  toNote: toNote,
  toAbc: toAbc
});

/**
 * [![tonal](https://img.shields.io/badge/tonal-array-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * Tonal array utilities. Sort notes by pitch, remove duplicates,
 * create ranges with notes or numbers and
 *
 * ## Usage
 *
 * ```js
 * // ES6 modules (babel, webpack, ...)
 * import * as Array from 'tonal/array';
 * Array.sort(["f", "a", "c"])
 *
 * // CommonJS modules (node)
 * const { Array } = require("tonal")
 * Array.range(1, 4)
 *
 * // Browser
 * Tonal.Array.range(1, 4)
 * ```
 *
 * ## API
 *
 * @module Array
 */

// ascending range
function ascR(b, n) {
  for (var a = []; n--; a[n] = n + b){ }
  return a;
}
// descending range
function descR(b, n) {
  for (var a = []; n--; a[n] = b - n){ }
  return a;
}

/**
 * Create a numeric range
 *
 * @param {number} from
 * @param {number} to
 * @return {Array<number>}
 *
 * @example
 * Array.range(-2, 2) // => [-2, -1, 0, 1, 2]
 * Array.range(2, -2) // => [2, 1, 0, -1, -2]
 */
function range(a, b) {
  return a === null || b === null
    ? []
    : a < b
    ? ascR(a, b - a + 1)
    : descR(a, a - b + 1);
}

/**
 *
 * Rotates a list a number of times. It"s completly agnostic about the
 * contents of the list.
 *
 * @param {Integer} times - the number of rotations
 * @param {Array} array
 * @return {Array} the rotated array
 *
 * @example
 * Array.rotate(1, [1, 2, 3]) // => [2, 3, 1]
 */
function rotate(times, arr) {
  var len = arr.length;
  var n = ((times % len) + len) % len;
  return arr.slice(n, len).concat(arr.slice(0, n));
}

/**
 * Return a copy of the array with the null values removed
 * @function
 * @param {Array} array
 * @return {Array}
 *
 * @example
 * Array.compact(["a", "b", null, "c"]) // => ["a", "b", "c"]
 */
var compact = function (arr) { return arr.filter(function (n) { return n === 0 || n; }); };

// a function that get note heights (with negative number for pitch classes)
var height = function (name) {
  var m = props(name).midi;
  return m !== null ? m : props(name + "-100").midi;
};

/**
 * Sort an array of notes in ascending order. Pitch classes are listed
 * before notes. Any string that is not a note is removed.
 *
 * @param {Array<string>} notes
 * @return {Array<string>} sorted array of notes
 *
 * @example
 * Array.sort(['c2', 'c5', 'c1', 'c0', 'c6', 'c'])
 * // => ['C', 'C0', 'C1', 'C2', 'C5', 'C6']
 * Array.sort(['c', 'F', 'G', 'a', 'b', 'h', 'J'])
 * // => ['C', 'F', 'G', 'A', 'B']
 */
function sort(src) {
  return compact(src.map(name)).sort(function (a, b) { return height(a) > height(b); });
}

/**
 * Get sorted notes with duplicates removed. Pitch classes are listed
 * before notes.
 *
 * @function
 * @param {Array<string>} array
 * @return {Array<string>} unique sorted notes
 *
 * @example
 * Array.unique(['a', 'b', 'c2', '1p', 'p2', 'c2', 'b', 'c', 'c3' ])
 * // => [ 'C', 'A', 'B', 'C2', 'C3' ]
 */
function unique(arr) {
  return sort(arr).filter(function (n, i, a) { return i === 0 || n !== a[i - 1]; });
}

/**
 * Randomizes the order of the specified array in-place, using the Fisher–Yates shuffle.
 *
 * @function
 * @param {Array} array
 * @return {Array} the array shuffled
 *
 * @example
 * Array.shuffle(["C", "D", "E", "F"]) // => [...]
 */
var shuffle = function (arr, rnd) {
  if ( rnd === void 0 ) rnd = Math.random;

  var i, t;
  var m = arr.length;
  while (m) {
    i = (rnd() * m--) | 0;
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
};

/**
 * Get all permutations of an array
 * http://stackoverflow.com/questions/9960908/permutations-in-javascript
 *
 * @param {Array} array - the array
 * @return {Array<Array>} an array with all the permutations
 * @example
 * Array.permutations(["a", "b", "c"])) // =>
 * [
 *   ["a", "b", "c"],
 *   ["b", "a", "c"],
 *   ["b", "c", "a"],
 *   ["a", "c", "b"],
 *   ["c", "a", "b"],
 *   ["c", "b", "a"]
 * ]
 *
 */
var permutations = function (arr) {
  if (arr.length === 0) { return [[]]; }
  return permutations(arr.slice(1)).reduce(function(acc, perm) {
    return acc.concat(
      arr.map(function(e, pos) {
        var newPerm = perm.slice();
        newPerm.splice(pos, 0, arr[0]);
        return newPerm;
      })
    );
  }, []);
};

var Array$1 = /*#__PURE__*/Object.freeze({
  range: range,
  rotate: rotate,
  compact: compact,
  sort: sort,
  unique: unique,
  shuffle: shuffle,
  permutations: permutations
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-interval.svg)](https://www.npmjs.com/package/tonal-interval)
 * [![tonal](https://img.shields.io/badge/tonal-interval-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-interval` is a collection of functions to create and manipulate music intervals.
 *
 * The intervals are strings in shorthand notation. Two variations are supported:
 *
 * - standard shorthand notation: type and number, for example: "M3", "d-4"
 * - inverse shorthand notation: number and then type, for example: "3M", "-4d"
 *
 * The problem with the standard shorthand notation is that some strings can be
 * parsed as notes or intervals, for example: "A4" can be note A in 4th octave
 * or an augmented four. To remove ambiguity, the prefered notation in tonal is the
 * inverse shortand notation.
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * // es6
 * import * as Interval from "tonal-interval"
 * // es5
 * const Interval = require("tonal-interval")
 * // part of tonal
 * import { Interval } from "tonal"
 *
 * Interval.semitones("4P") // => 5
 * Interval.invert("3m") // => "6M"
 * Interval.simplify("9m") // => "2m"
 * ```
 *
 * ## Install
 *
 * [![npm install tonal-interval](https://nodei.co/npm/tonal-interval.png?mini=true)](https://npmjs.org/package/tonal-interval/)
 *
 * ## API Documentation
 *
 * @module Interval
 */
// shorthand tonal notation (with quality after number)
var IVL_TNL = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
// standard shorthand notation (with quality before number)
var IVL_STR = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
var REGEX$2 = new RegExp("^" + IVL_TNL + "|" + IVL_STR + "$");
var SIZES = [0, 2, 4, 5, 7, 9, 11];
var TYPES = "PMMPPMM";
var CLASSES = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
var NAMES$1 = "1P 2m 2M 3m 3M 4P 5P 6m 6M 7m 7M 8P".split(" ");

/**
 * List basic (perfect, major, minor) interval names within a octave
 * @param {string} qualities - (Optional, default "PMm") the valid types
 * @return {Array} the interval names
 * @example
 * Interval.names() // => [ "1P", "2m", "2M", "3m", "3M", "4P", "5P", "6m", "6M", "7m", "7M", "8P" ]
 * Interval.names("P") // => [ "1P", "4P", "5P", "8P" ]
 * Interval.names("PM") // => [ "1P", "2M", "3M", "4P", "5P", "6M", "7M", "8P" ]
 * Interval.names("Pm") // => [ "1P", "2m", "3m", "4P", "5P", "6m", "7m", "8P" ]
 * Interval.names("d") // => []
 */
var names$1 = function (types) { return typeof types !== "string"
    ? NAMES$1.slice()
    : NAMES$1.filter(function (n) { return types.indexOf(n[1]) !== -1; }); };

var tokenize$2 = function (str) {
  var m = REGEX$2.exec(str);
  return m === null ? null : m[1] ? [m[1], m[2]] : [m[4], m[3]];
};

var NO_IVL = Object.freeze({
  name: null,
  num: null,
  q: null,
  step: null,
  alt: null,
  dir: null,
  type: null,
  simple: null,
  semitones: null,
  chroma: null
});

var fillStr$2 = function (s, n) { return Array(Math.abs(n) + 1).join(s); };

var qToAlt = function (type, q) {
  if (q === "M" && type === "M") { return 0; }
  if (q === "P" && type === "P") { return 0; }
  if (q === "m" && type === "M") { return -1; }
  if (/^A+$/.test(q)) { return q.length; }
  if (/^d+$/.test(q)) { return type === "P" ? -q.length : -q.length - 1; }
  return null;
};

var altToQ = function (type, alt) {
  if (alt === 0) { return type === "M" ? "M" : "P"; }
  else if (alt === -1 && type === "M") { return "m"; }
  else if (alt > 0) { return fillStr$2("A", alt); }
  else if (alt < 0) { return fillStr$2("d", type === "P" ? alt : alt + 1); }
  else { return null; }
};

var numToStep = function (num) { return (Math.abs(num) - 1) % 7; };

var properties$1 = function (str) {
  var t = tokenize$2(str);
  if (t === null) { return NO_IVL; }
  var p = { num: +t[0], q: t[1] };
  p.step = numToStep(p.num);
  p.type = TYPES[p.step];
  if (p.type === "M" && p.q === "P") { return NO_IVL; }

  p.name = "" + p.num + p.q;
  p.dir = p.num < 0 ? -1 : 1;
  p.simple = p.num === 8 || p.num === -8 ? p.num : p.dir * (p.step + 1);
  p.alt = qToAlt(p.type, p.q);
  p.oct = Math.floor((Math.abs(p.num) - 1) / 7);
  p.semitones = p.dir * (SIZES[p.step] + p.alt + 12 * p.oct);
  p.chroma = (((p.dir * (SIZES[p.step] + p.alt)) % 12) + 12) % 12;
  return Object.freeze(p);
};

var cache = {};
/**
 * Get interval properties. It returns an object with:
 *
 * - name: name
 * - num: number
 * - q: quality
 * - step: step
 * - alt: alteration
 * - dir: direction (1 ascending, -1 descending)
 * - type: "P" or "M" for perfectable or majorable
 * - simple: the simplified number
 * - semitones: the size in semitones
 * - chroma: the interval chroma
 * - ic: the interval class
 *
 * @function
 * @param {string} interval - the interval
 * @return {Object} the interval in the form [number, alt]
 */
function props$1(str) {
  if (typeof str !== "string") { return NO_IVL; }
  return cache[str] || (cache[str] = properties$1(str));
}

/**
 * Get the number of the interval
 *
 * @function
 * @param {string} interval - the interval
 * @return {Integer}
 * @example
 * Interval.num("m2") // => 2
 * Interval.num("P9") // => 9
 * Interval.num("P-4") // => -4
 */
var num = function (str) { return props$1(str).num; };

/**
 * Get interval name. Can be used to test if it"s an interval. It accepts intervals
 * as pitch or string in shorthand notation or tonal notation. It returns always
 * intervals in tonal notation.
 *
 * @function
 * @param {string} interval - the interval string or array
 * @return {string} the interval name or null if not valid interval
 * @example
 * Interval.name("m-3") // => "-3m"
 * Interval.name("3") // => null
 */
var name$1 = function (str) { return props$1(str).name; };

/**
 * Get size in semitones of an interval
 *
 * @function
 * @param {string} ivl
 * @return {Integer} the number of semitones or null if not an interval
 * @example
 * import { semitones } from "tonal-interval"
 * semitones("P4") // => 5
 * // or using tonal
 * Tonal.Interval.semitones("P5") // => 7
 */
var semitones = function (str) { return props$1(str).semitones; };

/**
 * Get the chroma of the interval. The chroma is a number between 0 and 7
 * that represents the position within an octave (pitch set)
 *
 * @function
 * @param {string} str
 * @return {number}
 */
var chroma$1 = function (str) { return props$1(str).chroma; };

/**
 * Get the [interval class](https://en.wikipedia.org/wiki/Interval_class)
 * number of a given interval.
 *
 * In musical set theory, an interval class is the shortest distance in
 * pitch class space between two unordered pitch classes
 *
 * @function
 * @param {String|Integer} interval - the interval or the number of semitones
 * @return {Integer} A value between 0 and 6
 *
 * @example
 * Interval.ic("P8") // => 0
 * Interval.ic("m6") // => 4
 * Interval.ic(10) // => 2
 * ["P1", "M2", "M3", "P4", "P5", "M6", "M7"].map(ic) // => [0, 2, 4, 5, 5, 3, 1]
 */
var ic = function (ivl) {
  if (typeof ivl === "string") { ivl = props$1(ivl).chroma; }
  return typeof ivl === "number" ? CLASSES[ivl % 12] : null;
};

/**
 * Given a interval property object, get the interval name
 *
 * The properties must contain a `num` *or* `step`, and `alt`:
 *
 * - num: the interval number
 * - step: the interval step (overrides the num property)
 * - alt: the interval alteration
 * - oct: (Optional) the number of octaves
 * - dir: (Optional) the direction
 *
 * @function
 * @param {Object} props - the interval property object
 *
 * @return {string} the interval name
 * @example
 * Interval.build({ step: 1, alt: -1, oct: 0, dir: 1 }) // => "1d"
 * Interval.build({ num: 9, alt: -1 }) // => "9m"
 */
var build$1 = function (ref) {
  if ( ref === void 0 ) ref = {};
  var num = ref.num;
  var step = ref.step;
  var alt = ref.alt;
  var oct = ref.oct; if ( oct === void 0 ) oct = 1;
  var dir = ref.dir;

  if (step !== undefined) { num = step + 1 + 7 * oct; }
  if (num === undefined) { return null; }

  var d = dir < 0 ? "-" : "";
  var type = TYPES[numToStep(num)];
  return d + num + altToQ(type, alt);
};

/**
 * Get the simplified version of an interval.
 *
 * @function
 * @param {string} interval - the interval to simplify
 * @return {string} the simplified interval
 *
 * @example
 * Interval.simplify("9M") // => "2M"
 * ["8P", "9M", "10M", "11P", "12P", "13M", "14M", "15P"].map(Interval.simplify)
 * // => [ "8P", "2M", "3M", "4P", "5P", "6M", "7M", "8P" ]
 * Interval.simplify("2M") // => "2M"
 * Interval.simplify("-2M") // => "7m"
 */
var simplify$1 = function (str) {
  var p = props$1(str);
  if (p === NO_IVL) { return null; }
  return p.simple + p.q;
};

/**
 * Get the inversion (https://en.wikipedia.org/wiki/Inversion_(music)#Intervals)
 * of an interval.
 *
 * @function
 * @param {string} interval - the interval to invert in interval shorthand
 * notation or interval array notation
 * @return {string} the inverted interval
 *
 * @example
 * Interval.invert("3m") // => "6M"
 * Interval.invert("2M") // => "7m"
 */
var invert = function (str) {
  var p = props$1(str);
  if (p === NO_IVL) { return null; }
  var step = (7 - p.step) % 7;
  var alt = p.type === "P" ? -p.alt : -(p.alt + 1);
  return build$1({ step: step, alt: alt, oct: p.oct, dir: p.dir });
};

// interval numbers
var IN = [1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7];
// interval qualities
var IQ = "P m M m M P d P m M m M".split(" ");

/**
 * Get interval name from semitones number. Since there are several interval
 * names for the same number, the name it"s arbitraty, but deterministic.
 *
 * @function
 * @param {Integer} num - the number of semitones (can be negative)
 * @return {string} the interval name
 * @example
 * import { fromSemitones } from "tonal-interval"
 * fromSemitones(7) // => "5P"
 * // or using tonal
 * Tonal.Distance.fromSemitones(-7) // => "-5P"
 */
var fromSemitones = function (num) {
  var d = num < 0 ? -1 : 1;
  var n = Math.abs(num);
  var c = n % 12;
  var o = Math.floor(n / 12);
  return d * (IN[c] + 7 * o) + IQ[c];
};

var Interval = /*#__PURE__*/Object.freeze({
  names: names$1,
  tokenize: tokenize$2,
  props: props$1,
  num: num,
  name: name$1,
  semitones: semitones,
  chroma: chroma$1,
  ic: ic,
  build: build$1,
  simplify: simplify$1,
  invert: invert,
  fromSemitones: fromSemitones
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-distance.svg)](https://www.npmjs.com/package/tonal-distance)
 * [![tonal](https://img.shields.io/badge/tonal-distance-yellow.svg)](https://github.com/danigb/tonal/tree/master/packages/tonal/distance)
 *
 * Transpose notes by intervals and find distances between notes
 *
 * @example
 * // es6
 * import * as Distance from "tonal-distance"
 * Distance.interval("C3", "C4") // => "1P"
 *
 * @example
 * // es6 import selected functions
 * import { interval, semitones, transpose } from "tonal-distance"
 *
 * semitones("C" ,"D") // => 2
 * interval("C4", "G4") // => "5P"
 * transpose("C4", "P5") // => "G4"
 *
 * @example
 * // included in tonal facade
 * const Tonal = require("tonal");
 * Tonal.Distance.transpose("C4", "P5")
 * Tonal.Distance.transposeBy("P5", "C4")
 *
 * @module Distance
 */

// Map from letter step to number of fifths starting from "C":
// { C: 0, D: 2, E: 4, F: -1, G: 1, A: 3, B: 5 }
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];

// Given a number of fifths, return the octaves they span
var fOcts = function (f) { return Math.floor((f * 7) / 12); };

// Get the number of octaves it span each step
var FIFTH_OCTS = FIFTHS.map(fOcts);

var encode = function (ref) {
  var step = ref.step;
  var alt = ref.alt;
  var oct = ref.oct;
  var dir = ref.dir; if ( dir === void 0 ) dir = 1;

  var f = FIFTHS[step] + 7 * alt;
  if (oct === null) { return [dir * f]; }
  var o = oct - FIFTH_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
};

// We need to get the steps from fifths
// Fifths for CDEFGAB are [ 0, 2, 4, -1, 1, 3, 5 ]
// We add 1 to fifths to avoid negative numbers, so:
// for ["F", "C", "G", "D", "A", "E", "B"] we have:
var STEPS = [3, 0, 4, 1, 5, 2, 6];

// Return the number of fifths as if it were unaltered
function unaltered(f) {
  var i = (f + 1) % 7;
  return i < 0 ? 7 + i : i;
}

var decode = function (f, o, dir) {
  var step = STEPS[unaltered(f)];
  var alt = Math.floor((f + 1) / 7);
  if (o === undefined) { return { step: step, alt: alt, dir: dir }; }
  var oct = o + 4 * alt + FIFTH_OCTS[step];
  return { step: step, alt: alt, oct: oct, dir: dir };
};

var memo$1 = function (fn, cache) {
  if ( cache === void 0 ) cache = {};

  return function (str) { return cache[str] || (cache[str] = fn(str)); };
};

var encoder = function (props) { return memo$1(function (str) {
    var p = props(str);
    return p.name === null ? null : encode(p);
  }); };

var encodeNote = encoder(props);
var encodeIvl = encoder(props$1);

/**
 * Transpose a note by an interval. The note can be a pitch class.
 *
 * This function can be partially applied.
 *
 * @param {string} note
 * @param {string} interval
 * @return {string} the transposed note
 * @example
 * import { tranpose } from "tonal-distance"
 * transpose("d3", "3M") // => "F#3"
 * // it works with pitch classes
 * transpose("D", "3M") // => "F#"
 * // can be partially applied
 * ["C", "D", "E", "F", "G"].map(transpose("M3)) // => ["E", "F#", "G#", "A", "B"]
 */
function transpose(note, interval) {
  if (arguments.length === 1) { return function (i) { return transpose(note, i); }; }
  var n = encodeNote(note);
  var i = encodeIvl(interval);
  if (n === null || i === null) { return null; }
  var tr = n.length === 1 ? [n[0] + i[0]] : [n[0] + i[0], n[1] + i[1]];
  return build(decode(tr[0], tr[1]));
}

/**
 * Transpose a pitch class by a number of perfect fifths.
 *
 * It can be partially applied.
 *
 * @function
 * @param {string} pitchClass - the pitch class
 * @param {Integer} fifhts - the number of fifths
 * @return {string} the transposed pitch class
 *
 * @example
 * import { trFifths } from "tonal-transpose"
 * [0, 1, 2, 3, 4].map(trFifths("C")) // => ["C", "G", "D", "A", "E"]
 * // or using tonal
 * Distance.trFifths("G4", 1) // => "D"
 */

function trFifths(note, fifths) {
  if (arguments.length === 1) { return function (f) { return trFifths(note, f); }; }
  var n = encodeNote(note);
  if (n === null) { return null; }
  return build(decode(n[0] + fifths));
}

/**
 * Get the distance in fifths between pitch classes
 *
 * Can be partially applied.
 *
 * @param {string} to - note or pitch class
 * @param {string} from - note or pitch class
 */
function fifths(from, to) {
  if (arguments.length === 1) { return function (to) { return fifths(from, to); }; }
  var f = encodeNote(from);
  var t = encodeNote(to);
  if (t === null || f === null) { return null; }
  return t[0] - f[0];
}

/**
 * The same as transpose with the arguments inverted.
 *
 * Can be partially applied.
 *
 * @param {string} note
 * @param {string} interval
 * @return {string} the transposed note
 * @example
 * import { tranposeBy } from "tonal-distance"
 * transposeBy("3m", "5P") // => "7m"
 */
function transposeBy(interval, note) {
  if (arguments.length === 1) { return function (n) { return transpose(n, interval); }; }
  return transpose(note, interval);
}

var isDescending = function (e) { return e[0] * 7 + e[1] * 12 < 0; };
var decodeIvl = function (i) { return isDescending(i) ? decode(-i[0], -i[1], -1) : decode(i[0], i[1], 1); };

function addIntervals(ivl1, ivl2, dir) {
  var i1 = encodeIvl(ivl1);
  var i2 = encodeIvl(ivl2);
  if (i1 === null || i2 === null) { return null; }
  var i = [i1[0] + dir * i2[0], i1[1] + dir * i2[1]];
  return build$1(decodeIvl(i));
}

/**
 * Add two intervals
 *
 * Can be partially applied.
 *
 * @param {string} interval1
 * @param {string} interval2
 * @return {string} the resulting interval
 * @example
 * import { add } from "tonal-distance"
 * add("3m", "5P") // => "7m"
 */
function add(ivl1, ivl2) {
  if (arguments.length === 1) { return function (i2) { return add(ivl1, i2); }; }
  return addIntervals(ivl1, ivl2, 1);
}

/**
 * Subtract two intervals
 *
 * Can be partially applied
 *
 * @param {string} minuend
 * @param {string} subtrahend
 * @return {string} interval diference
 */
function subtract(ivl1, ivl2) {
  if (arguments.length === 1) { return function (i2) { return add(ivl1, i2); }; }
  return addIntervals(ivl1, ivl2, -1);
}

/**
 * Find the interval between two pitches. It works with pitch classes
 * (both must be pitch classes and the interval is always ascending)
 *
 * Can be partially applied
 *
 * @param {string} from - distance from
 * @param {string} to - distance to
 * @return {string} the interval distance
 *
 * @example
 * import { interval } from "tonal-distance"
 * interval("C2", "C3") // => "P8"
 * interval("G", "B") // => "M3"
 *
 * @example
 * import * as Distance from "tonal-distance"
 * Distance.interval("M2", "P5") // => "P4"
 */
function interval(from, to) {
  if (arguments.length === 1) { return function (t) { return interval(from, t); }; }
  var f = encodeNote(from);
  var t = encodeNote(to);
  if (f === null || t === null || f.length !== t.length) { return null; }
  var d =
    f.length === 1
      ? [t[0] - f[0], -Math.floor(((t[0] - f[0]) * 7) / 12)]
      : [t[0] - f[0], t[1] - f[1]];
  return build$1(decodeIvl(d));
}

/**
 * Get the distance between two notes in semitones
 *
 * @param {String|Pitch} from - first note
 * @param {String|Pitch} to - last note
 * @return {Integer} the distance in semitones or null if not valid notes
 * @example
 * import { semitones } from "tonal-distance"
 * semitones("C3", "A2") // => -3
 * // or use tonal
 * Tonal.Distance.semitones("C3", "G3") // => 7
 */
function semitones$1(from, to) {
  if (arguments.length === 1) { return function (t) { return semitones$1(from, t); }; }
  var f = props(from);
  var t = props(to);
  return f.midi !== null && t.midi !== null
    ? t.midi - f.midi
    : f.chroma !== null && t.chroma !== null
    ? (t.chroma - f.chroma + 12) % 12
    : null;
}

var Distance = /*#__PURE__*/Object.freeze({
  transpose: transpose,
  trFifths: trFifths,
  fifths: fifths,
  transposeBy: transposeBy,
  addIntervals: addIntervals,
  add: add,
  subtract: subtract,
  interval: interval,
  semitones: semitones$1
});

var chromatic = [
	"1P 2m 2M 3m 3M 4P 4A 5P 6m 6M 7m 7M"
];
var lydian = [
	"1P 2M 3M 4A 5P 6M 7M"
];
var major = [
	"1P 2M 3M 4P 5P 6M 7M",
	[
		"ionian"
	]
];
var mixolydian = [
	"1P 2M 3M 4P 5P 6M 7m",
	[
		"dominant"
	]
];
var dorian = [
	"1P 2M 3m 4P 5P 6M 7m"
];
var aeolian = [
	"1P 2M 3m 4P 5P 6m 7m",
	[
		"minor"
	]
];
var phrygian = [
	"1P 2m 3m 4P 5P 6m 7m"
];
var locrian = [
	"1P 2m 3m 4P 5d 6m 7m"
];
var altered = [
	"1P 2m 3m 3M 5d 6m 7m",
	[
		"super locrian",
		"diminished whole tone",
		"pomeroy"
	]
];
var diminished = [
	"1P 2M 3m 4P 5d 6m 6M 7M",
	[
		"whole-half diminished"
	]
];
var iwato = [
	"1P 2m 4P 5d 7m"
];
var hirajoshi = [
	"1P 2M 3m 5P 6m"
];
var kumoijoshi = [
	"1P 2m 4P 5P 6m"
];
var pelog = [
	"1P 2m 3m 5P 6m"
];
var prometheus = [
	"1P 2M 3M 4A 6M 7m"
];
var ritusen = [
	"1P 2M 4P 5P 6M"
];
var scriabin = [
	"1P 2m 3M 5P 6M"
];
var piongio = [
	"1P 2M 4P 5P 6M 7m"
];
var augmented = [
	"1P 2A 3M 5P 5A 7M"
];
var neopolitan = [
	"1P 2m 3m 4P 5P 6m 7M"
];
var egyptian = [
	"1P 2M 4P 5P 7m"
];
var oriental = [
	"1P 2m 3M 4P 5d 6M 7m"
];
var flamenco = [
	"1P 2m 3m 3M 4A 5P 7m"
];
var balinese = [
	"1P 2m 3m 4P 5P 6m 7M"
];
var persian = [
	"1P 2m 3M 4P 5d 6m 7M"
];
var bebop = [
	"1P 2M 3M 4P 5P 6M 7m 7M"
];
var enigmatic = [
	"1P 2m 3M 5d 6m 7m 7M"
];
var ichikosucho = [
	"1P 2M 3M 4P 5d 5P 6M 7M"
];
var sdata = {
	chromatic: chromatic,
	lydian: lydian,
	major: major,
	mixolydian: mixolydian,
	dorian: dorian,
	aeolian: aeolian,
	phrygian: phrygian,
	locrian: locrian,
	"melodic minor": [
	"1P 2M 3m 4P 5P 6M 7M"
],
	"melodic minor second mode": [
	"1P 2m 3m 4P 5P 6M 7m"
],
	"lydian augmented": [
	"1P 2M 3M 4A 5A 6M 7M"
],
	"lydian dominant": [
	"1P 2M 3M 4A 5P 6M 7m",
	[
		"lydian b7"
	]
],
	"melodic minor fifth mode": [
	"1P 2M 3M 4P 5P 6m 7m",
	[
		"hindu",
		"mixolydian b6M"
	]
],
	"locrian #2": [
	"1P 2M 3m 4P 5d 6m 7m",
	[
		"half-diminished"
	]
],
	altered: altered,
	"harmonic minor": [
	"1P 2M 3m 4P 5P 6m 7M"
],
	"phrygian dominant": [
	"1P 2m 3M 4P 5P 6m 7m",
	[
		"spanish",
		"phrygian major"
	]
],
	"half-whole diminished": [
	"1P 2m 3m 3M 4A 5P 6M 7m",
	[
		"dominant diminished"
	]
],
	diminished: diminished,
	"major pentatonic": [
	"1P 2M 3M 5P 6M",
	[
		"pentatonic"
	]
],
	"lydian pentatonic": [
	"1P 3M 4A 5P 7M",
	[
		"chinese"
	]
],
	"mixolydian pentatonic": [
	"1P 3M 4P 5P 7m",
	[
		"indian"
	]
],
	"locrian pentatonic": [
	"1P 3m 4P 5d 7m",
	[
		"minor seven flat five pentatonic"
	]
],
	"minor pentatonic": [
	"1P 3m 4P 5P 7m"
],
	"minor six pentatonic": [
	"1P 3m 4P 5P 6M"
],
	"minor hexatonic": [
	"1P 2M 3m 4P 5P 7M"
],
	"flat three pentatonic": [
	"1P 2M 3m 5P 6M",
	[
		"kumoi"
	]
],
	"flat six pentatonic": [
	"1P 2M 3M 5P 6m"
],
	"major flat two pentatonic": [
	"1P 2m 3M 5P 6M"
],
	"whole tone pentatonic": [
	"1P 3M 5d 6m 7m"
],
	"ionian pentatonic": [
	"1P 3M 4P 5P 7M"
],
	"lydian #5P pentatonic": [
	"1P 3M 4A 5A 7M"
],
	"lydian dominant pentatonic": [
	"1P 3M 4A 5P 7m"
],
	"minor #7M pentatonic": [
	"1P 3m 4P 5P 7M"
],
	"super locrian pentatonic": [
	"1P 3m 4d 5d 7m"
],
	"in-sen": [
	"1P 2m 4P 5P 7m"
],
	iwato: iwato,
	hirajoshi: hirajoshi,
	kumoijoshi: kumoijoshi,
	pelog: pelog,
	"vietnamese 1": [
	"1P 3m 4P 5P 6m"
],
	"vietnamese 2": [
	"1P 3m 4P 5P 7m"
],
	prometheus: prometheus,
	"prometheus neopolitan": [
	"1P 2m 3M 4A 6M 7m"
],
	ritusen: ritusen,
	scriabin: scriabin,
	piongio: piongio,
	"major blues": [
	"1P 2M 3m 3M 5P 6M"
],
	"minor blues": [
	"1P 3m 4P 5d 5P 7m",
	[
		"blues"
	]
],
	"composite blues": [
	"1P 2M 3m 3M 4P 5d 5P 6M 7m"
],
	augmented: augmented,
	"augmented heptatonic": [
	"1P 2A 3M 4P 5P 5A 7M"
],
	"dorian #4": [
	"1P 2M 3m 4A 5P 6M 7m"
],
	"lydian diminished": [
	"1P 2M 3m 4A 5P 6M 7M"
],
	"whole tone": [
	"1P 2M 3M 4A 5A 7m"
],
	"leading whole tone": [
	"1P 2M 3M 4A 5A 7m 7M"
],
	"lydian minor": [
	"1P 2M 3M 4A 5P 6m 7m"
],
	"locrian major": [
	"1P 2M 3M 4P 5d 6m 7m",
	[
		"arabian"
	]
],
	neopolitan: neopolitan,
	"neopolitan minor": [
	"1P 2m 3m 4P 5P 6m 7M"
],
	"neopolitan major": [
	"1P 2m 3m 4P 5P 6M 7M",
	[
		"dorian b2"
	]
],
	"neopolitan major pentatonic": [
	"1P 3M 4P 5d 7m"
],
	"romanian minor": [
	"1P 2M 3m 5d 5P 6M 7m"
],
	"double harmonic lydian": [
	"1P 2m 3M 4A 5P 6m 7M"
],
	"harmonic major": [
	"1P 2M 3M 4P 5P 6m 7M"
],
	"double harmonic major": [
	"1P 2m 3M 4P 5P 6m 7M",
	[
		"gypsy"
	]
],
	egyptian: egyptian,
	"hungarian minor": [
	"1P 2M 3m 4A 5P 6m 7M"
],
	"hungarian major": [
	"1P 2A 3M 4A 5P 6M 7m"
],
	oriental: oriental,
	"spanish heptatonic": [
	"1P 2m 3m 3M 4P 5P 6m 7m"
],
	flamenco: flamenco,
	balinese: balinese,
	"todi raga": [
	"1P 2m 3m 4A 5P 6m 7M"
],
	"malkos raga": [
	"1P 3m 4P 6m 7m"
],
	"kafi raga": [
	"1P 3m 3M 4P 5P 6M 7m 7M"
],
	"purvi raga": [
	"1P 2m 3M 4P 4A 5P 6m 7M"
],
	persian: persian,
	bebop: bebop,
	"bebop dominant": [
	"1P 2M 3M 4P 5P 6M 7m 7M"
],
	"bebop minor": [
	"1P 2M 3m 3M 4P 5P 6M 7m"
],
	"bebop major": [
	"1P 2M 3M 4P 5P 5A 6M 7M"
],
	"bebop locrian": [
	"1P 2m 3m 4P 5d 5P 6m 7m"
],
	"minor bebop": [
	"1P 2M 3m 4P 5P 6m 7m 7M"
],
	"mystery #1": [
	"1P 2m 3M 5d 6m 7m"
],
	enigmatic: enigmatic,
	"minor six diminished": [
	"1P 2M 3m 4P 5P 6m 6M 7M"
],
	"ionian augmented": [
	"1P 2M 3M 4P 5A 6M 7M"
],
	"lydian #9": [
	"1P 2m 3M 4A 5P 6M 7M"
],
	ichikosucho: ichikosucho,
	"six tone symmetric": [
	"1P 2m 3M 4P 5A 6M"
]
};

var M = [
	"1P 3M 5P",
	[
		"Major",
		""
	]
];
var M13 = [
	"1P 3M 5P 7M 9M 13M",
	[
		"maj13",
		"Maj13"
	]
];
var M6 = [
	"1P 3M 5P 13M",
	[
		"6"
	]
];
var M69 = [
	"1P 3M 5P 6M 9M",
	[
		"69"
	]
];
var M7add13 = [
	"1P 3M 5P 6M 7M 9M"
];
var M7b5 = [
	"1P 3M 5d 7M"
];
var M7b6 = [
	"1P 3M 6m 7M"
];
var M7b9 = [
	"1P 3M 5P 7M 9m"
];
var M7sus4 = [
	"1P 4P 5P 7M"
];
var M9 = [
	"1P 3M 5P 7M 9M",
	[
		"maj9",
		"Maj9"
	]
];
var M9b5 = [
	"1P 3M 5d 7M 9M"
];
var M9sus4 = [
	"1P 4P 5P 7M 9M"
];
var Madd9 = [
	"1P 3M 5P 9M",
	[
		"2",
		"add9",
		"add2"
	]
];
var Maj7 = [
	"1P 3M 5P 7M",
	[
		"maj7",
		"M7"
	]
];
var Mb5 = [
	"1P 3M 5d"
];
var Mb6 = [
	"1P 3M 13m"
];
var Msus2 = [
	"1P 2M 5P",
	[
		"add9no3",
		"sus2"
	]
];
var Msus4 = [
	"1P 4P 5P",
	[
		"sus",
		"sus4"
	]
];
var Maddb9 = [
	"1P 3M 5P 9m"
];
var m = [
	"1P 3m 5P"
];
var m11 = [
	"1P 3m 5P 7m 9M 11P",
	[
		"_11"
	]
];
var m11b5 = [
	"1P 3m 7m 12d 2M 4P",
	[
		"h11",
		"_11b5"
	]
];
var m13 = [
	"1P 3m 5P 7m 9M 11P 13M",
	[
		"_13"
	]
];
var m6 = [
	"1P 3m 4P 5P 13M",
	[
		"_6"
	]
];
var m69 = [
	"1P 3m 5P 6M 9M",
	[
		"_69"
	]
];
var m7 = [
	"1P 3m 5P 7m",
	[
		"minor7",
		"_",
		"_7"
	]
];
var m7add11 = [
	"1P 3m 5P 7m 11P",
	[
		"m7add4"
	]
];
var m7b5 = [
	"1P 3m 5d 7m",
	[
		"half-diminished",
		"h7",
		"_7b5"
	]
];
var m9 = [
	"1P 3m 5P 7m 9M",
	[
		"_9"
	]
];
var m9b5 = [
	"1P 3m 7m 12d 2M",
	[
		"h9",
		"-9b5"
	]
];
var mMaj7 = [
	"1P 3m 5P 7M",
	[
		"mM7",
		"_M7"
	]
];
var mMaj7b6 = [
	"1P 3m 5P 6m 7M",
	[
		"mM7b6"
	]
];
var mM9 = [
	"1P 3m 5P 7M 9M",
	[
		"mMaj9",
		"-M9"
	]
];
var mM9b6 = [
	"1P 3m 5P 6m 7M 9M",
	[
		"mMaj9b6"
	]
];
var mb6M7 = [
	"1P 3m 6m 7M"
];
var mb6b9 = [
	"1P 3m 6m 9m"
];
var o = [
	"1P 3m 5d",
	[
		"mb5",
		"dim"
	]
];
var o7 = [
	"1P 3m 5d 13M",
	[
		"diminished",
		"m6b5",
		"dim7"
	]
];
var o7M7 = [
	"1P 3m 5d 6M 7M"
];
var oM7 = [
	"1P 3m 5d 7M"
];
var sus24 = [
	"1P 2M 4P 5P",
	[
		"sus4add9"
	]
];
var madd4 = [
	"1P 3m 4P 5P"
];
var madd9 = [
	"1P 3m 5P 9M"
];
var cdata = {
	"4": [
	"1P 4P 7m 10m",
	[
		"quartal"
	]
],
	"5": [
	"1P 5P"
],
	"7": [
	"1P 3M 5P 7m",
	[
		"Dominant",
		"Dom"
	]
],
	"9": [
	"1P 3M 5P 7m 9M",
	[
		"79"
	]
],
	"11": [
	"1P 5P 7m 9M 11P"
],
	"13": [
	"1P 3M 5P 7m 9M 13M",
	[
		"13_"
	]
],
	"64": [
	"5P 8P 10M"
],
	M: M,
	"M#5": [
	"1P 3M 5A",
	[
		"augmented",
		"maj#5",
		"Maj#5",
		"+",
		"aug"
	]
],
	"M#5add9": [
	"1P 3M 5A 9M",
	[
		"+add9"
	]
],
	M13: M13,
	"M13#11": [
	"1P 3M 5P 7M 9M 11A 13M",
	[
		"maj13#11",
		"Maj13#11",
		"M13+4",
		"M13#4"
	]
],
	M6: M6,
	"M6#11": [
	"1P 3M 5P 6M 11A",
	[
		"M6b5",
		"6#11",
		"6b5"
	]
],
	M69: M69,
	"M69#11": [
	"1P 3M 5P 6M 9M 11A"
],
	"M7#11": [
	"1P 3M 5P 7M 11A",
	[
		"maj7#11",
		"Maj7#11",
		"M7+4",
		"M7#4"
	]
],
	"M7#5": [
	"1P 3M 5A 7M",
	[
		"maj7#5",
		"Maj7#5",
		"maj9#5",
		"M7+"
	]
],
	"M7#5sus4": [
	"1P 4P 5A 7M"
],
	"M7#9#11": [
	"1P 3M 5P 7M 9A 11A"
],
	M7add13: M7add13,
	M7b5: M7b5,
	M7b6: M7b6,
	M7b9: M7b9,
	M7sus4: M7sus4,
	M9: M9,
	"M9#11": [
	"1P 3M 5P 7M 9M 11A",
	[
		"maj9#11",
		"Maj9#11",
		"M9+4",
		"M9#4"
	]
],
	"M9#5": [
	"1P 3M 5A 7M 9M",
	[
		"Maj9#5"
	]
],
	"M9#5sus4": [
	"1P 4P 5A 7M 9M"
],
	M9b5: M9b5,
	M9sus4: M9sus4,
	Madd9: Madd9,
	Maj7: Maj7,
	Mb5: Mb5,
	Mb6: Mb6,
	Msus2: Msus2,
	Msus4: Msus4,
	Maddb9: Maddb9,
	"11b9": [
	"1P 5P 7m 9m 11P"
],
	"13#11": [
	"1P 3M 5P 7m 9M 11A 13M",
	[
		"13+4",
		"13#4"
	]
],
	"13#9": [
	"1P 3M 5P 7m 9A 13M",
	[
		"13#9_"
	]
],
	"13#9#11": [
	"1P 3M 5P 7m 9A 11A 13M"
],
	"13b5": [
	"1P 3M 5d 6M 7m 9M"
],
	"13b9": [
	"1P 3M 5P 7m 9m 13M"
],
	"13b9#11": [
	"1P 3M 5P 7m 9m 11A 13M"
],
	"13no5": [
	"1P 3M 7m 9M 13M"
],
	"13sus4": [
	"1P 4P 5P 7m 9M 13M",
	[
		"13sus"
	]
],
	"69#11": [
	"1P 3M 5P 6M 9M 11A"
],
	"7#11": [
	"1P 3M 5P 7m 11A",
	[
		"7+4",
		"7#4",
		"7#11_",
		"7#4_"
	]
],
	"7#11b13": [
	"1P 3M 5P 7m 11A 13m",
	[
		"7b5b13"
	]
],
	"7#5": [
	"1P 3M 5A 7m",
	[
		"+7",
		"7aug",
		"aug7"
	]
],
	"7#5#9": [
	"1P 3M 5A 7m 9A",
	[
		"7alt",
		"7#5#9_",
		"7#9b13_"
	]
],
	"7#5b9": [
	"1P 3M 5A 7m 9m"
],
	"7#5b9#11": [
	"1P 3M 5A 7m 9m 11A"
],
	"7#5sus4": [
	"1P 4P 5A 7m"
],
	"7#9": [
	"1P 3M 5P 7m 9A",
	[
		"7#9_"
	]
],
	"7#9#11": [
	"1P 3M 5P 7m 9A 11A",
	[
		"7b5#9"
	]
],
	"7#9#11b13": [
	"1P 3M 5P 7m 9A 11A 13m"
],
	"7#9b13": [
	"1P 3M 5P 7m 9A 13m"
],
	"7add6": [
	"1P 3M 5P 7m 13M",
	[
		"67",
		"7add13"
	]
],
	"7b13": [
	"1P 3M 7m 13m"
],
	"7b5": [
	"1P 3M 5d 7m"
],
	"7b6": [
	"1P 3M 5P 6m 7m"
],
	"7b9": [
	"1P 3M 5P 7m 9m"
],
	"7b9#11": [
	"1P 3M 5P 7m 9m 11A",
	[
		"7b5b9"
	]
],
	"7b9#9": [
	"1P 3M 5P 7m 9m 9A"
],
	"7b9b13": [
	"1P 3M 5P 7m 9m 13m"
],
	"7b9b13#11": [
	"1P 3M 5P 7m 9m 11A 13m",
	[
		"7b9#11b13",
		"7b5b9b13"
	]
],
	"7no5": [
	"1P 3M 7m"
],
	"7sus4": [
	"1P 4P 5P 7m",
	[
		"7sus"
	]
],
	"7sus4b9": [
	"1P 4P 5P 7m 9m",
	[
		"susb9",
		"7susb9",
		"7b9sus",
		"7b9sus4",
		"phryg"
	]
],
	"7sus4b9b13": [
	"1P 4P 5P 7m 9m 13m",
	[
		"7b9b13sus4"
	]
],
	"9#11": [
	"1P 3M 5P 7m 9M 11A",
	[
		"9+4",
		"9#4",
		"9#11_",
		"9#4_"
	]
],
	"9#11b13": [
	"1P 3M 5P 7m 9M 11A 13m",
	[
		"9b5b13"
	]
],
	"9#5": [
	"1P 3M 5A 7m 9M",
	[
		"9+"
	]
],
	"9#5#11": [
	"1P 3M 5A 7m 9M 11A"
],
	"9b13": [
	"1P 3M 7m 9M 13m"
],
	"9b5": [
	"1P 3M 5d 7m 9M"
],
	"9no5": [
	"1P 3M 7m 9M"
],
	"9sus4": [
	"1P 4P 5P 7m 9M",
	[
		"9sus"
	]
],
	m: m,
	"m#5": [
	"1P 3m 5A",
	[
		"m+",
		"mb6"
	]
],
	m11: m11,
	"m11A 5": [
	"1P 3m 6m 7m 9M 11P"
],
	m11b5: m11b5,
	m13: m13,
	m6: m6,
	m69: m69,
	m7: m7,
	"m7#5": [
	"1P 3m 6m 7m"
],
	m7add11: m7add11,
	m7b5: m7b5,
	m9: m9,
	"m9#5": [
	"1P 3m 6m 7m 9M"
],
	m9b5: m9b5,
	mMaj7: mMaj7,
	mMaj7b6: mMaj7b6,
	mM9: mM9,
	mM9b6: mM9b6,
	mb6M7: mb6M7,
	mb6b9: mb6b9,
	o: o,
	o7: o7,
	o7M7: o7M7,
	oM7: oM7,
	sus24: sus24,
	"+add#9": [
	"1P 3M 5A 9A"
],
	madd4: madd4,
	madd9: madd9
};

/**
 * [![npm version](https://img.shields.io/npm/v/tonal.svg?style=flat-square)](https://www.npmjs.com/package/tonal)
 *
 * `tonal/pcset` is a collection of functions to work with pitch class sets, oriented
 * to make comparations (isEqual, isSubset, isSuperset)
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * // es6
 * import PCSet from "tonal-pcset"
 * var PCSet = require("tonal-pcset")
 *
 * PCSet.isEqual("c2 d5 e6", "c6 e3 d1") // => true
 * ```
 *
 * ## API documentation
 *
 * @module PCSet
 */

var chr = function (str) { return chroma(str) || chroma$1(str) || 0; };
var pcsetNum = function (set) { return parseInt(chroma$2(set), 2); };
var clen = function (chroma) { return chroma.replace(/0/g, "").length; };

/**
 * Get chroma of a pitch class set. A chroma identifies each set uniquely.
 * It"s a 12-digit binary each presenting one semitone of the octave.
 *
 * Note that this function accepts a chroma as parameter and return it
 * without modification.
 *
 * @param {Array|String} set - the pitch class set
 * @return {string} a binary representation of the pitch class set
 * @example
 * PCSet.chroma(["C", "D", "E"]) // => "1010100000000"
 */
function chroma$2(set) {
  if (isChroma(set)) { return set; }
  if (!Array.isArray(set)) { return ""; }
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  set.map(chr).forEach(function (i) {
    b[i] = 1;
  });
  return b.join("");
}

var all = null;
/**
 * Get a list of all possible chromas (all possible scales)
 * More information: http://allthescales.org/
 * @return {Array} an array of possible chromas from '10000000000' to '11111111111'
 *
 */
function chromas(n) {
  all = all || range(2048, 4095).map(function (n) { return n.toString(2); });
  return typeof n === "number"
    ? all.filter(function (chroma) { return clen(chroma) === n; })
    : all.slice();
}

/**
 * Given a a list of notes or a pcset chroma, produce the rotations
 * of the chroma discarding the ones that starts with "0"
 *
 * This is used, for example, to get all the modes of a scale.
 *
 * @param {Array|String} set - the list of notes or pitchChr of the set
 * @param {Boolean} normalize - (Optional, true by default) remove all
 * the rotations that starts with "0"
 * @return {Array<String>} an array with all the modes of the chroma
 *
 * @example
 * PCSet.modes(["C", "D", "E"]).map(PCSet.intervals)
 */
function modes(set, normalize) {
  normalize = normalize !== false;
  var binary = chroma$2(set).split("");
  return compact(
    binary.map(function(_, i) {
      var r = rotate(i, binary);
      return normalize && r[0] === "0" ? null : r.join("");
    })
  );
}

var REGEX$3 = /^[01]{12}$/;
/**
 * Test if the given string is a pitch class set chroma.
 * @param {string} chroma - the pitch class set chroma
 * @return {Boolean} true if its a valid pcset chroma
 * @example
 * PCSet.isChroma("101010101010") // => true
 * PCSet.isChroma("101001") // => false
 */
function isChroma(set) {
  return REGEX$3.test(set);
}

var IVLS = "1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M".split(" ");
/**
 * Given a pcset (notes or chroma) return it"s intervals
 * @param {String|Array} pcset - the pitch class set (notes or chroma)
 * @return {Array} intervals or empty array if not valid pcset
 * @example
 * PCSet.intervals("1010100000000") => ["1P", "2M", "3M"]
 */
function intervals(set) {
  if (!isChroma(set)) { return []; }
  return compact(
    set.split("").map(function(d, i) {
      return d === "1" ? IVLS[i] : null;
    })
  );
}

/**
 * Test if two pitch class sets are identical
 *
 * @param {Array|String} set1 - one of the pitch class sets
 * @param {Array|String} set2 - the other pitch class set
 * @return {Boolean} true if they are equal
 * @example
 * PCSet.isEqual(["c2", "d3"], ["c5", "d2"]) // => true
 */
function isEqual(s1, s2) {
  if (arguments.length === 1) { return function (s) { return isEqual(s1, s); }; }
  return chroma$2(s1) === chroma$2(s2);
}

/**
 * Create a function that test if a collection of notes is a
 * subset of a given set
 *
 * The function can be partially applied
 *
 * @param {Array|String} set - an array of notes or a chroma set string to test against
 * @param {Array|String} notes - an array of notes or a chroma set
 * @return {boolean} true if notes is a subset of set, false otherwise
 * @example
 * const inCMajor = PCSet.isSubsetOf(["C", "E", "G"])
 * inCMajor(["e6", "c4"]) // => true
 * inCMajor(["e6", "c4", "d3"]) // => false
 */
function isSubsetOf(set, notes) {
  if (arguments.length > 1) { return isSubsetOf(set)(notes); }
  set = pcsetNum(set);
  return function(notes) {
    notes = pcsetNum(notes);
    return notes !== set && (notes & set) === notes;
  };
}

/**
 * Create a function that test if a collectio of notes is a
 * superset of a given set (it contains all notes and at least one more)
 *
 * @param {Array|String} set - an array of notes or a chroma set string to test against
 * @param {Array|String} notes - an array of notes or a chroma set
 * @return {boolean} true if notes is a superset of set, false otherwise
 * @example
 * const extendsCMajor = PCSet.isSupersetOf(["C", "E", "G"])
 * extendsCMajor(["e6", "a", "c4", "g2"]) // => true
 * extendsCMajor(["c6", "e4", "g3"]) // => false
 */
function isSupersetOf(set, notes) {
  if (arguments.length > 1) { return isSupersetOf(set)(notes); }
  set = pcsetNum(set);
  return function(notes) {
    notes = pcsetNum(notes);
    return notes !== set && (notes | set) === notes;
  };
}

/**
 * Test if a given pitch class set includes a note
 * @param {Array|String} set - the base set to test against
 * @param {String|Pitch} note - the note to test
 * @return {Boolean} true if the note is included in the pcset
 * @example
 * PCSet.includes(["C", "D", "E"], "C4") // => true
 * PCSet.includes(["C", "D", "E"], "C#4") // => false
 */
function includes(set, note) {
  if (arguments.length > 1) { return includes(set)(note); }
  set = chroma$2(set);
  return function(note) {
    return set[chr(note)] === "1";
  };
}

/**
 * Filter a list with a pitch class set
 *
 * @param {Array|String} set - the pitch class set notes
 * @param {Array|String} notes - the note list to be filtered
 * @return {Array} the filtered notes
 *
 * @example
 * PCSet.filter(["C", "D", "E"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "d2", "c3", "d3" ])
 * PCSet.filter(["C2"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "c3" ])
 */
function filter(set, notes) {
  if (arguments.length === 1) { return function (n) { return filter(set, n); }; }
  return notes.filter(includes(set));
}

var PCSet = /*#__PURE__*/Object.freeze({
  chroma: chroma$2,
  chromas: chromas,
  modes: modes,
  isChroma: isChroma,
  intervals: intervals,
  isEqual: isEqual,
  isSubsetOf: isSubsetOf,
  isSupersetOf: isSupersetOf,
  includes: includes,
  filter: filter
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-dictionary.svg)](https://www.npmjs.com/package/tonal-dictionary)
 *
 * `tonal-dictionary` contains a dictionary of musical scales and chords
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * @example
 * // es6
 * import * as Dictionary from "tonal-dictionary"
 * // es5
 * const Dictionary = require("tonal-dictionary")
 *
 * @example
 * Dictionary.chord("Maj7") // => ["1P", "3M", "5P", "7M"]
 *
 * @module Dictionary
 */

var dictionary = function (raw) {
  var keys = Object.keys(raw).sort();
  var data = [];
  var index = [];

  var add = function (name, ivls, chroma) {
    data[name] = ivls;
    index[chroma] = index[chroma] || [];
    index[chroma].push(name);
  };

  keys.forEach(function (key) {
    var ivls = raw[key][0].split(" ");
    var alias = raw[key][1];
    var chr = chroma$2(ivls);

    add(key, ivls, chr);
    if (alias) { alias.forEach(function (a) { return add(a, ivls, chr); }); }
  });
  var allKeys = Object.keys(data).sort();

  var dict = function (name) { return data[name]; };
  dict.names = function (p) {
    if (typeof p === "string") { return (index[p] || []).slice(); }
    else { return (p === true ? allKeys : keys).slice(); }
  };
  return dict;
};

var combine = function (a, b) {
  var dict = function (name) { return a(name) || b(name); };
  dict.names = function (p) { return a.names(p).concat(b.names(p)); };
  return dict;
};

/**
 * A dictionary of scales: a function that given a scale name (without tonic)
 * returns an array of intervals
 *
 * @function
 * @param {string} name
 * @return {Array} intervals
 * @example
 * import { scale } from "tonal-dictionary"
 * scale("major") // => ["1P", "2M", ...]
 * scale.names(); // => ["major", ...]
 */
var scale = dictionary(sdata);

/**
 * A dictionary of chords: a function that given a chord type
 * returns an array of intervals
 *
 * @function
 * @param {string} type
 * @return {Array} intervals
 * @example
 * import { chord } from "tonal-dictionary"
 * chord("Maj7") // => ["1P", "3M", ...]
 * chord.names(); // => ["Maj3", ...]
 */
var chord = dictionary(cdata);
var pcset = combine(scale, chord);

var Dictionary = /*#__PURE__*/Object.freeze({
  dictionary: dictionary,
  combine: combine,
  scale: scale,
  chord: chord,
  pcset: pcset
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-chord.svg)](https://www.npmjs.com/package/tonal-chord)
 * [![tonal](https://img.shields.io/badge/tonal-chord-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-chord` is a collection of functions to manipulate musical chords
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * @example
 * // es6
 * import * as Chord from "tonal-chord"
 * // es5
 * const Chord = require("tonal-chord")
 *
 * @example
 * Chord.notes("CMaj7") // => ["C", "E", "G", "B"]
 *
 * @module Chord
 */

/**
 * Return the available chord names
 *
 * @function
 * @param {boolean} aliases - true to include aliases
 * @return {Array} the chord names
 *
 * @example
 * Chord.names() // => ["maj7", ...]
 */
var names$2 = chord.names;

var NO_CHORD = Object.freeze({
  name: null,
  names: [],
  intervals: [],
  chroma: null,
  setnum: null
});

var properties$2 = function (name) {
  var intervals = chord(name);
  if (!intervals) { return NO_CHORD; }
  var s = { intervals: intervals, name: name };
  s.chroma = chroma$2(intervals);
  s.setnum = parseInt(s.chroma, 2);
  s.names = chord.names(s.chroma);
  return s;
};

var memo$2 = function (fn, cache) {
  if ( cache === void 0 ) cache = {};

  return function (str) { return cache[str] || (cache[str] = fn(str)); };
};

/**
 * Get chord properties. It returns an object with:
 *
 * - name: the chord name
 * - names: a list with all possible names (includes the current)
 * - intervals: an array with the chord intervals
 * - chroma:  chord croma (see pcset)
 * - setnum: chord chroma number
 *
 * @function
 * @param {string} name - the chord name (without tonic)
 * @return {Object} an object with the properties or a object with all properties
 * set to null if not valid chord name
 */
var props$2 = memo$2(properties$2);

/**
 * Get chord intervals. It always returns an array
 *
 * @function
 * @param {string} name - the chord name (optionally a tonic and type)
 * @return {Array<String>} a list of intervals or null if the type is not known
 */
var intervals$1 = function (name) { return props$2(tokenize$3(name)[1]).intervals; };

/**
 * Get the chord notes of a chord. This function accepts either a chord name
 * (for example: "Cmaj7") or a list of notes.
 *
 * It always returns an array, even if the chord is not found.
 *
 * @function
 * @param {string} nameOrTonic - name of the chord or the tonic (if the second parameter is present)
 * @param {string} [name] - (Optional) name if the first parameter is the tonic
 * @return {Array} an array of notes or an empty array
 *
 * @example
 * Chord.notes("Cmaj7") // => ["C", "E", "G", "B"]
 * Chord.notes("C", "maj7") // => ["C", "E", "G", "B"]
 */
function notes(nameOrTonic, name) {
  if (name) { return props$2(name).intervals.map(transpose(nameOrTonic)); }
  var ref = tokenize$3(nameOrTonic);
  var tonic = ref[0];
  var type = ref[1];
  return props$2(type).intervals.map(transpose(tonic));
}

/**
 * Check if a given name correspond to a chord in the dictionary
 *
 * @function
 * @param {string} name
 * @return {Boolean}
 * @example
 * Chord.exists("CMaj7") // => true
 * Chord.exists("Maj7") // => true
 * Chord.exists("Ablah") // => false
 */
var exists = function (name) { return chord(tokenize$3(name)[1]) !== undefined; };

/**
 * Get all chords names that are a superset of the given one
 * (has the same notes and at least one more)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of chord names
 */
var supersets = function (name) {
  if (!intervals$1(name).length) { return []; }
  var isSuperset = isSupersetOf(intervals$1(name));
  return chord.names().filter(function (name) { return isSuperset(chord(name)); });
};

/**
 * Find all chords names that are a subset of the given one
 * (has less notes but all from the given chord)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of chord names
 */
var subsets = function (name) {
  var isSubset = isSubsetOf(intervals$1(name));
  return chord.names().filter(function (name) { return isSubset(chord(name)); });
};

// 6, 64, 7, 9, 11 and 13 are consider part of the chord
// (see https://github.com/danigb/tonal/issues/55)
var NUM_TYPES = /^(6|64|7|9|11|13)$/;
/**
 * Tokenize a chord name. It returns an array with the tonic and chord type
 * If not tonic is found, all the name is considered the chord name.
 *
 * This function does NOT check if the chord type exists or not. It only tries
 * to split the tonic and chord type.
 *
 * @function
 * @param {string} name - the chord name
 * @return {Array} an array with [tonic, type]
 * @example
 * Chord.tokenize("Cmaj7") // => [ "C", "maj7" ]
 * Chord.tokenize("C7") // => [ "C", "7" ]
 * Chord.tokenize("mMaj7") // => [ "", "mMaj7" ]
 * Chord.tokenize("Cnonsense") // => [ "C", "nonsense" ]
 */
function tokenize$3(name) {
  var p = tokenize(name);
  if (p[0] === "") { return ["", name]; }
  // aug is augmented (see https://github.com/danigb/tonal/issues/55)
  if (p[0] === "A" && p[3] === "ug") { return ["", "aug"]; }

  if (NUM_TYPES.test(p[2])) {
    return [p[0] + p[1], p[2] + p[3]];
  } else {
    return [p[0] + p[1] + p[2], p[3]];
  }
}

var Chord = /*#__PURE__*/Object.freeze({
  names: names$2,
  props: props$2,
  intervals: intervals$1,
  notes: notes,
  exists: exists,
  supersets: supersets,
  subsets: subsets,
  tokenize: tokenize$3
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-detect.svg?style=flat-square)](https://www.npmjs.com/package/tonal-detect)
 *
 * Find chord and scale names from a collection of notes or pitch classes
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * @example
 * import { chord } from "tonal-detect"
 * chord(["C", "E", "G", "A"]) // => ["CM6", "Am7"]
 *
 * @example
 * const Detect = require("tonal-detect")
 * Detect.chord(["C", "E", "G", "A"]) // => ["CM6", "Am7"]
 *
 * @module Detect
 */

function detector(dictionary, defaultBuilder) {
  defaultBuilder = defaultBuilder || (function (tonic, names) { return [tonic, names]; });
  return function(notes, builder) {
    builder = builder || defaultBuilder;
    notes = sort(notes.map(pc));
    return modes(notes)
      .map(function (mode, i) {
        var tonic = name(notes[i]);
        var names = dictionary.names(mode);
        return names.length ? builder(tonic, names) : null;
      })
      .filter(function (x) { return x; });
  };
}

/**
 * Given a collection of notes or pitch classes, try to find the chord name
 * @function
 * @param {Array<String>} notes
 * @return {Array<String>} chord names or empty array
 * @example
 * Detect.chord(["C", "E", "G", "A"]) // => ["CM6", "Am7"]
 */
var chord$1 = detector(
  chord,
  function (tonic, names) { return tonic + names[0]; }
);

/**
 * Given a collection of notes or pitch classes, try to find the scale names
 * @function
 * @param {Array<String>} notes
 * @return {Array<String>} scale names or empty array
 * @example
 * Detect.scale(["f3", "a", "c5", "e2", "d", "g2", "b6"]) // => [
 * "C major",
 * "D dorian",
 * "E phrygian",
 * "F lydian",
 * "G mixolydian",
 * "A aeolian",
 * "B locrian"
 * ]
 */
var scale$1 = detector(
  scale,
  function (tonic, names) { return tonic + " " + names[0]; }
);

var pcset$1 = detector(pcset);

var Detect = /*#__PURE__*/Object.freeze({
  detector: detector,
  chord: chord$1,
  scale: scale$1,
  pcset: pcset$1
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-roman-numeral.svg?style=flat-square)](https://www.npmjs.com/package/tonal-roman-numeral)
 * [![tonal](https://img.shields.io/badge/tonal-roman-numeral-yellow.svg?style=flat-square)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-roman-numeral` is a collection of functions to query about tonal keys.
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * @example
 * // es6
 * import * as RomanNumeral from "tonal-roman-numeral"
 * // es5
 * const RomanNumeral = require("tonal-roman-numeral")
 *
 * @example
 * RomanNumeral.names() // => ["I", "II", "III", "IV", "V", "VI", "VII"]
 * RomanNumeral.props('ii7') // => { name: 'ii', type: '7', num: 2, major: false }
 * RomanNumeral.degree(2) // => "II"
 * RomanNumeral.degree(2, false) // => "ii"
 * @module RomanNumeral
 */

var NAMES$2 = "I II III IV V VI VII".split(" ");
var NAMES_MINOR = NAMES$2.map(function (n) { return n.toLowerCase(); });
var REGEX$4 = /^(IV|I{1,3}|VI{0,2}|iv|i{1,3}|vi{0,2})([^IViv]*)$/;
var NO_PROPS = { name: null, type: null };

var getNames = function (major) { return (major === false ? NAMES_MINOR : NAMES$2); };
var memo$3 = function (fn, cache) {
  if ( cache === void 0 ) cache = {};

  return function (str) { return cache[str] || (cache[str] = fn(str)); };
};

var properties$3 = function (str) {
  var m = REGEX$4.exec(str);
  if (!m) { return NO_PROPS; }
  var name = m[1];
  var type = m[2];
  var n = name.toUpperCase();
  var major = name === n;
  var decimal = NAMES$2.indexOf(n) + 1;
  return { name: name, type: type, decimal: decimal, major: major };
};

/**
 * Get properties of a roman numeral string
 *
 * @function
 * @param {string} - the roman numeral string (can have type, like: Imaj7)
 * @return {Object} - the roman numeral properties
 *
 * @example
 * props("VIIb5") // => { name: "VII", type: "b5", num: 7, major: true }
 */
var props$3 = memo$3(properties$3);

/**
 * Get roman numeral names
 *
 * @function
 * @param {boolean} [isMajor=true]
 * @return {Array<String>}
 *
 * @example
 * names() // => ["I", "II", "III", "IV", "V", "VI", "VII"]
 * names(false) // => ["i", "ii", "iii", "iv", "v", "vi", "vii"]
 */
var names$3 = function (isMajor) { return getNames(isMajor).slice(); };

/**
 * Get roman numeral name of a string or null if not valid roman numeral
 *
 * @function
 * @param {string} name
 * @return {string}
 *
 * @example
 * name('IIb7') // => 'II
 * name('iii') // => 'iii'
 * name('Ii') // => null (mixed case not allowed)
 */
var name$2 = function (str) { return props$3(str).name; };

/**
 * Get type of a roman numeral
 *
 * @function
 * @param {string} name
 * @return {string}
 *
 * @example
 * type('Imaj7') // => 'maj7'
 */
var type = function (str) { return props$3(str).type; };

/**
 * Get roman numeral number in decimal integer (it accepts numbers from 1 to 7)
 *
 *
 * @function
 * @param {string|number} name - roman numeral name (with optional type)
 * @return {number}
 *
 * @example
 * decimal('IVmaj7') // => 4
 * decimal(4) // => 4
 * decimal(10) // => null
 */
var decimal = function (val) { return val > 0 && val < 8 ? val : props$3(val).decimal || null; };

/**
 * Get a roman numeral from a degree number
 *
 * @function
 * @param {number} degree
 * @param {boolean} [isMajor=true]
 * @return {string} the roman numeral
 *
 * @example
 * fromDegree(2) // => "II"
 * fromDegree(2, false) // => "ii"
 */
var fromDegree = function (degree, isMajor) { return getNames(isMajor)[degree - 1] || null; };

var RomanNumeral = /*#__PURE__*/Object.freeze({
  props: props$3,
  names: names$3,
  name: name$2,
  type: type,
  decimal: decimal,
  fromDegree: fromDegree
});

var arguments$1 = arguments;

var MODES = "major dorian phrygian lydian mixolydian minor locrian ionian aeolian".split(
  " "
);
var NUMS = [0, 1, 2, 3, 4, 5, 6, 0, 5];
var NOTES = "C D E F G A B".split(" ");

var TRIADS = ["", "m", "m", "", "", "m", "dim"];
var SEVENTHS = "Maj7 m7 m7 Maj7 7 m7 m7b5".split(" ");
var FIFTHS$1 = [0, 2, 4, -1, 1, 3, 5, 0, 3];

var modenum = function (mode) { return NUMS[MODES.indexOf(mode)]; };

/**
 * Get a list of valid mode names. The list of modes will be always in
 * increasing order (ionian to locrian)
 *
 * @function
 * @param {Boolean} alias - true to get aliases names
 * @return {Array} an array of strings
 * @example
 * Key.modes() // => [ "ionian", "dorian", "phrygian", "lydian",
 * // "mixolydian", "aeolian", "locrian" ]
 * Key.modes(true) // => [ "ionian", "dorian", "phrygian", "lydian",
 * // "mixolydian", "aeolian", "locrian", "major", "minor" ]
 */
var modeNames = function (aliases) { return aliases === true ? MODES.slice() : MODES.slice(0, 7); };

/**
 * Create a major key from alterations
 *
 * @function
 * @param {Integer} alt - the alteration number (positive sharps, negative flats)
 * @return {Key} the key object
 * @example
 * Key.fromAlter(2) // => "D major"
 */
var fromAlter = function (i) { return trFifths("C", i) + " major"; };

var names$4 = function (alt) {
  if ( alt === void 0 ) alt = 4;

  alt = Math.abs(alt);
  var result = [];
  for (var i = -alt; i <= alt; i++) { result.push(fromAlter(i)); }
  return result;
};

var NO_KEY = Object.freeze({
  name: null,
  tonic: null,
  mode: null,
  modenum: null,
  intervals: [],
  scale: [],
  alt: null,
  acc: null
});

var properties$4 = function (name) {
  var p = tokenize$4(name);
  if (p[0] === null) { return NO_KEY; }
  var k = { tonic: p[0], mode: p[1] };
  k.name = k.tonic + " " + k.mode;
  k.modenum = modenum(k.mode);
  var cs = rotate(k.modenum, NOTES);
  k.alt = fifths("C", k.tonic) - FIFTHS$1[MODES.indexOf(k.mode)];
  k.acc = altToAcc(k.alt);
  k.intervals = cs.map(interval(cs[0]));
  k.scale = k.intervals.map(transpose(k.tonic));
  return Object.freeze(k);
};

var memo$4 = function (fn, cache) {
  if ( cache === void 0 ) cache = {};

  return function (str) { return cache[str] || (cache[str] = fn(str)); };
};

/**
 * Return the a key properties object with the following information:
 *
 * - name {string}: name
 * - tonic {string}: key tonic
 * - mode {string}: key mode
 * - modenum {number}: mode number (0 major, 1 dorian, ...)
 * - intervals {Array}: the scale intervals
 * - scale {Array}: the scale notes
 * - acc {string}: accidentals of the key signature
 * - alt {number}: alteration number (a numeric representation of accidentals)
 *
 * @function
 * @param {string} name - the key name
 * @return {Object} the key properties object or null if not a valid key
 *
 * @example
 * Key.props("C3 dorian") // => { tonic: "C", mode: "dorian", ... }
 */
var props$4 = memo$4(properties$4);

/**
 * Get scale of a key
 *
 * @function
 * @param {string|Object} key
 * @return {Array} the key scale
 *
 * @example
 * Key.scale("A major") // => [ "A", "B", "C#", "D", "E", "F#", "G#" ]
 * Key.scale("Bb minor") // => [ "Bb", "C", "Db", "Eb", "F", "Gb", "Ab" ]
 * Key.scale("C dorian") // => [ "C", "D", "Eb", "F", "G", "A", "Bb" ]
 * Key.scale("E mixolydian") // => [ "E", "F#", "G#", "A", "B", "C#", "D" ]
 */
var scale$2 = function (str) { return props$4(str).scale; };

/**
 * Get a list of key scale degrees in roman numerals
 * @param {string} keyName
 * @return {Array}
 * @example
 * Key.degrees("C major") => ["I", "ii", "iii", "IV", "V", "vi", "vii"]
 */
var degrees = function (str) {
  var p = props$4(str);
  if (p.name === null) { return []; }
  var chords = rotate(p.modenum, SEVENTHS);
  return chords.map(function (chord, i) {
    return fromDegree(i + 1, chord[0] !== "m");
  });
};

/**
 * Get a list of the altered notes of a given Key. The notes will be in
 * the same order than in the key signature.
 *
 * @function
 * @param {string} key - the key name
 * @return {Array}
 *
 * @example
 * Key.alteredNotes("Eb major") // => [ "Bb", "Eb", "Ab" ]
 */
var alteredNotes = function (name) {
  var alt = props$4(name).alt;
  if (alt === null) { return null; }
  return alt === 0
    ? []
    : alt > 0
    ? range(1, alt).map(trFifths("B"))
    : range(-1, alt).map(trFifths("F"));
};

/**
 * Get a lead-sheet symbols for a given key name
 *
 * This function is currified (so can be partially applied)
 *
 * From http://openmusictheory.com/triads.html
 *
 * A lead-sheet symbol begins with a capital letter (and, if necessary,
 * an accidental) denoting the root of the chord.
 * That letter is followed by information about a chord’s quality:
 *
 * - major triad: no quality symbol is added
 * - minor triad: lower-case “m”
 * - diminished triad: lower-case “dim” or a degree sign “°”
 * - augmented triad: lower-case “aug” or a plus sign “+”
 *
 * @param {Array<string>} symbols - an array of symbols in major scale order
 * @param {string} keyName - the name of the key you want the symbols for
 * @param {Array<string>} [degrees] - the list of degrees. By default from 1 to 7 in ascending order
 * @return {function}
 * @see Key.chords
 * @see Key.triads
 *
 * @example
 * const chords = Key.leadsheetSymbols(["M", "m", "m", "M", "7", "m", "dim"])
 * chords("D dorian") //=> ["Dm", "Em", "FM", "G7", "Am", "Bdim", "CM"]
 * chords("D dorian", ['ii', 'V']) //=> [Em", "G7"]
 */
function leadsheetSymbols(symbols, keyName, degrees) {
  if (arguments.length === 1) { return function (n, d) { return leadsheetSymbols(symbols, n, d); }; }
  var p = props$4(keyName);
  if (!p.name) { return []; }
  var names = rotate(p.modenum, symbols);
  var chords = p.scale.map(function (tonic, i) { return tonic + names[i]; });
  if (!degrees) { return chords; }
  return degrees.map(decimal).map(function (n) { return chords[n - 1]; });
}

/**
 * Get key seventh chords
 *
 * @function
 * @param {string} name - the key name
 * @param {Array<number|string>} [degrees] - can be numbers or roman numerals
 * @return {Array<string>} seventh chord names
 *
 * @example
 * Key.chords("A major") // => ["AMaj7", "Bm7", "C#m7", "DMaj7", ..,]
 * Key.chords("A major", ['I', 'IV', 'V']) // => ["AMaj7", "DMaj7", "E7"]
 * Key.chords("A major", [5, 4, 1]) // => ["E7", "DMaj7", AMaj7"]
 */
var chords = leadsheetSymbols(SEVENTHS);

/**
 * Get key triads
 *
 * @function
 * @param {string} name - the key name
 * @param {Array<string|number>} [degrees]
 * @return {Array<string>} triad names
 *
 * @example
 * Key.triads("A major") // => ["AM", "Bm", "C#m", "DM", "E7", "F#m", "G#mb5"]
 * Key.triads("A major", ['I', 'IV', 'V']) // => ["AMaj7", "DMaj7", "E7"]
 * Key.triads("A major", [1, 4, 5]) // => ["AMaj7", "DMaj7", "E7"]
 */
var triads = leadsheetSymbols(TRIADS);

/**
 * Get secondary dominant key chords
 *
 * @function
 * @param {string} name - the key name
 * @return {Array}
 *
 * @example
 * Key.secDomChords("A major") // => ["E7", "F#7", ...]
 */

var secDomChords = function (name) {
  var p = props$4(name);
  if (!p.name) { return []; }
  return p.scale.map(function (t) { return transpose(t, "P5") + "7"; });
};

/**
 * Get relative of a key. Two keys are relative when the have the same
 * key signature (for example C major and A minor)
 *
 * It can be partially applied.
 *
 * @function
 * @param {string} mode - the relative destination
 * @param {string} key - the key source
 *
 * @example
 * Key.relative("dorian", "B major") // => "C# dorian"
 * // partial application
 * var minor = Key.relative("minor")
 * minor("C major") // => "A minor"
 * minor("E major") // => "C# minor"
 */
var relative = function (mode, key) {
  if (arguments$1.length === 1) { return function (key) { return relative(mode, key); }; }
  var num = modenum(mode.toLowerCase());
  if (num === undefined) { return null; }
  var k = props$4(key);
  if (k.name === null) { return null; }
  return trFifths(k.tonic, FIFTHS$1[num] - FIFTHS$1[k.modenum]) + " " + mode;
};

/**
 * Split the key name into its components (pitch class tonic and mode name)
 *
 * @function
 * @param {string} name
 * @return {Array} an array in the form [tonic, key]
 *
 * @example
 * Key.tokenize("C major") // => ["C", "major"]
 */
var tokenize$4 = function (name) {
  var p = tokenize(name);
  p[3] = p[3].toLowerCase();
  if (p[0] === "" || MODES.indexOf(p[3]) === -1) { return [null, null]; }
  return [p[0] + p[1], p[3]];
};

var Key = /*#__PURE__*/Object.freeze({
  modeNames: modeNames,
  fromAlter: fromAlter,
  names: names$4,
  props: props$4,
  scale: scale$2,
  degrees: degrees,
  alteredNotes: alteredNotes,
  leadsheetSymbols: leadsheetSymbols,
  chords: chords,
  triads: triads,
  secDomChords: secDomChords,
  relative: relative,
  tokenize: tokenize$4
});

/**
 * A collection of functions to create note ranges.
 *
 * @example
 * const Range = require("tonal-range")
 * import * as Range from "tonal-range"
 *
 * @example
 * // ascending chromatic range
 * Range.chromatic(["C4", "E4"]) // => ["C4", "Db4", "D4", "Eb4", "E4"]
 * // descending chromatic range
 * Range.chromatic(["E4", "C4"]) // => ["E4", "Eb4", "D4", "Db4", "C4"]
 * // combining ascending and descending in complex ranges
 * Range.chromatic(["C2", "E2", "D2"]) // => ["C2", "Db2", "D2", "Eb2", "E2", "Eb2", "D2"]
 * // numeric (midi note numbers) range
 * Range.numeric(["C4", "E4", "Bb3"]) // => [60, 61, 62, 63, 64]
 * // complex numeric range
 * Range.numeric(["C4", "E4", "Bb3"]) // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
 *
 * @module Range
 */

// convert notes to midi if needed
function asNum(n) {
  return typeof n === "number" ? n : midi(n);
}

/**
 * Create a numeric range. You supply a list of notes or numbers and it will
 * be conected to create complex ranges.
 *
 * @param {Array} array - the list of notes or numbers used
 * @return {Array} an array of numbers or empty array if not vald parameters
 *
 * @example
 * Range.numeric(["C5", "C4"]) // => [ 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60 ]
 * // it works midi notes
 * Range.numeric([10, 5]) // => [ 10, 9, 8, 7, 6, 5 ]
 * // complex range
 * Range.numeric(["C4", "E4", "Bb3"]) // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
 * // can be expressed with a string or array
 */
function numeric(arr) {
  return arr.map(asNum).reduce(function(r, n, i) {
    if (i === 1) { return range(r, n); }
    var last = r[r.length - 1];
    return r.concat(range(last, n).slice(1));
  });
}

/**
 * Create a range of chromatic notes. The altered notes will use flats.
 *
 * @function
 * @param {String|Array} list - the list of notes or midi note numbers
 * @return {Array} an array of note names
 *
 * @example
 * Range.chromatic("C2 E2 D2") // => ["C2", "Db2", "D2", "Eb2", "E2", "Eb2", "D2"]
 * // with sharps
 * Range.chromatic("C2 C3", true) // => [ "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3" ]
 */
function chromatic$1(arr, sharps) {
  return numeric(arr).map(function (n) { return fromMidi(n, sharps); });
}

/**
 * Create a range with a cycle of fifths
 * @function
 * @param {String|Pitch} tonic - the tonic note or pitch class
 * @param {Array|String} range - the range array
 * @return {Array} a range of cycle of fifths starting with the tonic
 * @example
 * Range.fifths("C", [0, 6]) // => [ "C", "G", "D", "A", "E", "B", "F#" ])
 */
function fifths$1(tonic, range) {
  return numeric(range).map(trFifths(tonic));
}

/**
 * Create a scale (pitch class set) Range. Given a scale (a pitch class set)
 * and a range array, it returns a range in notes.
 *
 * Can be partially applied
 *
 * @function
 * @param {Array} scale - the scale to use or a function to
 * convert from midi numbers to note names
 * @param {Array} range - a list of notes or midi numbers
 * @return {Array} the scale range, an empty array if not valid source or
 * null if not valid start or end
 *
 * @example
 * Range.scale("C D E F G A B", ["C3", "C2"])
 * // => [ "C3", "B2", "A2", "G2", "F2", "E2", "D2", "C2" ]
 * const majorC = Range.scale("C D E F G A B")
 * majorC(["C3", "C2"]) * // => [ "C3", "B2", "A2", "G2", "F2", "E2", "D2", "C2" ]
 */
function scale$3(set, range) {
  return arguments.length === 1
    ? function (r) { return scale$3(set, r); }
    : filter(set, chromatic$1(range));
}

var Range = /*#__PURE__*/Object.freeze({
  numeric: numeric,
  chromatic: chromatic$1,
  fifths: fifths$1,
  scale: scale$3
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-scale.svg?style=flat-square)](https://www.npmjs.com/package/tonal-scale)
 *
 * A scale is a collection of pitches in ascending or descending order.
 *
 * This module provides functions to get and manipulate scales.
 *
 * @example
 * // es6
 * import * as Scale from "tonal-scale"
 * // es5
 * const Scale = require("tonal-scale");
 *
 * @example
 * Scale.notes("Ab bebop") // => [ "Ab", "Bb", "C", "Db", "Eb", "F", "Gb", "G" ]
 * Scale.names() => ["major", "minor", ...]
 * @module Scale
 */

var NO_SCALE = Object.freeze({
  name: null,
  intervals: [],
  names: [],
  chroma: null,
  setnum: null
});

var properties$5 = function (name) {
  var intervals = scale(name);
  if (!intervals) { return NO_SCALE; }
  var s = { intervals: intervals, name: name };
  s.chroma = chroma$2(intervals);
  s.setnum = parseInt(s.chroma, 2);
  s.names = scale.names(s.chroma);
  return Object.freeze(s);
};

var memoize = function (fn, cache) { return function (str) { return cache[str] || (cache[str] = fn(str)); }; };

/**
 * Get scale properties. It returns an object with:
 * - name: the scale name
 * - names: a list with all possible names (includes the current)
 * - intervals: an array with the scale intervals
 * - chroma:  scale croma (see pcset)
 * - setnum: scale chroma number
 *
 * @function
 * @param {string} name - the scale name (without tonic)
 * @return {Object}
 */
var props$5 = memoize(properties$5, {});

/**
 * Return the available scale names
 *
 * @function
 * @param {boolean} [aliases=false] - true to include aliases
 * @return {Array} the scale names
 *
 * @example
 * Scale.names() // => ["maj7", ...]
 */
var names$5 = scale.names;

/**
 * Given a scale name, return its intervals. The name can be the type and
 * optionally the tonic (which is ignored)
 *
 * It retruns an empty array when no scale found
 *
 * @function
 * @param {string} name - the scale name (tonic and type, tonic is optional)
 * @return {Array<string>} the scale intervals if is a known scale or an empty
 * array if no scale found
 * @example
 * Scale.intervals("major") // => [ "1P", "2M", "3M", "4P", "5P", "6M", "7M" ]
 */
var intervals$2 = function (name) {
  var p = tokenize$5(name);
  return props$5(p[1]).intervals;
};

/**
 * Get the notes (pitch classes) of a scale.
 *
 * Note that it always returns an array, and the values are only pitch classes.
 *
 * @function
 * @param {string} tonic
 * @param {string} nameOrTonic - the scale name or tonic (if 2nd param)
 * @param {string} [name] - the scale name without tonic
 * @return {Array} a pitch classes array
 *
 * @example
 * Scale.notes("C", "major") // => [ "C", "D", "E", "F", "G", "A", "B" ]
 * Scale.notes("C major") // => [ "C", "D", "E", "F", "G", "A", "B" ]
 * Scale.notes("C4", "major") // => [ "C", "D", "E", "F", "G", "A", "B" ]
 * Scale.notes("A4", "no-scale") // => []
 * Scale.notes("blah", "major") // => []
 */
function notes$1(nameOrTonic, name) {
  var p = tokenize$5(nameOrTonic);
  name = name || p[1];
  return intervals$2(name).map(transpose(p[0]));
}

/**
 * Check if the given name is a known scale from the scales dictionary
 *
 * @function
 * @param {string} name - the scale name
 * @return {Boolean}
 */
function exists$1(name) {
  var p = tokenize$5(name);
  return scale(p[1]) !== undefined;
}

/**
 * Given a string with a scale name and (optionally) a tonic, split
 * that components.
 *
 * It retuns an array with the form [ name, tonic ] where tonic can be a
 * note name or null and name can be any arbitrary string
 * (this function doesn"t check if that scale name exists)
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array} an array [tonic, name]
 * @example
 * Scale.tokenize("C mixolydean") // => ["C", "mixolydean"]
 * Scale.tokenize("anything is valid") // => ["", "anything is valid"]
 * Scale.tokenize() // => ["", ""]
 */
function tokenize$5(str) {
  if (typeof str !== "string") { return ["", ""]; }
  var i = str.indexOf(" ");
  var tonic = name(str.substring(0, i)) || name(str) || "";
  var name$1 = tonic !== "" ? str.substring(tonic.length + 1) : str;
  return [tonic, name$1.length ? name$1 : ""];
}

/**
 * Find mode names of a scale
 *
 * @function
 * @param {string} name - scale name
 * @example
 * Scale.modeNames("C pentatonic") // => [
 *   ["C", "major pentatonic"],
 *   ["D", "egyptian"],
 *   ["E", "malkos raga"],
 *   ["G", "ritusen"],
 *   ["A", "minor pentatonic"]
 * ]
 */
var modeNames$1 = function (name) {
  var ivls = intervals$2(name);
  var tonics = notes$1(name);

  return modes(ivls)
    .map(function (chroma, i) {
      var name = scale.names(chroma)[0];
      if (name) { return [tonics[i] || ivls[i], name]; }
    })
    .filter(function (x) { return x; });
};

/**
 * Get all chords that fits a given scale
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array<string>} - the chord names
 *
 * @example
 * Scale.chords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
 */
var chords$1 = function (name) {
  var inScale = isSubsetOf(intervals$2(name));
  return chord.names().filter(function (name) { return inScale(chord(name)); });
};

/**
 * Given an array of notes, return the scale: a pitch class set starting from
 * the first note of the array
 *
 * @function
 * @param {Array} notes
 * @return {Array}
 * @example
 * Scale.toScale(['C4', 'c3', 'C5', 'C4', 'c4']) // => ["C"]
 * Scale.toScale(['D4', 'c#5', 'A5', 'F#6']) // => ["D", "F#", "A", "C#"]
 */
var toScale = function (notes) {
  var pcset = compact(notes.map(pc));
  if (!pcset.length) { return pcset; }
  var tonic = pcset[0];
  var scale = unique(pcset);
  return rotate(scale.indexOf(tonic), scale);
};

/**
 * Get all scales names that are a superset of the given one
 * (has the same notes and at least one more)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of scale names
 * @example
 * Scale.supersets("major") // => ["bebop", "bebop dominant", "bebop major", "chromatic", "ichikosucho"]
 */
var supersets$1 = function (name) {
  if (!intervals$2(name).length) { return []; }
  var isSuperset = isSupersetOf(intervals$2(name));
  return scale.names().filter(function (name) { return isSuperset(scale(name)); });
};

/**
 * Find all scales names that are a subset of the given one
 * (has less notes but all from the given scale)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of scale names
 *
 * @example
 * Scale.subsets("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
 */
var subsets$1 = function (name) {
  var isSubset = isSubsetOf(intervals$2(name));
  return scale.names().filter(function (name) { return isSubset(scale(name)); });
};

var Scale = /*#__PURE__*/Object.freeze({
  props: props$5,
  names: names$5,
  intervals: intervals$2,
  notes: notes$1,
  exists: exists$1,
  tokenize: tokenize$5,
  modeNames: modeNames$1,
  chords: chords$1,
  toScale: toScale,
  supersets: supersets$1,
  subsets: subsets$1
});

var index = {
  Abc: Abc,
  Array: Array$1,
  Chord: Chord,
  Detect: Detect,
  Dictionary: Dictionary,
  Distance: Distance,
  Interval: Interval,
  Key: Key,
  Note: Note,
  PCSet: PCSet,
  Range: Range,
  RomanNumeral: RomanNumeral,
  Scale: Scale
};

module.exports = index;
