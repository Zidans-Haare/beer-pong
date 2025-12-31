export function generateICS(event: {
    title: string;
    description: string;
    location: string;
    start: Date;
    durationMinutes: number;
}) {
    const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startTime = formatDate(event.start);
    const endTime = formatDate(new Date(event.start.getTime() + event.durationMinutes * 60000));

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BeerPongManager//DE
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${event.title}
DTSTART:${startTime}
DTEND:${endTime}
LOCATION:${event.location}
DESCRIPTION:${event.description}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
DESCRIPTION:Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`.trim();
}
