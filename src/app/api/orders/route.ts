import { NextResponse } from "next/server";
import { z } from "zod";
import { executeAction } from "@/lib/actions";
import { orders } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ orders });
  const result = orders.filter((order) =>
    order.id.toLowerCase().includes(query.toLowerCase()) ||
    order.phone.includes(query) ||
    order.customerName.toLowerCase().includes(query.toLowerCase())
  );
  return NextResponse.json({ orders: result });
}

const actionSchema = z.object({
  name: z.enum([
    "getOrder", "searchOrderByPhone", "getDeliveryPolicy", "rescheduleDelivery",
    "updateDeliveryLandmark", "requestSafeHandoff", "updateDeliveryStatus",
    "sendCustomerConfirmation", "createSupportTicket", "escalateToDispatcher",
  ]),
  input: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const parsed = actionSchema.parse(await request.json());
    const normalizedName =
      parsed.name === "rescheduleDelivery" ? "reschedule" :
      parsed.name === "updateDeliveryLandmark" ? "updateDeliveryLandmark" :
      parsed.name === "requestSafeHandoff" ? "requestSafeHandoff" :
      parsed.name === "updateDeliveryStatus" ? "updateDeliveryStatus" :
      parsed.name === "escalateToDispatcher" ? "escalateToDispatcher" : "getOrder";
    return NextResponse.json(executeAction(normalizedName, parsed.input));
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
