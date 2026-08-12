import { describe, it, expect } from 'vitest';
import { canonicalizeJSON } from '../../src/core/fingerprint/canonicalJson';

describe('Canonical JSON Serializer', () => {
  it('should stringify primitive values correctly', () => {
    expect(canonicalizeJSON('hello')).toBe('"hello"');
    expect(canonicalizeJSON(123)).toBe('123');
    expect(canonicalizeJSON(true)).toBe('true');
    expect(canonicalizeJSON(null)).toBe('null');
  });

  it('should sort object keys alphabetically regardless of insertion order', () => {
    const objA = { z: 1, a: 2, m: { y: 'test', b: 'nested' } };
    const objB = { m: { b: 'nested', y: 'test' }, a: 2, z: 1 };

    expect(canonicalizeJSON(objA)).toBe(canonicalizeJSON(objB));
    expect(canonicalizeJSON(objA)).toBe('{"a":2,"m":{"b":"nested","y":"test"},"z":1}');
  });

  it('should preserve array element order while canonicalizing objects inside arrays', () => {
    const arr = [{ b: 1, a: 2 }, { y: 3, x: 4 }];
    expect(canonicalizeJSON(arr)).toBe('[{"a":2,"b":1},{"x":4,"y":3}]');
  });
});
