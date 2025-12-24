import { Injectable } from '@nestjs/common';

// @upgrade todo use as dependency in ReflowService
@Injectable()
export class DAG {

  private adjacency = new Map<string, Set<string>>();
  private nodes = new Set<string>();

  addNode(id: string) {
    this.nodes.add(id);
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, new Set());
    }
  }

  /**
   * Edge: from → to
   * Meaning: from must come before to
   */
  addEdge(from: string, to: string) {
    this.addNode(from);
    this.addNode(to);
    this.adjacency.get(from)!.add(to);
  }

  /**
   * Kahn's Algorithm
   * - O(V + E)
   * - Stable ordering
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();

    for (const n of this.nodes) {
      inDegree.set(n, 0);
    }

    for (const [from, tos] of this.adjacency) {
      for (const to of tos) {
        inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, deg] of inDegree) {
      if (deg === 0) queue.push(node);
    }

    const result: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const neighbor of this.adjacency.get(node) ?? []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== this.nodes.size) {
      throw new Error(this.describeCycle());
    }

    return result;
  }

  /**
   * DFS-based cycle description
   */
  private describeCycle(): string {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (stack.has(node)) {
        path.push(node);
        return true;
      }
      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);
      path.push(node);

      for (const next of this.adjacency.get(node) ?? []) {
        if (dfs(next)) return true;
      }

      stack.delete(node);
      path.pop();
      return false;
    };

    for (const n of this.nodes) {
      if (dfs(n)) break;
    }

    const cycleStart = path[path.length - 1];
    const cyclePath = path.slice(path.indexOf(cycleStart)).concat(cycleStart);

    return `Dependency cycle detected: ${cyclePath.join(" → ")}`;
  }
}
