/**
 * Custom tree layout algorithm for rendering hierarchical data as SVG.
 * Implements a simplified Reingold-Tilford style layout.
 */

export interface TreeNode<T> {
  data: T;
  children: TreeNode<T>[];
}

export interface LayoutNode<T> {
  data: T;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode<T>[];
  parent: LayoutNode<T> | null;
}

export interface LayoutEdge<T> {
  source: LayoutNode<T>;
  target: LayoutNode<T>;
}

export interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 140,
  nodeHeight: 50,
  horizontalGap: 20,
  verticalGap: 40,
};

/**
 * Build a tree structure from flat data with parent references.
 */
export function buildTree<T extends { id: string }>(
  items: T[],
  getParentId: (item: T) => string | null,
): TreeNode<T>[] {
  const childrenMap = new Map<string | null, T[]>();

  // Group items by parent
  for (const item of items) {
    const parentId = getParentId(item);
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(item);
  }

  // Recursively build tree nodes
  function buildNode(item: T): TreeNode<T> {
    const children = childrenMap.get(item.id) ?? [];
    return {
      data: item,
      children: children.map(buildNode),
    };
  }

  // Find roots (items with null parent or parent not in dataset)
  const roots = childrenMap.get(null) ?? [];
  return roots.map(buildNode);
}

/**
 * Compute layout positions for a tree.
 * Returns positioned nodes and edges for SVG rendering.
 */
export function computeLayout<T>(
  roots: TreeNode<T>[],
  config: Partial<LayoutConfig> = {},
): { nodes: LayoutNode<T>[]; edges: LayoutEdge<T>[]; width: number; height: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const allNodes: LayoutNode<T>[] = [];
  const allEdges: LayoutEdge<T>[] = [];

  // Phase 1: Create layout nodes and compute subtree widths
  function createLayoutNode(
    node: TreeNode<T>,
    depth: number,
    parent: LayoutNode<T> | null,
  ): LayoutNode<T> {
    const layoutNode: LayoutNode<T> = {
      data: node.data,
      x: 0,
      y: depth * (cfg.nodeHeight + cfg.verticalGap),
      width: cfg.nodeWidth,
      height: cfg.nodeHeight,
      children: [],
      parent,
    };

    layoutNode.children = node.children.map((child) =>
      createLayoutNode(child, depth + 1, layoutNode),
    );

    allNodes.push(layoutNode);

    if (parent) {
      allEdges.push({ source: parent, target: layoutNode });
    }

    return layoutNode;
  }

  // Phase 2: Compute subtree width (post-order)
  function getSubtreeWidth(node: LayoutNode<T>): number {
    if (node.children.length === 0) {
      return cfg.nodeWidth;
    }
    const childrenWidth = node.children.reduce(
      (sum, child) => sum + getSubtreeWidth(child) + cfg.horizontalGap,
      -cfg.horizontalGap, // Remove extra gap after last child
    );
    return Math.max(cfg.nodeWidth, childrenWidth);
  }

  // Phase 3: Position nodes (pre-order)
  function positionNode(node: LayoutNode<T>, leftBound: number): void {
    const subtreeWidth = getSubtreeWidth(node);

    if (node.children.length === 0) {
      // Leaf node: center in its allocated space
      node.x = leftBound + subtreeWidth / 2 - cfg.nodeWidth / 2;
    } else {
      // Internal node: position children, then center parent over them
      let childLeft = leftBound;
      for (const child of node.children) {
        const childWidth = getSubtreeWidth(child);
        positionNode(child, childLeft);
        childLeft += childWidth + cfg.horizontalGap;
      }

      // Center parent over children
      const firstChild = node.children[0];
      const lastChild = node.children[node.children.length - 1];
      const childrenCenter =
        (firstChild.x + firstChild.width / 2 + lastChild.x + lastChild.width / 2) / 2;
      node.x = childrenCenter - cfg.nodeWidth / 2;
    }
  }

  // Process all roots
  let currentLeft = 0;
  const layoutRoots: LayoutNode<T>[] = [];

  for (const root of roots) {
    const layoutRoot = createLayoutNode(root, 0, null);
    layoutRoots.push(layoutRoot);
    const rootWidth = getSubtreeWidth(layoutRoot);
    positionNode(layoutRoot, currentLeft);
    currentLeft += rootWidth + cfg.horizontalGap * 2; // Extra gap between roots
  }

  // Compute bounding box
  let maxX = 0;
  let maxY = 0;
  for (const node of allNodes) {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    nodes: allNodes,
    edges: allEdges,
    width: maxX,
    height: maxY,
  };
}

/**
 * Generate SVG path data for an edge (elbow connector).
 */
export function getEdgePath<T>(edge: LayoutEdge<T>): string {
  const { source, target } = edge;
  const startX = source.x + source.width / 2;
  const startY = source.y + source.height;
  const endX = target.x + target.width / 2;
  const endY = target.y;
  const midY = (startY + endY) / 2;

  // Elbow path: down, across, down
  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
}
