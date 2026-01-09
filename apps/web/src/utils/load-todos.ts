import { REPO_PATHS } from '@achm/data';
import { SessionReportSchema, type TodoItem } from '@achm/schemas';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface AggregatedTodoItem extends TodoItem {
  sessionId: string;
  index: number;
}

export interface NextSessionAgenda {
  sessionId: string;
  sessionDate: string;
  gameStartDate: string; // In-world date
  agenda: string; // Markdown text
}

export interface TodosResult {
  todos: AggregatedTodoItem[];
  incompleteTodos: AggregatedTodoItem[];
  nextSession: NextSessionAgenda | null;
}

/**
 * Load all todos from session reports and find the next planned session's agenda.
 */
export function loadTodos(): TodosResult {
  const reportsDir = REPO_PATHS.REPORTS();

  if (!fs.existsSync(reportsDir)) {
    return {
      todos: [],
      incompleteTodos: [],
      nextSession: null,
    };
  }

  const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.yaml'));
  const allTodos: AggregatedTodoItem[] = [];
  const plannedSessions: NextSessionAgenda[] = [];

  for (const file of files) {
    const filePath = path.join(reportsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const raw = yaml.parse(content);
      const report = SessionReportSchema.parse(raw);

      if (report.status === 'completed') {
        // Extract todos from completed sessions
        const todos = report.todo || [];
        for (let i = 0; i < todos.length; i++) {
          const item = todos[i];
          // Handle both old string format and new object format
          if (typeof item === 'string') {
            allTodos.push({
              sessionId: report.id,
              index: i,
              text: item,
              status: 'pending', // Old string todos are assumed pending
            });
          } else {
            allTodos.push({
              sessionId: report.id,
              index: i,
              text: item.text,
              status: item.status,
              source: item.source,
            });
          }
        }
      } else if (report.status === 'planned') {
        // Collect planned sessions with agendas
        const agenda = report.agenda || '';
        if (agenda) {
          plannedSessions.push({
            sessionId: report.id,
            sessionDate: report.sessionDate || '',
            gameStartDate: report.gameStartDate || '',
            agenda,
          });
        }
      }
    } catch {
      // Skip invalid files
      continue;
    }
  }

  // Sort todos by session ID (most recent first)
  allTodos.sort((a, b) => b.sessionId.localeCompare(a.sessionId));

  // Filter incomplete todos
  const incompleteTodos = allTodos.filter((t) => t.status === 'pending');

  // Find next planned session (by session ID, highest first since it's likely the next one)
  plannedSessions.sort((a, b) => b.sessionId.localeCompare(a.sessionId));
  const nextSession = plannedSessions.length > 0 ? plannedSessions[0] : null;

  return {
    todos: allTodos,
    incompleteTodos,
    nextSession,
  };
}

/**
 * Get counts of todos for the navbar badge.
 */
export function getTodoCounts(): { incomplete: number; total: number } {
  const { todos, incompleteTodos } = loadTodos();
  return {
    incomplete: incompleteTodos.length,
    total: todos.length,
  };
}
