import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAccountApprovedEmail(to: string, name: string) {
    const appUrl = process.env.APP_URL ?? 'https://bier.olomek.com';
    const loginUrl = `${appUrl}/login`;

    return resend.emails.send({
        from: 'noreply@bier.olomek.com',
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
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Bierpong App &middot; bier.olomek.com</p>
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
