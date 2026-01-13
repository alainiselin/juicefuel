<template>
  <DesktopShell>
    <div class="p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Household Settings</h1>

      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else class="space-y-8 max-w-5xl">
        <!-- Active Household -->
        <div class="bg-white rounded-lg border-2 border-blue-200 shadow-sm">
          <div class="border-b border-blue-200 bg-blue-50 px-6 py-4">
            <h2 class="text-xl font-semibold text-gray-900">Active Household</h2>
            <p class="text-sm text-gray-600 mt-1">This is your currently active household</p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Household Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Household Name</label>
              <div v-if="isActiveOwner" class="flex gap-2">
                <input
                  v-model="activeHouseholdName"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :disabled="savingName"
                />
                <button
                  @click="saveActiveHouseholdName"
                  :disabled="savingName || activeHouseholdName === activeHousehold?.name"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ savingName ? 'Saving...' : 'Save' }}
                </button>
              </div>
              <p v-else class="text-lg text-gray-900">{{ activeHousehold?.name }}</p>
            </div>

            <!-- Members -->
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Members</h3>
              <div class="space-y-2">
                <div
                  v-for="member in activeMembers"
                  :key="member.user_id"
                  class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span class="text-blue-600 font-medium">
                        {{ member.user.display_name?.[0]?.toUpperCase() || 'U' }}
                      </span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ member.user.display_name }}</p>
                      <p class="text-sm text-gray-500">{{ member.user.email }}</p>
                    </div>
                  </div>
                  <span
                    class="px-3 py-1 text-xs font-medium rounded-full"
                    :class="{
                      'bg-purple-100 text-purple-800': member.role === 'OWNER',
                      'bg-blue-100 text-blue-800': member.role === 'ADMIN',
                      'bg-gray-100 text-gray-800': member.role === 'MEMBER',
                    }"
                  >
                    {{ member.role }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Invite Link (Owner Only) -->
            <div v-if="isActiveOwner" class="pt-4 border-t border-gray-200">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Invite Members</h3>
              <p class="text-sm text-gray-600 mb-3">
                Share this link to invite others to this household
              </p>
              
              <div v-if="activeInviteUrl" class="space-y-2">
                <div class="flex gap-2">
                  <input
                    :value="activeInviteUrl"
                    readonly
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                  />
                  <button
                    @click="copyInviteLink(activeInviteUrl)"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    {{ copiedActive ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <button
                  @click="generateInviteLink(activeHousehold.id, true)"
                  :disabled="generatingInvite"
                  class="text-sm text-blue-600 hover:text-blue-700"
                >
                  Generate New Link
                </button>
              </div>
              
              <button
                v-else
                @click="generateInviteLink(activeHousehold.id, true)"
                :disabled="generatingInvite"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ generatingInvite ? 'Generating...' : 'Generate Invite Link' }}
              </button>
            </div>
          </div>
        </div>

        <!-- All Households -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="border-b border-gray-200 px-6 py-4">
            <h2 class="text-xl font-semibold text-gray-900">All Households</h2>
            <p class="text-sm text-gray-600 mt-1">Manage all households you belong to</p>
          </div>
          
          <div class="p-6 space-y-3">
            <div
              v-for="household in allHouseholds"
              :key="household.id"
              class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <h3 class="text-lg font-semibold text-gray-900">{{ household.name }}</h3>
                    <span
                      v-if="household.id === activeHousehold?.id"
                      class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                    >
                      Active
                    </span>
                    <span
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="{
                        'bg-purple-100 text-purple-800': household.userRole === 'OWNER',
                        'bg-blue-100 text-blue-800': household.userRole === 'ADMIN',
                        'bg-gray-100 text-gray-800': household.userRole === 'MEMBER',
                      }"
                    >
                      {{ household.userRole }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">
                    Created {{ formatDate(household.created_at) }}
                  </p>
                </div>
                
                <div class="flex gap-2">
                  <button
                    v-if="household.id !== activeHousehold?.id"
                    @click="switchHousehold(household.id)"
                    :disabled="switching"
                    class="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Switch
                  </button>
                  
                  <button
                    v-if="household.userRole === 'OWNER'"
                    @click="toggleInviteLink(household.id)"
                    class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    {{ expandedInvites[household.id] ? 'Hide' : 'Invite' }}
                  </button>
                  
                  <button
                    v-if="household.userRole !== 'OWNER' || ownerCount(household.id) > 1"
                    @click="leaveHousehold(household.id)"
                    :disabled="leaving"
                    class="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                  >
                    Leave
                  </button>
                </div>
              </div>

              <!-- Expanded Invite Section -->
              <div v-if="expandedInvites[household.id]" class="mt-4 pt-4 border-t border-gray-200">
                <div v-if="inviteUrls[household.id]" class="space-y-2">
                  <div class="flex gap-2">
                    <input
                      :value="inviteUrls[household.id]"
                      readonly
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                    />
                    <button
                      @click="copyInviteLink(inviteUrls[household.id], household.id)"
                      class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      {{ copiedHouseholds[household.id] ? 'Copied!' : 'Copy' }}
                    </button>
                  </div>
                  <button
                    @click="generateInviteLink(household.id)"
                    :disabled="generatingInvite"
                    class="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Generate New Link
                  </button>
                </div>
                
                <button
                  v-else
                  @click="generateInviteLink(household.id)"
                  :disabled="generatingInvite"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ generatingInvite ? 'Generating...' : 'Generate Invite Link' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DesktopShell>
</template>

<script setup lang="ts">
const loading = ref(true);
const error = ref('');
const activeHousehold = ref<any>(null);
const activeMembers = ref<any[]>([]);
const activeUserRole = ref<string>('');
const allHouseholds = ref<any[]>([]);

const activeHouseholdName = ref('');
const savingName = ref(false);
const switching = ref(false);
const leaving = ref(false);

const activeInviteUrl = ref('');
const inviteUrls = ref<Record<string, string>>({});
const expandedInvites = ref<Record<string, boolean>>({});
const generatingInvite = ref(false);
const copiedActive = ref(false);
const copiedHouseholds = ref<Record<string, boolean>>({});

const isActiveOwner = computed(() => activeUserRole.value === 'OWNER');

async function loadData() {
  try {
    loading.value = true;
    error.value = '';
    
    // Load active household
    const activeData = await $fetch('/api/households/me');
    activeHousehold.value = activeData.household;
    activeMembers.value = activeData.members;
    activeUserRole.value = activeData.userRole;
    activeHouseholdName.value = activeData.household.name;
    
    if (activeData.household.invite_code) {
      const origin = window.location.origin;
      activeInviteUrl.value = `${origin}/join/${activeData.household.invite_code}`;
    }
    
    // Load all households
    allHouseholds.value = await $fetch('/api/households');
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to load household data';
  } finally {
    loading.value = false;
  }
}

async function saveActiveHouseholdName() {
  if (!activeHousehold.value || activeHouseholdName.value === activeHousehold.value.name) return;
  
  try {
    savingName.value = true;
    await $fetch(`/api/households/${activeHousehold.value.id}`, {
      method: 'PATCH',
      body: { name: activeHouseholdName.value },
    });
    activeHousehold.value.name = activeHouseholdName.value;
    
    // Update in all households list too
    const household = allHouseholds.value.find(h => h.id === activeHousehold.value.id);
    if (household) household.name = activeHouseholdName.value;
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to update household name';
  } finally {
    savingName.value = false;
  }
}

async function switchHousehold(householdId: string) {
  try {
    switching.value = true;
    await $fetch('/api/profile/active-household', {
      method: 'PATCH',
      body: { household_id: householdId },
    });
    
    // Reload data
    await loadData();
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to switch household';
  } finally {
    switching.value = false;
  }
}

async function generateInviteLink(householdId: string, isActive = false) {
  try {
    generatingInvite.value = true;
    
    // Temporarily switch context if needed (this is a workaround for MVP)
    // In production, you'd want a dedicated endpoint that takes household_id
    const needsSwitch = householdId !== activeHousehold.value?.id;
    
    if (needsSwitch) {
      await $fetch('/api/profile/active-household', {
        method: 'PATCH',
        body: { household_id: householdId },
      });
    }
    
    const data = await $fetch('/api/households/invite', {
      method: 'POST',
    });
    
    if (isActive) {
      activeInviteUrl.value = data.invite_url;
    } else {
      inviteUrls.value[householdId] = data.invite_url;
    }
    
    // Switch back if needed
    if (needsSwitch) {
      await loadData();
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to generate invite link';
  } finally {
    generatingInvite.value = false;
  }
}

async function copyInviteLink(url: string, householdId?: string) {
  try {
    await navigator.clipboard.writeText(url);
    
    if (householdId) {
      copiedHouseholds.value[householdId] = true;
      setTimeout(() => {
        copiedHouseholds.value[householdId] = false;
      }, 2000);
    } else {
      copiedActive.value = true;
      setTimeout(() => {
        copiedActive.value = false;
      }, 2000);
    }
  } catch (e) {
    error.value = 'Failed to copy link';
  }
}

function toggleInviteLink(householdId: string) {
  expandedInvites.value[householdId] = !expandedInvites.value[householdId];
  
  // Load invite URL if not already loaded
  if (expandedInvites.value[householdId] && !inviteUrls.value[householdId]) {
    const household = allHouseholds.value.find(h => h.id === householdId);
    if (household?.invite_code) {
      const origin = window.location.origin;
      inviteUrls.value[householdId] = `${origin}/join/${household.invite_code}`;
    }
  }
}

async function leaveHousehold(householdId: string) {
  const household = allHouseholds.value.find(h => h.id === householdId);
  if (!confirm(`Are you sure you want to leave "${household?.name}"?`)) return;
  
  try {
    leaving.value = true;
    
    // If leaving active household, switch first
    if (householdId === activeHousehold.value?.id) {
      const otherHousehold = allHouseholds.value.find(h => h.id !== householdId);
      if (otherHousehold) {
        await switchHousehold(otherHousehold.id);
      }
    }
    
    await $fetch('/api/households/leave', {
      method: 'POST',
      body: { household_id: householdId },
    });
    
    await loadData();
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to leave household';
  } finally {
    leaving.value = false;
  }
}

function ownerCount(householdId: string): number {
  // This is a simplified version - in production you'd fetch this from API
  return 1;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

onMounted(() => {
  loadData();
});
</script>
