import "server-only";
import { Resend } from "resend";

// Transactional email (password-reset, contact form, team invites). The app
// otherwise notifies merchants over WhatsApp — these are the only features
// that need real email delivery.
//
// RESEND_API_KEY: sign up free at resend.com, create an API key, add it to .env.
// RESEND_FROM_EMAIL: optional. Until a sending domain is verified on the Resend
// dashboard, leave this unset — it falls back to Resend's own test address, which
// works immediately with no domain setup (fine for the testing phase). Once a real
// domain is verified there, set this to something like "Shopper <no-reply@yourdomain.com>".
//
// CONTACT_INBOX_EMAIL: optional. Where messages from the /contact page's form are
// delivered. Defaults to Sundre Communications' own inbox.

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set — sign up at resend.com, create an API key, and add it to .env"
    );
  }
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Shopper <onboarding@resend.dev>";
}

function getContactInbox(): string {
  return process.env.CONTACT_INBOX_EMAIL ?? "sundrecommunication@gmail.com";
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Reset your Shopper password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #555; line-height: 1.5;">
          Someone requested a password reset for this account. If this was you, click the
          button below to choose a new password. This link expires in 1 hour.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email — your password
          won't change unless you open the link above and set a new one.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

/** Sent from the /contact marketing page — lands in Sundre Communications' inbox, reply-to the sender. */
export async function sendContactMessage({ name, email, message }: ContactMessage): Promise<void> {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: getContactInbox(),
    replyTo: email,
    subject: `New Shopper contact message from ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">New message from the Shopper contact page</h2>
        <p style="color: #555; line-height: 1.5;"><strong>Name:</strong> ${name}</p>
        <p style="color: #555; line-height: 1.5;"><strong>Email:</strong> ${email}</p>
        <p style="color: #555; line-height: 1.5; white-space: pre-wrap;">${message}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send contact message: ${error.message}`);
  }
}

interface TeamInviteDetails {
  storeName: string;
  inviteUrl: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

const ROLE_LABEL: Record<TeamInviteDetails["role"], string> = {
  OWNER: "owner",
  MANAGER: "manager",
  STAFF: "staff member",
};

/** Sent when a store owner invites someone to join their team (src/modules/stores/services/staff-service.ts). */
export async function sendTeamInviteEmail(to: string, details: TeamInviteDetails): Promise<void> {
  const resend = getClient();
  const roleLabel = ROLE_LABEL[details.role];
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: `You've been invited to join ${details.storeName} on Shopper`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">Join ${details.storeName} on Shopper</h2>
        <p style="color: #555; line-height: 1.5;">
          You've been invited to join <strong>${details.storeName}</strong>'s team as a
          <strong>${roleLabel}</strong>. Click the button below to accept — this link expires
          in 7 days.
        </p>
        <p style="margin: 24px 0;">
          <a href="${details.inviteUrl}"
             style="background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Accept invite
          </a>
        </p>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send team invite email: ${error.message}`);
  }
}
