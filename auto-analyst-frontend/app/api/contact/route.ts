import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  tls: {
    rejectUnauthorized: false
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, company, budget, message } = body

    // Email to sales team
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SALES_EMAIL,
      subject: `New Demo Request from ${company}`,
      html: `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        ${budget ? `<p><strong>Budget:</strong> $${Number(budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    })

    // Confirmation email to customer
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Demo Request Received - Auto-Analyst',
      html: `
        <h2>Thank You for Reaching Out!</h2>
        <p>We appreciate you taking the time to fill out our form. Our team is reviewing your request and will get back to you shortly.</p>
        <p>In the meantime, stay connected and explore our latest insights:</p>
        <ul style="margin-top: 10px;">
          <li><a href="https://www.firebird-technologies.com/" style="color: #FF7F7F;">Subscribe to Our Newsletter</a></li>
          <li><a href="https://www.linkedin.com/company/firebird-technologies-singapore/" style="color: #FF7F7F;">Follow Us on LinkedIn</a></li>
        </ul>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br>The Auto-Analyst Team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
} 