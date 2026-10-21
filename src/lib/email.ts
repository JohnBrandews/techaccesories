import "server-only";
import { connect as connectNet, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";

const ADMIN_NOTIFICATION_EMAIL = "admintech86@gmail.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function sender() {
  const configured = process.env.SMTP_FROM?.trim() || process.env.SENDER_EMAIL?.trim();
  const match = configured?.match(/^(.*?)\s*<([^<>]+)>$/);
  const email = (match?.[2] ?? configured ?? "").trim();
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
  if ((!process.env.BREVO_API_KEY && !smtpConfigured) || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Brevo email is not configured. Set Brevo SMTP credentials or BREVO_API_KEY and SMTP_FROM to a verified sender address.");
  }
  return { email, name: match?.[1]?.replace(/^['"]|['"]$/g, "").trim() || "TechAccesories" };
}

export async function sendTransactionalEmail({ to, name, subject, text, html }: { to: string; name?: string | null; subject: string; text: string; html: string }) {
  const from = sender();
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    await sendSmtpEmail({ to, name, subject, text, html, from });
    return;
  }
  if (!process.env.BREVO_API_KEY) throw new Error("Set Brevo SMTP credentials or BREVO_API_KEY to send transactional email.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: from, to: [{ email: to, ...(name ? { name } : {}) }], subject, textContent: text, htmlContent: html }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Brevo rejected a transactional email (${response.status}).`);
}

type MailSocket = Socket | TLSSocket;
class SmtpReplyReader {
  private buffer = "";
  private readonly lines: string[] = [];
  private readonly waiters: ((reply: { code: number; text: string }) => void)[] = [];
  private readonly onData = (chunk: Buffer) => { this.buffer += chunk.toString("utf8"); this.readLines(); };
  constructor(private readonly socket: MailSocket) { socket.on("data", this.onData); }
  private readLines() {
    let newline: number;
    while ((newline = this.buffer.indexOf("\r\n")) >= 0) {
      this.lines.push(this.buffer.slice(0, newline)); this.buffer = this.buffer.slice(newline + 2);
      const last = this.lines[this.lines.length - 1];
      if (/^\d{3} /.test(last)) {
        const reply = { code: Number(last.slice(0, 3)), text: this.lines.join("\n") };
        this.lines.length = 0; this.waiters.shift()?.(reply);
      }
    }
  }
  next() { return new Promise<{ code: number; text: string }>(resolve => this.waiters.push(resolve)); }
  dispose() { this.socket.off("data", this.onData); }
}

function awaitSocket(socket: MailSocket, event: "connect" | "secureConnect") {
  return new Promise<void>((resolve, reject) => {
    socket.once(event, resolve);
    socket.once("error", reject);
  });
}

function assertSmtpCode(reply: { code: number; text: string }, expected: number) {
  if (reply.code !== expected) throw new Error(`Brevo SMTP returned ${reply.code}.`);
}

function base64Lines(value: string) {
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

async function sendSmtpEmail({ to, name, subject, text, html, from }: { to: string; name?: string | null; subject: string; text: string; html: string; from: { email: string; name: string } }) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !/^\S+@\S+\.\S+$/.test(to)) throw new Error("Brevo SMTP configuration is invalid.");
  const implicitTls = port === 465 || process.env.SMTP_SECURE === "true";
  let socket: MailSocket = implicitTls ? connectTls({ host, port, servername: host }) : connectNet({ host, port });
  let reader = new SmtpReplyReader(socket);
  try {
    await awaitSocket(socket, implicitTls ? "secureConnect" : "connect");
    assertSmtpCode(await reader.next(), 220);
    const command = async (value: string, expected: number) => { socket.write(`${value}\r\n`); assertSmtpCode(await reader.next(), expected); };
    const hello = async () => command("EHLO techaccesories.local", 250);
    await hello();
    if (!implicitTls) {
      await command("STARTTLS", 220);
      reader.dispose();
      socket = connectTls({ socket: socket as Socket, servername: host });
      reader = new SmtpReplyReader(socket);
      await awaitSocket(socket, "secureConnect");
      await hello();
    }
    await command("AUTH LOGIN", 334);
    await command(Buffer.from(process.env.SMTP_USER!).toString("base64"), 334);
    await command(Buffer.from(process.env.SMTP_PASS!).toString("base64"), 235);
    await command(`MAIL FROM:<${from.email}>`, 250);
    await command(`RCPT TO:<${to}>`, 250);
    await command("DATA", 354);
    const boundary = `techacc-${Date.now().toString(36)}`;
    const encodedName = Buffer.from(from.name, "utf8").toString("base64");
    const encodedSubject = Buffer.from(subject.replace(/[\r\n]/g, " "), "utf8").toString("base64");
    const encodedToName = name ? `=?UTF-8?B?${Buffer.from(name.replace(/[\r\n]/g, " "), "utf8").toString("base64")}?= ` : "";
    const message = [
      `From: =?UTF-8?B?${encodedName}?= <${from.email}>`,
      `To: ${encodedToName}<${to}>`,
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(text),
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(html),
      `--${boundary}--`,
      "",
    ].join("\r\n").replace(/(^|\r\n)\./g, "$1..");
    socket.write(`${message}.\r\n`);
    assertSmtpCode(await reader.next(), 250);
    socket.write("QUIT\r\n");
    reader.dispose();
    socket.end();
  } catch (error) {
    reader.dispose();
    socket.destroy();
    throw error;
  }
}

export function publicSiteUrl(requestOrigin?: string) {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestOrigin || "http://localhost:3000";
  return configured.replace(/\/$/, "");
}

export function emailParagraph(text: string) {
  return `<p style="margin:0 0 16px;color:#34455c;line-height:1.7">${escapeHtml(text)}</p>`;
}

export function emailButton(label: string, url: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#1769aa;color:#fff;text-decoration:none;border-radius:4px;font-weight:700">${escapeHtml(label)}</a></p>`;
}

export function emailLayout(content: string) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:28px;background:#fff;border:1px solid #e1e6ed;border-radius:8px"><p style="margin:0 0 22px;color:#12345a;font-weight:800;letter-spacing:.5px">TECHACCESORIES</p>${content}<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #edf0f4;color:#78859a;font-size:12px">TechAccesories customer care</p></div></body></html>`;
}

export function adminNotificationAddress() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || ADMIN_NOTIFICATION_EMAIL;
}
