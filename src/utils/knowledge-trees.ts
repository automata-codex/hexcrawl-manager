import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { KnowledgeNodeSchema } from '../../schemas/knowledge-node';
import type { FlatKnowledgeTree, KnowledgeNodeData } from '../types.ts';

export function flattenKnowledgeTree(
  node: KnowledgeNodeData,
  prefix: string[] = [],
): FlatKnowledgeTree {
  const id = [...prefix, node.id].join('.');
  const result: FlatKnowledgeTree = { [id]: node };
  if (node.children) {
    for (const child of node.children) {
      Object.assign(result, flattenKnowledgeTree(child, [...prefix, node.id]));
    }
  }
  return result;
}

const knowledgeTrees: Record<string, FlatKnowledgeTree> = {};

const dir = path.resolve('data/knowledge-trees');
const files = fs.readdirSync(dir).filter(file => /\.ya?ml$/.test(file));

for (const file of files) {
  const rootId = file.replace(/\.ya?ml$/, '');
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const parsed = yaml.parse(content);
  const tree = KnowledgeNodeSchema.parse(parsed);
  knowledgeTrees[rootId] = flattenKnowledgeTree(tree);
}

export { knowledgeTrees };
