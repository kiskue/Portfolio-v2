import { describe, expect, it } from 'vitest';
import { SCENE_CHUNK_MARKER as TEST_MARKER } from '../support/budgets';
import { SCENE_CHUNK_MARKER } from '@/components/sections/home/dragon/scene';

describe('the scene chunk marker', () => {
  it('is the same string in the chunk entry and in the speed gate', () => {
    expect(TEST_MARKER).toBe(SCENE_CHUNK_MARKER);
  });
});
