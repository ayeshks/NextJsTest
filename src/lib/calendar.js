// Calendar helper for Lontha Boys Party Saga 2026

export const EVENT_DETAILS = {
  title: "LONTHA BOYS PARTY SAGA - 2026",
  description:
    "Exclusive private luxury retreat at Canterbury Nature & Wellness Resort, Kandy.\nAcoustics, lasers, poolside, sound system & villa saga.\nSecurity Gate Passcode: LBO26\nEvent Portal: http://localhost:3000",
  location:
    "Canterbury Nature & Wellness Resort, Udawela Road, Udawela, Kandy, Sri Lanka",
  // Start: Oct 30, 2026 12:00 PM Sri Lanka Time (UTC+5:30 -> 06:30 UTC)
  // End: Nov 01, 2026 06:00 PM Sri Lanka Time (UTC+5:30 -> 12:30 UTC)
  startUtc: "20261030T063000Z",
  endUtc: "20261101T123000Z",
};

export function getGoogleCalendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT_DETAILS.title,
    dates: `${EVENT_DETAILS.startUtc}/${EVENT_DETAILS.endUtc}`,
    details: EVENT_DETAILS.description,
    location: EVENT_DETAILS.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile() {
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lontha Boys//Party Saga 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:lb26-${Date.now()}@lonthaboys.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${EVENT_DETAILS.startUtc}`,
    `DTEND:${EVENT_DETAILS.endUtc}`,
    `SUMMARY:${EVENT_DETAILS.title}`,
    `DESCRIPTION:${EVENT_DETAILS.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${EVENT_DETAILS.location}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Lontha Boys Party Saga in 24 hours!",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "lontha-boys-saga-2026.ics");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
