import { Video, Home, Info, UserCircle, Phone, Map, Shield } from 'lucide-react';
import { Card } from '../components/ui/card';
import { motion } from 'framer-motion';

/**
 * Props for the SiteMapPage component.
 * @typedef {Object} SiteMapPageProps
 * @property {(page: string) => void} onNavigate - Function to navigate between pages.
 */
interface SiteMapPageProps {
  onNavigate: (page: string) => void;
}


/**
 * SiteMapPage component.
 * Displays the full navigation structure of Roomio, including categories and pages.
 * @param {SiteMapPageProps} props - Component props.
 * @returns {JSX.Element} Site map page layout.
 */
export function SiteMapPage({ onNavigate }: SiteMapPageProps) {
  const siteStructure = [
    {
      category: 'Principal',
      icon: Home,
      pages: [
        { name: 'Inicio', path: 'landing', description: 'Página principal de Roomio' },
        { name: 'Sobre nosotros', path: 'about', description: 'Conoce más sobre Roomio y nuestro equipo' },
      ],
    },
    {
      category: 'Cuenta',
      icon: UserCircle,
      pages: [
        { name: 'Iniciar sesión', path: 'auth', description: 'Accede a tu cuenta' },
        { name: 'Registrarse', path: 'auth', description: 'Crea una cuenta nueva' },
        { name: 'Recuperar contraseña', path: 'forgot-password', description: 'Restablece tu contraseña' },
        { name: 'Panel de usuario', path: 'dashboard', description: 'Gestiona tus salas y configuración' },
        { name: 'Perfil', path: 'profile', description: 'Edita tu información personal' },
      ],
    },
    {
      category: 'Videollamadas',
      icon: Phone,
      pages: [
        { name: 'Sala de videollamada', path: 'room', description: 'Únete o crea una sala de videollamada' },
      ],
    },
    {
      category: 'Información',
      icon: Info,
      pages: [
        { name: 'Mapa del sitio', path: 'sitemap', description: 'Navegación completa del sitio' },
        { name: 'Manual de usuario', path: 'landing', description: 'Guía de uso de la plataforma' },
      ],
    },
    {
      category: 'Legal',
      icon: Shield,
      pages: [
        { name: 'Política de privacidad', path: 'landing', description: 'Cómo protegemos tus datos' },
        { name: 'Términos de servicio', path: 'landing', description: 'Condiciones de uso de Roomio' },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
            >
              <Map className="w-8 h-8 text-white" aria-hidden="true" />
            </motion.div>
            <motion.h1 
              className="text-4xl text-foreground mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Mapa del sitio
            </motion.h1>
            <motion.p 
              className="text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Navegación completa de todas las páginas y secciones disponibles en Roomio. 
              Encuentra rápidamente lo que necesitas.
            </motion.p>
          </motion.div>

          {/* Site Structure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {siteStructure.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <motion.div
                  key={section.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4,
                    delay: 0.5 + (index * 0.1)
                  }}
                >
                  <motion.div
                    whileHover={{ 
                      y: -8,
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="p-6 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <motion.div 
                          className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center"
                          whileHover={{ 
                            scale: 1.1,
                            rotate: 5,
                            backgroundColor: "rgba(91, 141, 239, 0.2)"
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <IconComponent className="w-5 h-5 text-primary" aria-hidden="true" />
                        </motion.div>
                        <h2 className="text-xl text-foreground">{section.category}</h2>
                      </div>
                      
                      <ul className="space-y-3">
                        {section.pages.map((page, pageIndex) => (
                          <motion.li 
                            key={`${page.path}-${page.name}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                              delay: 0.6 + (index * 0.1) + (pageIndex * 0.05)
                            }}
                          >
                            <motion.button
                              onClick={() => onNavigate(page.path)}
                              className="w-full text-left group"
                              whileHover={{ x: 4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-start gap-2">
                                <motion.div 
                                  className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"
                                  whileHover={{ scale: 2 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                />
                                <div className="flex-1">
                                  <p className="text-foreground group-hover:text-primary transition-colors">
                                    {page.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {page.description}
                                  </p>
                                </div>
                              </div>
                            </motion.button>
                          </motion.li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: 0.8,
              duration: 0.5
            }}
          >
            <motion.div
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="mt-8 p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-xl">
                <div className="text-center">
                  <motion.div 
                    className="inline-flex items-center gap-2 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    <motion.img 
                      src="/logo.png"
                      alt="Roomio Logo"
                      className="w-12 h-12 object-contain"
                      whileHover={{ 
                        rotate: 360,
                        scale: 1.1
                      }}
                      transition={{ 
                        type: "spring",
                        stiffness: 260,
                        damping: 20
                      }}
                    />
                    <span className="text-2xl font-semibold text-foreground">Roomio</span>
                  </motion.div>
                  <motion.h3 
                    className="text-xl text-foreground mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                  >
                    ¿Listo para comenzar?
                  </motion.h3>
                  <motion.p 
                    className="text-muted-foreground mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                  >
                    Crea una cuenta o inicia sesión para empezar a usar Roomio
                  </motion.p>
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <motion.button
                      onClick={() => onNavigate('auth')}
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: "0 10px 25px -5px rgba(91, 141, 239, 0.4)"
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Iniciar sesión
                    </motion.button>
                    <motion.button
                      onClick={() => onNavigate('auth')}
                      className="px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      whileHover={{ 
                        scale: 1.05,
                        borderColor: "rgba(91, 141, 239, 0.8)"
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Registrarse gratis
                    </motion.button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Accessibility Info */}
          <motion.div 
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
          >
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Accesibilidad:</strong> Roomio cumple con las pautas WCAG 2.1 nivel AA. 
              Si experimentas algún problema de accesibilidad, por favor contáctanos.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * Exports the SiteMapPage component as default.
 */
export default SiteMapPage;
