import { Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

/**
 * Props for the Home component.
 * @typedef {Object} HomeProps
 * @property {(page: string) => void} onNavigate - Function to navigate between pages.
 */
interface HomeProps {
  onNavigate: (page: string) => void;
}

/**
 * Main Home page component.
 * Displays the hero section, features, and call-to-action for Roomio.
 * @param {HomeProps} props - Component props.
 * @returns {JSX.Element} Home page layout.
 */
const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const handleStartMeeting = () => {
    if (user) {
      onNavigate('dashboard');
    } else {
      onNavigate('login');
    }
  };
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, rgba(229, 231, 255, 0.3) 0%, rgba(237, 233, 254, 0.2) 50%, rgba(255, 255, 255, 1) 100%)' }}>
      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-20 xl:px-32 py-6 sm:py-8 lg:py-10 xl:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 sm:gap-8 lg:gap-8 items-center">
            {/* Left Column - Content */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Logo */}
              <div className="mb-2 sm:mb-4 lg:mb-6">
                <img 
                  src="/logo.png" 
                  alt="Roomio Logo" 
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain"
                />
              </div>
              
              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-gray-800 leading-tight font-normal">
                Conecta, colabora y crea en tiempo real
              </h1>
              
              {/* Description */}
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600 leading-relaxed max-w-2xl pt-1 sm:pt-2">
                Roomio es una plataforma moderna y accesible que te permite realizar videollamadas de hasta 10 personas con chat, audio y video de alta calidad.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4">
                <button
                  onClick={handleStartMeeting}
                  className="inline-flex items-center justify-center bg-[#5B8DEF] hover:bg-[#4A7FDE] text-white px-6 sm:px-8 lg:px-9 py-3 sm:py-3.5 lg:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors shadow-sm w-full sm:w-auto"
                  aria-label="Iniciar reunión ahora"
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5" aria-hidden="true" />
                  Iniciar reunión
                </button>
                <button
                  onClick={() => onNavigate('about')}
                  className="inline-flex items-center justify-center text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 px-6 sm:px-8 lg:px-9 py-3 sm:py-3.5 lg:py-4 rounded-lg font-medium text-base sm:text-lg transition-colors w-full sm:w-auto"
                  aria-label="Conocer más sobre Roomio"
                >
                  Conocer más
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 sm:gap-8 lg:gap-16 xl:gap-20 pt-2 sm:pt-4">
                <div>
                  <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-none mb-1 sm:mb-2">10+</p>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600">Participantes</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-none mb-1 sm:mb-2">HD</p>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600">Calidad de video</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-none mb-1 sm:mb-2">24/7</p>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600">Disponibilidad</p>
                </div>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="relative flex items-center justify-center lg:justify-end mt-6 lg:mt-0 lg:-mr-20">
              <img
                src="/meetingphoto.png"
                alt="Equipo en una videollamada profesional"
                className="w-full max-w-md sm:max-w-lg lg:max-w-2xl xl:max-w-3xl h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary to-accent overflow-hidden" aria-labelledby="cta-heading">
        {/* Animated Water Waves Background */}
        <div className="absolute inset-0 opacity-70">
          {/* Wave 1 */}
          <motion.svg
            className="absolute bottom-0 left-0 w-full h-full"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{ height: '100%' }}
          >
            <motion.path
              fill="rgba(255, 255, 255, 0.3)"
              initial={{ d: "M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,202.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" }}
              animate={{
                d: [
                  "M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,202.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,128L48,144C96,160,192,192,288,197.3C384,203,480,181,576,165.3C672,149,768,139,864,154.7C960,171,1056,213,1152,213.3C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,202.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.svg>

          {/* Wave 2 */}
          <motion.svg
            className="absolute bottom-0 left-0 w-full h-full"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{ height: '100%' }}
          >
            <motion.path
              fill="rgba(255, 255, 255, 0.2)"
              initial={{ d: "M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" }}
              animate={{
                d: [
                  "M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,128L48,138.7C96,149,192,171,288,165.3C384,160,480,128,576,128C672,128,768,160,864,165.3C960,171,1056,149,1152,144C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
          </motion.svg>

          {/* Wave 3 - Fastest */}
          <motion.svg
            className="absolute bottom-0 left-0 w-full h-full"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{ height: '100%' }}
          >
            <motion.path
              fill="rgba(255, 255, 255, 0.25)"
              initial={{ d: "M0,192L48,197.3C96,203,192,213,288,213.3C384,213,480,203,576,186.7C672,171,768,149,864,138.7C960,128,1056,128,1152,138.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" }}
              animate={{
                d: [
                  "M0,192L48,197.3C96,203,192,213,288,213.3C384,213,480,203,576,186.7C672,171,768,149,864,138.7C960,128,1056,128,1152,138.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,208C672,213,768,203,864,181.3C960,160,1056,128,1152,133.3C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,192L48,197.3C96,203,192,213,288,213.3C384,213,480,203,576,186.7C672,171,768,149,864,138.7C960,128,1056,128,1152,138.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
          </motion.svg>

          {/* Floating Bubbles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/30 backdrop-blur-sm"
              style={{
                width: `${Math.random() * 60 + 30}px`,
                height: `${Math.random() * 60 + 30}px`,
                left: `${Math.random() * 100}%`,
                bottom: `${Math.random() * 30}%`,
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
              }}
              animate={{
                y: [0, -100, -200, -300],
                opacity: [0, 0.8, 0.5, 0],
                scale: [1, 1.3, 1.2, 0.9]
              }}
              transition={{
                duration: Math.random() * 6 + 4,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeOut"
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            id="cta-heading"
            className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white mb-4 sm:mb-5 font-normal"
            style={{ 
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6), 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 0, 0, 0.4), 0 6px 30px rgba(91, 141, 239, 0.6)'
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            ¿Listo para comenzar?
          </motion.h2>
          <motion.p
            className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed"
            style={{ 
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.7), 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 0, 0, 0.4), 0 6px 24px rgba(91, 141, 239, 0.5)'
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Únete a miles de equipos que confían en Roomio para sus reuniones virtuales. Es gratis y solo toma unos segundos.
          </motion.p>
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => onNavigate('dashboard')}
                size="lg"
                className="bg-white text-primary hover:bg-gray-50 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 h-auto font-semibold rounded-lg shadow-md w-full sm:w-auto"
              >
                Crear reunión gratis
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/**
 * Exports the Home component as default.
 */
export default Home;

