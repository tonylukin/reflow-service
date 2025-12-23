import { Controller, Get } from '@nestjs/common';
import { ReflowService } from './reflow/reflow.service';
import { WorkCenterDoc, WorkOrderDoc } from './reflow/types';

const workCenterAssembly: WorkCenterDoc = {
  docId: "WC1",
  docType: "workCenter",
  data: {
    name: "Assembly",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 10 },
      { dayOfWeek: 2, startHour: 8, endHour: 12 },
      { dayOfWeek: 3, startHour: 8, endHour: 14 },
      { dayOfWeek: 4, startHour: 8, endHour: 16 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 }
    ],
    maintenanceWindows: [
      {
        startDate: "2024-05-08T12:00:00",
        endDate: "2024-05-08T15:00:00",
        reason: "Scheduled Maintenance"
      }
    ]
  }
};

const wo1_assembly: WorkOrderDoc = {
  docId: "WO1",
  docType: "workOrder",
  data: {
    workOrderNumber: "1",
    manufacturingOrderId: "MO1",
    workCenterId: "WC1",
    startDate: "2024-05-06T09:00:00",
    endDate: "2024-05-07T11:00:00",
    durationMinutes: 24 * 60 + 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

const wo_maintenance_assembly: WorkOrderDoc = {
  docId: "WO1_isMaintenance",
  docType: "workOrder",
  data: {
    workOrderNumber: "1_isMaintenance",
    manufacturingOrderId: "MO1",
    workCenterId: "WC1",
    startDate: "2024-05-07T09:00:00",
    endDate: "2024-05-07T11:00:00",
    durationMinutes: 120,
    isMaintenance: true,
    dependsOnWorkOrderIds: []
  }
};

const wo2_assembly: WorkOrderDoc = {
  docId: "WO2",
  docType: "workOrder",
  data: {
    workOrderNumber: "2",
    manufacturingOrderId: "MO1",
    workCenterId: "WC1",
    startDate: "2024-05-06T08:00:00",
    endDate: "2024-05-07T10:00:00",
    durationMinutes: 24 * 60 + 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

const wo3_assembly: WorkOrderDoc = {
  docId: "WO3",
  docType: "workOrder",
  data: {
    workOrderNumber: "3",
    manufacturingOrderId: "MO1",
    workCenterId: "WC1",
    startDate: "2024-05-06T09:00:00",
    endDate: "2024-05-07T11:00:00",
    durationMinutes: 24 * 60 + 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: ["WO1", "WO2"]
  }
};

const workCenterHQ: WorkCenterDoc = {
  docId: "WC2",
  docType: "workCenter",
  data: {
    name: "HQ",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 10 },
      { dayOfWeek: 2, startHour: 8, endHour: 12 },
      { dayOfWeek: 3, startHour: 8, endHour: 14 },
      { dayOfWeek: 4, startHour: 8, endHour: 16 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 }
    ],
    maintenanceWindows: [
      {
        startDate: "2024-05-06T08:00:00",
        endDate: "2024-05-07T08:00:00",
        reason: "Scheduled Maintenance"
      }
    ]
  }
};

const wo1_hq: WorkOrderDoc = {
  docId: "WO4",
  docType: "workOrder",
  data: {
    workOrderNumber: "1",
    manufacturingOrderId: "MO1",
    workCenterId: "WC2",
    startDate: "2024-05-06T09:00:00",
    endDate: "2024-05-07T11:00:00",
    durationMinutes: 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

const wo2_hq: WorkOrderDoc = {
  docId: "WO5",
  docType: "workOrder",
  data: {
    workOrderNumber: "1",
    manufacturingOrderId: "MO1",
    workCenterId: "WC2",
    startDate: "2024-05-06T09:00:00",
    endDate: "2024-05-07T11:00:00",
    durationMinutes: 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

@Controller()
export class AppController {
  constructor(private readonly reflowService: ReflowService) {}

  @Get('/reflow')
  getReflowTest() {
    try {
      const reflowResult = this.reflowService.reflow([wo2_assembly, wo1_assembly, wo3_assembly, wo_maintenance_assembly], [workCenterAssembly, workCenterHQ]);
      return reflowResult;
    } catch (error) {
      return {
        success: false,
        status: `Error: ${error.message}`
      };
    }
  }

  @Get('/reflow2')
  getReflow2Test() {
    try {
      const reflowResult = this.reflowService.reflow([wo1_hq, wo2_hq], [workCenterAssembly, workCenterHQ]);
      return reflowResult;
    } catch (error) {
      return {
        success: false,
        status: `Error: ${error.message}`
      };
    }
  }
}
