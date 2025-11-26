import { Video, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Navbar component for Roomio.
 * Displays navigation links, handles authentication state, and supports mobile/desktop layouts.
 * @returns {JSX.Element} Navigation bar layout.
 */
function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      landing: '/',
      about: '/about',
      auth: '/login',
      register: '/register',
      dashboard: '/dashboard',
      sitemap: '/sitemap'
    };
    const path = routes[page] ?? '/';
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isActive = (page: string) => {
    const routes: Record<string, string> = {
      landing: '/',
      about: '/about',
      auth: '/login',
      register: '/register',
      dashboard: '/dashboard',
      sitemap: '/sitemap'
    };
    return location.pathname === routes[page];
  };

  return (
    <nav className="navbar-container" role="navigation" aria-label="Navegación principal">
      <div className="navbar-content">
        <div className="navbar-inner">
          {/* Logo */}
          <button
            onClick={() => handleNavigate('landing')}
            className="navbar-logo-btn"
            aria-label="Ir a inicio - Roomio"
          >
            <img src="/logo.png" alt="" className="navbar-logo-img" aria-hidden="true" />
            <span className="navbar-logo-text">Roomio</span>
          </button>

          {/* Desktop Navigation */}
          <div className="navbar-desktop-menu">
            <button
              onClick={() => handleNavigate('landing')}
              className={`navbar-link ${isActive('landing') ? 'navbar-link-active' : ''}`}
              aria-current={isActive('landing') ? 'page' : undefined}
            >
              Inicio
            </button>
            <button
              onClick={() => handleNavigate('about')}
              className={`navbar-link ${isActive('about') ? 'navbar-link-active' : ''}`}
              aria-current={isActive('about') ? 'page' : undefined}
            >
              Sobre nosotros
            </button>
            {user ? (
              <>
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className={`navbar-link ${isActive('dashboard') ? 'navbar-link-active' : ''}`}
                  aria-current={isActive('dashboard') ? 'page' : undefined}
                >
                  Dashboard
                </button>
                <Button onClick={handleLogout} className="navbar-register-btn">
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('auth')}
                  className={`navbar-link ${isActive('auth') ? 'navbar-link-active' : ''}`}
                  aria-current={isActive('auth') ? 'page' : undefined}
                >
                  Iniciar sesión
                </button>
                <Button onClick={() => handleNavigate('register')} className="navbar-register-btn">
                  Registrarse
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navbar-mobile-btn"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Navigation - Back inside navbar-content */}
        {mobileMenuOpen && (
          <div className="navbar-mobile-menu" role="menu">
            <div className="navbar-mobile-content">
              <button
                onClick={() => {
                  handleNavigate('landing');
                  setMobileMenuOpen(false);
                }}
                className={`navbar-mobile-link ${isActive('landing') ? 'navbar-mobile-link-active' : ''}`}
                role="menuitem"
              >
                Inicio
              </button>
              <button
                onClick={() => {
                  handleNavigate('about');
                  setMobileMenuOpen(false);
                }}
                className={`navbar-mobile-link ${isActive('about') ? 'navbar-mobile-link-active' : ''}`}
                role="menuitem"
              >
                Sobre nosotros
              </button>
              {user ? (
                <>
                  <button
                    onClick={() => {
                      handleNavigate('dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className={`navbar-mobile-link ${isActive('dashboard') ? 'navbar-mobile-link-active' : ''}`}
                    role="menuitem"
                  >
                    Dashboard
                  </button>
                  <Button
                    onClick={handleLogout}
                    className="navbar-mobile-register"
                  >
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      handleNavigate('auth');
                      setMobileMenuOpen(false);
                    }}
                    className={`navbar-mobile-link ${isActive('auth') ? 'navbar-mobile-link-active' : ''}`}
                    role="menuitem"
                  >
                    Iniciar sesión
                  </button>
                  <Button
                    onClick={() => {
                      handleNavigate('register');
                      setMobileMenuOpen(false);
                    }}
                    className="navbar-mobile-register"
                  >
                    Registrarse
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * Exports the Navbar component as default.
 */
export default Navbar;
