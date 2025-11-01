import { Globe, MapPin, Plane } from 'lucide-react';

interface WorldMapProps {
  selectedCountries?: string[];
  onCountrySelect?: (country: string) => void;
  highlightColor?: string;
}

export const WorldMap = ({ selectedCountries = [], onCountrySelect, highlightColor = '#FF6B6B' }: WorldMapProps) => {
  return (
    <div className="relative w-full h-[400px] bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 rounded-2xl border-2 border-cyan-200 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-purple-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="relative">
          <Globe className="w-32 h-32 text-cyan-600 animate-spin" style={{ animationDuration: '20s' }} />
          <Plane className="absolute top-8 right-0 w-8 h-8 text-blue-600 animate-bounce" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Découvrez le monde
          </h3>
          <p className="text-muted-foreground max-w-md">
            Choisissez votre destination ci-dessus ou laissez-nous vous surprendre avec nos suggestions personnalisées
          </p>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          {['🌍 Europe', '🌎 Amérique', '🌏 Asie', '🌍 Afrique', '🌊 Océanie'].map((continent) => (
            <div
              key={continent}
              className="px-4 py-2 bg-white/80 backdrop-blur rounded-full border-2 border-cyan-300 text-sm font-medium text-cyan-700 hover:bg-cyan-500 hover:text-white transition-all cursor-pointer hover:scale-105"
            >
              {continent}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
