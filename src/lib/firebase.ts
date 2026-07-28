import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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
export const firebaseAuth = getAuth(firebaseApp)
export const firestore = getFirestore(firebaseApp)

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  hd: ALLOWED_EMAIL_DOMAIN,
  prompt: 'select_account',
})

export const isAllowedSchoolAccount = (email: string | null | undefined) =>
  Boolean(email && email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`))
