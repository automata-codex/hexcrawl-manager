import type { KnowledgeNodeData } from '../types.ts';

export function flattenKnowledgeTree(
  node: KnowledgeNodeData,
  parentPath: string[] = []
): { fullId: string; node: KnowledgeNodeData }[] {
  const fullId = [...parentPath, node.id].join('.');
  const entries = [{ fullId, node }];
  if (node.children) {
    for (const child of node.children) {
      entries.push(...flattenKnowledgeTree(child, [...parentPath, node.id]));
    }
  }
  return entries;
}
