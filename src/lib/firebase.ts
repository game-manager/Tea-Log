import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

export const ALLOWED_EMAIL_DOMAIN = 'ryugasaki1-h.ibk.ed.jp'

const firebaseConfig = {
  apiKey: 'AIzaSyDiHtlAVBfDS8MFMc8OjhrTwmbAmssa-E8',
  authDomain: 'teachers-log-a140c.firebaseapp.com',
  projectId: 'teachers-log-a140c',
  storageBucket: 'teachers-log-a140c.firebasestorage.app',
  messagingSenderId: '617891885255',
  appId: '1:617891885255:web:c4cfe5ebcab76525558ee2',
  measurementId: 'G-EFLZ0ZTRZ6',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAppCheck = initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaEnterpriseProvider('6Lcnw2gtAAAAAJI5vy1H1mmu9g5dcR834_ixvqYt'),
  isTokenAutoRefreshEnabled: true,
})
export const firebaseAuth = getAuth(firebaseApp)
export const firestore = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    return getFirestore(firebaseApp)
  }
})()

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  hd: ALLOWED_EMAIL_DOMAIN,
  prompt: 'select_account',
})

export const isAllowedSchoolAccount = (email: string | null | undefined) =>
  Boolean(email && email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`))
