<template>
  <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
    <!-- Blurred map background -->
    <div
      class="absolute inset-0 bg-cover bg-center blur-sm scale-105"
      style="background-image: url('/assets/login/login.png');"
    />
    <div class="absolute inset-0" style="background-color: rgba(0, 0, 0, 0.45);" />

    <div class="w-full max-w-md relative z-10">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-serif font-bold text-parchment-base mb-2">Middle-earth</h1>
        <p class="text-parchment-base font-book italic">Wandering Simulator</p>
      </div>

      <div class="bg-parchment-base rounded-xl shadow-2xl border-2 border-gold overflow-hidden">
        <div class="flex border-b-2 border-gold">
          <button
            @click="activeTab = 'login'"
            class="flex-1 py-3 text-sm font-serif font-semibold transition-colors"
            :class="activeTab === 'login'
              ? 'bg-gold text-ink-black'
              : 'text-ink-brown hover:bg-parchment-dark'"
          >
            Sign In
          </button>
          <button
            @click="activeTab = 'register'"
            class="flex-1 py-3 text-sm font-serif font-semibold transition-colors"
            :class="activeTab === 'register'
              ? 'bg-gold text-ink-black'
              : 'text-ink-brown hover:bg-parchment-dark'"
          >
            Create Account
          </button>
        </div>

        <div class="p-8">
          <!-- Login form -->
          <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-5">
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">Email</label>
              <input
                v-model="loginEmail"
                type="email"
                autocomplete="email"
                required
                placeholder="your@email.com"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">Password</label>
              <input
                v-model="loginPassword"
                type="password"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <p v-if="errorMessage" class="text-sm text-red-600 font-book">{{ errorMessage }}</p>

            <Button type="submit" variant="primary" size="lg" class="w-full" :disabled="authLoading">
              <span v-if="authLoading">Entering the world…</span>
              <span v-else>Enter Middle-earth</span>
            </Button>
          </form>

          <!-- Register form -->
          <form v-else @submit.prevent="handleRegister" class="space-y-5">
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">Username <span class="text-ink-light">(optional)</span></label>
              <input
                v-model="registerUsername"
                type="text"
                autocomplete="username"
                placeholder="Bilbo Baggins"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">Email</label>
              <input
                v-model="registerEmail"
                type="email"
                autocomplete="email"
                required
                placeholder="your@email.com"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">Password</label>
              <input
                v-model="registerPassword"
                type="password"
                autocomplete="new-password"
                required
                placeholder="At least 6 characters"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">Confirm Password</label>
              <input
                v-model="registerConfirm"
                type="password"
                autocomplete="new-password"
                required
                placeholder="••••••••"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <p v-if="errorMessage" class="text-sm text-red-600 font-book">{{ errorMessage }}</p>

            <Button type="submit" variant="primary" size="lg" class="w-full" :disabled="authLoading">
              <span v-if="authLoading">Preparing your journey…</span>
              <span v-else>Begin Your Journey</span>
            </Button>
          </form>
        </div>
      </div>

      <button
        type="button"
        @click="goExplore"
        class="block mx-auto mt-5 text-sm text-parchment-base/90 hover:text-gold font-book underline underline-offset-4 transition-colors"
      >
        Just looking? Explore the map as a guest
      </button>

      <p class="text-center text-xs text-parchment-base mt-6 font-book italic">
        A personal hobby project. Made for love of the work — no coin sought.
      </p>
    </div>

    <!-- Welcome modal (first visit only) -->
    <Modal
      v-if="showWelcome"
      title="Welcome to Middle-earth"
      size="sm"
      :show-close="false"
      :close-on-backdrop="false"
      @close="dismissWelcome"
    >
      <div class="font-book text-ink-black text-sm leading-relaxed">
        <p>The map awaits, traveller.</p>
        <p class="mt-2 text-ink-brown">Sign in to bring a character to life and set out on your own adventure — or wander the map freely as a guest to explore its lands, search for places, and trace routes.</p>
      </div>
      <template #footer>
        <div class="flex flex-col gap-2">
          <Button variant="primary" size="md" class="w-full" @click="dismissWelcome">
            Sign in / Create account
          </Button>
          <Button variant="outline" size="md" class="w-full" @click="goExplore">
            Explore as a guest
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const router = useRouter()
const { login, register, authLoading, currentUser } = useAuth()

const WELCOME_SEEN_KEY = 'me-explore-welcome-seen'
const showWelcome = ref(false)

onMounted(() => {
  // Show welcome modal only on first visit
  if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
    showWelcome.value = true
  }
})

function dismissWelcome() {
  showWelcome.value = false
  localStorage.setItem(WELCOME_SEEN_KEY, 'true')
}

function goExplore() {
  router.push('/explore')
}

const activeTab = ref<'login' | 'register'>('login')
const errorMessage = ref('')

const loginEmail = ref('')
const loginPassword = ref('')

const registerUsername = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerConfirm = ref('')

async function handleLogin() {
  errorMessage.value = ''
  try {
    await login(loginEmail.value, loginPassword.value)
    redirectAfterAuth()
  } catch (err: any) {
    errorMessage.value = err.message
  }
}

async function handleRegister() {
  errorMessage.value = ''
  if (registerPassword.value !== registerConfirm.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }
  try {
    await register(registerEmail.value, registerPassword.value, registerUsername.value || undefined)
    redirectAfterAuth()
  } catch (err: any) {
    errorMessage.value = err.message
  }
}

function redirectAfterAuth() {
  if (currentUser.value?.active_character_id) {
    router.replace('/wander')
  } else {
    router.replace('/')
  }
}
</script>

<script lang="ts">
export default { name: 'AuthPage' }
</script>
