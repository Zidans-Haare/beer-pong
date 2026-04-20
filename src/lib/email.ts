import { Resend } from 'resend';
import QRCode from 'qrcode';
import { getBookingTemplate } from '@/lib/booking_template';

const resend = new Resend(process.env.RESEND_API_KEY);
const adminCc = process.env.CC_EMAIL ?? process.env.ADMIN_EMAIL ?? undefined;

function getEmailFrom(): string {
    if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    try { return `noreply@${new URL(appUrl).hostname}`; } catch { return 'noreply@localhost'; }
}

function getAppDomain(): string {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    try { return new URL(appUrl).hostname; } catch { return 'localhost'; }
}

export async function sendTournamentInviteEmail(to: string, name: string, tournament: {
    name: string;
    date: Date;
    location: string | null;
    type: string;
    id: string;
}) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const tournamentUrl = `${appUrl}/tournaments/${tournament.id}`;
    const dateStr = new Date(tournament.date).toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' });

    return resend.emails.send({
        from: getEmailFrom(),
        cc: adminCc,
        to,
        subject: `Turnier-Einladung: ${tournament.name}`,
        html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8f8fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px;text-align:center;">
              <span style="font-size:13px;font-weight:600;color:#be23d5;letter-spacing:0.05em;text-transform:uppercase;">Bierpong App</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 4px rgba(0,0,0,0.05);overflow:hidden;">

              <!-- Accent bar -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#be23d5,#9333ea);"></td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px 28px;">
                  <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f0f14;letter-spacing:-0.3px;">Du bist eingeladen!</h1>
                  <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
                    Hallo ${name},<br><br>
                    es gibt ein neues Bierpong-Turnier und du bist dabei!
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
                    <tr>
                      <td style="padding:16px;background:#f8f8fc;border-radius:8px;border:1px solid rgba(0,0,0,0.07);">
                        <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Turnier</p>
                        <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0f0f14;">${tournament.name}</p>
                        <p style="margin:0 0 4px;font-size:13px;color:#52525b;">📅 ${dateStr}</p>
                        ${tournament.location ? `<p style="margin:0 0 4px;font-size:13px;color:#52525b;">📍 ${tournament.location}</p>` : ''}
                        <p style="margin:0;font-size:13px;color:#52525b;">🏓 ${tournament.type === 'TEAM' ? 'Team (2v2)' : 'Solo (1v1)'}</p>
                      </td>
                    </tr>
                  </table>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <a href="${tournamentUrl}"
                           style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#be23d5,#9333ea);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.1px;">
                          Zum Turnier
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                    Oder kopiere diesen Link in deinen Browser:<br>
                    <a href="${tournamentUrl}" style="color:#be23d5;text-decoration:none;">${tournamentUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 40px 20px;border-top:1px solid rgba(0,0,0,0.07);">
                  <p style="margin:0;font-size:12px;color:#a1a1aa;">
                    Du erhältst diese Email weil du als Teilnehmer eingetragen bist.
                  </p>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Bottom -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Bierpong App &middot; ${getAppDomain()}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
    });
}

export async function sendAccountApprovedEmail(to: string, name: string) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    return resend.emails.send({
        from: getEmailFrom(),
        cc: adminCc,
        to,
        subject: 'Dein Account wurde freigegeben',
        html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8f8fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px;text-align:center;">
              <span style="font-size:13px;font-weight:600;color:#be23d5;letter-spacing:0.05em;text-transform:uppercase;">Bierpong App</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 4px rgba(0,0,0,0.05);overflow:hidden;">

              <!-- Accent bar -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#be23d5,#9333ea);"></td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px 28px;">
                  <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f0f14;letter-spacing:-0.3px;">Account freigegeben</h1>
                  <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
                    Hallo ${name},<br><br>
                    dein Account wurde vom Administrator freigegeben. Du kannst dich ab sofort einloggen und an Turnieren teilnehmen.
                  </p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <a href="${loginUrl}"
                           style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#be23d5,#9333ea);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.1px;">
                          Jetzt einloggen
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                    Oder kopiere diesen Link in deinen Browser:<br>
                    <a href="${loginUrl}" style="color:#be23d5;text-decoration:none;">${loginUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 40px 20px;border-top:1px solid rgba(0,0,0,0.07);">
                  <p style="margin:0;font-size:12px;color:#a1a1aa;">
                    Falls du keinen Account beantragt hast, kannst du diese E-Mail ignorieren.
                  </p>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Bottom -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Bierpong App &middot; ${getAppDomain()}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
    });
}

export async function sendRoomReservationConfirmedEmail(to: string, name: string, tournamentName: string, hostName: string, roomDescription: string, tournamentDate: Date, hostEmail?: string) {
    const ccList: string[] = [];
    if (adminCc) ccList.push(adminCc);
    if (hostEmail) ccList.push(hostEmail);

    const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const shortFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', month: 'short', day: 'numeric' });
    
    const startDate = new Date(tournamentDate);
    const endDate = new Date(tournamentDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const checkinDate = shortFormatter.format(startDate);
    const checkinDateFull = formatter.format(startDate);
    const checkoutDateFull = formatter.format(endDate);
    const bookingDate = new Intl.DateTimeFormat('de-DE', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

    let qrCodeDataUrl: string | undefined;
    try {
        qrCodeDataUrl = await QRCode.toDataURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { width: 150, margin: 1 });
    } catch { /* QR generation failed, skip it */ }

    return resend.emails.send({
        from: getEmailFrom(),
        cc: ccList.length > 0 ? ccList : undefined,
        to,
        subject: `Buchungsbestätigung: Unterkunft bei ${hostName}`,
        html: getBookingTemplate(name, tournamentName, hostName, roomDescription, checkinDate, checkinDateFull, checkoutDateFull, bookingDate, qrCodeDataUrl),
    });
}

export async function sendCostSummaryEmail(opts: {
    to: string;
    recipientName: string;
    tournamentName: string;
    items: { userId: string; userName: string; category: string; quantity: number; price: number | null }[];
    totalCost: number;
    perPerson: number;
    myDebts: { toName: string; amount: number; paypalUrl: string | null }[];
    myCredits: { fromName: string; amount: number }[];
    allDebts?: { fromName: string; toName: string; amount: number }[];
    isAdmin?: boolean;
}) {
    const { to, recipientName, tournamentName, items, totalCost, perPerson, myDebts, myCredits, allDebts, isAdmin: adminView } = opts;
    const priced = items.filter(i => i.price != null && i.price > 0);

    const itemRows = priced.map(i => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2d36;">${i.userName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2d36;">${i.category}${i.quantity > 1 ? ` ×${i.quantity}` : ''}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2d36;text-align:right;font-weight:600;">${i.price!.toFixed(2)} €</td>
        </tr>`).join('');

    const myBalanceHtml = adminView ? '' : (() => {
        if (myDebts.length === 0 && myCredits.length === 0) {
            return `<div style="background:#1a3a2a;border:1px solid #10b981;border-radius:8px;padding:14px 18px;margin:20px 0;color:#10b981;font-weight:600;">✓ Du bist ausgeglichen — nichts zu bezahlen!</div>`;
        }
        const rows = [
            ...myDebts.map(d => {
                const safePaypalUrl = d.paypalUrl?.match(/^https:\/\/paypal\.me\/[\w.-]{1,50}$/) ? d.paypalUrl : null;
                const paypalBtn = safePaypalUrl
                    ? `<a href="${safePaypalUrl}/${d.amount.toFixed(2)}EUR" style="display:inline-block;margin-left:12px;padding:4px 12px;background:#003087;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:700;">PayPal →</a>`
                    : '';
                return `<div style="background:#3a1a1a;border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <span>Du schuldest <strong>${d.toName}</strong></span>
                    <span style="color:#ef4444;font-weight:700;">${d.amount.toFixed(2)} €${paypalBtn}</span>
                </div>`;
            }),
            ...myCredits.map(d => `
                <div style="background:#1a3a2a;border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                    <span><strong>${d.fromName}</strong> schuldet dir</span>
                    <span style="color:#10b981;font-weight:700;">${d.amount.toFixed(2)} €</span>
                </div>`),
        ].join('');
        return `<h3 style="color:#c778dd;margin:24px 0 10px;">Dein Saldo</h3>${rows}`;
    })();

    const allDebtsHtml = (adminView && allDebts && allDebts.length > 0) ? `
        <h3 style="color:#c778dd;margin:24px 0 10px;">Alle Schulden</h3>
        ${allDebts.map(d => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #2a2d36;font-size:0.9rem;">
                <span><strong>${d.fromName}</strong> → <strong>${d.toName}</strong></span>
                <span style="font-weight:700;">${d.amount.toFixed(2)} €</span>
            </div>`).join('')}
    ` : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0e0f13;font-family:system-ui,sans-serif;color:#c8c8c8;">
  <div style="max-width:540px;margin:32px auto;background:#1a1c22;border-radius:12px;overflow:hidden;border:1px solid #2a2d36;">
    <div style="background:linear-gradient(135deg,#be23d5,#7c3aed);padding:28px 32px;">
      <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.7);margin-bottom:4px;">Beer Pong</div>
      <h1 style="margin:0;font-size:1.4rem;color:#fff;">Kostenabrechnung</h1>
      <div style="color:rgba(255,255,255,0.8);margin-top:4px;">${tournamentName}</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;">Hi ${recipientName},</p>
      <p style="margin:0 0 24px;color:#8a8f9a;">hier ist die Kostenübersicht für das Turnier. ${adminView ? 'Vollständige Admin-Übersicht.' : 'Dein persönlicher Anteil ist unten aufgeführt.'}</p>

      <h3 style="color:#c778dd;margin:0 0 10px;">Was wurde mitgebracht</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #2a2d36;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#2a2d36;">
            <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#8a8f9a;">Person</th>
            <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#8a8f9a;">Item</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.8rem;color:#8a8f9a;">Preis</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="display:flex;gap:12px;margin-top:16px;">
        <div style="flex:1;background:#2a2d36;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:0.75rem;color:#8a8f9a;margin-bottom:4px;">Gesamt</div>
          <div style="font-size:1.3rem;font-weight:700;color:#fff;">${totalCost.toFixed(2)} €</div>
        </div>
        <div style="flex:1;background:#2a2d36;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:0.75rem;color:#8a8f9a;margin-bottom:4px;">Pro Person</div>
          <div style="font-size:1.3rem;font-weight:700;color:#c778dd;">${perPerson.toFixed(2)} €</div>
        </div>
      </div>

      ${myBalanceHtml}
      ${allDebtsHtml}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #2a2d36;text-align:center;font-size:0.75rem;color:#4a4f5a;">
      Beer Pong · ${getAppDomain()}
    </div>
  </div>
</body></html>`;

    return resend.emails.send({
        from: getEmailFrom(),
        to,
        subject: `Kostenabrechnung: ${tournamentName}`,
        html,
    });
}
