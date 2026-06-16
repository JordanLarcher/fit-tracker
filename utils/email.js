const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000,
  socketTimeout: 5000,
});

const sendPasswordResetEmail = async (to, resetUrl) => {
  const mailOptions = {
    from: `"FitTrack" <${process.env.EMAIL_FROM || 'noreply@fittrack.app'}>`,
    to,
    subject: 'Reset your FitTrack password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:18px;height:18px;border-radius:6px;background-color:#3cb9a0;display:inline-block;vertical-align:middle;margin-right:8px;"></td>
                        <td style="font-size:22px;font-weight:800;color:#20262e;letter-spacing:-.3px;vertical-align:middle;">Tempo</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Card -->
                <tr>
                  <td style="background-color:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:20px;font-weight:700;color:#20262e;padding-bottom:16px;">Reset your password</td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;line-height:1.6;color:#4b5563;padding-bottom:24px;">
                          We received a request to reset your FitTrack password. Click the button below to set a new one.
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom:24px;">
                          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;background-color:#20262e;border-radius:10px;text-decoration:none;letter-spacing:.2px;">
                            Reset password
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;line-height:1.5;color:#9aa1a9;border-top:1px solid #e6e8eb;padding-top:20px;">
                          <strong style="color:#6b7280;">Link expires in 1 hour</strong><br>
                          If you didn't request this, you can safely ignore this email — your password won't change.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding-top:24px;font-size:12px;color:#9aa1a9;line-height:1.5;">
                    FitTrack &middot; Your workout tracker<br>
                    <a href="${resetUrl.replace(/\/api\/auth\/reset-password\/.*/, '')}" style="color:#3cb9a0;text-decoration:none;">${resetUrl.replace(/\/api\/auth\/reset-password\/.*/, '').replace(/https?:\/\//, '')}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
