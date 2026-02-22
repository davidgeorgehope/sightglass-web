import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { sanitizeEvents } from '../utils/anonymize.js';
import type { ServerDB } from '../storage/db.js';

const router = Router();

const MAX_EVENTS_PER_REQUEST = 1000;

// ── Validation schemas ──

const EventsBodySchema = z.object({
  events: z.array(z.unknown()).min(1, 'At least one event is required').max(
    MAX_EVENTS_PER_REQUEST,
    `Maximum ${MAX_EVENTS_PER_REQUEST} events per request`,
  ),
});

const EventsQuerySchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
  signal: z.coerce.boolean().optional().default(true),
});

// ── POST /events ──

router.post('/', authMiddleware, (req, res) => {
  try {
    const user = req.user!;
    const db = req.app.get('db') as ServerDB;

    // Validate the request body structure
    const body = EventsBodySchema.parse(req.body);

    // Sanitize and validate each event (strips PII, validates fields)
    let cleanedEvents;
    try {
      cleanedEvents = sanitizeEvents(body.events);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: 'Event validation failed',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      throw err;
    }

    if (cleanedEvents.length === 0) {
      res.status(400).json({ error: 'No valid events after sanitization' });
      return;
    }

    // Store the events
    db.insertEvents(user.id, cleanedEvents);

    res.status(201).json({
      stored: cleanedEvents.length,
      received: body.events.length,
      stripped: body.events.length - cleanedEvents.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    console.error('Event ingestion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /events ──

router.get('/', authMiddleware, (req, res) => {
  try {
    const user = req.user!;
    const db = req.app.get('db') as ServerDB;

    const query = EventsQuerySchema.parse(req.query);
    const events = query.signal
      ? db.getSignalEventsByUser(user.id, query.since, query.limit)
      : db.getEventsByUser(user.id, query.since, query.limit);

    res.json({
      count: events.length,
      events,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    console.error('Event retrieval error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
