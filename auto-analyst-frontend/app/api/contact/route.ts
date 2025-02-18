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
        ${budget ? `<p><strong>Budget:</strong> $${Number(budget).toLocaleString()} USD</p>` : ''}
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
        <h2>Thank you for your interest in Auto-Analyst!</h2>
        <p>We've received your demo request and our team will be in touch with you shortly to schedule a personalized demo.</p>
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