import { beforeEach, describe, expect, test } from "bun:test";
import type { Step, TrimStep } from "@/features/plan/steps";
import { stepId } from "@/features/plan/steps";
import { useProjectStore } from "./useProjectStore";

function trim(seconds: number): Step {
  return { id: stepId(), enabled: true, type: "trim", mode: "start", seconds, from: 0, to: 0 };
}

describe("undo/redo history", () => {
  beforeEach(() => {
    useProjectStore.setState({ steps: [], past: [], future: [], chat: [] });
  });

  test("add round trips", () => {
    const s = useProjectStore.getState();
    s.addSteps([trim(3)]);
    expect(useProjectStore.getState().steps).toHaveLength(1);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().steps).toHaveLength(0);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().steps).toHaveLength(1);
  });

  test("edit round trips", () => {
    const step = trim(3);
    useProjectStore.getState().addSteps([step]);
    useProjectStore.getState().updateStep(step.id, { seconds: 5 } as Partial<Step>);
    expect((useProjectStore.getState().steps[0] as TrimStep).seconds).toBe(5);
    useProjectStore.getState().undo();
    expect((useProjectStore.getState().steps[0] as TrimStep).seconds).toBe(3);
    useProjectStore.getState().redo();
    expect((useProjectStore.getState().steps[0] as TrimStep).seconds).toBe(5);
  });

  test("reorder round trips", () => {
    const a = trim(1);
    const b = trim(2);
    useProjectStore.getState().addSteps([a, b]);
    useProjectStore.getState().reorderSteps(0, 1);
    expect(useProjectStore.getState().steps[0].id).toBe(b.id);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().steps[0].id).toBe(a.id);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().steps[0].id).toBe(b.id);
  });

  test("delete round trips", () => {
    const a = trim(1);
    useProjectStore.getState().addSteps([a]);
    useProjectStore.getState().removeStep(a.id);
    expect(useProjectStore.getState().steps).toHaveLength(0);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().steps).toHaveLength(1);
  });

  test("new action clears the redo stack", () => {
    useProjectStore.getState().addSteps([trim(1)]);
    useProjectStore.getState().undo();
    useProjectStore.getState().addSteps([trim(2)]);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().steps).toHaveLength(1);
    expect((useProjectStore.getState().steps[0] as TrimStep).seconds).toBe(2);
  });
});
