import { useState, useEffect } from 'react';
import { Camera, Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { getCurrentUser, updateUserProfile, deleteUserAccount } from '../services/authService';
import { getAuthClient } from '../firebase/firebaseClient';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import type { IUser } from '../interfaces/IUser';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    age: '',
    photoURL: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para el modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // Estados para el modal de reautenticación (cambio de email)
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [reauthError, setReauthError] = useState('');
  const [pendingEmailChange, setPendingEmailChange] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setProfileData({
        name: currentUser.displayName || '',
        email: currentUser.email || '',
        age: currentUser.age?.toString() || '',
        photoURL: currentUser.photoURL || ''
      });
    }
  }, []);

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validar edad si se proporciona
      const age = profileData.age ? parseInt(profileData.age) : undefined;
      if (profileData.age && (isNaN(age!) || age! < 1 || age! > 150)) {
        setError('Por favor ingresa una edad válida (1-150)');
        setLoading(false);
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (profileData.email && !emailRegex.test(profileData.email)) {
        setError('Por favor ingresa un correo electrónico válido');
        setLoading(false);
        return;
      }

      // Si el email cambió, solicitar reautenticación
      if (user && profileData.email !== user.email) {
        setPendingEmailChange(profileData.email);
        setShowReauthModal(true);
        setLoading(false);
        return;
      }

      const updatedUser = await updateUserProfile(
        profileData.name,
        profileData.photoURL,
        age,
        profileData.email
      );
      
      // Actualizar estado local con los datos guardados
      setUser(updatedUser);
      setProfileData({
        name: updatedUser.displayName || '',
        email: updatedUser.email || '',
        age: updatedUser.age?.toString() || '',
        photoURL: updatedUser.photoURL || ''
      });
      
      setSuccess('Perfil actualizado correctamente');
      setIsEditing(false);
      
      console.log('✅ Estado actualizado con:', updatedUser);
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setProfileData({
        name: user.displayName || '',
        email: user.email || '',
        age: user.age?.toString() || '',
        photoURL: user.photoURL || ''
      });
    }
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

  const handleImageUpload = () => {
    console.log('Función de carga de imagen disponible próximamente');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    
    if (!deletePassword) {
      setDeleteError('Por favor ingresa tu contraseña para confirmar');
      return;
    }

    setDeleteLoading(true);

    try {
      await deleteUserAccount(deletePassword);
      // Después de eliminar exitosamente, redirigir al login
      onNavigate('login');
    } catch (err: any) {
      console.error('Error al eliminar cuenta:', err);
      setDeleteError(err.message || 'Error al eliminar la cuenta');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleReauthForEmail = async () => {
    setReauthError('');
    
    if (!reauthPassword) {
      setReauthError('Por favor ingresa tu contraseña');
      return;
    }

    setReauthLoading(true);

    try {
      // Reautenticar usuario
      const auth = getAuthClient();
      const firebaseUser = auth.currentUser;
      
      if (!firebaseUser || !user?.email) {
        throw new Error('No hay sesión activa');
      }

      const credential = EmailAuthProvider.credential(user.email, reauthPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Ahora actualizar perfil con el nuevo email
      const age = profileData.age ? parseInt(profileData.age) : undefined;
      const updatedUser = await updateUserProfile(
        profileData.name,
        profileData.photoURL,
        age,
        pendingEmailChange
      );
      
      // Actualizar estado local
      setUser(updatedUser);
      setProfileData({
        name: updatedUser.displayName || '',
        email: updatedUser.email || '',
        age: updatedUser.age?.toString() || '',
        photoURL: updatedUser.photoURL || ''
      });
      
      setSuccess('Perfil y email actualizados correctamente');
      setIsEditing(false);
      setShowReauthModal(false);
      setReauthPassword('');
      setPendingEmailChange('');
      
    } catch (err: any) {
      console.error('Error en reautenticación:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setReauthError('Contraseña incorrecta');
      } else {
        setReauthError(err.message || 'Error al verificar contraseña');
      }
    } finally {
      setReauthLoading(false);
    }
  };

  const handleCancelReauth = () => {
    setShowReauthModal(false);
    setReauthPassword('');
    setReauthError('');
    setPendingEmailChange('');
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('dashboard')}
                aria-label="Volver al panel"
                className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl text-foreground">Mi perfil</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Administra tu información personal y preferencias</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
            {/* Profile Header Card */}
            <Card className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage 
                      src={profileData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.email || 'user'}`} 
                      alt={profileData.name || 'Usuario'} 
                    />
                    <AvatarFallback className="text-2xl">
                      {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handleImageUpload}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                    aria-label="Cambiar foto de perfil"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                  <h2 className="text-2xl text-foreground mb-1">{profileData.name || 'Usuario'}</h2>
                  <p className="text-muted-foreground mb-1">{profileData.email}</p>
                  {profileData.age && (
                    <p className="text-sm text-muted-foreground mb-4">{profileData.age} años</p>
                  )}
                  {!profileData.age && <div className="mb-4"></div>}
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      Editar perfil
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Personal Information */}
            <Card className="p-6">
              <h3 className="text-foreground mb-6">Información personal</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!isEditing}
                    className="bg-input-background"
                    aria-describedby="name-description"
                  />
                  <p id="name-description" className="text-xs text-muted-foreground">
                    Este nombre se mostrará a otros participantes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cambiar tu correo requiere verificar tu contraseña
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Edad (opcional)</Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="150"
                    placeholder="Ingresa tu edad"
                    value={profileData.age}
                    onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                    disabled={!isEditing}
                    className="bg-input-background"
                    aria-describedby="age-description"
                  />
                  <p id="age-description" className="text-xs text-muted-foreground">
                    Tu edad se guarda en Firebase y se sincroniza entre dispositivos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photoURL">URL de foto de perfil (opcional)</Label>
                  <Input
                    id="photoURL"
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    value={profileData.photoURL}
                    onChange={(e) => setProfileData({ ...profileData, photoURL: e.target.value })}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puedes dejar esto vacío para usar un avatar generado automáticamente
                  </p>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 items-center justify-center sm:justify-start">
                    <Button 
                      onClick={handleSaveProfile} 
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                      disabled={loading}
                    >
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      {loading ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                    <Button 
                      onClick={handleCancelEdit} 
                      variant="outline" 
                      className="w-full sm:w-auto"
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Account Security */}
            <Card className="p-6">
              <h3 className="text-foreground mb-6">Seguridad</h3>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-foreground">Contraseña</p>
                    <p className="text-sm text-muted-foreground">Última actualización: hace 30 días</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="sm:flex-shrink-0"
                    onClick={() => onNavigate('reset-password')}
                  >
                    Cambiar contraseña
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <div>
                    <p className="text-foreground">Eliminar cuenta</p>
                    <p className="text-sm text-muted-foreground">Esta acción es permanente y no se puede deshacer</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="sm:flex-shrink-0"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Eliminar cuenta
                  </Button>
                </div>
              </div>
            </Card>
        </div>
      </main>

      {/* Modal de confirmación para eliminar cuenta (sin contraseña) */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <DialogTitle>¿Eliminar cuenta?</DialogTitle>
            </div>
            <DialogDescription>
              Esta acción es permanente y no se puede deshacer. Se eliminarán todos tus datos, incluyendo tu perfil, reuniones y configuraciones.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {deleteError}
              </div>
            )}
            <p className="text-base text-center text-muted-foreground">¿Estás seguro que deseas eliminar tu cuenta?</p>
          </div>
          <DialogFooter>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center items-center">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                disabled={deleteLoading}
                className="w-full sm:w-auto"
              >
                No, cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="w-full sm:w-auto"
              >
                {deleteLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                    Eliminando...
                  </>
                ) : (
                  'Sí, eliminar mi cuenta'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de reautenticación para cambio de email */}
      <Dialog open={showReauthModal} onOpenChange={setShowReauthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar identidad</DialogTitle>
            <DialogDescription>
              Por seguridad, necesitas ingresar tu contraseña para cambiar tu correo electrónico.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4">
            {reauthError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {reauthError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reauth-password">
                Contraseña actual
              </Label>
              <Input
                id="reauth-password"
                type="password"
                placeholder="Tu contraseña"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                disabled={reauthLoading}
                className="bg-input-background"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Cambiarás tu email de <strong>{user?.email}</strong> a <strong>{pendingEmailChange}</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelReauth}
              disabled={reauthLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReauthForEmail}
              disabled={reauthLoading || !reauthPassword}
            >
              {reauthLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                  Verificando...
                </>
              ) : (
                'Confirmar cambio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;
