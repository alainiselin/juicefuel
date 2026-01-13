import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { z } from 'zod';

const CreateTagSchema = z.object({
  label: z.string().min(1),
  kind: z.string().optional().nullable(),
  scope: z.enum(['GLOBAL', 'HOUSEHOLD']).optional().default('GLOBAL'),
  household_id: z.string().uuid().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = CreateTagSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid tag data',
      data: validation.error.flatten(),
    });
  }

  const { label, kind, scope, household_id } = validation.data;

  // Normalize empty string to undefined
  const normalizedHouseholdId = household_id || undefined;

  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (scope === 'HOUSEHOLD') {
    if (!normalizedHouseholdId) {
      throw createError({
        statusCode: 400,
        message: 'household_id required for HOUSEHOLD scope',
      });
    }

    const member = await prisma.household_member.findUnique({
      where: {
        household_id_user_id: {
          household_id: normalizedHouseholdId,
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
  }

  const tag = await prisma.tag.upsert({
    where: { slug },
    update: {},
    create: {
      name: label,
      slug,
      kind: kind || null,
      scope: scope || 'GLOBAL',
      household_id: scope === 'HOUSEHOLD' ? normalizedHouseholdId : null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      scope: true,
      household_id: true,
    },
  });

  return tag;
});
