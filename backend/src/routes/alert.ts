import { Router, Request, Response } from 'express';
import { sendAlert, getDefaultMessages } from '../services/alertService';
import User from '../models/User';

const router = Router();

/**
 * POST /api/alert
 * Send alert message to trusted adult
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get user's trusted adult info
    let trustedAdult;
    
    try {
      const user = await User.findById(userId);
      trustedAdult = user?.trustedAdult;
    } catch (dbError) {
      console.warn('Could not fetch user from DB:', dbError);
    }

    if (!trustedAdult) {
      // Check if trusted adult was provided in request
      if (req.body.trustedAdult) {
        trustedAdult = req.body.trustedAdult;
      } else {
        res.status(400).json({ 
          error: 'No trusted adult configured',
          message: 'Please set up a trusted adult in your profile first.'
        });
        return;
      }
    }

    // Send the alert
    const result = await sendAlert(trustedAdult, message);

    res.json(result);
  } catch (error) {
    console.error('Alert send error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send alert'
    });
  }
});

/**
 * GET /api/alert/messages
 * Get default alert message templates
 */
router.get('/messages', (req: Request, res: Response) => {
  res.json({
    messages: getDefaultMessages(),
  });
});

/**
 * POST /api/alert/test
 * Test alert configuration without actually sending
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { trustedAdult } = req.body;

    if (!trustedAdult || !trustedAdult.channel || !trustedAdult.address) {
      res.status(400).json({ 
        valid: false,
        error: 'Invalid trusted adult configuration'
      });
      return;
    }

    // Validate the configuration
    const validChannels = ['sms', 'email', 'push'];
    if (!validChannels.includes(trustedAdult.channel)) {
      res.status(400).json({ 
        valid: false,
        error: 'Invalid channel. Must be sms, email, or push.'
      });
      return;
    }

    // Basic validation for address
    if (trustedAdult.channel === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trustedAdult.address)) {
        res.status(400).json({ 
          valid: false,
          error: 'Invalid email address'
        });
        return;
      }
    }

    if (trustedAdult.channel === 'sms') {
      // Basic phone validation (allows various formats)
      const phoneRegex = /^[\d\s\-+()]{10,}$/;
      if (!phoneRegex.test(trustedAdult.address)) {
        res.status(400).json({ 
          valid: false,
          error: 'Invalid phone number'
        });
        return;
      }
    }

    res.json({ 
      valid: true,
      message: `Configuration valid for ${trustedAdult.channel} alerts to ${trustedAdult.name || 'trusted adult'}`
    });
  } catch (error) {
    console.error('Alert test error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

export default router;
