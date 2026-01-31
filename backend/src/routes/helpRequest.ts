import { Router, Request, Response } from 'express';
import HelpRequest from '../models/HelpRequest';
import User from '../models/User';

const router = Router();

const VALID_TYPES = ['help', 'confused', 'slower'] as const;

/**
 * POST /api/help-request
 * Create a new help request (student taps Quick Help button)
 */
router.post('/help-request', async (req: Request, res: Response) => {
  try {
    const { type, studentId, classSessionId, courseId, teacherId, anonymous } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: 'type is required and must be help, confused, or slower' });
      return;
    }
    if (!classSessionId || typeof classSessionId !== 'string') {
      res.status(400).json({ error: 'classSessionId is required' });
      return;
    }

    const now = new Date();
    const doc = await HelpRequest.create({
      type,
      studentId: studentId ?? 'anonymous',
      classSessionId: classSessionId.trim(),
      courseId: courseId?.trim() || undefined,
      teacherId: teacherId?.trim() || undefined,
      timestamp: now,
      resolved: false,
      anonymous: Boolean(anonymous),
    });

    res.status(201).json({
      id: doc._id,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error('Help request create error:', error);
    res.status(500).json({ error: 'Failed to create help request' });
  }
});

/**
 * GET /api/help-requests
 * List help requests for a session (teacher dashboard). Query: sessionId (required), since (optional ISO date).
 */
router.get('/help-requests', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const since = req.query.since as string | undefined;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId query is required' });
      return;
    }

    const filter: Record<string, unknown> = { classSessionId: sessionId.trim() };
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        filter.createdAt = { $gte: sinceDate };
      }
    }

    const docs = await HelpRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const studentIds = [...new Set(docs.map((d) => d.studentId).filter((id) => id && objectIdRegex.test(id)))];
    const userMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const users = await User.find({ _id: { $in: studentIds } }).select('_id displayName').lean();
      users.forEach((u) => {
        userMap[String(u._id)] = u.displayName || 'Student';
      });
    }

    const list = docs.map((d) => ({
      id: d._id,
      type: d.type,
      studentId: d.studentId,
      studentDisplayName: d.anonymous ? 'Anonymous' : (userMap[String(d.studentId)] ?? d.studentId),
      classSessionId: d.classSessionId,
      courseId: d.courseId,
      teacherId: d.teacherId,
      createdAt: d.createdAt,
      timestamp: d.timestamp,
      seenAt: d.seenAt,
      resolved: d.resolved,
      anonymous: d.anonymous,
    }));

    res.json(list);
  } catch (error) {
    console.error('Help requests list error:', error);
    res.status(500).json({ error: 'Failed to fetch help requests' });
  }
});

/**
 * PATCH /api/help-request/:id
 * Mark request as seen (or dismissed). Body: { seen: true }
 */
router.patch('/help-request/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seen, dismissed } = req.body;
    const now = new Date();
    const update: Record<string, unknown> = {};
    if (seen === true || dismissed === true) {
      update.seenAt = now;
      update.resolved = true;
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'Body must include seen: true or dismissed: true' });
      return;
    }

    const doc = await HelpRequest.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!doc) {
      res.status(404).json({ error: 'Help request not found' });
      return;
    }

    res.json({
      id: doc._id,
      type: doc.type,
      seenAt: doc.seenAt,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error('Help request update error:', error);
    res.status(500).json({ error: 'Failed to update help request' });
  }
});

export default router;
