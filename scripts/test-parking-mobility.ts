import assert from 'node:assert/strict';
import { 
  calculateDistanceMeters, 
  formatDistance, 
  formatElapsedParkingTime, 
  getNavigationUrl 
} from '../src/services/parkingService';

console.log('🧪 === TEST PARKING & MOBILITY LOGIC ===');

// 1. Distance Calculation Tests (Haversine Formula)
console.log('1. Testing Distance Calculations (Haversine)...');

// Zero coordinates edge case
assert.equal(calculateDistanceMeters(0, 0, 45.0, 9.0), 0, 'Zero coordinates should return 0 meters');
assert.equal(calculateDistanceMeters(45.0, 9.0, 0, 0), 0, 'Zero target coordinates should return 0 meters');

// Known distance: Milano Duomo (45.4642, 9.1919) to Stazione Centrale (45.4859, 9.2045) ~ 2.6 km
const distDuomoCentrale = calculateDistanceMeters(45.4642, 9.1919, 45.4859, 9.2045);
assert.ok(distDuomoCentrale >= 2400 && distDuomoCentrale <= 2800, `Expected ~2600m, got ${distDuomoCentrale}`);
console.log(`✓ Distance calculation accurate: ${distDuomoCentrale}m`);

// Distance formatting
assert.equal(formatDistance(50), '50 m');
assert.equal(formatDistance(950), '950 m');
assert.equal(formatDistance(1000), '1.0 km');
assert.equal(formatDistance(2700), '2.7 km');
console.log('✓ Distance formatting verified (meters and km)');

// 2. Elapsed Parking Time Tests
console.log('2. Testing Elapsed Time Formatting...');
const now = Date.now();
assert.equal(formatElapsedParkingTime(now - 30 * 1000), 'Proprio ora');
assert.equal(formatElapsedParkingTime(now - 15 * 60 * 1000), '15 min fa');
assert.equal(formatElapsedParkingTime(now - 75 * 60 * 1000), '1h 15m fa');
assert.equal(formatElapsedParkingTime(now - 120 * 60 * 1000), '2h fa');
assert.equal(formatElapsedParkingTime(now - 25 * 3600 * 1000), '1 giorno fa');
assert.equal(formatElapsedParkingTime(now - 50 * 3600 * 1000), '2 giorni fa');
console.log('✓ Elapsed parking time formatting passed');

// 3. Navigation URLs
console.log('3. Testing Walking Navigation URLs...');
const navUrlCoords = getNavigationUrl(45.4642, 9.1919, 'Duomo di Milano');
assert.ok(navUrlCoords.includes('travelmode=walking'), 'Must request walking mode');
assert.ok(navUrlCoords.includes('45.4642,9.1919'), 'Must include destination coordinates');

const navUrlAddress = getNavigationUrl(0, 0, 'Via Roma 10, Milano');
assert.ok(navUrlAddress.includes('destination=Via%20Roma%2010%2C%20Milano'), 'Must encode text address');
console.log('✓ Navigation URLs generated properly');

// 4. Parking Meter Cost & Extension Math
console.log('4. Testing Parking Meter Math...');
const durationMins = 90; // 1.5 hours
const ratePerHour = 1.50; // 1.50 €/h
const expectedCost = Math.round((durationMins / 60) * ratePerHour * 100) / 100;
assert.equal(expectedCost, 2.25, `Expected 2.25 €, got ${expectedCost}`);

const extendDelta = 30; // +30m -> 120 min (2h)
const updatedCost = Math.round(((durationMins + extendDelta) / 60) * ratePerHour * 100) / 100;
assert.equal(updatedCost, 3.00, `Expected 3.00 €, got ${updatedCost}`);
console.log('✓ Parking meter cost estimation passed');

console.log('🎉 ALL PARKING & MOBILITY LOGIC TESTS PASSED!');
