import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stroopsToUsdc, usdcToStroops, stroopsToUsdcInput } from './index';

// Number.MAX_SAFE_INTEGER is 9007199254740991 — anything above it cannot be
// represented exactly as a JS number, so these values catch float conversions.
const BEYOND_SAFE_USDC = '9007199254740993.1234567';
const BEYOND_SAFE_STROOPS = 90071992547409931234567n;

describe('USDC / stroop amount conversion', () => {
  describe('zero', () => {
    it('stroopsToUsdc formats zero', () => {
      assert.equal(stroopsToUsdc('0'), '0.00');
      assert.equal(stroopsToUsdc(0n, 0), '0');
      assert.equal(stroopsToUsdc(0n, 7), '0.0000000');
    });

    it('usdcToStroops parses zero in every form', () => {
      assert.equal(usdcToStroops('0'), 0n);
      assert.equal(usdcToStroops('0.0'), 0n);
      assert.equal(usdcToStroops('0.0000000'), 0n);
      assert.equal(usdcToStroops('.0'), 0n);
    });

    it('stroopsToUsdcInput formats zero without a fraction', () => {
      assert.equal(stroopsToUsdcInput('0'), '0');
      assert.equal(stroopsToUsdcInput(0n), '0');
    });
  });

  describe('7 decimal places (1 stroop precision)', () => {
    it('usdcToStroops keeps all 7 decimals', () => {
      assert.equal(usdcToStroops('0.0000001'), 1n);
      assert.equal(usdcToStroops('0.1234567'), 1234567n);
      assert.equal(usdcToStroops('1.9999999'), 19999999n);
    });

    it('stroopsToUsdcInput shows all 7 decimals exactly', () => {
      assert.equal(stroopsToUsdcInput('1'), '0.0000001');
      assert.equal(stroopsToUsdcInput('1234567'), '0.1234567');
      assert.equal(stroopsToUsdcInput('19999999'), '1.9999999');
    });

    it('stroopsToUsdc shows all 7 decimals when asked', () => {
      assert.equal(stroopsToUsdc('19999999', 7), '1.9999999');
      assert.equal(stroopsToUsdc('1', 7), '0.0000001');
    });

    it('stroopsToUsdc pads with zeros beyond 7 decimals', () => {
      assert.equal(stroopsToUsdc('15000000', 9), '1.500000000');
    });
  });

  describe('rounding and truncation', () => {
    it('stroopsToUsdc rounds half up to the requested decimals', () => {
      assert.equal(stroopsToUsdc('11250000'), '1.13'); // 1.125
      assert.equal(stroopsToUsdc('11249999'), '1.12'); // 1.1249999
      assert.equal(stroopsToUsdc('11234567'), '1.12');
      assert.equal(stroopsToUsdc('99950000'), '10.00'); // 9.995 carries into the whole part
      assert.equal(stroopsToUsdc('15000000', 0), '2'); // 1.5
      assert.equal(stroopsToUsdc('14999999', 0), '1');
    });

    it('stroopsToUsdc rounds sub-cent amounts', () => {
      assert.equal(stroopsToUsdc('49999'), '0.00'); // 0.0049999
      assert.equal(stroopsToUsdc('50000'), '0.01'); // 0.005
    });

    it('usdcToStroops truncates (never rounds) digits past 7 decimals', () => {
      assert.equal(usdcToStroops('1.12345678'), 11234567n);
      assert.equal(usdcToStroops('1.12345679999'), 11234567n);
      assert.equal(usdcToStroops('0.00000009'), 0n);
    });

    it('stroopsToUsdcInput never rounds and trims trailing zeros', () => {
      assert.equal(stroopsToUsdcInput('11250000'), '1.125');
      assert.equal(stroopsToUsdcInput('99950000'), '9.995');
      assert.equal(stroopsToUsdcInput('50005000000'), '5000.5');
    });
  });

  describe('large values beyond Number.MAX_SAFE_INTEGER', () => {
    it('usdcToStroops converts without precision loss', () => {
      assert.equal(usdcToStroops(BEYOND_SAFE_USDC), BEYOND_SAFE_STROOPS);
      assert.equal(usdcToStroops('9007199254740993'), 90071992547409930000000n);
    });

    it('stroopsToUsdcInput converts without precision loss', () => {
      assert.equal(stroopsToUsdcInput(BEYOND_SAFE_STROOPS), BEYOND_SAFE_USDC);
      assert.equal(stroopsToUsdcInput(BEYOND_SAFE_STROOPS.toString()), BEYOND_SAFE_USDC);
    });

    it('stroopsToUsdc converts without precision loss', () => {
      // A float conversion would print 9007199254740992 here.
      assert.equal(stroopsToUsdc(BEYOND_SAFE_STROOPS, 7), BEYOND_SAFE_USDC);
      assert.equal(stroopsToUsdc(BEYOND_SAFE_STROOPS), '9007199254740993.12');
      assert.equal(stroopsToUsdc('90071992547409930000000'), '9007199254740993.00');
    });

    it('handles values near the i128 maximum', () => {
      const i128Max = 2n ** 127n - 1n; // 170141183460469231731687303715884105727
      assert.equal(stroopsToUsdcInput(i128Max), '17014118346046923173168730371588.4105727');
      assert.equal(stroopsToUsdc(i128Max), '17014118346046923173168730371588.41');
      assert.equal(usdcToStroops('17014118346046923173168730371588.4105727'), i128Max);
    });
  });

  describe('invalid input', () => {
    it('usdcToStroops rejects non-numeric strings', () => {
      for (const input of ['', ' ', '.', 'abc', '1abc', 'NaN', 'Infinity']) {
        assert.throws(() => usdcToStroops(input), /Invalid USDC amount/, `expected "${input}" to throw`);
      }
    });

    it('usdcToStroops rejects negative, signed and exponent notation', () => {
      for (const input of ['-1', '-0.5', '+1', '1e5', '1.-5']) {
        assert.throws(() => usdcToStroops(input), /Invalid USDC amount/, `expected "${input}" to throw`);
      }
    });

    it('usdcToStroops rejects malformed decimals and separators', () => {
      for (const input of ['1.2.3', '1,000', '1 000', '0x10']) {
        assert.throws(() => usdcToStroops(input), /Invalid USDC amount/, `expected "${input}" to throw`);
      }
    });

    it('usdcToStroops accepts surrounding whitespace and bare decimal points', () => {
      assert.equal(usdcToStroops(' 2.5 '), 25000000n);
      assert.equal(usdcToStroops('.5'), 5000000n);
      assert.equal(usdcToStroops('1.'), 10000000n);
    });

    it('stroopsToUsdc and stroopsToUsdcInput reject non-integer stroop strings', () => {
      for (const input of ['abc', '1.5', '1e7', '-']) {
        assert.throws(() => stroopsToUsdc(input), SyntaxError, `expected "${input}" to throw`);
        assert.throws(() => stroopsToUsdcInput(input), SyntaxError, `expected "${input}" to throw`);
      }
      // BigInt('') is 0n, so an empty stroop string reads as zero
      assert.equal(stroopsToUsdc(''), '0.00');
    });
  });

  describe('round-trip conversion', () => {
    it('usdc → stroops → usdc returns the original value', () => {
      const values = ['1', '1.5', '100', '0.5', '0.0000001', '999.999999', '5000.5', BEYOND_SAFE_USDC];
      for (const value of values) {
        assert.equal(stroopsToUsdcInput(usdcToStroops(value)), value);
      }
    });

    it('stroops → usdc → stroops returns the original value', () => {
      const values = [0n, 1n, 15000000n, 9999999999n, 2n ** 64n, BEYOND_SAFE_STROOPS];
      for (const value of values) {
        assert.equal(usdcToStroops(stroopsToUsdcInput(value)), value);
      }
    });

    it('normalises trailing zeros on the way back', () => {
      assert.equal(stroopsToUsdcInput(usdcToStroops('1.5000000')), '1.5');
      assert.equal(stroopsToUsdcInput(usdcToStroops('100.00')), '100');
    });
  });
});
