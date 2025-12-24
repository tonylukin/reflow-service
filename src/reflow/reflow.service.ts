import { DateTime } from "luxon";
import {
  WorkOrderDoc,
  WorkCenterDoc,
  ReflowResult,
  ScheduledWorkOrder,
  ScheduleChange, ManufacturingOrderDoc
} from "./types";
import { ConstraintChecker } from "./constraint-checker";
import * as D from "../utils/date-utils";
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReflowService {

  public static readonly DATE_FORMAT: string = 'yyyy-LL-dd HH:mm:ss';

  /**
   * Reflow work orders to generate a new schedule.
   * Respects dependencies, work center shifts, and maintenance windows.
   * @param workOrders
   * @param workCenters
   * @param manufacturingOrders
   */
  reflow(
    workOrders: WorkOrderDoc[],
    workCenters: WorkCenterDoc[],
    manufacturingOrders: ManufacturingOrderDoc[] = [] // @upgrade todo check by manufacturing orders later
  ): ReflowResult {

    ConstraintChecker.validateDependencies(workOrders);
    const ordered = ConstraintChecker.topoSortAndApplyMaintenance(workOrders, workCenters);

    const wcMap = new Map(workCenters.map(w => [w.docId, w]));
    const completion = new Map<string, DateTime>();
    const wcAvailability = new Map<string, DateTime>();

    const schedule: ScheduledWorkOrder[] = [];
    const changes: ScheduleChange[] = [];

    for (const wo of ordered) {
      const wc = wcMap.get(wo.data.workCenterId);
      if (!wc) {
        throw new Error("Missing work center");
      }

      const originalStart = D.toDT(wo.data.startDate);
      let cursor = originalStart;

      for (const dep of wo.data.dependsOnWorkOrderIds) {
        const depEnd = completion.get(dep);
        if (depEnd && depEnd > cursor) {
          cursor = depEnd;
        }
      }

      const wcFree = wcAvailability.get(wc.docId);
      if (wcFree && wcFree > cursor) {
        cursor = wcFree;
      }

      let remaining = wo.data.durationMinutes;
      const segments: {start: DateTime, end: DateTime}[] = [];
      const reasons: string[] = [];

      while (remaining > 0) {
        if (!D.isWithinShift(cursor, wc.data.shifts)) {
          reasons.push("Paused outside shift hours");
          cursor = D.nextShiftStart(cursor, wc.data.shifts);
          continue;
        }

        const maintenance = D.inMaintenance(cursor, wc.data.maintenanceWindows);
        if (maintenance) {
          reasons.push("Paused for maintenance window");
          cursor = DateTime.fromISO(maintenance.endDate);
          continue;
        }

        const shiftEnd = D.shiftEnd(cursor, wc.data.shifts);
        const maintenanceStart = D.nextMaintenance(cursor, wc.data.maintenanceWindows);

        let blockEnd = shiftEnd;
        if (maintenanceStart && maintenanceStart < blockEnd) {
          blockEnd = maintenanceStart;
        }

        const workable = Math.min(
          remaining,
          D.minutesBetween(cursor, blockEnd)
        );

        if (workable <= 0) {
          cursor = blockEnd;
          continue;
        }

        const start = cursor;
        const end = cursor.plus({ minutes: workable });
        segments.push({ start: start.toFormat(ReflowService.DATE_FORMAT), end: end.toFormat(ReflowService.DATE_FORMAT) });

        cursor = end;
        remaining -= workable;
      }

      completion.set(wo.docId, cursor);
      wcAvailability.set(wc.docId, cursor);

      schedule.push({
        workOrderId: wo.docId,
        workCenterId: wc.docId,
        start: segments[0].start,
        end: cursor.toFormat(ReflowService.DATE_FORMAT),
        segments
      });

      const oldEnd = D.toDT(wo.data.endDate);
      if (!oldEnd.equals(cursor)) {
        changes.push({
          workOrderId: wo.docId,
          oldStart: D.toDT(wo.data.startDate).toFormat(ReflowService.DATE_FORMAT),
          oldEnd: oldEnd.toFormat(ReflowService.DATE_FORMAT),
          newStart: segments[0].start,
          newEnd: cursor.toFormat(ReflowService.DATE_FORMAT),
          deltaMinutes: cursor.diff(oldEnd, "minutes").minutes,
          reasons
        });
      }
    }

    return { schedule, changes };
  }
}
