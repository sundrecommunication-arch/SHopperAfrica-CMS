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

// --- Merchant lifecycle emails ---------------------------------------------
// Sent to new merchants after signup (src/modules/lifecycle). Replies go to
// SUPPORT_EMAIL (default admin@shopperafrica.com) so a merchant can just hit
// "reply" for help. SUPPORT_WHATSAPP_NUMBER (international format, digits
// only, e.g. 2348012345678) adds a "chat with us on WhatsApp" button; leave
// it unset to hide the button.

export type LifecycleEmailKind = "WELCOME" | "ONBOARDING" | "NEED_HELP" | "NO_ORDERS" | "TRIAL_ENDING";

export interface LifecycleEmailDetails {
  name: string | null;
  appUrl: string;
  /** Present once the merchant has created a store. */
  storeName?: string | null;
  storeUrl?: string | null;
  trialEndsAt?: Date | null;
  /** Omitted for account notices (welcome, trial ending). */
  unsubscribeUrl?: string | null;
  /** RFC 8058 one-click target (POST) for the List-Unsubscribe header. */
  oneClickUnsubscribeUrl?: string | null;
}

function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL ?? "admin@shopperafrica.com";
}

function whatsappSupportUrl(text: string): string | null {
  const number = (process.env.SUPPORT_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

function ctaButton(href: string, label: string, color = "#111"): string {
  return `<a href="${esc(href)}" style="display: inline-block; background: ${color}; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 4px 8px 4px 0;">${label}</a>`;
}

function lifecycleLayout(body: string, d: LifecycleEmailDetails): string {
  const footer = d.unsubscribeUrl
    ? `You're getting this because you created a Shopper account.
       <a href="${esc(d.unsubscribeUrl)}" style="color: #888;">Unsubscribe from tips</a>.`
    : `You're getting this because you created a Shopper account.`;
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      ${body}
      <p style="color: #555; line-height: 1.5; margin-top: 24px;">
        Questions? Just reply to this email — a real person reads every message.
      </p>
      <p style="color: #555; line-height: 1.5;">— The Shopper team</p>
      <p style="color: #888; font-size: 12px; line-height: 1.5; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
        ${footer}
      </p>
    </div>
  `;
}

function greeting(name: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? `Hi ${esc(first)},` : "Hi there,";
}

function lifecycleContent(kind: LifecycleEmailKind, d: LifecycleEmailDetails): { subject: string; body: string } {
  const p = (html: string) => `<p style="color: #333; line-height: 1.6;">${html}</p>`;
  const dashboard = `${d.appUrl}/dashboard`;
  const storeName = d.storeName ? esc(d.storeName) : "your store";

  switch (kind) {
    case "WELCOME":
      return {
        subject: "Welcome to Shopper 🎉",
        body: `
          <h2 style="margin-bottom: 8px;">Welcome to Shopper!</h2>
          ${p(greeting(d.name))}
          ${p("Thanks for signing up. Shopper gives your business its own online store — customers browse your products, order, and pay online or straight through WhatsApp.")}
          ${p("Setting up takes about 10 minutes:")}
          <ol style="color: #333; line-height: 1.8; padding-left: 20px;">
            <li>Name your store and pick a look</li>
            <li>Add your first products with photos and prices</li>
            <li>Share your store link with customers</li>
          </ol>
          <p style="margin: 24px 0;">${ctaButton(dashboard, "Set up my store")}</p>
        `,
      };

    case "ONBOARDING":
      return {
        subject: "4 steps to your first sale on Shopper",
        body: `
          <h2 style="margin-bottom: 8px;">Get ${storeName} ready for customers</h2>
          ${p(greeting(d.name))}
          ${p("Here's what the most successful Shopper stores do in their first week:")}
          <ol style="color: #333; line-height: 1.7; padding-left: 20px;">
            <li><strong>Add your first products.</strong> Go to <em>Products → Add product</em>. Clear photos and a short description sell best. Products with sizes or colours can have options, each with its own stock.</li>
            <li><strong>Set your delivery fees.</strong> Under <em>Delivery</em>, add delivery zones (e.g. "Lagos Mainland", "Outside Lagos") with a fee for each — customers see it at checkout.</li>
            <li><strong>Connect WhatsApp and payments.</strong> Add your WhatsApp number under <em>Store</em> so orders reach your phone, and connect Paystack under <em>Payments</em> to accept card and bank transfer payments.</li>
            <li><strong>Share your store link.</strong> Put it in your WhatsApp status, Instagram bio and TikTok profile${d.storeUrl ? `: <a href="${esc(d.storeUrl)}">${esc(d.storeUrl)}</a>` : ""}.</li>
          </ol>
          <p style="margin: 24px 0;">${ctaButton(dashboard, "Go to my dashboard")}</p>
        `,
      };

    case "NEED_HELP": {
      const wa = whatsappSupportUrl("Hi Shopper, I need help setting up my store.");
      return {
        subject: "Need help getting started?",
        body: `
          <h2 style="margin-bottom: 8px;">Need a hand getting started?</h2>
          ${p(greeting(d.name))}
          ${p(`We noticed ${storeName} doesn't have any products yet. That's completely normal — lots of people get stuck on the first step, and we're happy to help.`)}
          ${p("Tell us what you sell and we'll walk you through adding your first product, setting prices and sharing your link. It only takes a few minutes.")}
          <p style="margin: 24px 0;">
            ${wa ? ctaButton(wa, "Chat with us on WhatsApp", "#16a34a") : ""}
            ${ctaButton(`${dashboard}/products/new`, "Add my first product")}
          </p>
          ${p(`Prefer email? Reply to this message or write to <a href="mailto:${esc(getSupportEmail())}">${esc(getSupportEmail())}</a>.`)}
        `,
      };
    }

    case "NO_ORDERS": {
      const wa = whatsappSupportUrl("Hi Shopper, I'd like tips on getting my first order.");
      return {
        subject: "Tips to get your first order",
        body: `
          <h2 style="margin-bottom: 8px;">Let's get ${storeName} its first order</h2>
          ${p(greeting(d.name))}
          ${p("Your products are live — great work! Now it's about getting people to see them. A few things that work well:")}
          <ul style="color: #333; line-height: 1.7; padding-left: 20px;">
            <li><strong>Post your store link on your WhatsApp status</strong> every few days, with a photo of one product.</li>
            <li><strong>Add the link to your Instagram and TikTok bios.</strong></li>
            <li><strong>Message 10 past customers</strong> directly and tell them they can now order online.</li>
            <li><strong>Create a discount code</strong> (<em>Discounts</em> in your dashboard) for your first customers.</li>
          </ul>
          <p style="margin: 24px 0;">
            ${d.storeUrl ? ctaButton(d.storeUrl, "View my store") : ctaButton(dashboard, "Go to my dashboard")}
            ${wa ? ctaButton(wa, "Ask us on WhatsApp", "#16a34a") : ""}
          </p>
        `,
      };
    }

    case "TRIAL_ENDING": {
      const date = d.trialEndsAt
        ? d.trialEndsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "soon";
      return {
        subject: "Your Shopper trial ends soon",
        body: `
          <h2 style="margin-bottom: 8px;">Your free trial ends ${esc(date)}</h2>
          ${p(greeting(d.name))}
          ${p(`The free trial on ${storeName} ends on <strong>${esc(date)}</strong>. After that, your store moves to the Free plan — it stays online, but paid-plan features and higher limits switch off.`)}
          ${p("To keep everything you're using, choose a plan before the trial ends.")}
          <p style="margin: 24px 0;">${ctaButton(`${dashboard}/billing`, "Choose a plan")}</p>
        `,
      };
    }
  }
}

/** Sends one lifecycle email. Throws on Resend errors so the caller can retry later. */
export async function sendLifecycleEmail(
  to: string,
  kind: LifecycleEmailKind,
  d: LifecycleEmailDetails
): Promise<void> {
  const resend = getClient();
  const { subject, body } = lifecycleContent(kind, d);
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    replyTo: getSupportEmail(),
    subject,
    html: lifecycleLayout(body, d),
    headers: d.oneClickUnsubscribeUrl
      ? {
          "List-Unsubscribe": `<${d.oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });

  if (error) {
    throw new Error(`Failed to send ${kind} email: ${error.message}`);
  }
}
