import { DateTime } from "luxon";

/* ---------- Base ---------- */

export interface BaseDocument<T> {
  docId: string;
  docType: string;
  data: T;
}

/* ---------- Work Order ---------- */

export interface WorkOrderData {
  workOrderNumber: string;
  manufacturingOrderId: string;
  workCenterId: string;

  startDate: string;
  endDate: string;
  durationMinutes: number;

  isMaintenance: boolean;
  dependsOnWorkOrderIds: string[];
}

export type WorkOrderDoc = BaseDocument<WorkOrderData> & {
  docType: "workOrder";
};

/* ---------- Work Center ---------- */

export interface Shift {
  dayOfWeek: number; // 0-6
  startHour: number;
  endHour: number;
}

export interface MaintenanceWindow {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface WorkCenterData {
  name: string;
  shifts: Shift[];
  maintenanceWindows: MaintenanceWindow[];
}

export type WorkCenterDoc = BaseDocument<WorkCenterData> & {
  docType: "workCenter";
};

/* ---------- Results ---------- */

export interface ScheduleSegment {
  start: DateTime;
  end: DateTime;
}

export interface ScheduledWorkOrder {
  workOrderId: string;
  workCenterId: string;
  start: DateTime;
  end: DateTime;
  segments: ScheduleSegment[];
}

export interface ScheduleChange {
  workOrderId: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
  deltaMinutes: number;
  reasons: string[];
}

export interface ReflowResult {
  schedule: ScheduledWorkOrder[];
  changes: ScheduleChange[];
}

/* ---------- Manufacturing Order ---------- */

export interface ManufacturingOrderData {
  manufacturingOrderNumber: string;
  itemId: string;
  quantity: number;
  dueDate: string;
}

export type ManufacturingOrderDoc = BaseDocument<ManufacturingOrderData> & {
  docType: "manufacturingOrder";
};

