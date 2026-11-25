import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PROOF_FILE_BYTES,
  formatBytes,
  hashFile,
  isSha256Hex,
  normalizeProofHash,
  type HashPhase,
} from './proof-hash.ts';

// Known SHA-256 test vectors (FIPS 180-2)
const SHA256_EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const SHA256_ABC_448 = '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';

describe('hashFile', () => {
  it('hashes empty input to the known SHA-256 vector', async () => {
    const result = await hashFile(new File([], 'empty.txt'));
    assert.equal(result.hash, SHA256_EMPTY);
    assert.equal(result.fileName, 'empty.txt');
    assert.equal(result.size, 0);
  });

  it('hashes "abc" to the known SHA-256 vector', async () => {
    const result = await hashFile(new File(['abc'], 'abc.txt'));
    assert.equal(result.hash, SHA256_ABC);
    assert.equal(result.fileName, 'abc.txt');
    assert.equal(result.size, 3);
  });

  it('hashes the 448-bit FIPS message to the known vector', async () => {
    const message = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    const result = await hashFile(new File([message], 'fips.txt'));
    assert.equal(result.hash, SHA256_ABC_448);
  });

  it('returns a lowercase 64-character hex digest', async () => {
    const result = await hashFile(new File(['bill of lading'], 'bol.pdf'));
    assert.match(result.hash, /^[0-9a-f]{64}$/);
  });

  it('hashes binary content byte-for-byte', async () => {
    const bytes = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
    const result = await hashFile(new File([bytes], 'abc.bin'));
    assert.equal(result.hash, SHA256_ABC);
  });

  it('reports reading progress then the computing phase', async () => {
    const events: Array<[HashPhase, number]> = [];
    await hashFile(new File(['abc'], 'abc.txt'), (phase, percent) => events.push([phase, percent]));
    assert.deepEqual(events, [
      ['reading', 0],
      ['reading', 100],
      ['computing', 100],
    ]);
  });

  it('rejects files above MAX_PROOF_FILE_BYTES without reading them', async () => {
    let read = false;
    const oversized = {
      name: 'huge.pdf',
      size: MAX_PROOF_FILE_BYTES + 1,
      slice: () => {
        read = true;
        return new Blob();
      },
    } as unknown as File;

    await assert.rejects(hashFile(oversized), RangeError);
    assert.equal(read, false);
  });

  it('exposes a 50 MB limit', () => {
    assert.equal(MAX_PROOF_FILE_BYTES, 50 * 1024 * 1024);
  });
});

describe('normalizeProofHash', () => {
  it('lowercases the hash', () => {
    assert.equal(normalizeProofHash(SHA256_ABC.toUpperCase()), SHA256_ABC);
  });

  it('trims surrounding whitespace', () => {
    assert.equal(normalizeProofHash(`  ${SHA256_ABC}\n`), SHA256_ABC);
  });

  it('strips a 0x prefix', () => {
    assert.equal(normalizeProofHash(`0x${SHA256_ABC}`), SHA256_ABC);
    assert.equal(normalizeProofHash(`0X${SHA256_ABC.toUpperCase()}`), SHA256_ABC);
  });

  it('strips sha256: and sha-256: prefixes', () => {
    assert.equal(normalizeProofHash(`sha256:${SHA256_ABC}`), SHA256_ABC);
    assert.equal(normalizeProofHash(`SHA-256:${SHA256_ABC}`), SHA256_ABC);
  });

  it('strips only one prefix', () => {
    assert.equal(normalizeProofHash(`0x0x${SHA256_ABC}`), `0x${SHA256_ABC}`);
  });

  it('leaves an already normalised hash unchanged', () => {
    assert.equal(normalizeProofHash(SHA256_ABC), SHA256_ABC);
  });
});

describe('isSha256Hex', () => {
  it('accepts a lowercase 64-character hex digest', () => {
    assert.equal(isSha256Hex(SHA256_ABC), true);
    assert.equal(isSha256Hex(SHA256_EMPTY), true);
  });

  it('accepts uppercase and mixed case', () => {
    assert.equal(isSha256Hex(SHA256_ABC.toUpperCase()), true);
    assert.equal(isSha256Hex(SHA256_ABC.slice(0, 32).toUpperCase() + SHA256_ABC.slice(32)), true);
  });

  it('accepts a 0x or sha256: prefix', () => {
    assert.equal(isSha256Hex(`0x${SHA256_ABC}`), true);
    assert.equal(isSha256Hex(`sha256:${SHA256_ABC}`), true);
  });

  it('rejects the wrong length', () => {
    assert.equal(isSha256Hex(SHA256_ABC.slice(0, 63)), false);
    assert.equal(isSha256Hex(`${SHA256_ABC}0`), false);
    assert.equal(isSha256Hex(`0x${SHA256_ABC.slice(0, 62)}`), false);
    assert.equal(isSha256Hex(''), false);
  });

  it('rejects non-hex characters', () => {
    assert.equal(isSha256Hex(`${SHA256_ABC.slice(0, 63)}g`), false);
    assert.equal(isSha256Hex(SHA256_ABC.replace('a', ' ')), false);
  });

  it('rejects IPFS CIDs and URLs', () => {
    assert.equal(isSha256Hex('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'), false);
    assert.equal(isSha256Hex('https://example.com/proof.pdf'), false);
  });

  it('rejects a double prefix', () => {
    assert.equal(isSha256Hex(`0x0x${SHA256_ABC}`), false);
  });
});

describe('formatBytes', () => {
  it('formats values under 1 KB as bytes', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1), '1 B');
    assert.equal(formatBytes(1023), '1023 B');
  });

  it('formats kilobytes with one decimal under 10', () => {
    assert.equal(formatBytes(1024), '1.0 KB');
    assert.equal(formatBytes(1536), '1.5 KB');
  });

  it('formats values of 10 or more without decimals', () => {
    assert.equal(formatBytes(10 * 1024), '10 KB');
    assert.equal(formatBytes(1023 * 1024), '1023 KB');
  });

  it('formats megabytes and the proof file limit', () => {
    assert.equal(formatBytes(1024 * 1024), '1.0 MB');
    assert.equal(formatBytes(MAX_PROOF_FILE_BYTES), '50 MB');
  });

  it('formats gigabytes and caps the unit at GB', () => {
    assert.equal(formatBytes(1024 ** 3), '1.0 GB');
    assert.equal(formatBytes(1024 ** 4), '1024 GB');
  });
});
