import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { getCurrentUser, updateUserPassword } from '../services/authService';
import type { IUser } from '../interfaces/IUser';

/**
 * Props for the ResetPasswordPage component.
 * @typedef {Object} ResetPasswordPageProps
 * @property {(page: string) => void} onNavigate - Function to navigate between pages.
 */
interface ResetPasswordPageProps {
  onNavigate: (page: string) => void;
}


/**
 * ResetPasswordPage component.
 * Allows the user to change their password with validation and feedback.
 * Displays error messages and navigation options.
 * @param {ResetPasswordPageProps} props - Component props.
 * @returns {JSX.Element} Password reset page layout.
 */
export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      onNavigate('login');
    } else {
      setUser(currentUser);
    }
  }, [onNavigate]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Al menos una mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Al menos una minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Al menos un número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Al menos un carácter especial');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Por favor, completa todos los campos');
      return;
    }

    // Validar requisitos de contraseña
    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setError(`La contraseña debe cumplir: ${passwordErrors.join(', ')}`);
      return;
    }

    // Validar que las contraseñas coincidan
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar que la nueva contraseña sea diferente
    if (formData.currentPassword === formData.newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setIsLoading(true);

    try {
      await updateUserPassword(formData.currentPassword, formData.newPassword);
      setPasswordReset(true);
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    const errors = validatePassword(password);
    const strength = ((5 - errors.length) / 5) * 100;
    
    if (strength < 40) return { strength, label: 'Débil', color: 'bg-red-500' };
    if (strength < 80) return { strength, label: 'Media', color: 'bg-yellow-500' };
    return { strength, label: 'Fuerte', color: 'bg-green-500' };
  };

  const currentStrength = passwordStrength(formData.newPassword);

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
                onClick={() => onNavigate('profile')}
                aria-label="Volver al perfil"
                className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl text-foreground">Cambiar contraseña</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Actualiza tu contraseña de acceso</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">

        <Card className="p-6">
          {!passwordReset ? (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl text-foreground mb-2">Cambiar contraseña</h2>
                <p className="text-muted-foreground text-sm">
                  Tu nueva contraseña debe ser diferente a la contraseña actual.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contraseña actual */}
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showPassword.current ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                      required
                      aria-required="true"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword.current ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword.current ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword.new ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                      required
                      aria-required="true"
                      aria-describedby="password-requirements"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword.new ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword.new ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {formData.newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Seguridad de la contraseña:</span>
                        <span className={`font-medium ${
                          currentStrength.label === 'Fuerte' ? 'text-green-600' :
                          currentStrength.label === 'Media' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {currentStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${currentStrength.color}`}
                          style={{ width: `${currentStrength.strength}%` }}
                          role="progressbar"
                          aria-valuenow={currentStrength.strength}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Fortaleza de la contraseña"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showPassword.confirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword.confirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword.confirm ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {/* Match indicator */}
                  {formData.confirmPassword && (
                    <p className={`text-xs ${
                      formData.newPassword === formData.confirmPassword
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {formData.newPassword === formData.confirmPassword
                        ? '✓ Las contraseñas coinciden'
                        : '✗ Las contraseñas no coinciden'}
                    </p>
                  )}
                </div>

                {/* Password requirements */}
                <div id="password-requirements" className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-primary mb-2">La contraseña debe contener:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                        {formData.newPassword.length >= 8 ? '✓' : '•'}
                      </span>
                      Mínimo 8 caracteres
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        {/[A-Z]/.test(formData.newPassword) ? '✓' : '•'}
                      </span>
                      Al menos una letra mayúscula
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={/[a-z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        {/[a-z]/.test(formData.newPassword) ? '✓' : '•'}
                      </span>
                      Al menos una letra minúscula
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={/[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        {/[0-9]/.test(formData.newPassword) ? '✓' : '•'}
                      </span>
                      Al menos un número
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        {/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? '✓' : '•'}
                      </span>
                      Al menos un carácter especial (!@#$%^&*...)
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                      Restableciendo...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                      Restablecer contraseña
                    </>
                  )}
                </Button>
              </form>

              {/* Additional info */}
              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => onNavigate('profile')}
                >
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
                </div>
                
                <h2 className="text-2xl text-foreground mb-3">¡Contraseña restablecida!</h2>
                <p className="text-muted-foreground mb-8">
                  Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                </p>

                <Button
                  onClick={() => onNavigate('profile')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Volver al perfil
                </Button>
              </div>
            </>
          )}
        </Card>
        </div>
      </main>
    </div>
  );
}

/**
 * Exports the ResetPasswordPage component as default.
 */
export default ResetPasswordPage;
