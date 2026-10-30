import { afterEach, describe, expect, it, vi } from "vitest";

import { salesService } from "./sales.service";

describe("Sales service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates new sales with payment awaiting confirmation", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      {
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ id: "sale-1" }),
      } as Response,
    );

    await salesService.create({
      patientId: "patient-1",
      packageId: "package-1",
      value: "120.00",
      paymentMethod: "pix",
    });

    const [, init] = fetchSpy.mock.calls[0]!;
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      patientId: "patient-1",
      packageId: "package-1",
      value: "120.00",
      paymentMethod: "pix",
      paymentStatus: "open",
    });
  });
});
