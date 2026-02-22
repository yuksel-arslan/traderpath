/**
 * Timeframe Validation Middleware (Fastify preHandler)
 *
 * Rejects requests whose `interval` query parameter is not one of the
 * six supported timeframes (5m, 15m, 30m, 1h, 4h, 1d).
 *
 * On failure responds with HTTP 400 and error code VALIDATION_ERROR.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { isValidTimeframe, VALID_TIMEFRAMES } from '../config/timeframe.enum';

interface IntervalQuery {
  interval?: string;
}

/**
 * Fastify preHandler that validates the `interval` query param.
 * Attach as preHandler on individual routes or as an onRequest hook.
 */
export async function validateTimeframe(
  request: FastifyRequest<{ Querystring: IntervalQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { interval } = request.query as IntervalQuery;

  if (interval !== undefined && !isValidTimeframe(interval)) {
    return reply.status(400).send({
      success: false,
      error: 'VALIDATION_ERROR',
      message: `Invalid timeframe '${interval}'. Accepted values: ${VALID_TIMEFRAMES.join(', ')}`,
    });
  }
}

/**
 * Body-based variant — validates `interval` inside a JSON body.
 * Use on POST endpoints where interval is sent as body field.
 */
export async function validateTimeframeBody(
  request: FastifyRequest<{ Body: { interval?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = request.body as { interval?: string } | undefined;
  const interval = body?.interval;

  if (interval !== undefined && !isValidTimeframe(interval)) {
    return reply.status(400).send({
      success: false,
      error: 'VALIDATION_ERROR',
      message: `Invalid timeframe '${interval}'. Accepted values: ${VALID_TIMEFRAMES.join(', ')}`,
    });
  }
}
