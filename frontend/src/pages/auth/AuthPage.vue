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
        <h1 class="text-4xl font-serif font-bold text-parchment-base mb-2">{{ t('brand.title') }}</h1>
        <p class="text-parchment-base text-3xl font-book italic">{{ t('brand.subtitle') }}</p>
      </div>

      <div class="bg-parchment-base rounded-xl shadow-2xl border-2 border-gold overflow-hidden">
        <div class="flex border-b-2 border-gold">
          <button
            @click="activeTab = 'login'"
            class="flex-1 py-3 text-sm font-serif font-semibold transition-colors"
            :class="activeTab === 'login'
              ? 'bg-gold-base text-ink-black'
              : 'text-ink-brown hover:bg-parchment-dark'"
          >
            {{ t('auth.signIn') }}
          </button>
          <button
            @click="activeTab = 'register'"
            class="flex-1 py-3 text-sm font-serif font-semibold transition-colors"
            :class="activeTab === 'register'
              ? 'bg-gold-base text-ink-black'
              : 'text-ink-brown hover:bg-parchment-dark'"
          >
            {{ t('auth.createAccount') }}
          </button>
        </div>

        <div class="p-8">
          <!-- Login form -->
          <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-5">
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">{{ t('auth.email') }}</label>
              <input
                v-model="loginEmail"
                type="email"
                autocomplete="email"
                required
                :placeholder="t('auth.emailPlaceholder')"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">{{ t('auth.password') }}</label>
              <input
                v-model="loginPassword"
                type="password"
                autocomplete="current-password"
                required
                :placeholder="t('auth.passwordPlaceholder')"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <p v-if="errorMessage" class="text-sm text-red-600 font-book">{{ errorMessage }}</p>

            <Button type="submit" variant="primary" size="lg" class="w-full" :disabled="authLoading">
              <span v-if="authLoading">{{ t('auth.enteringWorld') }}</span>
              <span v-else>{{ t('auth.enterMiddleEarth') }}</span>
            </Button>
          </form>

          <!-- Register form -->
          <form v-else @submit.prevent="handleRegister" class="space-y-5">
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">{{ t('auth.username') }} <span class="text-ink-light">{{ t('auth.usernameOptional') }}</span></label>
              <input
                v-model="registerUsername"
                type="text"
                autocomplete="username"
                :placeholder="t('auth.usernamePlaceholder')"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">{{ t('auth.email') }}</label>
              <input
                v-model="registerEmail"
                type="email"
                autocomplete="email"
                required
                :placeholder="t('auth.emailPlaceholder')"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">{{ t('auth.password') }}</label>
              <input
                v-model="registerPassword"
                type="password"
                autocomplete="new-password"
                required
                :placeholder="t('auth.passwordHint')"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-book font-medium text-ink-brown mb-1">{{ t('auth.confirmPassword') }}</label>
              <input
                v-model="registerConfirm"
                type="password"
                autocomplete="new-password"
                required
                :placeholder="t('auth.passwordPlaceholder')"
                class="w-full h-10 px-3 py-1 text-sm rounded-md border-2 border-earth-dark bg-parchment-base text-ink-black placeholder:text-ink-light focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <p v-if="errorMessage" class="text-sm text-red-600 font-book">{{ errorMessage }}</p>

            <Button type="submit" variant="primary" size="lg" class="w-full" :disabled="authLoading">
              <span v-if="authLoading">{{ t('auth.preparingJourney') }}</span>
              <span v-else>{{ t('auth.beginJourney') }}</span>
            </Button>
          </form>
        </div>
      </div>

      <button
        type="button"
        @click="goExplore"
        class="block mx-auto text-lg mt-5 text-parchment-base hover:text-gold font-book underline underline-offset-4 transition-colors"
      >
        {{ t('auth.guestLink') }}
      </button>

      <p class="text-center text-md text-parchment-base mt-6 font-book italic">
        {{ t('auth.footerNote') }}
      </p>
    </div>

    <!-- Welcome modal (first visit only) -->
    <Modal
      v-if="showWelcome"
      :title="t('auth.welcomeTitle')"
      size="sm"
      :show-close="false"
      :close-on-backdrop="false"
      @close="dismissWelcome"
    >
      <div class="font-book text-ink-black text-sm leading-relaxed">
        <p>{{ t('auth.welcomeLine1') }}</p>
        <p class="mt-2 text-ink-brown">{{ t('auth.welcomeLine2') }}</p>
      </div>
      <template #footer>
        <div class="flex flex-col gap-2">
          <Button variant="primary" size="md" class="w-full" @click="dismissWelcome">
            {{ t('auth.signInOrCreate') }}
          </Button>
          <Button variant="outline" size="md" class="w-full" @click="goExplore">
            {{ t('auth.exploreAsGuest') }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const { t } = useI18n()
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
    errorMessage.value = t('auth.passwordsDoNotMatch')
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
