import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import logo from '@/assets/logo-travliaq.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface NavigationProps {
  variant?: 'default' | 'minimal';
}

const Navigation = ({ variant = 'default' }: NavigationProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const closeMenu = () => setIsOpen(false);
  
  const isMinimal = variant === 'minimal';

  return (
    <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/">
          <img src={logo} alt="Logo Travliaq" className="h-16 md:h-20 w-auto" />
        </a>

        {/* Desktop Navigation */}
        {!isMinimal && (
          <nav className="hidden md:flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-white hover:text-white/80 transition-colors"
          >
            <a href="/">{t('nav.home')}</a>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-white hover:text-white/80 transition-colors"
          >
            <a href="/blog">{t('nav.blog')}</a>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-white hover:text-white/80 transition-colors flex items-center gap-1"
          >
            <a href="/discover">
              <span className="text-lg">✨</span>
              {t('nav.discover')}
            </a>
          </Button>
          
          <Button
            variant="hero"
            size="sm"
            asChild
            className="bg-travliaq-golden-sand text-travliaq-deep-blue hover:bg-travliaq-golden-sand/90 font-semibold"
          >
            <a href="/questionnaire">{t('hero.cta')}</a>
          </Button>
          
          {user && !roleLoading && isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:text-white/80 transition-colors"
            >
              <a href="/admin/blog">{t('nav.admin')}</a>
            </Button>
          )}
          
          {!user && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:text-white/80 transition-colors"
            >
              <a href="/auth">{t('nav.login')}</a>
            </Button>
          )}
          
          {user && (
            <Button
              onClick={signOut}
              variant="ghost"
              size="sm"
              className="text-white hover:text-white/80 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          )}
          
          <LanguageSwitcher />
        </nav>
        )}

        {/* Mobile Navigation */}
        {!isMinimal && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white/80"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-travliaq-deep-blue border-l border-white/10">
            <nav className="flex flex-col gap-4 mt-8">
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="text-white hover:text-white/80 transition-colors justify-start"
                onClick={closeMenu}
              >
                <a href="/">{t('nav.home')}</a>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="text-white hover:text-white/80 transition-colors justify-start"
                onClick={closeMenu}
              >
                <a href="/blog">{t('nav.blog')}</a>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="text-white hover:text-white/80 transition-colors justify-start flex items-center gap-2"
                onClick={closeMenu}
              >
                <a href="/discover">
                  <span className="text-lg">✨</span>
                  {t('nav.discover')}
                </a>
              </Button>
              
              <Button
                variant="hero"
                size="lg"
                asChild
                className="bg-travliaq-golden-sand text-travliaq-deep-blue hover:bg-travliaq-golden-sand/90 font-semibold justify-start"
                onClick={closeMenu}
              >
                <a href="/questionnaire">{t('hero.cta')}</a>
              </Button>
              
              {user && !roleLoading && isAdmin && (
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="text-white hover:text-white/80 transition-colors justify-start"
                  onClick={closeMenu}
                >
                  <a href="/admin/blog">{t('nav.admin')}</a>
                </Button>
              )}
              
              {!user && (
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="text-white hover:text-white/80 transition-colors justify-start"
                  onClick={closeMenu}
                >
                  <a href="/auth">{t('nav.login')}</a>
                </Button>
              )}
              
              {user && (
                <Button
                  onClick={() => {
                    signOut();
                    closeMenu();
                  }}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:text-white/80 transition-colors justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.logout')}
                </Button>
              )}
              
              <div className="flex justify-start">
                <LanguageSwitcher />
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        )}
      </div>
    </header>
  );
};

export default Navigation;
