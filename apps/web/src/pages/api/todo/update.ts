import { REPO_PATHS, writeYamlAtomic } from '@achm/data';
import {
  SessionReportSchema,
  padSessionNum,
  parseSessionId,
  type SessionId,
} from '@achm/schemas';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { getCurrentUserRole } from '../../../utils/auth';
import { SECURITY_ROLE } from '../../../utils/constants';
import { getTodoCounts } from '../../../utils/load-todos';

import type { APIRoute } from 'astro';

interface UpdateRequest {
  sessionId: string;
  todoIndex: number;
  status: 'pending' | 'done';
}

export const POST: APIRoute = async ({ locals, request }) => {
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

  // Parse request body
  let body: UpdateRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_JSON' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { sessionId, todoIndex, status } = body;

  // Validate request
  if (!sessionId || typeof todoIndex !== 'number' || !status) {
    return new Response(
      JSON.stringify({
        error: 'Missing required fields: sessionId, todoIndex, status',
        code: 'MISSING_FIELDS',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (status !== 'pending' && status !== 'done') {
    return new Response(
      JSON.stringify({
        error: 'Invalid status. Must be "pending" or "done"',
        code: 'INVALID_STATUS',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Find and read the session report
  let paddedSessionNum: string;
  try {
    const { number } = parseSessionId(sessionId as SessionId);
    paddedSessionNum = padSessionNum(number);
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Invalid session ID format',
        code: 'INVALID_SESSION_ID',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const reportPath = path.join(REPO_PATHS.REPORTS(), `session-${paddedSessionNum}.yaml`);

  if (!fs.existsSync(reportPath)) {
    return new Response(
      JSON.stringify({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Read and parse the report
  let report;
  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    const raw = yaml.parse(content);
    report = SessionReportSchema.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Failed to parse session report',
        code: 'PARSE_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Verify it's a completed session with todos
  if (report.status !== 'completed') {
    return new Response(
      JSON.stringify({
        error: 'Session is not completed',
        code: 'NOT_COMPLETED',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const todos = report.todo || [];
  if (todoIndex < 0 || todoIndex >= todos.length) {
    return new Response(
      JSON.stringify({
        error: 'Todo index out of range',
        code: 'INDEX_OUT_OF_RANGE',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Update the todo status
  const todoItem = todos[todoIndex];
  if (typeof todoItem === 'string') {
    // Convert old string format to new object format
    todos[todoIndex] = { text: todoItem, status };
  } else {
    todos[todoIndex] = { ...todoItem, status };
  }

  // Update the report with new todos and timestamp
  const updatedReport = {
    ...report,
    todo: todos,
    updatedAt: new Date().toISOString(),
  };

  // Write the updated report
  try {
    writeYamlAtomic(reportPath, updatedReport);
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Failed to write session report',
        code: 'WRITE_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Return success with updated counts
  const counts = getTodoCounts();

  return new Response(
    JSON.stringify({
      success: true,
      ...counts,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
