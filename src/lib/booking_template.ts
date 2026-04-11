const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Beer Pong';

function esc(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export const getBookingTemplate = (
    name: string,
    tournamentName: string,
    hostName: string,
    roomDescription: string,
    checkinDate: string,
    checkinDateFull: string,
    checkoutDateFull: string,
    bookingDate: string,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Buchungsbestätigung – ${esc(hostName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#7c3aed;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;">${esc(appName)}</p>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.01em;">Buchung bestätigt</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">

            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">
              Hallo <strong>${esc(name)}</strong>,
            </p>
            <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#374151;">
              deine Zimmerbuchung wurde bestätigt. Hier ist eine Zusammenfassung:
            </p>

            <!-- Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5ff;border:1px solid #e9d5ff;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7c3aed;">Unterkunft</p>
                  <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a1a2e;">${esc(hostName)}</p>
                  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">${esc(roomDescription)}</p>
                  <hr style="border:none;border-top:1px solid #e9d5ff;margin:0 0 18px;" />
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#6b7280;padding-bottom:10px;">Turnier</td>
                      <td style="font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;padding-bottom:10px;">${esc(tournamentName)}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;padding-bottom:10px;">Anreise</td>
                      <td style="font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;padding-bottom:10px;">${esc(checkinDateFull)}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;padding-bottom:10px;">Abreise</td>
                      <td style="font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;padding-bottom:10px;">${esc(checkoutDateFull)}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;">Buchungsdatum</td>
                      <td style="font-size:13px;color:#9ca3af;text-align:right;">${esc(bookingDate)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
              Wir freuen uns auf dich beim Turnier!
            </p>

            <!-- Digital Check-In QR -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;background: #f9f5ff;border: 1px dashed #e9d5ff;border-radius: 12px;">
              <tr>
                <td align="center" style="padding: 24px;">
                  <p style="margin:0 0 12px;font-size:12px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Digitaler Check-In</p>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.youtube.com/watch?v=dQw4w9WgXcQ" alt="Check-In" width="150" height="150" style="display:block;border-radius:8px;border:4px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.08);" />
                  <p style="margin:16px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Diesen QR-Code bitte beim Check-In vorzeigen, dann kommt das Rick Roll Video von YT :)</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
              Viele Grüße,<br />
              <strong>Das ${esc(appName)}-Team</strong>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f5ff;padding:18px 40px;border-top:1px solid #e9d5ff;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Diese E-Mail wurde automatisch durch ${esc(appName)} versandt.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
