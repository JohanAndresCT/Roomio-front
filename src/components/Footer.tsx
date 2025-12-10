import React from 'react'
import { Video, Twitter, Github, Linkedin, Mail } from 'lucide-react'

/**
 * Props for the Footer component.
 * @typedef {Object} FooterProps
 * @property {(page: string) => void} onNavigate - Function to navigate between pages.
 */
interface FooterProps {
  onNavigate: (page: string) => void
}


/**
 * Footer component for Roomio.
 * Displays brand, navigation, legal, and social links.
 * @param {FooterProps} props - Component props.
 * @returns {JSX.Element} Footer layout.
 */
export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-secondary border-t border-border mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="flex flex-wrap justify-between gap-8 items-start">
          {/* Brand */}
          <div className="w-full md:w-auto md:flex-1 md:max-w-[300px]">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Roomio" className="w-14 h-14 object-contain brand-logo" />
              <div>
                <span className="text-2xl font-bold text-foreground brand-title">Roomio</span>
                <p className="text-muted-foreground mt-2 max-w-[18rem] text-sm">Plataforma moderna y accesible de videollamadas en tiempo real.</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="w-full sm:w-auto md:flex-1 md:min-w-[200px]">
            <h3 className="mb-4 text-base font-semibold text-foreground">Navegación</h3>
            <ul className="space-y-4">
              <li>
                <button onClick={() => onNavigate('landing')} className="text-muted-foreground hover:text-primary transition-colors text-lg font-medium">Inicio</button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="text-muted-foreground hover:text-primary transition-colors text-lg font-medium">Sobre nosotros</button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="text-muted-foreground hover:text-primary transition-colors text-lg font-medium">Iniciar sesión</button>
              </li>
              <li>
                <a href="/manual_de_usuario.pdf" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-lg font-medium block">Manual de usuario</a>
              </li>
              <li>
                <button onClick={() => onNavigate('sitemap')} className="text-muted-foreground hover:text-primary transition-colors text-lg font-medium">Mapa del sitio</button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="w-1/2 sm:w-auto md:flex-1 md:min-w-[180px]">
            <h3 className="mb-4 text-base font-semibold text-foreground">Legal</h3>
            <ul className="space-y-3">
              <li>
                <button className="text-muted-foreground hover:text-primary transition-colors text-base sm:text-lg">Política de privacidad</button>
              </li>
              <li>
                <button className="text-muted-foreground hover:text-primary transition-colors text-base sm:text-lg">Términos de servicio</button>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="w-1/2 sm:w-auto md:flex-1 md:min-w-[150px]">
            <h3 className="mb-4 text-base font-semibold text-foreground">Síguenos</h3>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[['Twitter', Twitter], ['GitHub', Github], ['LinkedIn', Linkedin], ['Email', Mail]].map(([label, Icon], idx) => (
                <a
                  key={idx}
                  href="#"
                  aria-label={String(label)}
                  className="w-10 h-10 sm:w-11 sm:h-11 bg-white border border-border rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors shadow-md p-2"
                >
                  {/* @ts-ignore */}
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-muted-foreground">
          <p className="text-sm">&copy; {new Date().getFullYear()} Roomio. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

/**
 * Exports the Footer component as default.
 */
export default Footer
