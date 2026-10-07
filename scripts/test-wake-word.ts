import assert from 'node:assert';
import { wakeWordService, isWakeWordMatch } from '../src/services/wakeWordService.ts';

console.log('🧪 === TEST HEY CHELONA WAKE WORD SERVICE ===');

// 1. Test Match Wake Word
console.log('1. Testing matchWakeWord triggers...');
assert.strictEqual(isWakeWordMatch('Hey Chelona'), true, 'Should match "Hey Chelona"');
assert.strictEqual(isWakeWordMatch('hey chelona'), true, 'Should match "hey chelona"');
assert.strictEqual(isWakeWordMatch('Ehi Chelona come stai?'), true, 'Should match "Ehi Chelona"');
assert.strictEqual(isWakeWordMatch('Ok Chelona apri la spesa'), true, 'Should match "Ok Chelona"');
assert.strictEqual(isWakeWordMatch('Ciao Chelona'), true, 'Should match "Ciao Chelona"');
assert.strictEqual(isWakeWordMatch('Chelona'), true, 'Should match "Chelona"');
assert.strictEqual(isWakeWordMatch('che lona'), true, 'Should match "che lona"');
assert.strictEqual(isWakeWordMatch('Hei Kelona'), true, 'Should match phonetic "Hei Kelona"');
assert.strictEqual(isWakeWordMatch('Attiva Chelona'), true, 'Should match "Attiva Chelona"');

// 2. Negative test cases
console.log('2. Testing negative phrases (no false positive)...');
assert.strictEqual(isWakeWordMatch(''), false, 'Empty string should be false');
assert.strictEqual(isWakeWordMatch('Buongiorno a tutti'), false, 'Unrelated phrase should be false');
assert.strictEqual(isWakeWordMatch('Andiamo a Barcellona in vacanza'), false, '"Barcellona" should not match');
assert.strictEqual(isWakeWordMatch('Compriamo le mele e le pere'), false, 'Shopping phrase should not match');

// 3. Test Service State & Lifecycle safety
console.log('3. Testing Service State & Lifecycle...');
const state = wakeWordService.getState();
assert.strictEqual(typeof state.isSupported, 'boolean', 'isSupported must be boolean');
assert.strictEqual(typeof state.isEnabled, 'boolean', 'isEnabled must be boolean');
assert.strictEqual(typeof state.isListening, 'boolean', 'isListening must be boolean');

// 4. Test Pause & Resume
console.log('4. Testing Pause & Resume idempotency...');
wakeWordService.pause();
assert.strictEqual(wakeWordService.getState().isListening, false, 'Should not be listening while paused');
wakeWordService.resume();

// 5. Test Subscription
console.log('5. Testing Subscription listener...');
let receivedState = null;
const unsub = wakeWordService.subscribe((s) => {
  receivedState = s;
});
assert.notStrictEqual(receivedState, null, 'Subscriber must receive initial state');
unsub();

// 6. Test Stop
console.log('6. Testing Stop...');
wakeWordService.stop();

console.log('🎉 ALL HEY CHELONA WAKE WORD TESTS PASSED PERFECTLY!\n');
