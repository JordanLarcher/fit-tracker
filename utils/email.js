const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (to, resetUrl) => {
  const mailOptions = {
    from: `"FitTrack" <${process.env.EMAIL_FROM || 'noreply@fittrack.app'}>`,
    to,
    subject: 'Password Reset — FitTrack',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #20262e;">FitTrack — Password Reset</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background: #20262e; color: #fff;
                  text-decoration: none; border-radius: 10px; font-weight: 600; margin: 16px 0;">
          Reset password
        </a>
        <p style="color: #9aa1a9; font-size: 0.85rem;">
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
