import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  return transporter.sendMail({
    from: `"Jamroll PM" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
}

export function taskAssignedEmail(taskTitle: string, projectName: string, link: string) {
  return {
    subject: `You've been assigned: ${taskTitle}`,
    html: `
      <p>You've been assigned a new task in <strong>${projectName}</strong>.</p>
      <p><strong>${taskTitle}</strong></p>
      <p><a href="${link}">View task</a></p>
    `,
  }
}

export function mentionedEmail(authorName: string, taskTitle: string, link: string) {
  return {
    subject: `${authorName} mentioned you in "${taskTitle}"`,
    html: `
      <p><strong>${authorName}</strong> mentioned you in a comment on <strong>${taskTitle}</strong>.</p>
      <p><a href="${link}">View comment</a></p>
    `,
  }
}

export function taskDueTomorrowEmail(taskTitle: string, projectName: string, link: string) {
  return {
    subject: `Reminder: "${taskTitle}" is due tomorrow`,
    html: `
      <p>Your task <strong>${taskTitle}</strong> in <strong>${projectName}</strong> is due tomorrow.</p>
      <p><a href="${link}">View task</a></p>
    `,
  }
}

export function projectInviteEmail(orgName: string, inviteLink: string) {
  return {
    subject: `You've been invited to join ${orgName} on Jamroll PM`,
    html: `
      <p>You've been invited to join <strong>${orgName}</strong>.</p>
      <p><a href="${inviteLink}">Accept invitation</a></p>
    `,
  }
}
