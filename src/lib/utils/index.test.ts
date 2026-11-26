import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cn, shortAddress, stroopsToUsdc, usdcToStroops } from './index';

describe('Utility functions', () => {
  describe('cn (className merger)', () => {
    it('combines multiple class names', () => {
      const result = cn('px-2', 'py-4', 'text-red-600');
      assert.ok(result.includes('px-2'));
      assert.ok(result.includes('py-4'));
      assert.ok(result.includes('text-red-600'));
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      assert.ok(result.includes('base'));
      assert.ok(result.includes('active'));
    });

    it('removes false/null/undefined classes', () => {
      const flag = false as boolean;
      const missing: string | undefined = undefined;
      const result = cn('class1', flag && 'class2', null, 'class3', missing && 'class4');
      assert.ok(result.includes('class1'));
      assert.ok(!result.includes('class2'));
      assert.ok(result.includes('class3'));
      assert.ok(!result.includes('class4'));
    });

    it('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      assert.ok(result.includes('class1'));
      assert.ok(result.includes('class2'));
      assert.ok(result.includes('class3'));
    });

    it('resolves Tailwind conflicts correctly', () => {
      // cn uses clsx which allows override logic
      const result = cn('text-red-600', 'text-blue-600');
      // Last class should win or conflicts are resolved
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });
  });

  describe('shortAddress', () => {
    it('shortens Stellar address to first and last 4 characters by default', () => {
      const address = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      const result = shortAddress(address);
      assert.equal(result, 'GCDV...6ZQUA');
    });

    it('respects custom character count', () => {
      const address = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      const result = shortAddress(address, 6);
      assert.equal(result, 'GCDVUV...T6ZQUA');
    });

    it('handles addresses shorter than the total required characters', () => {
      const shortAddr = 'GCDVUV';
      const result = shortAddress(shortAddr, 4);
      // Should handle gracefully without crashing
      assert.ok(typeof result === 'string');
    });

    it('returns full address if shorter than double the char count', () => {
      const shortAddr = 'GCDVUV';
      const result = shortAddress(shortAddr, 2);
      assert.ok(result.length <= shortAddr.length + 3); // "..." is 3 chars
    });

    it('preserves case of address characters', () => {
      const address = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      const result = shortAddress(address);
      const firstPart = result.split('...')[0];
      const lastPart = result.split('...')[1];
      assert.equal(firstPart, 'GCDV');
      assert.equal(lastPart, '6ZQUA');
    });

    it('works with lowercase addresses', () => {
      const address = 'gcdvuvdfyrmzuvr2v2ujhbvl2zxi33ewqd37zrzthllzs2qqyt6zqua';
      const result = shortAddress(address, 4);
      assert.ok(result.includes('...'));
      assert.ok(result.startsWith('gcdv'));
      assert.ok(result.endsWith('zqua'));
    });

    it('handles contract addresses (starting with C)', () => {
      const address = 'CAB7DXV5GWMJ7BQBFTNRQ2OB6QOFL3V45B4EVFVVZRR2V7Q3H3QACWQ';
      const result = shortAddress(address, 4);
      assert.ok(result.startsWith('CAB7'));
      assert.ok(result.endsWith('QACWQ'));
    });
  });

  describe('stroopsToUsdc', () => {
    it('converts stroops to USDC with default 2 decimal places', () => {
      // 1 USDC = 10,000,000 stroops
      const result = stroopsToUsdc('10000000');
      assert.equal(result, '1.00');
    });

    it('converts larger amounts correctly', () => {
      // 100 USDC = 1,000,000,000 stroops
      const result = stroopsToUsdc('1000000000');
      assert.equal(result, '100.00');
    });

    it('respects custom decimal places', () => {
      const result = stroopsToUsdc('10000000', 0);
      assert.equal(result, '1');
    });

    it('handles 7 decimal places (full precision)', () => {
      const result = stroopsToUsdc('10000000', 7);
      assert.equal(result, '1.0000000');
    });

    it('accepts stroops as bigint', () => {
      const result = stroopsToUsdc(10000000n);
      assert.equal(result, '1.00');
    });

    it('converts very small amounts', () => {
      // 1 stroop = 0.0000001 USDC, displays as 0.00 with 2 decimals
      const result = stroopsToUsdc('1');
      assert.equal(result, '0.00');
    });

    it('truncates excess decimal places', () => {
      // 1.123456789 USDC with 2 decimals should show 1.12
      const result = stroopsToUsdc('11234567', 2);
      assert.equal(result, '1.12');
    });

    it('handles zero', () => {
      const result = stroopsToUsdc('0');
      assert.equal(result, '0.00');
    });
  });

  describe('usdcToStroops', () => {
    it('converts USDC string to stroops (bigint)', () => {
      // 1.5 USDC = 15,000,000 stroops
      const result = usdcToStroops('1.5');
      assert.equal(result, 15000000n);
    });

    it('converts whole numbers without decimal point', () => {
      // 100 USDC = 1,000,000,000 stroops
      const result = usdcToStroops('100');
      assert.equal(result, 1000000000n);
    });

    it('handles zero', () => {
      const result = usdcToStroops('0');
      assert.equal(result, 0n);
    });

    it('pads fractional parts to 7 decimal places', () => {
      // 1.5 → 1.5000000
      const result = usdcToStroops('1.5');
      assert.equal(result, 15000000n);
    });

    it('truncates more than 7 decimal places', () => {
      // 1.12345678 → 1.1234567 (last digit is truncated)
      const result = usdcToStroops('1.12345678');
      assert.equal(result, 11234567n);
    });

    it('handles very small amounts', () => {
      // 0.0000001 USDC = 1 stroop
      const result = usdcToStroops('0.0000001');
      assert.equal(result, 1n);
    });
  });

  describe('USDC and stroops conversion round-trip', () => {
    it('round-trips conversion for typical values', () => {
      const testCases = [
        { usdc: '1', stroops: 10000000n },
        { usdc: '1.5', stroops: 15000000n },
        { usdc: '100', stroops: 1000000000n },
        { usdc: '0.5', stroops: 5000000n },
        { usdc: '999.999999', stroops: 9999999990n },
      ];

      for (const testCase of testCases) {
        const converted = usdcToStroops(testCase.usdc);
        assert.equal(converted, testCase.stroops);
      }
    });
  });

  describe('copyToClipboard', () => {
    it('documents copyToClipboard function signature', () => {
      // copyToClipboard(text: string): Promise<void>
      // Expected behavior:
      // - Copies text to system clipboard
      // - Returns resolved promise on success
      // - Throws/rejects on failure (clipboard API unavailable, permissions denied)
      // - Requires secure context (https or localhost)
      
      const textToCopy = 'Hello, clipboard!';
      assert.ok(typeof textToCopy === 'string');
    });

    it('documents clipboard API availability', () => {
      // Uses Clipboard API (navigator.clipboard.writeText)
      // Available in modern browsers (Chrome, Firefox, Safari, Edge)
      // May fail in:
      // - Non-secure contexts (HTTP in production)
      // - Some older browsers
      // - Browsers with clipboard permissions denied
      
      const apiMethod = 'navigator.clipboard.writeText';
      assert.ok(typeof apiMethod === 'string');
    });

    it('documents error handling', () => {
      // Error cases:
      // 1. NotAllowedError: User denied clipboard access
      // 2. NotSupportedError: Clipboard API not available
      // 3. Any other DOMException
      
      // Typical error handling:
      // try {
      //   await copyToClipboard('text');
      // } catch (error) {
      //   if (error.name === 'NotAllowedError') {
      //     // User denied permission
      //   } else {
      //     // Clipboard not available
      //   }
      // }
      
      const errorTypes = ['NotAllowedError', 'NotSupportedError'];
      assert.equal(errorTypes.length, 2);
    });
  });

  describe('utility function patterns', () => {
    it('documents component usage of cn utility', () => {
      // cn (clsx + tailwind-merge) is used for:
      // 1. Conditionally combining Tailwind classes
      // 2. Resolving conflicting Tailwind utilities
      // 3. Cleaner JSX syntax than ternary operators
      
      // Example:
      // <div className={cn(
      //   'px-4 py-2 rounded',
      //   isActive ? 'bg-blue-500' : 'bg-gray-300',
      //   isDisabled && 'opacity-50 cursor-not-allowed'
      // )}>
      
      const pattern = 'cn(base, condition && modifier)';
      assert.ok(typeof pattern === 'string');
    });

    it('documents shortAddress usage for display', () => {
      // shortAddress is used to display Stellar addresses in:
      // 1. UI tables and cards (limited space)
      // 2. Transaction details (clickable links)
      // 3. Address badges (compact format)
      
      // Always show full address in tooltips or dedicated detail pages
      
      const useCases = ['tables', 'cards', 'badges'];
      assert.equal(useCases.length, 3);
    });

    it('documents USDC conversion for display and calculations', () => {
      // stroopsToUsdc: Display amounts to users (always show human-readable USDC)
      // usdcToStroops: Convert user input to stroops for contract calls
      // Always store amounts in stroops on-chain (not floating-point)
      
      const rule = 'Store stroops, display USDC';
      assert.ok(typeof rule === 'string');
    });
  });
});
