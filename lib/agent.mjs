// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
// The in-app agent. It calls the SAME defineAction definitions the UI calls.
import qualifyLead from "../actions/qualify-lead.mjs";
import checkAvailability from "../actions/check-availability.mjs";
import bookAppointment from "../actions/book-appointment.mjs";
import updateBooking from "../actions/update-booking.mjs";
import sendFollowUp from "../actions/send-follow-up.mjs";
import { load, SERVICES } from "./store.mjs";

const SERVICE_WORDS = [
  [/receptionist|phone|call/i, "ai-receptionist"],
  [/chatbot|whatsapp|website chat/i, "chatbot"],
  [/booking|lead/i, "lead-booking"],
  [/crm|automation|workflow/i, "crm-automation"],
];
const pickService = (text, fallback = "lead-booking") =>
  (SERVICE_WORDS.find(([re]) => re.test(text)) || [])[1] || fallback;

export async function agentSay(textRaw) {
  const text = String(textRaw || "").trim();
  const state = load();
  try {
    let m = text.match(/^book\s+(\S+)/i);
    if (m) {
      const lead = state.leads.find((l) => l.id === m[1]) || state.leads.find((l) => l.name.toLowerCase().includes(m[1].toLowerCase()));
      if (!lead) return `I couldn't find that lead. Qualify them first, or check the lead list.`;
      const avail = await checkAvailability.run({ service: lead.service, date: "" });
      if (!avail.openSlots.length) return `No open slots left for ${avail.serviceLabel}.`;
      const slot = avail.openSlots[0];
      const b = await bookAppointment.run({ leadId: lead.id, slotId: slot.id, actor: "agent" });
      return `Proposed booking ${b.id} for ${lead.name}: ${b.serviceLabel} on ${b.date} at ${b.time}. It's marked PROPOSED — approve, move or cancel it in the Bookings panel.`;
    }
    m = text.match(/^(approve|cancel)\s+(\S+)/i);
    if (m) {
      const b = await updateBooking.run({ bookingId: m[2], change: m[1].toLowerCase(), newSlotId: "", actor: "agent" });
      return `Done — booking ${b.id} is now ${b.status}.`;
    }
    if (/availab|open slots|when/i.test(text)) {
      const service = pickService(text);
      const avail = await checkAvailability.run({ service, date: "" });
      const list = avail.openSlots.slice(0, 5).map((s) => `${s.date} ${s.time}`).join(" · ");
      return `${avail.serviceLabel} (${avail.minutes} min) — next open slots: ${list || "none"}.`;
    }
    m = text.match(/follow\s?up\s+(\S+)/i);
    if (m) {
      const lead = state.leads.find((l) => l.id === m[1]) || state.leads.find((l) => l.name.toLowerCase().includes(m[1].toLowerCase()));
      if (!lead) return `I couldn't find that lead for a follow-up.`;
      const d = await sendFollowUp.run({ leadId: lead.id, actor: "agent" });
      return `Drafted a follow-up for ${lead.name} — it's in the Follow-ups panel as a draft for human review. Nothing was sent.`;
    }
    if (text.includes(",")) {
      const [name, contact, ...rest] = text.split(",").map((s) => s.trim());
      const message = rest.join(", ");
      const lead = await qualifyLead.run({ name, contact: contact || "", service: pickService(message || text), message, actor: "agent" });
      return `Qualified ${lead.name} as lead ${lead.id} — score ${lead.score} (${lead.tier}) for ${SERVICES[lead.service].label}. Say "book ${lead.id}" and I'll propose the earliest open slot.`;
    }
    return `I can: qualify a lead (send "Name, email, what they need"), check availability, "book lead-1", "approve booking-1", "cancel booking-1", or "follow up lead-1". Everything I do goes through the same actions as the buttons — and my bookings stay PROPOSED until a human approves them.`;
  } catch (err) {
    return `That didn't work: ${err.message}`;
  }
}
