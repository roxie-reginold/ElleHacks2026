import { Router, Request, Response } from 'express';
import TeacherRequest from '../models/TeacherRequest';

const router = Router();

// ─────────────────────────────────────
// STUDENT SIDE: Send a request
// ─────────────────────────────────────

/**
 * POST /api/teacher-requests
 * Student clicks "I need help", "I'm confused", or "Please be slower"
 * Body: { studentId, teacherId?, requestType, classSession? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId, requestType, classSession } = req.body;

    if (!studentId || !requestType) {
      res.status(400).json({ error: 'studentId and requestType are required' });
      return;
    }

    const validTypes = ['need_help', 'confused', 'slow_down'];
    if (!validTypes.includes(requestType)) {
      res.status(400).json({ error: 'Invalid requestType. Must be: need_help, confused, or slow_down' });
      return;
    }

    const request = new TeacherRequest({
      studentId,
      teacherId,
      requestType,
      classSession,
      resolved: false,
      timestamp: new Date(),
    });

    await request.save();
    res.status(201).json(request);
  } catch (error) {
    console.error('Teacher request create error:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// ─────────────────────────────────────
// TEACHER SIDE: View and resolve requests
// ─────────────────────────────────────

/**
 * GET /api/teacher-requests/teacher/:teacherId
 * Teacher sees all unresolved requests for their class
 * Query: ?resolved=false&classSession=Math
 */
router.get('/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const resolved = req.query.resolved !== 'true'; // default: show unresolved
    const classSession = req.query.classSession as string;

    const query: any = {
      teacherId,
      resolved: !resolved, // flip: if resolved query is false, we want resolved: false
    };

    // Actually: if ?resolved=false (default), show unresolved. If ?resolved=true, show resolved.
    query.resolved = req.query.resolved === 'true';

    if (classSession) {
      query.classSession = classSession;
    }

    const requests = await TeacherRequest.find(query).sort({ timestamp: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Teacher requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * PATCH /api/teacher-requests/:id/resolve
 * Teacher resolves a request (optionally adds a note)
 * Body: { teacherNote? }
 */
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacherNote } = req.body;

    const request = await TeacherRequest.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedAt: new Date(),
        teacherNote: teacherNote || undefined,
      },
      { new: true }
    );

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    res.json(request);
  } catch (error) {
    console.error('Resolve request error:', error);
    res.status(500).json({ error: 'Failed to resolve request' });
  }
});

// ─────────────────────────────────────
// STUDENT SIDE: View own request history
// ─────────────────────────────────────

/**
 * GET /api/teacher-requests/student/:studentId
 * Student sees their own past requests
 */
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const requests = await TeacherRequest.find({ studentId }).sort({ timestamp: -1 }).limit(20);
    res.json(requests);
  } catch (error) {
    console.error('Student requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

export default router;