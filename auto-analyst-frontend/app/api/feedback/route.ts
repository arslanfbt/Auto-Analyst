import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { Readable } from 'stream'
import { NextRequest } from 'next/server'

interface ChatItem {
  chat_id: number;
  user_id: number;
  title: string;
  created_at: string;
}

interface ModelSettings {
  model_name: string;
  model_provider: string;
  temperature: number;
  max_tokens: number;
}

// Function to read form data with files
async function readFormData(req: NextRequest) {
  const formData = await req.formData()
  const type = formData.get('type') as string
  const message = formData.get('message') as string
  
  // Get session information
  const sessionId = formData.get('sessionId') as string || 'Not provided'
  const userEmail = formData.get('userEmail') as string || 'Not provided'
  
  // Parse JSON model settings from localStorage
  let modelSettings: ModelSettings | null = null
  try {
    const modelSettingsStr = formData.get('modelSettings') as string
    if (modelSettingsStr) {
      modelSettings = JSON.parse(modelSettingsStr)
    }
  } catch (error) {
    console.error('Error parsing model settings:', error)
  }
  
  // Parse JSON session data if available
  let sessionInfo = null
  try {
    const sessionInfoStr = formData.get('sessionInfo') as string
    if (sessionInfoStr) {
      sessionInfo = JSON.parse(sessionInfoStr)
    }
  } catch (error) {
    console.error('Error parsing session info:', error)
  }
  
  // Parse JSON recent chats data if available
  let recentChats: ChatItem[] = []
  try {
    const recentChatsStr = formData.get('recentChats') as string
    if (recentChatsStr) {
      recentChats = JSON.parse(recentChatsStr)
    }
  } catch (error) {
    console.error('Error parsing recent chats:', error)
  }
  
  // Extract all image files
  const images: { filename: string; content: Buffer; contentType: string }[] = []
  
  for (let i = 0; i < 5; i++) { // Maximum 5 images
    const imageFile = formData.get(`image${i}`) as File | null
    if (imageFile) {
      // Convert the file to buffer
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      images.push({
        filename: imageFile.name,
        content: buffer,
        contentType: imageFile.type
      })
    }
  }
  
  return { type, message, images, sessionId, userEmail, modelSettings, sessionInfo, recentChats }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const { type, message, images, sessionId, userEmail, modelSettings, sessionInfo, recentChats } = await readFormData(request)

    if (!message || !type) {
      return NextResponse.json(
        { error: 'Message and type are required' },
        { status: 400 }
      )
    }

    // Get email configuration from environment variables
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT)
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.SMTP_FROM
    const toEmail = process.env.SMTP_USER // Send to the SMTP_USER as requested

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail || !toEmail) {
      console.error('Missing email configuration')
      return NextResponse.json(
        { error: 'Server email configuration is incomplete' },
        { status: 500 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Prepare email content
    const feedbackType = type === 'suggestion' ? 'Suggestion' : 'Bug Report'
    const subject = `Auto-Analyst ${feedbackType}`
    
    // Prepare image references for HTML if there are images
    const imageHtml = images.length > 0 ? 
      `<div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        <h3 style="color: #333; margin-bottom: 15px;">Attached Screenshots (${images.length})</h3>
        <div style="margin-bottom: 10px; color: #666; font-size: 14px;">
          Images are also included as attachments to this email.
        </div>
      </div>` : '';
    
    // Format the session info for the email
    const getSessionInfoHtml = () => {
      if (!sessionId && !userEmail && !sessionInfo && !modelSettings) return '';
      
      // Extract relevant information from sessionInfo
      const datasetName = sessionInfo?.dataset_name || 'Not available';
      
      // Use model settings from localStorage with proper values
      const modelName = modelSettings?.model_name || 
                        sessionInfo?.model_settings?.model_name || 
                        process.env.DEFAULT_PUBLIC_MODEL || 
                        'Not available';
                        
      const modelProvider = modelSettings?.model_provider || 
                           sessionInfo?.model_settings?.model_provider || 
                           process.env.DEFAULT_MODEL_PROVIDER || 
                           'Not available';
                           
      const temperature = modelSettings?.temperature ?? 
                          sessionInfo?.model_settings?.temperature ?? 
                          0.7;
                          
      const maxTokens = modelSettings?.max_tokens ?? 
                        sessionInfo?.model_settings?.max_tokens ?? 
                        6000;
      
      return `
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">Session Information</h3>
          <div style="font-family: monospace; background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 14px;">
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>User Email:</strong> ${userEmail}</p>
            <p><strong>Dataset Name:</strong> ${datasetName}</p>
            <p><strong>Model:</strong> ${modelName} (${modelProvider})</p>
            <p><strong>Temperature:</strong> ${temperature}</p>
            <p><strong>Max Tokens:</strong> ${maxTokens}</p>
          </div>
        </div>
      `;
    };
    
    // Format recent chats for the email
    const getRecentChatsHtml = () => {
      if (!recentChats || recentChats.length === 0) return '';
      
      const chatItems = recentChats.map((chat: ChatItem, index: number) => {
        return `
          <div style="margin-bottom: 15px;">
            <p><strong>Chat ${index + 1}:</strong> ${chat.title || 'No title'}</p>
            <p><strong>Created:</strong> ${new Date(chat.created_at).toLocaleString()}</p>
          </div>
        `;
      }).join('');
      
      return `
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">Recent Chats</h3>
          <div style="font-family: monospace; background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 14px;">
            ${chatItems}
          </div>
        </div>
      `;
    };

    // Prepare email attachments
    const attachments = images.map((image, index) => ({
      filename: image.filename,
      content: image.content,
      contentType: image.contentType,
      cid: `image${index}` // Content ID for embedding in HTML
    }));

    // Send email
    await transporter.sendMail({
      from: `"Auto-Analyst Feedback" <${fromEmail}>`,
      to: toEmail,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #333;">${feedbackType} from Auto-Analyst User</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          ${getSessionInfoHtml()}
          ${getRecentChatsHtml()}
          ${imageHtml}
          <p style="color: #666; margin-top: 20px; font-size: 12px;">
            This message was sent from the Auto-Analyst feedback system.
          </p>
        </div>
      `,
      attachments: attachments
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending feedback:', error)
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    )
  }
} 