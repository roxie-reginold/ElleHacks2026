// Alert service for sending messages to trusted adults
// Supports SMS (Twilio), email, and push notifications

export interface AlertResult {
  success: boolean;
  message: string;
  channel?: string;
}

export interface TrustedAdult {
  name: string;
  channel: 'sms' | 'email' | 'push';
  address: string;
}

// Default safe-word messages
const DEFAULT_MESSAGES = [
  "I'm feeling overwhelmed. Can I take a break?",
  "I need some support right now.",
  "Can you check on me when you get a chance?",
];

/**
 * Send alert to trusted adult
 */
export async function sendAlert(
  trustedAdult: TrustedAdult,
  customMessage?: string
): Promise<AlertResult> {
  const message = customMessage || DEFAULT_MESSAGES[0];
  
  try {
    switch (trustedAdult.channel) {
      case 'sms':
        return await sendSMS(trustedAdult.address, trustedAdult.name, message);
      case 'email':
        return await sendEmail(trustedAdult.address, trustedAdult.name, message);
      case 'push':
        return await sendPush(trustedAdult.address, message);
      default:
        return { success: false, message: 'Unknown channel' };
    }
  } catch (error) {
    console.error('Alert send error:', error);
    return { 
      success: false, 
      message: 'Failed to send alert. Please try again.' 
    };
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(
  phoneNumber: string,
  recipientName: string,
  message: string
): Promise<AlertResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('Twilio not configured, simulating SMS send');
    return {
      success: true,
      message: `[DEMO] SMS would be sent to ${recipientName} at ${phoneNumber}: "${message}"`,
      channel: 'sms',
    };
  }

  // For hackathon demo - simulate SMS send
  // In production, would use Twilio SDK
  console.log(`[SMS] To: ${phoneNumber}`);
  console.log(`[SMS] Message: Whisper Lite Alert - ${message}`);
  
  return {
    success: true,
    message: `[DEMO] SMS would be sent to ${recipientName} at ${phoneNumber}`,
    channel: 'sms',
  };
}

/**
 * Send email alert
 */
async function sendEmail(
  emailAddress: string,
  recipientName: string,
  message: string
): Promise<AlertResult> {
  // For hackathon, simulate email send
  // In production, integrate with SendGrid, AWS SES, etc.
  
  console.log(`[EMAIL] To: ${emailAddress}`);
  console.log(`[EMAIL] Subject: Whisper Lite - Support Needed`);
  console.log(`[EMAIL] Body: ${message}`);
  
  return {
    success: true,
    message: `[DEMO] Email would be sent to ${recipientName} at ${emailAddress}`,
    channel: 'email',
  };
}

/**
 * Send push notification
 */
async function sendPush(
  pushToken: string,
  message: string
): Promise<AlertResult> {
  // For hackathon, simulate push notification
  // In production, integrate with Firebase Cloud Messaging, etc.
  
  console.log(`[PUSH] Token: ${pushToken}`);
  console.log(`[PUSH] Message: ${message}`);
  
  return {
    success: true,
    message: '[DEMO] Push notification would be sent',
    channel: 'push',
  };
}

/**
 * Get default alert messages
 */
export function getDefaultMessages(): string[] {
  return DEFAULT_MESSAGES;
}

export default {
  sendAlert,
  getDefaultMessages,
};
