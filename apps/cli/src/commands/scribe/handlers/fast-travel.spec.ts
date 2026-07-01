import * as cliKit from '@achm/cli-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import fastTravel from './fast-travel';
import fastTravelAbort from './fast-travel/abort';
import fastTravelPlanAndExecute from './fast-travel/plan-and-execute';
import fastTravelResume from './fast-travel/resume';
import fastTravelStatus from './fast-travel/status';

import type { Context } from '../types';

// Mock the leaf handlers so only the router's flag parsing / dispatch is tested.
vi.mock('./fast-travel/plan-and-execute', () => ({ default: vi.fn() }));
vi.mock('./fast-travel/resume', () => ({ default: vi.fn() }));
vi.mock('./fast-travel/status', () => ({ default: vi.fn() }));
vi.mock('./fast-travel/abort', () => ({ default: vi.fn() }));
// The router validates a destination hex; stub the map-backed helpers.
vi.mock('@achm/core', () => ({
  isValidHexId: () => true,
  normalizeHexId: (hex: string) => hex.toUpperCase(),
}));
vi.mock('@achm/data', () => ({
  loadMapConfig: () => ({ grid: { notation: 'flat' } }),
}));

const ctx = {} as Context;
const run = (args: string[]) => fastTravel(ctx)(args);

describe('fast travel router — flag & dispatch parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cliKit, 'usage').mockImplementation(() => '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes a bare destination with default pace and REC on', () => {
    run(['P13']);
    expect(fastTravelPlanAndExecute).toHaveBeenCalledWith(
      ctx,
      'P13',
      'normal',
      false,
    );
  });

  it('passes --no-rec through for a destination', () => {
    run(['P13', '--no-rec']);
    expect(fastTravelPlanAndExecute).toHaveBeenCalledWith(
      ctx,
      'P13',
      'normal',
      true,
    );
  });

  it('accepts --no-rec alongside an explicit pace, in any position', () => {
    run(['P13', 'slow', '--no-rec']);
    expect(fastTravelPlanAndExecute).toHaveBeenNthCalledWith(
      1,
      ctx,
      'P13',
      'slow',
      true,
    );

    run(['--no-rec', 'P13', 'fast']);
    expect(fastTravelPlanAndExecute).toHaveBeenNthCalledWith(
      2,
      ctx,
      'P13',
      'fast',
      true,
    );
  });

  it('passes --no-rec through to resume, defaulting to off', () => {
    run(['resume', '--no-rec']);
    expect(fastTravelResume).toHaveBeenCalledWith(ctx, true);

    run(['resume']);
    expect(fastTravelResume).toHaveBeenCalledWith(ctx, false);
  });

  it('dispatches status and abort without a REC flag', () => {
    run(['status']);
    expect(fastTravelStatus).toHaveBeenCalledWith(ctx);

    run(['abort']);
    expect(fastTravelAbort).toHaveBeenCalledWith(ctx);
  });

  it('rejects an unknown flag with usage and dispatches nothing', () => {
    run(['P13', '--nope']);
    expect(cliKit.usage).toHaveBeenCalled();
    expect(fastTravelPlanAndExecute).not.toHaveBeenCalled();
  });
});
