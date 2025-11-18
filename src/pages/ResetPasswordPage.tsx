import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

interface ResetPasswordPageProps {
  onNavigate: (page: string) => void;
}

export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

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
    
    if (!formData.newPassword || !formData.confirmPassword) {
      alert('Por favor, completa todos los campos');
      return;
    }

    // Validar requisitos de contraseña
    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      alert(`La contraseña debe cumplir: ${passwordErrors.join(', ')}`);
      return;
    }

    // Validar que las contraseñas coincidan
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    // Simulación de cambio de contraseña
    setTimeout(() => {
      setIsLoading(false);
      setPasswordReset(true);
      alert('Contraseña restablecida exitosamente');
    }, 1500);
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
    <div className="flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-accent/5 to-background min-h-screen">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img 
              src="/logo.png" 
              alt="Roomio Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-semibold text-foreground">Roomio</span>
          </div>
        </div>

        <Card className="p-8">
          {!passwordReset ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                
                <h1 className="text-2xl text-foreground mb-2">Crear nueva contraseña</h1>
                <p className="text-muted-foreground">
                  Tu nueva contraseña debe ser diferente a las contraseñas utilizadas anteriormente.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      autoFocus
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
                <p className="text-sm text-muted-foreground text-center">
                  ¿Recordaste tu contraseña?{' '}
                  <button
                    onClick={() => onNavigate('login')}
                    className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  >
                    Iniciar sesión
                  </button>
                </p>
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
                  onClick={() => onNavigate('login')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Ir al inicio de sesión
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
