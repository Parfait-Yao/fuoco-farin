import { route, ok } from '@/server/http/route';
import { catalogRepository } from '@/server/repositories/catalogRepository';
import { toCategory } from '@/server/mappers';

export const dynamic = 'force-dynamic';

/** GET /api/categories — active categories in display order. */
export const GET = route(async () => ok((await catalogRepository.findCategories(false)).map(toCategory)));
