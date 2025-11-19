import { apiClient } from './api';
import { STORAGE_KEYS, API_BASE_URL } from '../constants';
import type { IUser } from '../interfaces/IUser';
import { getAuthClient } from '../firebase/firebaseClient';
import { 
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  reload,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail
} from 'firebase/auth';
import { saveUserToFirestore, getUserFromFirestore } from './userService';

/**
 * Authentication Service
 * Provides authentication methods for the Roomio application using Backend API.
 * Handles user registration, login, logout, password recovery, and account management.
 */

// ============================================
// AUTHENTICATION METHODS
// ============================================

/**
 * Register a new user with email and password
 * Sprint 1 - Story #1: Sign-up básico 
 * 
 * @param email - User's email address
 * @param password - User's password
 * @param displayName - User's display name
 * @returns Promise<IUser> - The created user object
 * @throws Error if registration fails
 */
/**
 * Register a new user with email and password
 * Sprint 1 - Story #1: Sign-up básico 
 * 
 * @param email - User's email address
 * @param password - User's password
 * @param displayName - User's display name
 * @param age - User's age (optional)
 * @returns Promise<IUser> - The created user object
 * @throws Error if registration fails
 */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  age?: number
): Promise<IUser> {
  console.log('🛠️ authService.registerUser llamado con:', { email, displayName });
  console.log('🔑 Longitud de contraseña:', password.length);
  
  try {
    console.log('📝 Enviando petición al backend /auth/register...');
    console.log('📦 Datos a enviar:', { email, displayName, age, password: '[HIDDEN]' });
    
    const requestData: any = {
      email,
      password,
      displayName
    };
    
    if (age !== undefined) {
      requestData.age = age;
    }
    
    const response = await apiClient.post<any>('/auth/register', requestData);
    
    console.log('✅ Respuesta del backend:', response);
    console.log('📝 response.data:', response.data);
    console.log('🔍 Estructura completa de response.data:', JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.uid) {
      console.error('⚠️ Sin UID en la respuesta:', response);
      throw new Error('Respuesta inválida del servidor - no se recibió UID');
    }

    const responseData = response.data;
    
    // Paso crítico: Autenticar con Firebase para obtener un token válido
    console.log('🔥 Autenticando con Firebase Auth para obtener token válido...');
    const auth = getAuthClient();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseToken = await userCredential.user.getIdToken();
    
    console.log('✅ Token de Firebase obtenido:', firebaseToken.substring(0, 20) + '...');
    
    const user: IUser = {
      uid: responseData.uid,
      email: email,
      displayName: displayName,
      photoURL: null,
      age: age || responseData.age || null
    };
    
    // Save Firebase token (valid) and user in localStorage
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, firebaseToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    
    // Guardar datos del usuario en Firestore
    const firestoreData: any = {
      email: user.email,
      displayName: user.displayName || ''
    };
    
    if (user.photoURL) {
      firestoreData.photoURL = user.photoURL;
    }
    
    if (age !== undefined) {
      firestoreData.age = age;
    }
    
    await saveUserToFirestore(user.uid, firestoreData);
    console.log('✅ Datos guardados en Firestore');
    
    console.log('✅ Usuario registrado y autenticado con Firebase');
    console.log('✅ Datos del usuario:', user);
    console.log('🔑 Token de Firebase guardado');
    
    // Nota: El backend puede no tener endpoints para gestionar usuarios
    // Los datos se persisten en Firebase Auth (displayName, photoURL)
    // Los datos adicionales (age) se guardan en localStorage
    
    return user;
    
  } catch (error: any) {
    console.error('❌ Error registering user:', error);
    console.error('❌ Error completo:', JSON.stringify(error, null, 2));
    
    // Clean localStorage on error
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // User-friendly error messages
    let errorMessage = error.message || 'Error al crear la cuenta';
    
    if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already in use')) {
      errorMessage = 'Este correo electrónico ya está registrado';
    } else if (errorMessage.includes('weak-password')) {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres';
    } else if (errorMessage.includes('invalid-email')) {
      errorMessage = 'Correo electrónico inválido';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Login user with email and password
 * Sprint 1 - Story #2: Login / Logout 
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<IUser> - The authenticated user object
 * @throws Error if login fails
 */
/**
 * Login with Google OAuth
 * Usa Firebase Auth directamente en el frontend
 * 
 * @returns Promise<IUser> - The authenticated user object
 * @throws Error if login fails
 */
export async function loginWithGoogle(): Promise<IUser> {
  console.log('🔵 authService.loginWithGoogle llamado');
  
  // Limpiar localStorage antes de hacer login
  console.log('🧹 Limpiando localStorage antes del login...');
  localStorage.clear();
  
  try {
    const auth = getAuthClient();
    const provider = new GoogleAuthProvider();
    
    // Configurar el provider para solicitar acceso
    provider.addScope('profile');
    provider.addScope('email');
    
    console.log('🔥 Iniciando popup de Google...');
    
    // Autenticar con popup
    const result = await signInWithPopup(auth, provider);
    console.log('✅ Autenticado con Google:', result.user);
    
    // Obtener el token de Firebase
    const idToken = await result.user.getIdToken();
    console.log('✅ Token de Firebase obtenido');
    
    // Crear objeto de usuario
    const user: IUser = {
      uid: result.user.uid,
      email: result.user.email || '',
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
      photoURL: result.user.photoURL || null,
      age: null
    };
    
    console.log('✅ Usuario extraído:', user);

    // Guardar token y usuario en localStorage
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    
    // Guardar/actualizar en Firestore
    const googleFirestoreData: any = {
      email: user.email,
      displayName: user.displayName || ''
    };
    if (user.photoURL) {
      googleFirestoreData.photoURL = user.photoURL;
    }
    await saveUserToFirestore(user.uid, googleFirestoreData);
    
    console.log('✅ Sesión iniciada con Google');
    
    // Opcional: Sincronizar con backend (sin bloquear si falla)
    try {
      console.log('📝 Sincronizando con backend...');
      await apiClient.post('/auth/sync', { 
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        age: user.age
      });
      console.log('✅ Sincronizado con backend');
    } catch (backendError) {
      console.warn('⚠️ No se pudo sincronizar con backend (continuando):', backendError);
    }
    
    return user;
  } catch (error: any) {
    console.error('❌ Error logging in with Google:', error);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Specific error messages
    let errorMessage = error.message || 'Error al iniciar sesión con Google';
    
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Ventana de autenticación cerrada';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup bloqueado. Por favor permite popups en tu navegador';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Solicitud cancelada';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Login with Facebook OAuth
 * Usa Firebase Auth directamente en el frontend
 * 
 * @returns Promise<IUser> - The authenticated user object
 * @throws Error if login fails
 */
export async function loginWithFacebook(): Promise<IUser> {
  console.log('🔵 authService.loginWithFacebook llamado');
  
  // Limpiar localStorage antes de hacer login
  console.log('🧹 Limpiando localStorage antes del login...');
  localStorage.clear();
  
  try {
    const auth = getAuthClient();
    const provider = new FacebookAuthProvider();
    
    // Configurar el provider
    provider.addScope('email');
    provider.addScope('public_profile');
    
    console.log('🔥 Iniciando popup de Facebook...');
    
    // Autenticar con popup
    const result = await signInWithPopup(auth, provider);
    console.log('✅ Autenticado con Facebook:', result.user);
    
    // Obtener el token de Firebase
    const idToken = await result.user.getIdToken();
    console.log('✅ Token de Firebase obtenido');
    
    // Crear objeto de usuario
    const user: IUser = {
      uid: result.user.uid,
      email: result.user.email || '',
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
      photoURL: result.user.photoURL || null,
      age: null
    };
    
    console.log('✅ Usuario extraído:', user);

    // Guardar token y usuario en localStorage
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    
    // Guardar/actualizar en Firestore
    const facebookFirestoreData: any = {
      email: user.email,
      displayName: user.displayName || ''
    };
    if (user.photoURL) {
      facebookFirestoreData.photoURL = user.photoURL;
    }
    await saveUserToFirestore(user.uid, facebookFirestoreData);
    
    console.log('✅ Sesión iniciada con Facebook');
    
    // Opcional: Sincronizar con backend (sin bloquear si falla)
    try {
      console.log('📝 Sincronizando con backend...');
      await apiClient.post('/auth/sync', { 
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        age: user.age
      });
      console.log('✅ Sincronizado con backend');
    } catch (backendError) {
      console.warn('⚠️ No se pudo sincronizar con backend (continuando):', backendError);
    }
    
    return user;
  } catch (error: any) {
    console.error('❌ Error logging in with Facebook:', error);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Specific error messages
    let errorMessage = error.message || 'Error al iniciar sesión con Facebook';
    
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Ventana de autenticación cerrada';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup bloqueado. Por favor permite popups en tu navegador';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Solicitud cancelada';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'Ya existe una cuenta con este correo usando otro proveedor';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Login user with email and password
 * Sprint 1 - Story #2: Login / Logout 
 * 
 * Firebase Auth se maneja desde el backend.
 * Este método solo hace una llamada al backend para autenticar.
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<IUser> - The authenticated user object
 * @throws Error if login fails
 */
export async function loginUser(
  email: string,
  password: string
): Promise<IUser> {
  console.log('🔵 authService.loginUser llamado con:', { email });
  console.log('🔑 Longitud de contraseña:', password.length);
  
  // Limpiar localStorage antes de hacer login
  console.log('🧹 Limpiando localStorage antes del login...');
  localStorage.clear();
  
  try {
    console.log('📝 Enviando petición al backend /auth/login...');
    
    // Primero verificar con el backend que el usuario existe
    const response = await apiClient.post<any>('/auth/login', {
      email,
      password
    });
    
    console.log('✅ Respuesta del backend:', response);
    console.log('📝 response.data:', response.data);
    
    if (!response.data || !response.data.uid) {
      console.error('⚠️ Sin UID en la respuesta:', response);
      throw new Error('Respuesta inválida del servidor - no se recibió UID');
    }

    const responseData = response.data;
    
    // Paso crítico: Autenticar con Firebase para obtener un token válido
    console.log('🔥 Autenticando con Firebase Auth para obtener token válido...');
    const auth = getAuthClient();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Recargar el usuario para asegurar datos actualizados
    await reload(userCredential.user);
    
    const firebaseToken = await userCredential.user.getIdToken();
    
    console.log('✅ Token de Firebase obtenido:', firebaseToken.substring(0, 20) + '...');
    
    // Obtener datos del usuario desde Firebase Auth y Firestore
    // El backend solo verifica credenciales, los datos del perfil vienen de Firebase Auth y Firestore
    const firestoreData = await getUserFromFirestore(responseData.uid);
    
    const user: IUser = {
      uid: responseData.uid,
      email: userCredential.user.email || email,
      displayName: userCredential.user.displayName || responseData.displayName || email.split('@')[0],
      photoURL: userCredential.user.photoURL || responseData.photoURL || null,
      age: firestoreData?.age || responseData.age || null
    };
    
    console.log('✅ Usuario extraído de Firebase Auth + Firestore:', user);
    console.log('📝 displayName desde Firebase:', userCredential.user.displayName);
    console.log('📝 photoURL desde Firebase:', userCredential.user.photoURL);
    console.log('📝 age desde Firestore:', firestoreData?.age);

    // Save Firebase token (valid) and user in localStorage
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, firebaseToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    
    console.log('✅ Sesión iniciada con token de Firebase');
    console.log('✅ Datos del usuario:', user);
    console.log('🔑 Token de Firebase guardado');
    
    return user;
  } catch (error: any) {
    console.error('❌ Error logging in:', error);
    console.error('❌ Error completo:', JSON.stringify(error, null, 2));
    
    // Clean localStorage on error
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // User-friendly error messages
    let errorMessage = error.message || 'Error al iniciar sesión';
    
    if (errorMessage.includes('operation-not-allowed')) {
      errorMessage = 'El sistema de autenticación no está configurado correctamente. Por favor contacta al administrador para habilitar Email/Password en Firebase Console.';
    } else if (errorMessage.includes('No autorizado') || 
        errorMessage.includes('401') ||
        errorMessage.includes('wrong-password') ||
        errorMessage.includes('user-not-found') ||
        errorMessage.includes('invalid-credential')) {
      errorMessage = 'Email o contraseña incorrectos';
    } else if (errorMessage.includes('too-many-requests')) {
      errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
    } else if (errorMessage.includes('user-disabled')) {
      errorMessage = 'Esta cuenta ha sido deshabilitada';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Logout current user
 * Sprint 1 - Story #2: Login / Logout
 * 
 * @returns Promise<void>
 * @throws Error if logout fails
 */
export async function logoutUser(): Promise<void> {
  try {
    console.log('📝 Cerrando sesión...');
    
    // Opcionalmente llamar al backend para invalidar el token
    try {
      await apiClient.post('/auth/logout', {}, true);
    } catch (error) {
      console.warn('Error al notificar logout al backend:', error);
    }
    
    // Limpiar localStorage
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    console.log('✅ Sesión cerrada');
  } catch (error: any) {
    console.error('Error logging out:', error);
    throw new Error('Error al cerrar sesión');
  }
}

/**
 * Send password reset email
 * Sprint 1 - Story #3: Recuperar contraseña 
 * 
 * @param email - User's email address
 * @returns Promise<void>
 * @throws Error if sending email fails
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    console.log('📝 Enviando email de recuperación de contraseña...');
    
    const auth = getAuthClient();
    
    // Firebase automatically handles sending the email
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + '/login', // URL de retorno después de resetear
      handleCodeInApp: false
    });
    
    console.log('✅ Email de recuperación enviado por Firebase');
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    
    // User-friendly error messages
    let errorMessage = error.message || 'Error al enviar el correo de recuperación';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No existe una cuenta con este correo electrónico';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Correo electrónico inválido';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Demasiados intentos. Por favor intenta más tarde';
    }
    
    throw new Error(errorMessage);
  }
}

// ============================================
// PROFILE MANAGEMENT METHODS
// ============================================

/**
 * Get current user profile
 * Sprint 1 - Story #4: Ver perfil de usuario
 * 
 * @returns IUser | null - Current user or null if not authenticated
 */
export function getCurrentUser(): IUser | null {
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userData) return null;
    return JSON.parse(userData) as IUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Update user profile information
 * Sprint 1 - Story #5: Editar perfil de usuario (5 pts)
 * 
 * @param displayName - New display name (optional)
 * @param photoURL - New photo URL (optional)
 * @param age - New age (optional)
 * @param email - New email (optional, requires re-authentication)
 * @returns Promise<IUser>
 * @throws Error if update fails or user not authenticated
 */
export async function updateUserProfile(
  displayName?: string,
  photoURL?: string,
  age?: number,
  email?: string
): Promise<IUser> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    console.log('🔧 Actualizando perfil...');
    console.log('👤 Usuario actual:', currentUser);
    
    const updates: { displayName?: string; photoURL?: string; age?: number; email?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    if (age !== undefined) updates.age = age;
    if (email !== undefined && email !== currentUser.email) updates.email = email;

    console.log('📦 Datos a enviar:', updates);
    console.log('🔑 UID:', currentUser.uid);

    // 1. Actualizar perfil en Firebase Auth (displayName y photoURL)
    const auth = getAuthClient();
    const firebaseUser = auth.currentUser;
    
    if (firebaseUser && (displayName !== undefined || photoURL !== undefined)) {
      console.log('🔥 Actualizando perfil en Firebase Auth...');
      const firebaseUpdates: any = {};
      if (displayName !== undefined) firebaseUpdates.displayName = displayName;
      if (photoURL !== undefined) firebaseUpdates.photoURL = photoURL || null;
      
      try {
        await updateProfile(firebaseUser, firebaseUpdates);
        // Recargar el usuario para obtener los datos actualizados
        await reload(firebaseUser);
        console.log('✅ Perfil actualizado en Firebase Auth');
      } catch (firebaseError: any) {
        console.error('❌ Error al actualizar Firebase Auth:', firebaseError.message);
        throw new Error('Error al actualizar el perfil en Firebase');
      }
    }

    // 1.5. Actualizar email en Firebase Auth si es necesario
    if (firebaseUser && email !== undefined && email !== currentUser.email) {
      console.log('📧 Actualizando email en Firebase Auth...');
      try {
        // Use verifyBeforeUpdateEmail to send verification before changing
        await verifyBeforeUpdateEmail(firebaseUser, email);
        console.log('✅ Email de verificación enviado. Revisa tu correo para confirmar el cambio.');
        // Note: Email is NOT updated immediately, only after verification
        // For now, we don't update the email in the user object
        email = currentUser.email; // Keep current email until verified
      } catch (emailError: any) {
        console.error('❌ Error al actualizar email:', emailError.message);
        if (emailError.code === 'auth/requires-recent-login') {
          throw new Error('Por seguridad, debes volver a iniciar sesión para cambiar tu email');
        } else if (emailError.code === 'auth/email-already-in-use') {
          throw new Error('Este email ya está en uso por otra cuenta');
        } else if (emailError.code === 'auth/invalid-email') {
          throw new Error('Email inválido');
        }
        throw new Error('Error al actualizar el email');
      }
    }

    // 2. Intentar actualizar en el backend (opcional - no bloquear si falla)
    try {
      console.log('📝 Intentando actualizar en backend...');
      await apiClient.put<IUser>(`/users/${currentUser.uid}`, updates, true);
      console.log('✅ Perfil actualizado en backend');
    } catch (backendError: any) {
      console.warn('⚠️ Backend no soporta actualización de perfil:', backendError.message);
      // No bloquear - el backend puede no tener estos endpoints implementados
    }

    // 3. Update localStorage with latest data from Firebase
    const refreshedUser = firebaseUser ? {
      uid: currentUser.uid,
      email: email !== undefined ? email : (firebaseUser.email || currentUser.email),
      displayName: firebaseUser.displayName || displayName || currentUser.displayName,
      photoURL: firebaseUser.photoURL || photoURL || currentUser.photoURL,
      age: age !== undefined ? age : currentUser.age
    } : { ...currentUser, ...updates };
    
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(refreshedUser));
    
    // 4. Guardar todos los datos en Firestore
    const firestoreData: any = {
      email: refreshedUser.email,
      displayName: refreshedUser.displayName || ''
    };
    
    if (refreshedUser.photoURL) {
      firestoreData.photoURL = refreshedUser.photoURL;
    }
    
    if (refreshedUser.age !== null && refreshedUser.age !== undefined) {
      firestoreData.age = refreshedUser.age;
    }
    
    await saveUserToFirestore(currentUser.uid, firestoreData);
    console.log('✅ Datos guardados en Firestore');
    
    console.log('✅ Perfil actualizado exitosamente:', refreshedUser);
    return refreshedUser;
  } catch (error: any) {
    console.error('❌ Error updating profile:', error);
    console.error('❌ Error completo:', JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Error al actualizar el perfil');
  }
}

/**
 * Update user password
 * Sprint 1 - Story #5: Editar perfil de usuario (5 pts)
 * 
 * @param currentPassword - Current password for re-authentication
 * @param newPassword - New password
 * @returns Promise<void>
 * @throws Error if update fails or user not authenticated
 */
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.email) {
      throw new Error('No hay usuario autenticado');
    }

    console.log('🔑 Actualizando contraseña...');

    // Obtener usuario de Firebase
    const auth = getAuthClient();
    const firebaseUser = auth.currentUser;
    
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('No hay sesión activa en Firebase');
    }

    // Reauthenticate with current password
    console.log('🔐 Reautenticando usuario...');
    const credential = EmailAuthProvider.credential(
      firebaseUser.email,
      currentPassword
    );

    try {
      await reauthenticateWithCredential(firebaseUser, credential);
      console.log('✅ Usuario reautenticado');
    } catch (reauthError: any) {
      console.error('❌ Error de reautenticación:', reauthError);
      if (reauthError.code === 'auth/wrong-password' || reauthError.code === 'auth/invalid-credential') {
        throw new Error('La contraseña actual es incorrecta');
      }
      throw new Error('Error al verificar la contraseña actual');
    }

    // Update password in Firebase
    console.log('🔄 Actualizando contraseña en Firebase...');
    await updatePassword(firebaseUser, newPassword);
    console.log('✅ Contraseña actualizada en Firebase');

    // Opcional: Notificar al backend
    try {
      await apiClient.put('/users/password', {
        uid: currentUser.uid
      }, true);
      console.log('✅ Backend notificado del cambio de contraseña');
    } catch (backendError: any) {
      console.warn('⚠️ No se pudo notificar al backend (continuando):', backendError.message);
      // Don't throw error, change already completed in Firebase
    }
    
    console.log('✅ Contraseña actualizada correctamente');
  } catch (error: any) {
    console.error('❌ Error updating password:', error);
    throw new Error(error.message || 'Error al actualizar la contraseña');
  }
}

/**
 * Delete user account
 * Sprint 1 - Story #6: Eliminar cuenta de usuario (3 pts)
 * 
 * @param password - User's current password for confirmation
 * @returns Promise<void>
 * @throws Error if deletion fails or user not authenticated
 */
export async function deleteUserAccount(password: string): Promise<void> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.email) {
      throw new Error('No hay usuario autenticado');
    }

    console.log('🗑️ Eliminando cuenta...');

    // Obtener usuario de Firebase
    const auth = getAuthClient();
    const firebaseUser = auth.currentUser;
    
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('No hay sesión activa en Firebase');
    }

    // Reauthenticate with password to confirm identity
    console.log('🔐 Reautenticando usuario para confirmar...');
    const credential = EmailAuthProvider.credential(
      firebaseUser.email,
      password
    );

    try {
      await reauthenticateWithCredential(firebaseUser, credential);
      console.log('✅ Usuario reautenticado');
    } catch (reauthError: any) {
      console.error('❌ Error de reautenticación:', reauthError);
      if (reauthError.code === 'auth/wrong-password' || reauthError.code === 'auth/invalid-credential') {
        throw new Error('Contraseña incorrecta');
      }
      throw new Error('Error al verificar la contraseña');
    }

    // Eliminar cuenta de Firebase Auth
    console.log('🔥 Eliminando cuenta de Firebase...');
    await deleteUser(firebaseUser);
    console.log('✅ Cuenta eliminada de Firebase');

    // Opcional: Notificar al backend para eliminar datos adicionales
    try {
      await apiClient.delete(`/users/${currentUser.uid}`, true);
      console.log('✅ Datos eliminados del backend');
    } catch (backendError: any) {
      console.warn('⚠️ No se pudo eliminar del backend (continuando):', backendError.message);
      // No bloquear - el usuario ya fue eliminado de Firebase
    }
    
    // Limpiar localStorage
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    console.log('✅ Cuenta eliminada completamente');
  } catch (error: any) {
    console.error('❌ Error deleting account:', error);
    throw new Error(error.message || 'Error al eliminar la cuenta');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Debug function to check stored credentials
 * REMOVE IN PRODUCTION
 */
export function debugStoredData(): void {
  console.log('🔍 Debug - Datos almacenados:');
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  
  console.log('Token:', token ? `${token.substring(0, 20)}...` : 'No hay token');
  console.log('User Data:', userData ? JSON.parse(userData) : 'No hay datos de usuario');
}

/**
 * Check if user is authenticated
 * 
 * @returns boolean - True if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const user = getCurrentUser();
  return !!(token && user);
}

/**
 * Get user's auth token for API authentication
 * 
 * @returns string | null - User's auth token or null if not authenticated
 */
export function getUserToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export default {
  registerUser,
  loginUser,
  loginWithGoogle,
  loginWithFacebook,
  logoutUser,
  sendPasswordReset,
  getCurrentUser,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  isAuthenticated,
  getUserToken
};
