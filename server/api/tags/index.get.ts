import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const query = getQuery(event);
  
  const searchQuery = (query.query as string)?.trim() || '';
  const kindsParam = query.kinds as string | string[] | undefined;
  const householdId = query.household_id as string | undefined;
  const limit = Math.min(parseInt((query.limit as string) || '20'), 100);

  if (!householdId) {
    throw createError({
      statusCode: 400,
      message: 'household_id required',
    });
  }

  // Verify user has access to household
  const member = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: userId,
      },
    },
  });

  if (!member) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    });
  }

  // Parse kinds filter
  const kinds: string[] = [];
  if (kindsParam) {
    if (Array.isArray(kindsParam)) {
      kinds.push(...kindsParam);
    } else if (typeof kindsParam === 'string') {
      kinds.push(...kindsParam.split(',').map(k => k.trim()).filter(Boolean));
    }
  }

  const where: any = {
    OR: [
      { scope: 'GLOBAL' },
      { scope: 'HOUSEHOLD', household_id: householdId },
    ],
  };

  if (kinds.length > 0) {
    where.kind = { in: kinds };
  }

  if (searchQuery) {
    where.name = {
      contains: searchQuery,
      mode: 'insensitive',
    };
  }

  // Fetch with smart ordering
  const startsWith = searchQuery
    ? await prisma.tag.findMany({
        where: {
          ...where,
          name: {
            startsWith: searchQuery,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          kind: true,
          scope: true,
        },
        take: limit,
        orderBy: { name: 'asc' },
      })
    : [];

  if (startsWith.length >= limit) {
    return startsWith;
  }

  const contains = searchQuery
    ? await prisma.tag.findMany({
        where: {
          ...where,
          name: {
            contains: searchQuery,
            mode: 'insensitive',
          },
          NOT: {
            name: {
              startsWith: searchQuery,
              mode: 'insensitive',
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          kind: true,
          scope: true,
        },
        take: limit - startsWith.length,
        orderBy: { name: 'asc' },
      })
    : await prisma.tag.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          kind: true,
          scope: true,
        },
        take: limit,
        orderBy: { name: 'asc' },
      });

  const results = new Map();
  startsWith.forEach(t => results.set(t.id, t));
  contains.forEach(t => results.set(t.id, t));

  return Array.from(results.values()).slice(0, limit);
});
