// Lux Automations — end-to-end test for Lux Lead & Booking Desk.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
rmSync(join(dirname(fileURLToPath(import.meta.url)), "..", "data.json"), { force: true });

const { default: qualifyLead } = await import("../actions/qualify-lead.mjs");
const { default: checkAvailability } = await import("../actions/check-availability.mjs");
const { default: bookAppointment } = await import("../actions/book-appointment.mjs");
const { default: updateBooking } = await import("../actions/update-booking.mjs");
const { default: sendFollowUp } = await import("../actions/send-follow-up.mjs");
const { agentSay } = await import("../lib/agent.mjs");

let fails = 0;
const check = (label, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}`); if (!cond) fails++; };

const lead = await qualifyLead.run({ name: "Maya Chen", contact: "maya@blossomdental.ca", service: "lead-booking", message: "We miss calls after hours and need bookings handled — urgent, please send a quote this week.", actor: "test" });
check("qualify-lead scores a complete urgent lead hot (>=80)", lead.score >= 80 && lead.tier === "hot");

const avail = await checkAvailability.run({ service: "lead-booking", date: "" });
check("check-availability returns open slots", avail.openSlots.length > 0);
const slot = avail.openSlots[0];

const booking = await bookAppointment.run({ leadId: lead.id, slotId: slot.id, actor: "agent" });
check("agent booking lands as PROPOSED (human in control)", booking.status === "proposed");

let doubleBookBlocked = false;
try { await bookAppointment.run({ leadId: lead.id, slotId: slot.id, actor: "agent" }); } catch { doubleBookBlocked = true; }
check("double-booking the same slot is rejected", doubleBookBlocked);

const approved = await updateBooking.run({ bookingId: booking.id, change: "approve", newSlotId: "", actor: "ui" });
check("human approve → confirmed", approved.status === "confirmed");

const moved = await updateBooking.run({ bookingId: booking.id, change: "move", newSlotId: avail.openSlots[2].id, actor: "ui" });
check("human move → new slot/date recorded", moved.slotId === avail.openSlots[2].id);

const draft = await sendFollowUp.run({ leadId: lead.id, actor: "test" });
check("follow-up is a draft, explicitly not sent", draft.status.includes("draft") && draft.body.includes("Maya"));

const reply = await agentSay("availability chatbot");
check("agent answers via the shared check-availability action", /open slots/i.test(reply));

const reply2 = await agentSay(`cancel ${booking.id}`);
check("agent cancel via shared update-booking action frees the booking", /cancelled/.test(reply2));

console.log(fails === 0 ? "ALL TESTS PASS" : `${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
