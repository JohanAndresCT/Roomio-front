/**
 * Represents a user in Roomio.
 * @typedef {Object} IUser
 * @property {string} uid - Unique user ID.
 * @property {string} email - User email address.
 * @property {string | null} [displayName] - User display name (optional).
 * @property {string | null} [photoURL] - User profile photo URL (optional).
 * @property {number | null} [age] - User age (optional).
 */
export interface IUser {
  uid: string
  email: string
  displayName?: string | null
  photoURL?: string | null
  age?: number | null
}
