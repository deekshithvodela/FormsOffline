/**
 * Forms Offline — Canonical JSON Serializer
 * 
 * Guarantee: Recursively sorts all object keys alphabetically so that identical structures
 * produce identical string representations regardless of property order.
 */

export function canonicalizeJSON(val: any): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const arrayElements = val.map((item) => canonicalizeJSON(item));
    return `[${arrayElements.join(',')}]`;
  }

  const keys = Object.keys(val).sort();
  const keyPairs = keys.map((key) => {
    const serializedValue = canonicalizeJSON(val[key]);
    return `${JSON.stringify(key)}:${serializedValue}`;
  });

  return `{${keyPairs.join(',')}}`;
}
