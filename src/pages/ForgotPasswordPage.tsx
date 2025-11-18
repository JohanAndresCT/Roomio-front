import { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      alert('Por favor, ingresa tu correo electrónico');
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);

    // Simulación de envío de email
    setTimeout(() => {
      setIsLoading(false);
      setEmailSent(true);
      alert('Correo de recuperación enviado');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
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
          {!emailSent ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <button
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                  aria-label="Volver al inicio de sesión"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Volver</span>
                </button>
                
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                
                <h1 className="text-2xl text-foreground mb-2">Recuperar contraseña</h1>
                <p className="text-muted-foreground">
                  Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <input
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    aria-required="true"
                    autoFocus
                  />
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                      Enviar instrucciones
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
                  <Mail className="w-8 h-8 text-green-600" aria-hidden="true" />
                </div>
                
                <h2 className="text-2xl text-foreground mb-3">Revisa tu correo</h2>
                <p className="text-muted-foreground mb-2">
                  Hemos enviado instrucciones de recuperación a:
                </p>
                <p className="text-foreground mb-8">{email}</p>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-primary">
                    <strong>Nota:</strong> El enlace de recuperación expirará en 1 hora. Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => onNavigate('reset-password')}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Ir a restablecer contraseña
                  </Button>
                  
                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Enviar de nuevo
                  </Button>
                  
                  <Button
                    onClick={() => onNavigate('login')}
                    variant="ghost"
                    className="w-full"
                  >
                    Volver al inicio de sesión
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
