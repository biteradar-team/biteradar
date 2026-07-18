import {describe, expect, test} from 'vitest';
import {isAllowed} from './admin-allowlist';

describe('isAllowed', () => {
  const csv = 'ana@biteradar.rs, Marko@Biteradar.rs';

  test('allows an email in the list', () => {
    expect(isAllowed('ana@biteradar.rs', csv)).toBe(true);
  });

  test('is case-insensitive on both sides', () => {
    expect(isAllowed('MARKO@biteradar.rs', csv)).toBe(true);
    expect(isAllowed('ana@BITERADAR.rs', csv)).toBe(true);
  });

  test('trims whitespace around entries', () => {
    expect(isAllowed('marko@biteradar.rs', '  marko@biteradar.rs  ')).toBe(true);
  });

  test('denies an email not in the list', () => {
    expect(isAllowed('intruder@evil.com', csv)).toBe(false);
  });

  test('denies everyone when the allowlist is empty or unset', () => {
    expect(isAllowed('ana@biteradar.rs', '')).toBe(false);
    expect(isAllowed('ana@biteradar.rs', undefined)).toBe(false);
    expect(isAllowed('ana@biteradar.rs', '  ,  ')).toBe(false);
  });

  test('denies empty / missing email', () => {
    expect(isAllowed('', csv)).toBe(false);
    expect(isAllowed(null, csv)).toBe(false);
    expect(isAllowed(undefined, csv)).toBe(false);
  });
});
