import { env } from "../config/env.js";

export class EmailVerificationError extends Error {
  constructor(message = "Email verification is temporarily unavailable.") {
    super(message);
    this.name = "EmailVerificationError";
  }
}

function codeFromDigits() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function sendViaBrevo({ email, code, name }) {
  // if (env.email.provider === "mock" || !env.email.brevoApiKey) {
  //   console.info(`[email] Mock verification code for ${email}: ${code}`);
  //   return { provider: "mock" };
  // }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": env.email.brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: env.email.fromName, email: env.email.fromEmail },
      to: [{ email, name }],
      subject: "Your Kingsville Estate raffle Draw verification code",
      htmlContent: `
      <div style="font-family: sans-serif; text-align: center; padding: 40px; background-color: #f8fafc;">
          <h2 style="color: #064e3b;">Kingsville Estate Raffle</h2>
          <p>Hello ${name},</p>
          <p>Your verification code is:</p>
          <h1 style="font-size: 40px; letter-spacing: 5px; color: #d97706; background: #fef3c7; padding: 20px; border-radius: 10px; display: inline-block;">
            ${code}
          </h1>
          <p>This code expires in ${env.email.codeTtlMinutes} minutes.</p>
        </div>
      `,
      textContent: `Your Kingsville Estate raffle verification code is ${code}. This code expires in ${env.email.codeTtlMinutes} minutes.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EmailVerificationError(
      `Brevo rejected the send request (${response.status}): ${detail}`,
    );
  }

  return { provider: "brevo" };
}

export async function sendVerificationCode({ name, email }) {
  const code = codeFromDigits();
  await sendViaBrevo({ email, code, name });
  return { code };
}
