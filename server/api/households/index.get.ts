import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  
  const households = await prisma.household.findMany({
    where: {
      members: {
        some: {
          user_id: userId
        }
      }
    },
    include: {
      meal_plan: true,
      recipe_libraries: {
        select: {
          id: true,
          name: true,
        },
      },
      members: {
        where: {
          user_id: userId
        },
        select: {
          role: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return households.map(h => ({
    ...h,
    userRole: h.members[0]?.role,
    members: undefined,
  }));
});
