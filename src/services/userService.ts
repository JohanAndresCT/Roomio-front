import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreClient } from '../firebase/firebaseClient'

/**
 * Represents metadata for a user stored in Firestore.
 * @property {number} [age] - The user's age (optional).
 * @property {string} email - The user's email address.
 * @property {string} displayName - The user's display name.
 * @property {string} [photoURL] - The user's profile photo URL (optional).
 * @property {any} [updatedAt] - Timestamp of last update (optional).
 */
export interface UserMetadata {
  age?: number
  email: string
  displayName: string
  photoURL?: string
  updatedAt?: any
}

/**
 * Saves or updates user metadata in Firestore for the given user ID.
 * Removes undefined fields before saving, as Firestore does not accept them.
 * @param {string} uid - The user ID.
 * @param {Partial<UserMetadata>} data - The user metadata to save or update.
 * @returns {Promise<{ success: boolean }>} Success status.
 * @throws Will throw an error if the operation fails.
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
 * Retrieves user metadata from Firestore for the given user ID.
 * @param {string} uid - The user ID.
 * @returns {Promise<UserMetadata | null>} The user metadata, or null if not found.
 * @throws Will throw an error if the operation fails.
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
 * Updates specific fields in user metadata for the given user ID in Firestore.
 * @param {string} uid - The user ID.
 * @param {Partial<UserMetadata>} data - The fields to update in user metadata.
 * @returns {Promise<{ success: boolean }>} Success status.
 * @throws Will throw an error if the operation fails.
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
