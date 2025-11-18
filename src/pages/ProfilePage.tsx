import { useState } from 'react';
import { Camera, Save, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Usuario Demo',
    email: 'demo@roomio.com',
    age: '28'
  });

  const handleSaveProfile = () => {
    console.log('Perfil actualizado correctamente');
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleImageUpload = () => {
    console.log('Función de carga de imagen disponible próximamente');
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
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" alt={profileData.name} />
                    <AvatarFallback className="text-2xl">
                      {profileData.name.charAt(0)}
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
                  <h2 className="text-2xl text-foreground mb-1">{profileData.name}</h2>
                  <p className="text-muted-foreground mb-4">{profileData.email}</p>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Edad</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="120"
                    value={profileData.age}
                    onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                    disabled={!isEditing}
                    className="bg-input-background"
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 items-center justify-center sm:justify-start">
                    <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Guardar cambios
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" className="w-full sm:w-auto">
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
                  <Button variant="outline" size="sm" className="sm:flex-shrink-0">
                    Cambiar contraseña
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <div>
                    <p className="text-foreground">Eliminar cuenta</p>
                    <p className="text-sm text-muted-foreground">Esta acción es permanente y no se puede deshacer</p>
                  </div>
                  <Button variant="destructive" size="sm" className="sm:flex-shrink-0">
                    Eliminar cuenta
                  </Button>
                </div>
              </div>
            </Card>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
