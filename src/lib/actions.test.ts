import { describe, expect, it } from "vitest";
import { executeAction } from "./actions";

describe("RouteSaathi business actions", () => {
  it("reschedules an order and updates the landmark", () => {
    const result = executeAction("reschedule", {
      orderId: "ORD-2026-10024",
      date: "Today",
      timeSlot: "5 PM–8 PM",
      reason: "Customer at office",
    });
    expect(result.ok).toBe(true);
    expect(result.order?.slot).toBe("5 PM–8 PM");

    const landmark = executeAction("updateDeliveryLandmark", {
      orderId: "ORD-2026-10024",
      landmark: "Temple ke paas",
    });
    expect(landmark.ok).toBe(true);
    expect(landmark.order?.landmark).toBe("Temple ke paas");
  });

  it("blocks neighbour handoff for a high-value order", () => {
    const result = executeAction("requestSafeHandoff", {
      orderId: "ORD-2026-10031",
      neighbourName: "Anita",
      neighbourPhone: "+91 99999 11111",
      otp: "123456",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("dispatcher approval");
  });

  it("allows OTP handoff for a low-value order", () => {
    const result = executeAction("requestSafeHandoff", {
      orderId: "ORD-2026-10024",
      neighbourName: "Anita",
      neighbourPhone: "+91 99999 11111",
      otp: "123456",
    });
    expect(result.ok).toBe(true);
  });
});
