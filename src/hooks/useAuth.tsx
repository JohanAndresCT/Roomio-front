import React, { createContext, useContext, useEffect, useState } from 'react'
import type { IUser } from '@interfaces/IUser'
import { getAuthClient, googleProvider, githubProvider } from '@firebase/firebaseClient'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth'

/**
 * Authentication context interface for Roomio.
 * @typedef {Object} IAuthContext
 * @property {IUser | null} user - Current authenticated user or null.
 * @property {boolean} loading - Whether authentication state is loading.
 * @property {(email: string, password: string) => Promise<void>} register - Register a new user.
 * @property {(email: string, password: string) => Promise<void>} login - Login with email and password.
 * @property {() => Promise<void>} logout - Logout the current user.
 * @property {() => Promise<void>} loginWithGoogle - Login with Google provider.
 * @property {() => Promise<void>} loginWithGitHub - Login with GitHub provider.
 * @property {(email: string) => Promise<void>} resetPassword - Send password reset email.
 * @property {(data: { displayName?: string; photoURL?: string }) => Promise<void>} updateProfile - Update user profile.
 * @property {() => Promise<void>} deleteAccount - Delete the current user account.
 */
interface IAuthContext {
  user: IUser | null
  loading: boolean
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithGitHub: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>
  deleteAccount: () => Promise<void>
}


const AuthContext = createContext<IAuthContext | undefined>(undefined)

/**
 * AuthProvider component for Roomio.
 * Provides authentication context to child components.
 * @param {{ children: React.ReactNode }} props - Provider props.
 * @returns {JSX.Element} Auth context provider.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null)
  const [loading, setLoading] = useState(true)
  const auth = getAuthClient()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email || '', displayName: u.displayName, photoURL: u.photoURL })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function register(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password)
  }
  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }
  async function logout() {
    await signOut(auth)
  }
  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }
  async function loginWithGitHub() {
    await signInWithPopup(auth, githubProvider)
  }
  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }
  async function updateProfile(data: { displayName?: string; photoURL?: string }) {
    if (!auth.currentUser) throw new Error('No user')
    await firebaseUpdateProfile(auth.currentUser, data as any)
  }
  async function deleteAccount() {
    if (!auth.currentUser) throw new Error('No user')
    await firebaseDeleteUser(auth.currentUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, loginWithGoogle, loginWithGitHub, resetPassword, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook to access authentication context.
 * Must be used within AuthProvider.
 * @returns {IAuthContext} Authentication context value.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
