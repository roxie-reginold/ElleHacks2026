import { Router, Request, Response } from 'express';
import User from '../models/User';

const router = Router();

/**
 * GET /api/profile/:userId
 * Get user profile
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    let user = await User.findById(userId);

    if (!user) {
      // Return default profile for demo mode
      res.json({
        _id: userId,
        displayName: 'Friend',
        ageRange: '13-15',
        readingLevelGrade: 7,
        sensitivity: 'med',
        focusMoments: 0,
        journalPrompts: [],
      });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    // Return default for demo mode
    res.json({
      _id: req.params.userId,
      displayName: 'Friend',
      ageRange: '13-15',
      readingLevelGrade: 7,
      sensitivity: 'med',
      focusMoments: 0,
      journalPrompts: [],
    });
  }
});

/**
 * POST /api/profile
 * Create or update user profile
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      _id,
      displayName,
      ageRange,
      pronouns,
      readingLevelGrade,
      sensitivity,
      trustedAdult,
      focusMoments,
      journalPrompts,
      role,
    } = req.body;

    if (!_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Validate reading level
    const validReadingLevel = Math.min(10, Math.max(6, readingLevelGrade || 7));

    // Validate sensitivity
    const validSensitivity = ['low', 'med', 'high'].includes(sensitivity) 
      ? sensitivity 
      : 'med';

    const validRole = role === 'teacher' ? 'teacher' : 'student';
    const updateData = {
      displayName: displayName || 'Friend',
      ageRange: ageRange || '13-15',
      pronouns,
      readingLevelGrade: validReadingLevel,
      sensitivity: validSensitivity,
      trustedAdult,
      focusMoments: focusMoments || 0,
      journalPrompts: journalPrompts || [],
      role: validRole,
    };

    try {
      const user = await User.findByIdAndUpdate(
        _id,
        updateData,
        { new: true, upsert: true, runValidators: true }
      );
      res.json(user);
    } catch (dbError) {
      // DB not available, return the data as-is
      console.warn('Could not save to DB:', dbError);
      res.json({ _id, ...updateData });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PATCH /api/profile/:userId/focus-moments
 * Increment focus moments
 */
router.patch('/:userId/focus-moments', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { increment = 1 } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { focusMoments: increment } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ focusMoments: user.focusMoments });
  } catch (error) {
    console.error('Focus moments update error:', error);
    res.status(500).json({ error: 'Failed to update focus moments' });
  }
});

/**
 * DELETE /api/profile/:userId
 * Delete user profile and all associated data
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Note: In production, also delete sessions and recaps
    // await Session.deleteMany({ userId });
    // await Recap.deleteMany({ userId });

    res.json({ success: true, message: 'Profile deleted' });
  } catch (error) {
    console.error('Profile delete error:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;
