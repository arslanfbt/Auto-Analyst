import nodemailer from 'nodemailer';
import logger from '@/lib/utils/logger'

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Debug options
  logger: process.env.NODE_ENV === 'development',
  debug: process.env.NODE_ENV === 'development',
});

// Test email connection during server startup (only in development)
if (process.env.NODE_ENV === 'development') {
  transporter.verify(function (error) {
    if (error) {
      console.error('SMTP connection error:', error);
    } else {
      logger.log('SMTP server connection verified');
    }
  });
}

/**
 * Send an email
 */
export async function sendEmail({ 
  to, 
  subject, 
  html,
  from = process.env.SMTP_FROM
}: { 
  to: string; 
  subject: string; 
  html: string;
  from?: string;
}): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: from || 'Auto-Analyst <noreply@firebird-technologies.com>',
      to,
      subject,
      html,
    });
    
    logger.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send a payment confirmation email
 */
export async function sendPaymentConfirmationEmail({
  email,
  name,
  plan,
  amount,
  billingCycle,
  date,
}: {
  email: string;
  name: string;
  plan: string;
  amount: string;
  billingCycle: string;
  date: string;
}): Promise<boolean> {
  const subject = `Your Auto-Analyst Subscription Confirmation`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #FF7F7F; margin-bottom: 5px;">Thank You for Your Subscription!</h1>
        <p style="color: #666; font-size: 16px;">Your payment was successful</p>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name || 'there'},</h2>
        <p style="color: #555; line-height: 1.5;">
          Thank you for subscribing to Auto-Analyst. Your account has been successfully upgraded to the <strong>${plan}</strong> plan.
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Payment Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #555; width: 40%;">Plan:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">${plan}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555;">Amount:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">$${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555;">Billing Cycle:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">${billingCycle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555;">Date:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">${date}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">What's Next?</h3>
        <p style="color: #555; line-height: 1.5;">
          You can now enjoy all the benefits of your subscription. Your account has been upgraded, and all features are available immediately.
        </p>
        <div style="text-align: center; margin-top: 15px;">
          <a href="${process.env.NEXTAUTH_URL}/chat" style="background-color: #FF7F7F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Using Auto-Analyst</a>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
        <p>If you have any questions, please contact us at ${process.env.SALES_EMAIL || 'support@firebird-technologies.com'}</p>
        <p>&copy; ${new Date().getFullYear()} Auto-Analyst by Firebird Technologies. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send a contact form email
 */
export async function sendContactFormEmail({
  email,
  name,
  message,
  subject,
}: {
  email: string;
  name: string;
  message: string;
  subject: string;
}): Promise<boolean> {
  const emailSubject = `Contact Form: ${subject}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Contact Form Submission</h2>
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #FF7F7F;">
        <p>${message.replace(/\n/g, '<br>')}</p>
      </div>
      <p style="color: #666; font-size: 14px;">This message was sent from the Auto-Analyst contact form.</p>
    </div>
  `;
  
  return sendEmail({
    to: process.env.SALES_EMAIL || 'arslan@firebird-technologies.com',
    subject: emailSubject,
    html,
    // Use the sender's email in the reply-to header
    from: `"Auto-Analyst Contact" <${process.env.SMTP_FROM}>`,
  });
}

// Add this function back for backward compatibility
export async function sendSubscriptionConfirmation(
  userEmail: string,
  planName: string,
  planType: string,
  amount: number,
  interval: string,
  renewalDate: string,
  creditAmount: number,
  resetDate: string
) {
  // Format credit amount for display
  const formattedCredits = creditAmount >= 999999 ? 'Unlimited' : creditAmount.toLocaleString();
  const intervalText = interval === 'year' ? 'year' : 'month';
  
  // Convert to format expected by new function
  return sendPaymentConfirmationEmail({
    email: userEmail,
    name: '',
    plan: planName,
    amount: amount.toString(),
    billingCycle: interval === 'year' ? 'Annual' : 'Monthly',
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  });
} 