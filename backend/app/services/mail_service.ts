import nodemailer from 'nodemailer'
import env from '#start/env'

let transporter: nodemailer.Transporter | null = null

export function isSmtpConfigured(): boolean {
  return !!(env.get('SMTP_HOST') && env.get('SMTP_USER') && env.get('SMTP_PASSWORD'))
}

function getTransporter(): nodemailer.Transporter {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)')
  }
  if (!transporter) {
    const port = env.get('SMTP_PORT') ?? 587
    const secure = env.get('SMTP_SECURE') ?? false
    transporter = nodemailer.createTransport({
      host: env.get('SMTP_HOST'),
      port,
      secure,
      auth: {
        user: env.get('SMTP_USER'),
        pass: env.get('SMTP_PASSWORD'),
      },
    })
  }
  return transporter
}

export async function sendTransactionalEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const from = env.get('MAIL_FROM_ADDRESS', 'noreply@cutnary.com')
  const fromName = env.get('MAIL_FROM_NAME', 'Cutnary')
  const transport = getTransporter()
  await transport.sendMail({
    from: `"${fromName}" <${from}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  })
}
