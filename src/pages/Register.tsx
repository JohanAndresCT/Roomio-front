import { useState } from 'react';
import { Facebook, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { registerUser, loginUser, loginWithGoogle, loginWithFacebook } from '../services/authService';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const passwordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    const errors = validatePassword(password);
    const strength = ((5 - errors.length) / 5) * 100;
    
    if (strength < 40) return { strength, label: 'Débil', color: 'bg-red-500' };
    if (strength < 80) return { strength, label: 'Media', color: 'bg-yellow-500' };
    return { strength, label: 'Fuerte', color: 'bg-green-500' };
  };

  const currentStrength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validaciones
    if (!name || !age || !email || !password || !confirmPassword) {
      setError('Por favor, completa todos los campos');
      return;
    }

    // Validar requisitos de contraseña
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(`La contraseña debe cumplir: ${passwordErrors.join(', ')}`);
      return;
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    console.log('🔵 Register: Formulario enviado', { email, name });
    setLoading(true);

    try {
      console.log('🔵 Register: Llamando a registerUser...');
      // Registrar usuario en Firebase
      const userAge = age ? parseInt(age) : undefined;
      const user = await registerUser(email, password, name, userAge);
      console.log('✅ Registro exitoso:', user);
      
      // ⚠️ TEMPORAL: Comentado hasta que se habilite Email/Password en Firebase Console
      // El login automático falla porque Firebase Auth Email/Password no está habilitado
      // Descomenta estas líneas después de habilitar Email/Password:
      /*
      console.log('🔄 Haciendo login automático después del registro...');
      await loginUser(email, password);
      console.log('✅ Login automático exitoso');
      */
      
      // Por ahora, navegar directamente al dashboard con el token del registro
      onNavigate('dashboard');
    } catch (err: any) {
      console.error('❌ Error en registro:', err);
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      console.log('🔵 Register: Registrando con Google...');
      const user = await loginWithGoogle();
      console.log('✅ Registro con Google exitoso:', user);
      onNavigate('dashboard');
    } catch (err: any) {
      console.error('❌ Error en registro con Google:', err);
      setError(err.message || 'Error al registrarse con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    setLoading(true);

    try {
      console.log('🔵 Register: Registrando con Facebook...');
      const user = await loginWithFacebook();
      console.log('✅ Registro con Facebook exitoso:', user);
      onNavigate('dashboard');
    } catch (err: any) {
      console.error('❌ Error en registro con Facebook:', err);
      setError(err.message || 'Error al registrarse con Facebook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background px-4 py-12">
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
          <h1 className="text-2xl text-foreground mb-2">
            Crear cuenta
          </h1>
          <p className="text-muted-foreground">
            Completa los datos para registrarte
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Edad</Label>
              <input
                id="age"
                type="number"
                placeholder="18"
                min="13"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                  aria-required="true"
                  aria-describedby="password-requirements"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Match indicator */}
              {confirmPassword && (
                <p className={`text-xs ${
                  password === confirmPassword
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {password === confirmPassword
                    ? '✓ Las contraseñas coinciden'
                    : '✗ Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            {/* Password requirements */}
            <div id="password-requirements" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-foreground mb-2">La contraseña debe contener:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className={password.length >= 8 ? 'text-green-600' : ''}>
                    {password.length >= 8 ? '✓' : '•'}
                  </span>
                  Mínimo 8 caracteres
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                    {/[A-Z]/.test(password) ? '✓' : '•'}
                  </span>
                  Al menos una letra mayúscula
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                    {/[a-z]/.test(password) ? '✓' : '•'}
                  </span>
                  Al menos una letra minúscula
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                    {/[0-9]/.test(password) ? '✓' : '•'}
                  </span>
                  Al menos un número
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : ''}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '•'}
                  </span>
                  Al menos un carácter especial (!@#$%^&*...)
                </li>
              </ul>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          {/* OAuth Buttons */}
          <div className="mt-6">
            <div className="relative mb-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                o continuar con
              </span>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                aria-label="Continuar con Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar con Google
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                type="button"
                onClick={handleFacebookLogin}
                disabled={loading}
                aria-label="Continuar con Facebook"
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" aria-hidden="true" />
                Continuar con Facebook
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-primary hover:underline font-medium"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Al continuar, aceptas nuestros{' '}
          <button className="text-primary hover:underline">Términos de servicio</button> y{' '}
          <button className="text-primary hover:underline">Política de privacidad</button>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
