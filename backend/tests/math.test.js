// math.test.js
// Unit tests for math.js using Jest

const { add, subtract } = require('../src/utils/math'); // Import the functions to be tested

test('add() correctly adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
});

test('subtract() correctly subtracts two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
    expect(subtract(0, 5)).toBe(-5);
});
