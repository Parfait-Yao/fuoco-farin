import { route, ok } from '@/server/http/route';
import { z } from 'zod';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** GET /api/pizzas/:slugOrId — one visible pizza with its published reviews. */
export const GET = route<{ slug: string }>(async (_request, { params }) => ok(await catalogService.getPizza(z.string().min(1).max(120).parse(params.slug))));
