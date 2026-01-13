# Household Management Redesign - Complete

## Overview
Redesigned household management to be centralized in Settings with proper active household tracking and improved UX.

## What Changed

### Database Schema
- Added `active_household_id` field to `user_profile` table
- Created relation between user and their active household
- Migration: `20251231134058_add_active_household`

### API Endpoints

#### New
- **PATCH `/api/profile/active-household`** - Switch active household
  - Body: `{ household_id: string }`
  - Validates user membership before switching

#### Updated
- **GET `/api/households/me`** - Now returns active household instead of first household
  - Auto-sets active household if none exists
  - Returns household details, members, and user's role

- **GET `/api/households`** - Now includes `userRole` for each household
  - Shows user's membership role in each household

- **POST `/api/households/leave`** - Now accepts optional household_id
  - Body: `{ household_id?: string }`
  - Clears active_household_id if leaving active household
  - Falls back to active household if no ID provided

### UI Changes

#### Settings Page (`app/pages/settings.vue`)
Completely redesigned with two main sections:

**1. Active Household Section** (Blue bordered, prominent)
- Shows currently active household name
- Owner can edit household name
- Displays all members with roles
- Owner can generate/regenerate invite links
- Clear visual distinction as "active"

**2. All Households Section**
- Lists all households user belongs to
- Each card shows:
  - Household name
  - "Active" badge if currently active
  - User's role badge (Owner/Admin/Member)
  - Creation date
  - Action buttons:
    - **Switch** - Make this household active
    - **Invite** - Expand to show/generate invite link
    - **Leave** - Leave household (if not sole owner)
- Invite links can be generated per household
- Expandable invite sections with copy functionality

#### Planner Page (`app/pages/plan.vue`)
- **Removed** household selector dropdown
- **Now** automatically uses active household
- Cleaner, less confusing interface
- To switch households, user goes to Settings

## User Experience Improvements

### Before
- Household selector in planner was confusing
- Unclear which household was "active"
- Invite links only for first household
- No clear household management location

### After
- **One centralized location** for all household management
- **Clear visual distinction** of active household
- **Easy household switching** from settings
- **Per-household invite links** for owners
- **Cleaner planner interface** focused on planning
- **Better role visibility** - see your role in each household

## Testing Checklist

- [ ] Switch active household from settings
- [ ] Generate invite link for active household
- [ ] Generate invite link for non-active owned household
- [ ] Switch to different household and verify planner updates
- [ ] Leave a non-active household
- [ ] Try to leave as sole owner (should fail)
- [ ] Verify member vs owner UI differences
- [ ] Test with multiple households
- [ ] Test with single household
- [ ] Copy invite links and verify they work

## Migration Notes

### For Existing Users
- First time accessing settings, the system will:
  1. Check if user has `active_household_id` set
  2. If not, automatically set to their first (oldest) household
  3. Continue working seamlessly

### Database
- Run: `npx prisma migrate dev` (already applied)
- Run: `npx prisma generate` (already applied)
- Nullable `active_household_id` allows graceful migration

## Technical Details

### Active Household Selection Logic
1. User explicitly switches → `PATCH /api/profile/active-household`
2. On first load with no active household → Auto-set to oldest household
3. When leaving active household → Cleared, will auto-set on next access
4. Planner always uses active household

### Invite Link Generation
- Each household can have one active invite code
- Stored in `household.invite_code`
- Regenerating creates new code, invalidating old link
- URL format: `{origin}/join/{invite_code}`

### Role Visibility
- User sees their role in each household
- Different actions available based on role:
  - **Owner**: Edit name, generate invites, leave if multiple owners
  - **Admin**: Future permissions
  - **Member**: Switch, leave

## Future Enhancements
- Add household creation flow in settings
- Add member management (promote/demote/remove)
- Add household deletion for sole owners
- Add household search/filter
- Add recent activity indicators
- Add member count badges
