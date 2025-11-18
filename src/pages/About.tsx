import { Video, Users, Shield, Zap, Heart, Target, User } from 'lucide-react';
import { Card } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

// Tech Logo Component
function TechLogo({ name, logoSrc }: { name: string; logoSrc: string }) {
  return (
    <div className="flex-shrink-0 mx-2 sm:mx-4 lg:mx-6 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
      <img 
        src={logoSrc} 
        alt={name} 
        className="h-8 sm:h-10 lg:h-12 w-auto object-contain"
      />
    </div>
  );
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const silhouettes = [
    '/people/1.png',
    '/people/2.png',
    '/people/3.png',
    '/people/4.png',
    '/people/5.png',
    '/people/6.png',
    '/people/7.png'
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % silhouettes.length);
    }, 4000); // Cambia cada 4 segundos

    return () => clearInterval(interval);
  }, [silhouettes.length]);

  // Posiciones dispersas para las 4 siluetas en diferentes partes de la sección
  const silhouettePositions = [
    { top: '5%', left: '8%', size: 'w-24 sm:w-32 lg:w-40', delay: 0 },        // Superior izquierda
    { top: '10%', right: '15%', size: 'w-28 sm:w-36 lg:w-44', delay: 0.5 },   // Superior derecha
    { bottom: '8%', left: '60%', size: 'w-26 sm:w-34 lg:w-42', delay: 1.0 },  // Inferior centro-derecha
    { top: '50%', left: '3%', size: 'w-22 sm:w-30 lg:w-38', delay: 1.5 }      // Centro izquierda
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-background py-12 sm:py-16 lg:py-20 overflow-hidden">
        {/* Animated Background Silhouettes - Multiple instances */}
        <div className="absolute inset-0 pointer-events-none">
          {silhouettePositions.map((position, index) => (
            <motion.div
              key={index}
              className="absolute"
              style={{
                top: position.top,
                left: position.left,
                right: position.right,
                bottom: position.bottom
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.4, scale: 1 }}
              transition={{ 
                duration: 2.5, 
                ease: "easeInOut",
                delay: position.delay
              }}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={silhouettes[(currentImageIndex + index) % silhouettes.length]}
                  alt=""
                  className={`${position.size} h-auto`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 1.5, 
                    ease: "easeInOut"
                  }}
                  aria-hidden="true"
                />
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4 sm:mb-6">
              <img 
                src="/logo.png" 
                alt="Roomio Logo" 
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-foreground mb-4 sm:mb-6">
              Sobre Roomio
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground">
              Una plataforma moderna y accesible de videollamadas diseñada para conectar equipos y personas en todo el mundo
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-8 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-6 sm:gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary/10 rounded-full mb-6">
                <Target className="w-6 h-6 text-primary" aria-hidden="true" />
                <span className="text-lg lg:text-xl font-medium text-primary">Nuestra Misión</span>
              </div>
              <h2 className="text-4xl lg:text-5xl text-foreground mb-6">
                Democratizar las comunicaciones en tiempo real
              </h2>
              <div className="space-y-4 text-lg lg:text-xl text-muted-foreground">
                <p>
                  Roomio nace con la visión de hacer que las videollamadas sean accesibles, intuitivas y potentes para todos. Creemos que la comunicación efectiva no debe ser un privilegio, sino un derecho al alcance de cualquier equipo u organización.
                </p>
                <p>
                  Nuestro objetivo es eliminar las barreras técnicas y de usabilidad que dificultan la colaboración remota, proporcionando una plataforma que sea tan fácil de usar como potente en sus capacidades.
                </p>
              </div>
            </div>
            <div className="relative flex items-center justify-center">
              <img
                src="/Aboutphoto.png"
                alt="Equipo colaborando"
                className="w-full max-w-2xl h-auto scale-110"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-16 lg:py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 sm:mb-4">Nuestros valores</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
              Los principios que guían el desarrollo y evolución de Roomio
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-2">Colaboración</h3>
              <p className="text-base lg:text-lg text-muted-foreground">
                Facilitamos el trabajo en equipo sin importar la distancia
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-2">Accesibilidad</h3>
              <p className="text-base lg:text-lg text-muted-foreground">
                Diseñado para ser usado por todos, sin excepciones
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-chart-3/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-chart-3" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-2">Simplicidad</h3>
              <p className="text-base lg:text-lg text-muted-foreground">
                Interfaz intuitiva que no requiere capacitación
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-chart-5/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-chart-5" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-2">Calidad</h3>
              <p className="text-base lg:text-lg text-muted-foreground">
                Comprometidos con ofrecer la mejor experiencia posible
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Technologies Stack */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary to-accent overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white mb-3 sm:mb-4 px-4">Tecnologías que Impulsan Roomio</h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto px-4">
              La plataforma <strong>Roomio</strong> utiliza las tecnologías <strong>Vite.js</strong>, <strong>React</strong>, <strong>TypeScript</strong>, <strong>SASS</strong>, <strong>Fetch API</strong>, <strong>Node.js</strong>, <strong>Express.js</strong>, <strong>Socket.io</strong>, <strong>Peer.js</strong>, <strong>WebRTC</strong>, <strong>Firebase Authentication</strong>, <strong>Cloud Firestore</strong>, <strong>Vercel</strong> y <strong>Render</strong>.
            </p>
          </div>

          {/* Infinite Scrolling Logos */}
          <div className="relative">
            <div className="overflow-hidden py-4 sm:py-8">
              <div className="flex animate-scroll-left">
                {/* First set of logos */}
                <TechLogo name="Vite.js" logoSrc="/vite.png" />
                <TechLogo name="React" logoSrc="/react.png" />
                <TechLogo name="TypeScript" logoSrc="/typescript.png" />
                <TechLogo name="SASS" logoSrc="/Sass.png" />
                <TechLogo name="Fetch API" logoSrc="/Fetch api.png" />
                <TechLogo name="Node.js" logoSrc="/nodejs.png" />
                <TechLogo name="Express.js" logoSrc="/Expressjs.png" />
                <TechLogo name="Socket.io" logoSrc="/socket.io logo.png" />
                <TechLogo name="Peer.js" logoSrc="/peer.js.png" />
                <TechLogo name="WebRTC" logoSrc="/webrtc.png" />
                <TechLogo name="Firebase Auth" logoSrc="/firebase.png" />
                <TechLogo name="Firestore" logoSrc="/firestore.png" />
                <TechLogo name="Vercel" logoSrc="/vercel.png" />
                <TechLogo name="Render" logoSrc="/render.png" />
                
                {/* Duplicate set for seamless loop */}
                <TechLogo name="Vite.js" logoSrc="/vite.png" />
                <TechLogo name="React" logoSrc="/react.png" />
                <TechLogo name="TypeScript" logoSrc="/typescript.png" />
                <TechLogo name="SASS" logoSrc="/Sass.png" />
                <TechLogo name="Fetch API" logoSrc="/Fetch api.png" />
                <TechLogo name="Node.js" logoSrc="/nodejs.png" />
                <TechLogo name="Express.js" logoSrc="/Expressjs.png" />
                <TechLogo name="Socket.io" logoSrc="/socket.io logo.png" />
                <TechLogo name="Peer.js" logoSrc="/peer.js.png" />
                <TechLogo name="WebRTC" logoSrc="/webrtc.png" />
                <TechLogo name="Firebase Auth" logoSrc="/firebase.png" />
                <TechLogo name="Firestore" logoSrc="/firestore.png" />
                <TechLogo name="Vercel" logoSrc="/vercel.png" />
                <TechLogo name="Render" logoSrc="/render.png" />
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scroll-left {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          .animate-scroll-left {
            animation: scroll-left 40s linear infinite;
            width: fit-content;
          }

          .animate-scroll-left:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* Team Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 sm:mb-4">Nuestro Equipo</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
              Las personas detrás de Roomio, comprometidas con crear la mejor experiencia de videollamadas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Johan Ceballos */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-1">Johan Ceballos</h3>
              <p className="text-base lg:text-lg text-primary font-medium mb-2">Desarrollador Frontend</p>
              <p className="text-base lg:text-lg text-muted-foreground">
                Especializado en crear interfaces intuitivas y accesibles
              </p>
            </Card>

            {/* Emanuel Rivas */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 bg-gradient-to-br from-accent to-chart-3 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-1">Emanuel Rivas</h3>
              <p className="text-base lg:text-lg text-accent font-medium mb-2">Desarrollador Backend</p>
              <p className="text-base lg:text-lg text-muted-foreground">
                Experto en arquitectura de servidores y APIs
              </p>
            </Card>

            {/* Camilo Muñoz */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 bg-gradient-to-br from-chart-3 to-chart-4 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-1">Camilo Muñoz</h3>
              <p className="text-base lg:text-lg text-chart-3 font-medium mb-2">Encargado de Base de Datos</p>
              <p className="text-base lg:text-lg text-muted-foreground">
                Gestión y optimización de datos en tiempo real
              </p>
            </Card>

            {/* Andrez Ramirez */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 bg-gradient-to-br from-chart-4 to-chart-5 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-xl lg:text-2xl text-foreground mb-1">Andrez Ramirez</h3>
              <p className="text-base lg:text-lg text-chart-4 font-medium mb-2">Desarrollador Frontend</p>
              <p className="text-base lg:text-lg text-muted-foreground">
                Enfocado en experiencia de usuario y diseño responsive
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
