import { DAG } from "./dag.service";

describe("DAG", () => {

  test("topological sort works", () => {
    const dag = new DAG();
    dag.addEdge("A", "B");
    dag.addEdge("B", "C");

    expect(dag.topologicalSort()).toEqual(["A", "B", "C"]);
  });

  test("detects cycle", () => {
    const dag = new DAG();
    dag.addEdge("A", "B");
    dag.addEdge("B", "C");
    dag.addEdge("C", "A");

    expect(() => dag.topologicalSort()).toThrow(/cycle/i);
  });

});
