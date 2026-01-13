import prisma from './prisma';

/**
 * Ensures a user has at least one household with a recipe library.
 * Creates a default household if the user has no memberships.
 * Idempotent: safe to call multiple times.
 */
export async function ensureDefaultHouseholdForUser(
  userId: string,
  displayName?: string | null
): Promise<void> {
  // Check if user already belongs to any household
  const existingMembership = await prisma.household_member.findFirst({
    where: { user_id: userId },
  });

  if (existingMembership) {
    // User already has a household
    return;
  }

  // Create default household
  const householdName = displayName
    ? `${displayName}'s Household`
    : 'My Household';

  const household = await prisma.household.create({
    data: {
      name: householdName,
      members: {
        create: {
          user_id: userId,
          role: 'OWNER',
        },
      },
      recipe_libraries: {
        create: {
          name: 'My Recipes',
        },
      },
    },
  });

  console.log(`Created default household ${household.id} for user ${userId}`);
}
