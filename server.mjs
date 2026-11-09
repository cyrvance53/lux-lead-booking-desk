// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
// Minimal server: serves the UI and dispatches /api/actions/<name> to the SAME
// defineAction definitions the agent imports. One capability, one implementation.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import qualifyLead from "./actions/qualify-lead.mjs";
import checkAvailability from "./actions/check-availability.mjs";
import bookAppointment from "./actions/book-appointment.mjs";
import updateBooking from "./actions/update-booking.mjs";
import sendFollowUp from "./actions/send-follow-up.mjs";
import { agentSay } from "./lib/agent.mjs";
import { load } from "./lib/store.mjs";

const ACTIONS = {
  "qualify-lead": qualifyLead,
  "check-availability": checkAvailability,
  "book-appointment": bookAppointment,
  "update-booking": updateBooking,
  "send-follow-up": sendFollowUp,
};
const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "public", "index.html"), "utf8");
const PORT = process.env.PORT || 4173;

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/") return send(res, 200, html, "text/html");
    if (url.pathname === "/api/state") return send(res, 200, load());
    if (url.pathname === "/api/agent" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => send(res, 200, { reply: await agentSay(JSON.parse(body || "{}").text || "") }));
      return;
    }
    const m = url.pathname.match(/^\/api\/actions\/([\w-]+)$/);
    if (m && ACTIONS[m[1]]) {
      const action = ACTIONS[m[1]];
      if (req.method === "GET") {
        return send(res, 200, await action.run(Object.fromEntries(url.searchParams)));
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        try {
          const input = JSON.parse(body || "{}");
          send(res, 200, await action.run(input));
        } catch (e) {
          send(res, 400, { error: String(e.message || e) });
        }
      });
      return;
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 400, { error: String(e.message || e) });
  }
}).listen(PORT, () => console.log(`Lux Lead & Booking Desk listening on http://localhost:${PORT}`));
