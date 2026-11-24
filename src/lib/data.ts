export type OrderStatus = "Assigned" | "Out for Delivery" | "Rescheduled" | "Delivered";

export type Order = {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  landmark: string;
  value: number;
  slot: string;
  status: OrderStatus;
  preferredLanguage: string;
};

export const orders: Order[] = [
  { id: "ORD-2026-10024", customerName: "Priya Sharma", phone: "+91 98765 43210", city: "Chennai", address: "14, Anna Nagar West, Chennai", landmark: "Near Metro Station", value: 1299, slot: "2 PM–5 PM", status: "Out for Delivery", preferredLanguage: "Tanglish" },
  { id: "ORD-2026-10031", customerName: "Arjun Reddy", phone: "+91 98450 12847", city: "Bengaluru", address: "88, 5th Cross, Indiranagar, Bengaluru", landmark: "Opposite Café Azzure", value: 7800, slot: "10 AM–1 PM", status: "Assigned", preferredLanguage: "English" },
  { id: "ORD-2026-10045", customerName: "Lakshmi Iyer", phone: "+91 94433 78102", city: "Coimbatore", address: "23, Saibaba Colony, Coimbatore", landmark: "Vinayagar Temple", value: 2450, slot: "5 PM–8 PM", status: "Out for Delivery", preferredLanguage: "Tamil" },
  { id: "ORD-2026-10058", customerName: "Mohammed Salman", phone: "+91 98942 66311", city: "Madurai", address: "Flat 4B, Meenakshi Nagar, Madurai", landmark: "Near Meenakshi College", value: 899, slot: "1 PM–4 PM", status: "Assigned", preferredLanguage: "Hinglish" },
  { id: "ORD-2026-10063", customerName: "Anjali Mehta", phone: "+91 99802 44129", city: "Jaipur", address: "19, Vaishali Marg, Jaipur", landmark: "Pink City gate side", value: 5200, slot: "11 AM–2 PM", status: "Out for Delivery", preferredLanguage: "Hindi" },
  { id: "ORD-2026-10077", customerName: "Rahul Verma", phone: "+91 94150 22904", city: "Lucknow", address: "House 47, Gomti Nagar, Lucknow", landmark: "Wave Mall ki side", value: 1650, slot: "3 PM–6 PM", status: "Assigned", preferredLanguage: "Hinglish" },
];

export const knowledgeDocuments = [
  { id: "reschedule", title: "Rescheduling policy", keywords: ["reschedule", "later", "slot", "time"], text: "Rescheduling requires the rider to confirm the new date and time slot before changing the order." },
  { id: "handoff", title: "Safe-handoff policy", keywords: ["neighbour", "neighbor", "handoff", "otp"], text: "Neighbour handoff requires explicit consent, a verified name and phone number, and OTP approval. High-value orders require dispatcher approval." },
  { id: "high-value", title: "High-value item policy", keywords: ["high value", "expensive", "5000"], text: "Orders valued at ₹5,000 or more require dispatcher approval for exceptions and neighbour handoffs." },
  { id: "otp", title: "OTP verification policy", keywords: ["otp", "verification"], text: "Approved neighbour handoff requires the delivery OTP. Never disclose or store an OTP in conversation summaries." },
  { id: "escalation", title: "Complaint escalation rules", keywords: ["refund", "payment", "fraud", "threat", "abusive", "restricted"], text: "Refunds, payment disputes, fraud, threats, abusive language, and restricted-address changes must be escalated." },
];

export function retrievePolicy(query: string) {
  const lower = query.toLowerCase();
  return knowledgeDocuments
    .filter((doc) => doc.keywords.some((word) => lower.includes(word)))
    .map((doc) => doc.text);
}
