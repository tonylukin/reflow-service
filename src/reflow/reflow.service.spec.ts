import { ReflowService } from "./reflow.service";
import { WorkOrderDoc, WorkCenterDoc, ManufacturingOrderDoc } from "./types";
import { DateTime } from 'luxon';

const service = new ReflowService();

const wcBase: WorkCenterDoc = {
  docId: "WC1",
  docType: "workCenter",
  data: {
    name: "Assembly",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 }
    ],
    maintenanceWindows: [
      {
        startDate: "2024-05-08T12:00:00",
        endDate: "2024-05-08T13:00:00"
      }
    ]
  }
};

const woBase: WorkOrderDoc = {
  docId: "WO1",
  docType: "workOrder",
  data: {
    workOrderNumber: "1",
    manufacturingOrderId: "MO1",
    workCenterId: "WC1",
    startDate: "2024-05-06T09:00:00",
    endDate: "2024-05-06T11:00:00",
    durationMinutes: 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

const manufacturingOrderBase: ManufacturingOrderDoc = {
  docId: "MO1",
  docType: "manufacturingOrder",
  data: {
    manufacturingOrderNumber: "MO-1001",
    itemId: "P-1001",
    quantity: 100,
    dueDate: "2024-05-20T17:00:00"
  }
};

describe("ReflowService.reflow()", () => {

  test("1. schedules single order inside shift", () => {
    const result = service.reflow([woBase], [wcBase], [manufacturingOrderBase]);
    expect(result.schedule[0].end).toBe('2024-05-06 11:00:00');
  });

  test("2. pauses at shift end", () => {
    const wo = {
      ...woBase,
      docId: "WO2",
      data: {
        ...woBase?.data,
        startDate: "2024-05-06T16:00:00",
        durationMinutes: 120
      }
    } as WorkOrderDoc;

    const result = service.reflow([wo], [wcBase], [manufacturingOrderBase]);
    expect(result.schedule[0].end).toBe('2024-05-07 09:00:00');
  });

  test("3. overnight continuation", () => {
    const wo: WorkOrderDoc = {
      docId: "WO3",
      docType: "workOrder",
      data: {
        workOrderNumber: "3",
        manufacturingOrderId: "MO1",
        workCenterId: "WC1",
        startDate: "2024-05-06T16:30:00",
        endDate: "2024-05-06T18:30:00",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: []
      }
    };

    const result = service.reflow([wo], [wcBase], [manufacturingOrderBase]);
    expect(result.schedule[0].end).toBe('2024-05-07 09:00:00');
  });

  test("4. blocked by maintenance window", () => {
    const wo: WorkOrderDoc = {
      docId: "WO4",
      docType: "workOrder",
      data: {
        workOrderNumber: "4",
        manufacturingOrderId: "MO1",
        workCenterId: "WC1",
        startDate: "2024-05-08T11:00:00",
        endDate: "2024-05-08T14:00:00",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: []
      }
    };

    const result = service.reflow([wo], [wcBase], [manufacturingOrderBase]);
    expect(result.schedule[0].segments.length).toBe(2);
  });

  test("5. maintenance work order is locked", () => {
    const wo: WorkOrderDoc = {
      docId: "WO5",
      docType: "workOrder",
      data: {
        workOrderNumber: "5",
        manufacturingOrderId: "MO1",
        workCenterId: "WC1",
        startDate: "2024-05-07T10:00:00",
        endDate: "2024-05-07T12:00:00",
        durationMinutes: 120,
        isMaintenance: true,
        dependsOnWorkOrderIds: []
      }
    };

    const result = service.reflow([wo], [wcBase], [manufacturingOrderBase]);
    expect(result.schedule.length).toBe(0);
  });

  test("6. two orders same work center no overlap", () => {
    const wo1: WorkOrderDoc = {
      docId: "WO6A",
      docType: "workOrder",
      data: {
        workOrderNumber: "6A",
        manufacturingOrderId: "MO1",
        workCenterId: "WC1",
        startDate: "2024-05-06T08:00:00",
        endDate: "2024-05-06T10:00:00",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: []
      }
    };

    const wo2: WorkOrderDoc = {
      ...wo1,
      docId: "WO6B",
      data: {
        ...wo1.data,
        startDate: "2024-05-06T08:00:00"
      }
    };

    const result = service.reflow([wo1, wo2], [wcBase], [manufacturingOrderBase]);
    expect(DateTime.fromFormat(result.schedule[1].start, ReflowService.DATE_FORMAT) >= DateTime.fromFormat(result.schedule[0].end, ReflowService.DATE_FORMAT)).toBe(true);
  });

  test("7. dependency delays child", () => {
    const parent = {
      ...woBase,
      docId: "WO7A",
      data: {
        ...woBase?.data,
        startDate: "2024-05-06T08:00:00",
        durationMinutes: 240
      }
    } as WorkOrderDoc;

    const child = {
      ...parent,
      docId: "WO7B",
      data: {
        ...parent.data,
        dependsOnWorkOrderIds: ["WO7A"],
        durationMinutes: 60
      }
    };

    const result = service.reflow([parent, child], [wcBase], [manufacturingOrderBase]);
    expect(result.schedule[0]['workOrderId']).toBe('WO7A');
    expect(result.schedule[1]['workOrderId']).toBe('WO7B');
    expect(result.schedule[1].start).toBe(result.schedule[0].end)
  });

  test("8. multiple parent dependency", () => {
    const a = { ...woBase, docId: "A" } as WorkOrderDoc;
    const b = { ...woBase, docId: "B" } as WorkOrderDoc;
    const c = {
      ...woBase,
      docId: "C",
      data: {
        ...woBase?.data,
        dependsOnWorkOrderIds: ["A", "B"]
      }
    } as WorkOrderDoc;

    const result = service.reflow([a, b, c], [wcBase], [manufacturingOrderBase]);
    expect(DateTime.fromFormat(result.schedule[2].start, ReflowService.DATE_FORMAT) >= DateTime.fromFormat(result.schedule[1].end, ReflowService.DATE_FORMAT))
      .toBe(true);
  });

  test("9. skips weekend", () => {
    const wo: WorkOrderDoc = {
      docId: "WO9",
      docType: "workOrder",
      data: {
        workOrderNumber: "9",
        manufacturingOrderId: "MO1",
        workCenterId: "WC1",
        startDate: "2024-05-10T16:00:00",
        endDate: "2024-05-13T10:00:00",
        durationMinutes: 240,
        isMaintenance: false,
        dependsOnWorkOrderIds: []
      }
    };

    const result = service.reflow([wo], [wcBase], [manufacturingOrderBase]);
    expect(DateTime.fromFormat(result.schedule[0].end, ReflowService.DATE_FORMAT).weekday).toBe(1);
  });

  test("10. chain dependency A → B → C", () => {
    const a = {
      ...woBase,
      docId: "A",
      data: { ...woBase?.data, durationMinutes: 60 }
    } as WorkOrderDoc;

    const b = {
      ...a,
      docId: "B",
      data: { ...a.data, dependsOnWorkOrderIds: ["A"] }
    };

    const c = {
      ...a,
      docId: "C",
      data: { ...a.data, dependsOnWorkOrderIds: ["B"] }
    };

    const result = service.reflow([a, b, c], [wcBase], [manufacturingOrderBase]);
    expect(DateTime.fromFormat(result.schedule[2].start, ReflowService.DATE_FORMAT) >= DateTime.fromFormat(result.schedule[1].end, ReflowService.DATE_FORMAT))
      .toBe(true);
  });

});

describe("ReflowService - cyclic dependency detection", () => {
  const service = new ReflowService();

  const wc: WorkCenterDoc = {
    docId: "WC-1",
    docType: "workCenter",
    data: {
      name: "Assembly",
      shifts: [
        { dayOfWeek: 1, startHour: 8, endHour: 17 },
        { dayOfWeek: 2, startHour: 8, endHour: 17 },
        { dayOfWeek: 3, startHour: 8, endHour: 17 },
        { dayOfWeek: 4, startHour: 8, endHour: 17 },
        { dayOfWeek: 5, startHour: 8, endHour: 17 }
      ],
      maintenanceWindows: []
    }
  };

  test("throws error when cyclic dependency exists", () => {
    const woA: WorkOrderDoc = {
      docId: "A",
      docType: "workOrder",
      data: {
        workOrderNumber: "A",
        manufacturingOrderId: "MO-1",
        workCenterId: "WC-1",
        startDate: "2024-05-06T08:00:00Z",
        endDate: "2024-05-06T09:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["C"] // A → C
      }
    };

    const woB: WorkOrderDoc = {
      docId: "B",
      docType: "workOrder",
      data: {
        workOrderNumber: "B",
        manufacturingOrderId: "MO-1",
        workCenterId: "WC-1",
        startDate: "2024-05-06T09:00:00Z",
        endDate: "2024-05-06T10:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["A"] // B → A
      }
    };

    const woC: WorkOrderDoc = {
      docId: "C",
      docType: "workOrder",
      data: {
        workOrderNumber: "C",
        manufacturingOrderId: "MO-1",
        workCenterId: "WC-1",
        startDate: "2024-05-06T10:00:00Z",
        endDate: "2024-05-06T11:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["B"] // C → B
      }
    };

    expect(() => {
      service.reflow([woA, woB, woC], [wc]);
    }).toThrow(/cycle/i);
  });
});


