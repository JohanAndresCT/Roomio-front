import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreClient } from '../firebase/firebaseClient'

export interface UserMetadata {
  age?: number
  email: string
  displayName: string
  photoURL?: string
  updatedAt?: any
}

/**
 * Save or update user metadata in Firestore
 */
export async function saveUserToFirestore(uid: string, data: Partial<UserMetadata>) {
  try {
    const db = getFirestoreClient()
    const userRef = doc(db, 'users', uid)
    
    // Remover campos undefined (Firestore no los acepta)
    const cleanData: any = {}
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value
      }
    })
    
    await setDoc(userRef, {
      ...cleanData,
      updatedAt: serverTimestamp()
    }, { merge: true })
    
    return { success: true }
  } catch (error) {
    console.error('Error saving user to Firestore:', error)
    throw error
  }
}

/**
 * Get user metadata from Firestore
 */
export async function getUserFromFirestore(uid: string): Promise<UserMetadata | null> {
  try {
    const db = getFirestoreClient()
    const userRef = doc(db, 'users', uid)
    const docSnap = await getDoc(userRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as UserMetadata
    }
    return null
  } catch (error) {
    console.error('Error getting user from Firestore:', error)
    throw error
  }
}

/**
 * Update specific fields in user metadata
 */
export async function updateUserInFirestore(uid: string, data: Partial<UserMetadata>) {
  try {
    const db = getFirestoreClient()
    const userRef = doc(db, 'users', uid)
    
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error updating user in Firestore:', error)
    throw error
  }
}
