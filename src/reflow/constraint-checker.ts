import { WorkOrderDoc, WorkCenterDoc, MaintenanceWindow } from "./types";

export class ConstraintChecker {

  /**
   * Validate that there are no cycles in work order dependencies using DFS.
   * @param {WorkOrderDoc[]} workOrders
   * @throws {Error} if a cycle is detected
   */
  static validateDependencies(workOrders: WorkOrderDoc[]) {
    const map = new Map(workOrders.map(w => [w.docId, w]));
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (id: string) => {
      if (stack.has(id)) {
        throw new Error(`Dependency cycle detected at ${id}`);
      }
      if (visited.has(id)) {
        return;
      }

      stack.add(id);
      const wo = map.get(id);
      if (!wo) {
        return;
      }

      for (const dep of wo.data.dependsOnWorkOrderIds) {
        dfs(dep);
      }

      stack.delete(id);
      visited.add(id);
    }

    for (const wo of workOrders) {
      dfs(wo.docId);
    }
  }

  /**
   * Topologically sort work orders based on dependencies,
   * and apply maintenance windows to work centers.
   * @param {WorkOrderDoc[]} workOrders
   * @param {WorkCenterDoc[]} workCenters
   * @returns {WorkOrderDoc[]}
   */
  static topoSortAndApplyMaintenance(
      workOrders: WorkOrderDoc[],
      workCenters: WorkCenterDoc[]
    ): WorkOrderDoc[] {
      const wcMap = new Map(workCenters.map(w => [w.docId, w]));

      // 1️⃣ Convert maintenance WOs into maintenance windows
      for (const wo of workOrders) {
        if (!wo.data.isMaintenance) {
          continue;
        }

        const wc = wcMap.get(wo.data.workCenterId);
        if (!wc) {
          throw new Error(
            `Maintenance WO ${wo.docId} references missing work center`
          );
        }

        const window: MaintenanceWindow = {
          startDate: wo.data.startDate,
          endDate: wo.data.endDate,
          reason: `Maintenance WO ${wo.data.workOrderNumber}`
        };

        wc.data.maintenanceWindows.push(window);
      }

      // 2️⃣ Topological sort NON-maintenance work orders
      const map = new Map(
        workOrders
          .filter(w => !w.data.isMaintenance)
          .map(w => [w.docId, w])
      );

      const visited = new Set<string>();
      const result: WorkOrderDoc[] = [];

      const visit = (id: string) => {
        if (visited.has(id)) {
          return;
        }
        visited.add(id);

        const wo = map.get(id);
        if (!wo) {
          return;
        }

        wo.data.dependsOnWorkOrderIds.forEach(visit);
        result.push(wo);
      }

      map.forEach((_, id) => visit(id));

      return result;
    }
}
