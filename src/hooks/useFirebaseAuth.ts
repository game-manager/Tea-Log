import { useCallback, useEffect, useState } from 'react'
import {
  deleteUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { firebaseAuth, googleProvider, isAllowedSchoolAccount } from '../lib/firebase'

const providerIsGoogle = (user: FirebaseUser) =>
  user.providerData.some((provider) => provider.providerId === 'google.com')

const isAllowedAccount = (user: FirebaseUser) =>
  user.emailVerified && isAllowedSchoolAccount(user.email) && providerIsGoogle(user)

export function useFirebaseAuth() {
  const [account, setAccount] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(firebaseAuth, async (nextAccount) => {
    if (nextAccount && !isAllowedAccount(nextAccount)) {
      await signOut(firebaseAuth)
      setAccount(null)
      setError(`@${'ryugasaki1-h.ibk.ed.jp'} のGoogleアカウントでログインしてください。`)
    } else {
      setAccount(nextAccount)
      if (nextAccount) setError('')
    }
    setLoading(false)
  }), [])

  const login = useCallback(async () => {
    setSigningIn(true)
    setError('')
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      if (!isAllowedAccount(result.user)) {
        try { await deleteUser(result.user) } catch { await signOut(firebaseAuth) }
        setError('@ryugasaki1-h.ibk.ed.jp のGoogleアカウントのみ利用できます。')
      }
    } catch (reason) {
      const code = typeof reason === 'object' && reason && 'code' in reason ? String(reason.code) : ''
      if (code !== 'auth/popup-closed-by-user') setError('Googleログインに失敗しました。学校アカウントを選択して、もう一度お試しください。')
    } finally {
      setSigningIn(false)
    }
  }, [])

  const logout = useCallback(() => signOut(firebaseAuth), [])

  return { account, loading, signingIn, error, login, logout }
}
