import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'
import { initializeAuth, inMemoryPersistence } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'
import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'

const firebaseConfig = {
  apiKey: "AIzaSyDy8X7VIYHay4HLd8uYR7DT2FOh7TtTf8Q",
  authDomain: "freznelai.firebaseapp.com",
  projectId: "freznelai",
  storageBucket: "freznelai.firebasestorage.app",
  messagingSenderId: "738000387736",
  appId: "1:738000387736:web:334b92e83e7eb9efdf1aed",
  measurementId: "G-GVGH84C0V6"
}

const app = initializeApp(firebaseConfig)
const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
})
const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({
  prompt: 'select_account'
})

const googleLoginButton = document.querySelector('#google-login')
const messageElement = document.querySelector('#message')
const logoutButton = document.querySelector('#logout')

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true

  try {
    await signOut(auth)
    showMessage('You have been logged out.', false)
    googleLoginButton.hidden = false
    logoutButton.hidden = true
  } catch (error) {
    console.error('Hosted logout failed:', error)
    showMessage('Unable to log out. Please try again.')
  } finally {
    logoutButton.disabled = false
  }
})

onAuthStateChanged(auth, (user) => {
  if (user) {
    googleLoginButton.hidden = true
    logoutButton.hidden = false
    showMessage(`Signed in as ${user.email}`, false)
  } else {
    googleLoginButton.hidden = false
    logoutButton.hidden = true
  }
})

function showMessage(message, isError = true) {
  messageElement.textContent = message
  messageElement.style.color = isError ? '#c62828' : '#2e7d32'
}

function getLoginRequest() {
  const searchParams = new URLSearchParams(window.location.search)

  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')

  if (!redirectUri || !state) {
    throw new Error('This login page was not opened by Voyager.')
  }

  const callbackUrl = new URL(redirectUri)

  // Allow the Voyager production deep-link OR a local HTTP callback used as
  // a development fallback.
  const isDeepLink =
    callbackUrl.protocol === 'navic:' &&
    callbackUrl.hostname === 'auth' &&
    callbackUrl.pathname === '/callback'

  const isLocalhost =
    callbackUrl.protocol === 'http:' &&
    (callbackUrl.hostname === '127.0.0.1' || callbackUrl.hostname === 'localhost') &&
    callbackUrl.pathname === '/callback'

  if (!isDeepLink && !isLocalhost) {
    throw new Error('Invalid Voyager callback URL.')
  }

  if (state.length < 32 || state.length > 256) {
    throw new Error('Invalid authentication state.')
  }

  return {
    redirectUri: callbackUrl.toString(),
    state,
    isDeepLink
  }
}

async function startGoogleLogin() {
  googleLoginButton.disabled = true
  showMessage('Opening Google sign-in...', false)

  try {
    const { redirectUri, state, isDeepLink } = getLoginRequest()

    const result = await signInWithPopup(auth, googleProvider)
    const providerCredential = GoogleAuthProvider.credentialFromResult(result)

    if (!providerCredential) {
      throw new Error('Google did not return a provider credential.')
    }

    if (!providerCredential.idToken && !providerCredential.accessToken) {
      throw new Error('Google returned no usable credential.')
    }

    showMessage('Login successful. Returning to Voyager...', false)

    const fields = {
      state,
      idToken: providerCredential.idToken || '',
      accessToken: providerCredential.accessToken || ''
    }

    if (isDeepLink) {
      const callbackUrl = new URL(redirectUri)

      for (const [name, value] of Object.entries(fields)) {
        callbackUrl.searchParams.set(name, value)
      }

      window.location.assign(callbackUrl.toString())
      return
    }

    // Submit credentials in the POST body instead of putting them in the URL.
    // A native form submission avoids CORS/preflight issues with localhost.
    const callbackForm = document.createElement('form')
    callbackForm.method = 'POST'
    callbackForm.action = redirectUri
    callbackForm.style.display = 'none'

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      callbackForm.appendChild(input)
    }

    document.body.appendChild(callbackForm)
    callbackForm.submit()
  } catch (error) {
    console.error('Hosted Google login failed:', error)

    if (error.code === 'auth/popup-closed-by-user') {
      showMessage('The Google sign-in window was closed.')
    } else if (error.code === 'auth/popup-blocked') {
      showMessage('The browser blocked the Google sign-in popup.')
    } else if (error.code === 'auth/unauthorized-domain') {
      showMessage('This login page domain is not authorized in Firebase.')
    } else {
      showMessage(error.message || 'Unable to sign in with Google.')
    }

    googleLoginButton.disabled = false
  }
}

googleLoginButton.addEventListener('click', () => {
  void startGoogleLogin()
})
