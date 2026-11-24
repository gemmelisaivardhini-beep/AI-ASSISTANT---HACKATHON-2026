import { z } from "zod";
import { orders, retrievePolicy, type Order } from "./data";

export type ActionResult = { ok: boolean; message: string; order?: Order; policy?: string[] };

const schemas = {
  getOrder: z.object({ orderId: z.string().min(5) }),
  reschedule: z.object({ orderId: z.string(), date: z.string(), timeSlot: z.string(), reason: z.string() }),
  landmark: z.object({ orderId: z.string(), landmark: z.string().min(2) }),
  handoff: z.object({ orderId: z.string(), neighbourName: z.string().min(2), neighbourPhone: z.string(), otp: z.string().regex(/^\d{6}$/) }),
  status: z.object({ orderId: z.string(), status: z.string() }),
  escalation: z.object({ orderId: z.string(), reason: z.string(), conversationSummary: z.string() }),
};

export function executeAction(name: string, input: unknown): ActionResult {
  const order = (id: string) => orders.find((item) => item.id === id);

  if (name === "getOrder") {
    const parsed = schemas.getOrder.parse(input);
    const found = order(parsed.orderId);
    if (!found) return { ok: false, message: "Order not found" };
    return { ok: true, message: "Order retrieved", order: found, policy: retrievePolicy("reschedule neighbour OTP") };
  }
  if (name === "reschedule") {
    const parsed = schemas.reschedule.parse(input);
    const found = order(parsed.orderId);
    if (!found) return { ok: false, message: "Order not found" };
    found.slot = parsed.timeSlot;
    found.status = "Rescheduled";
    return { ok: true, message: `Rescheduled to ${parsed.timeSlot}`, order: found, policy: retrievePolicy("reschedule") };
  }
  if (name === "updateDeliveryLandmark") {
    const parsed = schemas.landmark.parse(input);
    const found = order(parsed.orderId);
    if (!found) return { ok: false, message: "Order not found" };
    found.landmark = parsed.landmark;
    return { ok: true, message: `Landmark updated to ${parsed.landmark}`, order: found, policy: retrievePolicy("address") };
  }
  if (name === "updateDeliveryStatus") {
    const parsed = schemas.status.parse(input);
    const found = order(parsed.orderId);
    if (!found) return { ok: false, message: "Order not found" };
    found.status = parsed.status as Order["status"];
    return { ok: true, message: `Status updated to ${parsed.status}`, order: found };
  }
  if (name === "escalateToDispatcher") {
    const parsed = schemas.escalation.parse(input);
    return { ok: true, message: `Escalation created for ${parsed.orderId}`, policy: retrievePolicy(parsed.reason) };
  }
  if (name === "requestSafeHandoff") {
    const parsed = schemas.handoff.parse(input);
    const found = order(parsed.orderId);
    if (!found) return { ok: false, message: "Order not found" };
    if (found.value >= 5000) return { ok: false, message: "High-value handoff requires dispatcher approval", policy: retrievePolicy("high value OTP neighbour") };
    return { ok: true, message: `Safe handoff approved for ${parsed.neighbourName}`, order: found, policy: retrievePolicy("neighbour OTP") };
  }
  return { ok: false, message: "Unknown action" };
}
