import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const planPagePath = join(__dirname, '../plan.vue');
const planPageSource = readFileSync(planPagePath, 'utf-8');

describe('Plan Page Static Analysis', () => {
  it('should reference required components', () => {
    // Check that components are used in the template
    expect(planPageSource).toContain('<DesktopShell>');
    expect(planPageSource).toContain('<WeekGridFullView');
    expect(planPageSource).toContain('<AddMealSlotDialog');
    expect(planPageSource).toContain('<MealPlanGeneratorModal');
  });

  it('should have exactly 4 desktop tabs (no Snack)', () => {
    // Check slot configuration in source
    const slotsMatch = planPageSource.match(/const slots = \[([\s\S]*?)\];/);
    expect(slotsMatch).toBeTruthy();
    
    const slotsContent = slotsMatch![1];
    
    // Desktop must have these tabs
    expect(slotsContent).toContain("'Full View'");
    expect(slotsContent).toContain("'Breakfast'");
    expect(slotsContent).toContain("'Lunch'");
    expect(slotsContent).toContain("'Dinner'");
    
    // Snack must NOT be present
    expect(slotsContent).not.toContain("'Snack'");
    
    // Count tabs (should be exactly 4)
    const tabCount = (slotsContent.match(/label:/g) || []).length;
    expect(tabCount).toBe(4);
  });

  it('should use correct SlotType enum values', () => {
    expect(planPageSource).toContain('BREAKFAST');
    expect(planPageSource).toContain('LUNCH');
    expect(planPageSource).toContain('DINNER');
    expect(planPageSource).toContain("value: 'ALL'");
  });
});
