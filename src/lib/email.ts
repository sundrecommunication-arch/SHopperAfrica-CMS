import "server-only";
import { Resend } from "resend";

// Transactional email: password reset, contact form, team invites, and order
// notifications (new order → merchant; confirmation/status updates → customer).
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

// Anything a customer typed (names, addresses, notes) ends up in these
// emails — escape it so it can't inject markup into the merchant's inbox.
function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface OrderEmailDetails {
  storeName: string;
  orderNumber: string;
  currencySymbol: string;
  items: { name: string; variantName: string | null; quantity: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  deliveryMethod: string | null;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  customerNotes: string | null;
  /** Link to the order — the dashboard page for merchants, the receipt for customers. */
  orderUrl: string;
}

function money(symbol: string, amount: number): string {
  return `${esc(symbol)}${amount.toLocaleString()}`;
}

function renderOrderSummary(d: OrderEmailDetails): string {
  const rows = d.items
    .map(
      (i) => `
        <tr>
          <td style="padding: 6px 0; color: #333;">${i.quantity} × ${esc(i.name)}${
            i.variantName ? ` <span style="color: #888;">(${esc(i.variantName)})</span>` : ""
          }</td>
          <td style="padding: 6px 0; text-align: right; color: #333;">${money(d.currencySymbol, i.lineTotal)}</td>
        </tr>`
    )
    .join("");

  const line = (label: string, value: string, bold = false) => `
        <tr>
          <td style="padding: 4px 0; color: ${bold ? "#111" : "#666"};${bold ? " font-weight: 700;" : ""}">${label}</td>
          <td style="padding: 4px 0; text-align: right; color: ${bold ? "#111" : "#666"};${bold ? " font-weight: 700;" : ""}">${value}</td>
        </tr>`;

  return `
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
        ${rows}
        <tr><td colspan="2" style="border-top: 1px solid #eee; padding-top: 4px;"></td></tr>
        ${line("Subtotal", money(d.currencySymbol, d.subtotal))}
        ${d.discount > 0 ? line("Discount", `-${money(d.currencySymbol, d.discount)}`) : ""}
        ${
          d.deliveryMethod
            ? line(
                `Delivery (${esc(d.deliveryMethod)})`,
                d.deliveryFee > 0 ? money(d.currencySymbol, d.deliveryFee) : "Free"
              )
            : ""
        }
        ${line("Total", money(d.currencySymbol, d.total), true)}
      </table>`;
}

function button(url: string, label: string): string {
  return `
      <p style="margin: 24px 0;">
        <a href="${esc(url)}"
           style="background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          ${label}
        </a>
      </p>`;
}

/** Sent to the store owner(s) when a new order comes in (or an online payment completes). */
export async function sendNewOrderEmail(to: string[], d: OrderEmailDetails): Promise<void> {
  const resend = getClient();
  const paid = d.paymentStatus === "PAID";
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: `New order ${d.orderNumber} — ${money(d.currencySymbol, d.total)}${paid ? " (paid)" : ""}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 4px;">New order ${esc(d.orderNumber)}</h2>
        <p style="color: #555; margin-top: 0;">${esc(d.storeName)} just received an order.</p>
        ${renderOrderSummary(d)}
        <p style="color: #555; line-height: 1.6; font-size: 14px;">
          <strong>Customer:</strong> ${esc(d.customerName)}<br />
          <strong>Phone:</strong> ${esc(d.customerPhone)}<br />
          ${d.customerEmail ? `<strong>Email:</strong> ${esc(d.customerEmail)}<br />` : ""}
          ${d.deliveryAddress ? `<strong>Deliver to:</strong> ${esc(d.deliveryAddress)}<br />` : ""}
          <strong>Payment:</strong> ${esc(d.paymentMethod)} — ${paid ? "Paid" : "Awaiting payment"}
        </p>
        ${
          d.customerNotes
            ? `<p style="color: #555; font-size: 14px;"><strong>Notes:</strong> <em>${esc(d.customerNotes)}</em></p>`
            : ""
        }
        ${button(d.orderUrl, "View order")}
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send new order email: ${error.message}`);
  }
}

/** Sent to the customer right after they place an order (or their online payment completes). */
export async function sendOrderConfirmationEmail(to: string, d: OrderEmailDetails): Promise<void> {
  const resend = getClient();
  const paid = d.paymentStatus === "PAID";
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: `Your ${d.storeName} order ${d.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 4px;">Thanks for your order, ${esc(d.customerName.split(" ")[0])}!</h2>
        <p style="color: #555; margin-top: 0; line-height: 1.5;">
          ${esc(d.storeName)} has received order <strong>${esc(d.orderNumber)}</strong>.
          ${paid ? "Your payment was received." : "You'll find payment details on your order page."}
        </p>
        ${renderOrderSummary(d)}
        ${button(d.orderUrl, "View your order")}
        <p style="color: #888; font-size: 13px;">We'll email you when your order status changes.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send order confirmation email: ${error.message}`);
  }
}

/** Sent to the customer when the merchant moves their order along (shipped, delivered, …). */
export async function sendOrderUpdateEmail(
  to: string,
  d: { storeName: string; orderNumber: string; customerName: string; headline: string; message: string; orderUrl: string }
): Promise<void> {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: `${d.storeName} order ${d.orderNumber}: ${d.headline}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">${esc(d.headline)}</h2>
        <p style="color: #555; line-height: 1.5;">
          Hi ${esc(d.customerName.split(" ")[0])}, ${esc(d.message)}
        </p>
        ${button(d.orderUrl, "View your order")}
        <p style="color: #888; font-size: 13px;">Order ${esc(d.orderNumber)} from ${esc(d.storeName)}.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send order update email: ${error.message}`);
  }
}
