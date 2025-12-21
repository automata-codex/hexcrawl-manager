import { writeYamlAtomic } from '@achm/data';
import { RegionSchema } from '@achm/schemas';
import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { getCurrentUserRole } from '../../../../utils/auth';
import { SECURITY_ROLE } from '../../../../utils/constants';

// Resolve the regions directory path
const DATA_DIR = path.resolve(process.cwd(), '../../data');
const REGIONS_DIR = path.join(DATA_DIR, 'regions');

export const POST: APIRoute = async ({ locals, params }) => {
  const role = getCurrentUserRole(locals);

  if (role !== SECURITY_ROLE.GM) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Missing region ID', code: 'MISSING_ID' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Find the region file (could be .yaml or .yml)
  const yamlPath = path.join(REGIONS_DIR, `${id}.yaml`);
  const ymlPath = path.join(REGIONS_DIR, `${id}.yml`);
  const regionPath = fs.existsSync(yamlPath) ? yamlPath : fs.existsSync(ymlPath) ? ymlPath : null;

  if (!regionPath) {
    return new Response(
      JSON.stringify({ error: 'Region not found', code: 'NOT_FOUND' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Read and parse the region file
  let region;
  try {
    const content = fs.readFileSync(regionPath, 'utf8');
    const raw = yaml.parse(content);
    region = RegionSchema.parse(raw);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to parse region file',
        code: 'PARSE_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Check if herald is already complete
  if (region.heraldComplete) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Herald already complete',
        alreadyComplete: true,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Update the region with heraldComplete: true
  const updatedRegion = {
    ...region,
    heraldComplete: true,
  };

  // Write the updated region
  try {
    writeYamlAtomic(regionPath, updatedRegion);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to write region file',
        code: 'WRITE_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Herald marked complete',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
