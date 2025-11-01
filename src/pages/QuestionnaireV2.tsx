import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Users, Heart, Baby, UserCircle, Plane, Hotel, Compass, 
  MapPin, Calendar as CalendarIcon, Euro, Sparkles, Mountain,
  Waves, Sun, Snowflake, CheckCircle2, Mail, Globe, Palmtree,
  Camera, Utensils, Building, Car, MapPinned, Clock, Coffee,
  Moon, Sunrise, AlertCircle, Shield, Briefcase, PartyPopper,
  Music, Book, ShoppingBag, Wine, Dumbbell, ArrowRight, ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CitySearch } from "@/components/questionnaire/CitySearch";
import { WorldMap } from "@/components/questionnaire-v2/WorldMap";
import { BudgetChart } from "@/components/questionnaire-v2/BudgetChart";
import { ProgressRing } from "@/components/questionnaire-v2/ProgressRing";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Traveler {
  type: 'adult' | 'child';
  age?: number;
}

interface QuestionnaireData {
  // Section 1: Voyageurs
  travelGroup?: string;
  travelers: Traveler[];
  
  // Section 2: Destination
  hasDestination?: boolean;
  destination?: string;
  departureCity?: string;
  climates: string[];
  affinities: string[];
  ambiance?: string;
  
  // Section 3: Dates
  datesType?: 'fixed' | 'flexible' | 'open';
  dateRange?: { from: Date; to?: Date };
  approximateDate?: Date;
  flexibility?: string;
  duration?: string;
  
  // Section 4: Services
  helpWith: string[];
  
  // Section 5: Vols
  flightPreference?: string;
  luggagePreferences: Record<number, string>;
  
  // Section 6: Hébergement
  accommodationTypes: string[];
  comfort?: string;
  neighborhood?: string;
  amenities: string[];
  
  // Section 7: Activités
  activities: string[];
  
  // Section 8: Budget
  budget: number;
  budgetType?: string;
  budgetCurrency?: string;
  
  // Section 9: Style & Rythme
  styles: string[];
  rhythm?: string;
  schedulePrefs: string[];
  
  // Section 10: Contraintes
  mobility: string[];
  dietaryRestrictions?: string;
  allergies?: string;
  
  // Section 11: Finalisation
  email: string;
  additionalInfo?: string;
}

const QuestionnaireV2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [data, setData] = useState<QuestionnaireData>({
    travelers: [{ type: 'adult' }],
    helpWith: [],
    climates: [],
    affinities: [],
    accommodationTypes: [],
    amenities: [],
    activities: [],
    styles: [],
    schedulePrefs: [],
    mobility: [],
    luggagePreferences: {},
    budget: 1000,
    email: ""
  });

  const totalSections = 11;
  const progress = ((currentSection + 1) / totalSections) * 100;

  const sections = [
    { id: 0, title: "Voyageurs", icon: Users },
    { id: 1, title: "Destination", icon: Globe },
    { id: 2, title: "Dates", icon: CalendarIcon },
    { id: 3, title: "Services", icon: Sparkles },
    { id: 4, title: "Vols", icon: Plane },
    { id: 5, title: "Hébergement", icon: Hotel },
    { id: 6, title: "Activités", icon: Camera },
    { id: 7, title: "Budget", icon: Euro },
    { id: 8, title: "Style & Rythme", icon: Clock },
    { id: 9, title: "Contraintes", icon: Shield },
    { id: 10, title: "Finalisation", icon: CheckCircle2 },
  ];

  const travelGroups = [
    { id: "solo", label: "Solo", icon: UserCircle, color: "from-purple-500 to-pink-500" },
    { id: "duo", label: "Duo", icon: Heart, color: "from-red-500 to-rose-500" },
    { id: "family", label: "Famille", icon: Baby, color: "from-blue-500 to-cyan-500" },
    { id: "friends", label: "Amis", icon: Users, color: "from-green-500 to-emerald-500" },
  ];

  const services = [
    { id: "flights", label: "Vols", icon: Plane, desc: "Réservation de billets d'avion" },
    { id: "accommodation", label: "Hébergement", icon: Hotel, desc: "Hôtels, Airbnb, etc." },
    { id: "activities", label: "Activités", icon: Compass, desc: "Visites, excursions, etc." },
    { id: "transport", label: "Transport local", icon: Car, desc: "Location de voiture, transferts" },
  ];

  const climates = [
    { id: "hot", label: "Chaud", icon: Sun, color: "from-orange-500 to-red-500" },
    { id: "mild", label: "Tempéré", icon: Sparkles, color: "from-yellow-500 to-orange-500" },
    { id: "cold", label: "Froid", icon: Snowflake, color: "from-blue-500 to-cyan-500" },
  ];

  const affinities = [
    { id: "beach", label: "Plage", icon: Waves },
    { id: "mountain", label: "Montagne", icon: Mountain },
    { id: "city", label: "Ville", icon: Building },
    { id: "nature", label: "Nature", icon: Palmtree },
    { id: "culture", label: "Culture", icon: Book },
    { id: "adventure", label: "Aventure", icon: Compass },
  ];

  const activities = [
    { id: "museums", label: "Musées", icon: Book },
    { id: "gastronomy", label: "Gastronomie", icon: Utensils },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
    { id: "nightlife", label: "Vie nocturne", icon: Music },
    { id: "sports", label: "Sports", icon: Dumbbell },
    { id: "relaxation", label: "Détente", icon: Coffee },
    { id: "wine", label: "Œnologie", icon: Wine },
    { id: "photography", label: "Photo", icon: Camera },
  ];

  const accommodationTypes = [
    { id: "hotel", label: "Hôtel", icon: Hotel },
    { id: "airbnb", label: "Airbnb", icon: Building },
    { id: "resort", label: "Resort", icon: Palmtree },
    { id: "hostel", label: "Auberge", icon: Users },
  ];

  const amenities = [
    { id: "pool", label: "Piscine" },
    { id: "spa", label: "Spa" },
    { id: "gym", label: "Salle de sport" },
    { id: "restaurant", label: "Restaurant" },
    { id: "wifi", label: "WiFi" },
    { id: "parking", label: "Parking" },
  ];

  const schedulePrefs = [
    { id: "early_bird", label: "Lève-tôt", icon: Sunrise },
    { id: "night_owl", label: "Couche-tard", icon: Moon },
    { id: "flexible", label: "Flexible", icon: Clock },
  ];

  const toggleItem = (key: keyof QuestionnaireData, value: string) => {
    const array = data[key] as string[];
    if (array.includes(value)) {
      setData({ ...data, [key]: array.filter(v => v !== value) });
    } else {
      setData({ ...data, [key]: [...array, value] });
    }
  };

  const canProceed = () => {
    switch(currentSection) {
      case 0: return data.travelGroup && data.travelers.length > 0;
      case 1: return true; // Optional destination
      case 2: return data.datesType;
      case 3: return data.helpWith.length > 0;
      case 4: return data.helpWith.includes('flights') ? data.flightPreference : true;
      case 5: return data.helpWith.includes('accommodation') ? data.accommodationTypes.length > 0 : true;
      case 6: return data.helpWith.includes('activities') ? data.activities.length > 0 : true;
      case 7: return data.budget > 0;
      case 8: return data.styles.length > 0 && data.rhythm;
      case 9: return true; // Optional
      case 10: return data.email && data.email.includes('@');
      default: return false;
    }
  };

  const nextSection = () => {
    if (!canProceed()) {
      toast({
        title: "Information manquante",
        description: "Veuillez répondre aux questions avant de continuer",
        variant: "destructive"
      });
      return;
    }
    
    if (currentSection < totalSections - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    console.log("Submitting:", data);
    toast({
      title: "Questionnaire envoyé !",
      description: "Nous préparons votre voyage sur mesure...",
    });
    // TODO: Submit to API
  };

  const addTraveler = (type: 'adult' | 'child') => {
    setData({
      ...data,
      travelers: [...data.travelers, { type, age: type === 'child' ? 5 : undefined }]
    });
  };

  const removeTraveler = (index: number) => {
    const newTravelers = data.travelers.filter((_, i) => i !== index);
    setData({ ...data, travelers: newTravelers });
  };

  const updateTravelerAge = (index: number, age: number) => {
    const newTravelers = [...data.travelers];
    newTravelers[index].age = age;
    setData({ ...data, travelers: newTravelers });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50">
      <Navigation theme="light" />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Hero Header with Progress */}
        <div className="text-center mb-8 space-y-6">
          <div className="inline-block">
            <Badge className="text-lg px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
              ✨ Questionnaire Visuel
            </Badge>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Créez votre voyage de rêve
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une expérience interactive et visuelle pour concevoir le voyage parfait
          </p>

          {/* Progress Ring */}
          <div className="flex justify-center">
            <ProgressRing percentage={progress} title="Complété" />
          </div>

          {/* Section Navigation */}
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              const isActive = idx === currentSection;
              const isCompleted = idx < currentSection;
              
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "transition-all",
                    isCompleted && "bg-green-100 border-green-500 text-green-700 hover:bg-green-200"
                  )}
                  onClick={() => setCurrentSection(idx)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {section.title}
                  {isCompleted && <CheckCircle2 className="w-4 h-4 ml-2" />}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-5xl mx-auto">
          
          {/* Section 0: Voyageurs */}
          {currentSection === 0 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Qui voyage ?
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {travelGroups.map((group) => {
                    const Icon = group.icon;
                    const isSelected = data.travelGroup === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setData({ ...data, travelGroup: group.id })}
                        className={cn(
                          "relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl",
                          isSelected 
                            ? `bg-gradient-to-br ${group.color} text-white border-transparent shadow-2xl scale-105`
                            : "bg-white hover:border-primary"
                        )}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-2 right-2 w-6 h-6" />
                        )}
                        <Icon className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-semibold text-center">{group.label}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Détails des voyageurs</h3>
                    <div className="flex gap-2">
                      <Button onClick={() => addTraveler('adult')} size="sm">
                        + Adulte
                      </Button>
                      <Button onClick={() => addTraveler('child')} size="sm" variant="outline">
                        + Enfant
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {data.travelers.map((traveler, idx) => (
                      <Card key={idx} className="p-4 flex items-center gap-4">
                        <Badge variant={traveler.type === 'adult' ? 'default' : 'secondary'}>
                          {traveler.type === 'adult' ? '👤 Adulte' : '👶 Enfant'}
                        </Badge>
                        
                        {traveler.type === 'child' && (
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-sm">Âge:</Label>
                            <Input
                              type="number"
                              min="0"
                              max="17"
                              value={traveler.age || 5}
                              onChange={(e) => updateTravelerAge(idx, parseInt(e.target.value))}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">ans</span>
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTraveler(idx)}
                          disabled={data.travelers.length === 1}
                        >
                          ✕
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 1: Destination */}
          {currentSection === 1 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Où souhaitez-vous aller ?
                </h2>

                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <Label className="text-lg font-semibold">Avez-vous une destination en tête ?</Label>
                    <RadioGroup 
                      value={data.hasDestination ? "yes" : "no"} 
                      onValueChange={(v) => setData({ ...data, hasDestination: v === "yes" })}
                      className="flex justify-center gap-4 mt-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="dest-yes" />
                        <Label htmlFor="dest-yes" className="cursor-pointer">Oui</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="dest-no" />
                        <Label htmlFor="dest-no" className="cursor-pointer">Non, surprenez-moi!</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {data.hasDestination && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-lg">
                          <MapPin className="w-5 h-5" />
                          Destination
                        </Label>
                        <CitySearch
                          value={data.destination || ""}
                          onChange={(city) => setData({ ...data, destination: city })}
                          placeholder="Paris, Tokyo, New York..."
                        />
                      </div>
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-lg">
                          <Plane className="w-5 h-5" />
                          Ville de départ
                        </Label>
                        <CitySearch
                          value={data.departureCity || ""}
                          onChange={(city) => setData({ ...data, departureCity: city })}
                          placeholder="D'où partez-vous ?"
                        />
                      </div>
                    </div>
                  )}

                  <div className="my-8">
                    <WorldMap />
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Climat préféré</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {climates.map((climate) => {
                        const Icon = climate.icon;
                        const isSelected = data.climates.includes(climate.id);
                        return (
                          <button
                            key={climate.id}
                            onClick={() => toggleItem("climates", climate.id)}
                            className={cn(
                              "p-6 rounded-xl border-2 transition-all hover:scale-105",
                              isSelected 
                                ? `bg-gradient-to-br ${climate.color} text-white border-transparent shadow-xl`
                                : "bg-white hover:border-primary"
                            )}
                          >
                            <Icon className="w-10 h-10 mx-auto mb-2" />
                            <p className="font-semibold">{climate.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Vos affinités de voyage</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {affinities.map((affinity) => {
                        const Icon = affinity.icon;
                        const isSelected = data.affinities.includes(affinity.id);
                        return (
                          <button
                            key={affinity.id}
                            onClick={() => toggleItem("affinities", affinity.id)}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all hover:scale-105 flex items-center gap-3",
                              isSelected 
                                ? "bg-cyan-500 text-white border-cyan-600 shadow-lg"
                                : "bg-white hover:border-cyan-400"
                            )}
                          >
                            <Icon className="w-6 h-6" />
                            <span className="font-medium">{affinity.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 2: Dates */}
          {currentSection === 2 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Quand partez-vous ?
                </h2>

                <div className="space-y-6">
                  <RadioGroup 
                    value={data.datesType} 
                    onValueChange={(v: any) => setData({ ...data, datesType: v })}
                    className="grid md:grid-cols-3 gap-4"
                  >
                    <Label
                      htmlFor="fixed"
                      className={cn(
                        "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                        data.datesType === 'fixed' ? "bg-orange-500 text-white border-orange-600 shadow-xl" : "bg-white hover:border-orange-400"
                      )}
                    >
                      <RadioGroupItem value="fixed" id="fixed" className="sr-only" />
                      <CalendarIcon className="w-12 h-12 mb-2" />
                      <span className="font-semibold">Dates précises</span>
                    </Label>
                    
                    <Label
                      htmlFor="flexible"
                      className={cn(
                        "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                        data.datesType === 'flexible' ? "bg-orange-500 text-white border-orange-600 shadow-xl" : "bg-white hover:border-orange-400"
                      )}
                    >
                      <RadioGroupItem value="flexible" id="flexible" className="sr-only" />
                      <Clock className="w-12 h-12 mb-2" />
                      <span className="font-semibold">Dates flexibles</span>
                    </Label>
                    
                    <Label
                      htmlFor="open"
                      className={cn(
                        "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                        data.datesType === 'open' ? "bg-orange-500 text-white border-orange-600 shadow-xl" : "bg-white hover:border-orange-400"
                      )}
                    >
                      <RadioGroupItem value="open" id="open" className="sr-only" />
                      <Sparkles className="w-12 h-12 mb-2" />
                      <span className="font-semibold">Ouvert</span>
                    </Label>
                  </RadioGroup>

                  {(data.datesType === 'fixed' || data.datesType === 'flexible') && (
                    <div className="flex justify-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full max-w-md h-16 text-lg">
                            <CalendarIcon className="mr-2 h-6 w-6" />
                            {data.dateRange?.from ? (
                              data.dateRange.to ? (
                                <>
                                  {format(data.dateRange.from, "dd MMM")} - {format(data.dateRange.to, "dd MMM yyyy")}
                                </>
                              ) : (
                                format(data.dateRange.from, "dd MMM yyyy")
                              )
                            ) : (
                              <span>Sélectionnez vos dates</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                          <Calendar
                            initialFocus
                            mode="range"
                            selected={data.dateRange}
                            onSelect={(range) => setData({ ...data, dateRange: range })}
                            numberOfMonths={2}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Section 3: Services */}
          {currentSection === 3 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Comment pouvons-nous vous aider ?
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {services.map((service) => {
                    const Icon = service.icon;
                    const isSelected = data.helpWith.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleItem("helpWith", service.id)}
                        className={cn(
                          "p-6 rounded-xl border-2 transition-all hover:scale-105 text-left relative",
                          isSelected 
                            ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white border-transparent shadow-xl"
                            : "bg-white hover:border-green-400"
                        )}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-4 right-4 w-6 h-6" />
                        )}
                        <Icon className="w-12 h-12 mb-3" />
                        <h3 className="text-xl font-bold mb-1">{service.label}</h3>
                        <p className={cn("text-sm", isSelected ? "text-white/90" : "text-muted-foreground")}>
                          {service.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Section 4: Vols */}
          {currentSection === 4 && data.helpWith.includes('flights') && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  ✈️ Préférences de vol
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Type de vol préféré</Label>
                    <RadioGroup 
                      value={data.flightPreference} 
                      onValueChange={(v) => setData({ ...data, flightPreference: v })}
                      className="space-y-3"
                    >
                      {[
                        { value: "direct", label: "Vol direct uniquement", icon: "✈️" },
                        { value: "one_stop", label: "Maximum 1 escale", icon: "🔄" },
                        { value: "flexible", label: "Flexible (meilleur prix)", icon: "💰" },
                      ].map((option) => (
                        <Label
                          key={option.value}
                          htmlFor={option.value}
                          className={cn(
                            "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-[1.02]",
                            data.flightPreference === option.value 
                              ? "bg-sky-500 text-white border-sky-600 shadow-lg"
                              : "bg-white hover:border-sky-400"
                          )}
                        >
                          <RadioGroupItem value={option.value} id={option.value} className="mr-3" />
                          <span className="text-2xl mr-3">{option.icon}</span>
                          <span className="font-medium">{option.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Préférences bagages</Label>
                    {data.travelers.map((traveler, idx) => (
                      <div key={idx} className="mb-3">
                        <Label className="text-sm mb-2 block">
                          {traveler.type === 'adult' ? `Adulte ${idx + 1}` : `Enfant ${idx + 1}`}
                        </Label>
                        <RadioGroup
                          value={data.luggagePreferences[idx]}
                          onValueChange={(v) => setData({
                            ...data,
                            luggagePreferences: { ...data.luggagePreferences, [idx]: v }
                          })}
                          className="flex gap-2"
                        >
                          {[
                            { value: "cabin", label: "Cabine" },
                            { value: "checked", label: "Soute" },
                            { value: "both", label: "Les deux" },
                          ].map((option) => (
                            <Label
                              key={option.value}
                              htmlFor={`luggage-${idx}-${option.value}`}
                              className={cn(
                                "flex-1 p-3 rounded-lg border-2 cursor-pointer text-center transition-all",
                                data.luggagePreferences[idx] === option.value
                                  ? "bg-sky-500 text-white border-sky-600"
                                  : "bg-white hover:border-sky-400"
                              )}
                            >
                              <RadioGroupItem 
                                value={option.value} 
                                id={`luggage-${idx}-${option.value}`} 
                                className="sr-only"
                              />
                              {option.label}
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 5: Hébergement */}
          {currentSection === 5 && data.helpWith.includes('accommodation') && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  🏨 Votre hébergement idéal
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Type d'hébergement</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {accommodationTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = data.accommodationTypes.includes(type.id);
                        return (
                          <button
                            key={type.id}
                            onClick={() => toggleItem("accommodationTypes", type.id)}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all hover:scale-105",
                              isSelected 
                                ? "bg-purple-500 text-white border-purple-600 shadow-lg"
                                : "bg-white hover:border-purple-400"
                            )}
                          >
                            <Icon className="w-8 h-8 mx-auto mb-2" />
                            <p className="font-medium text-sm">{type.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Niveau de confort</Label>
                    <RadioGroup 
                      value={data.comfort} 
                      onValueChange={(v) => setData({ ...data, comfort: v })}
                      className="grid grid-cols-3 gap-3"
                    >
                      {[
                        { value: "budget", label: "Économique", icon: "💰" },
                        { value: "standard", label: "Standard", icon: "⭐" },
                        { value: "luxury", label: "Luxe", icon: "💎" },
                      ].map((option) => (
                        <Label
                          key={option.value}
                          htmlFor={`comfort-${option.value}`}
                          className={cn(
                            "flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105",
                            data.comfort === option.value 
                              ? "bg-purple-500 text-white border-purple-600 shadow-lg"
                              : "bg-white hover:border-purple-400"
                          )}
                        >
                          <RadioGroupItem value={option.value} id={`comfort-${option.value}`} className="sr-only" />
                          <span className="text-3xl mb-2">{option.icon}</span>
                          <span className="font-medium">{option.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Équipements souhaités</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {amenities.map((amenity) => {
                        const isSelected = data.amenities.includes(amenity.id);
                        return (
                          <button
                            key={amenity.id}
                            onClick={() => toggleItem("amenities", amenity.id)}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                              isSelected 
                                ? "bg-purple-500 text-white border-purple-600"
                                : "bg-white hover:border-purple-400"
                            )}
                          >
                            {amenity.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 6: Activités */}
          {currentSection === 6 && data.helpWith.includes('activities') && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  🎭 Vos activités préférées
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {activities.map((activity) => {
                    const Icon = activity.icon;
                    const isSelected = data.activities.includes(activity.id);
                    return (
                      <button
                        key={activity.id}
                        onClick={() => toggleItem("activities", activity.id)}
                        className={cn(
                          "p-5 rounded-xl border-2 transition-all hover:scale-105",
                          isSelected 
                            ? "bg-gradient-to-br from-orange-500 to-red-500 text-white border-transparent shadow-xl"
                            : "bg-white hover:border-orange-400"
                        )}
                      >
                        <Icon className="w-10 h-10 mx-auto mb-2" />
                        <p className="font-medium text-sm">{activity.label}</p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Section 7: Budget */}
          {currentSection === 7 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  💰 Votre budget
                </h2>

                <div className="space-y-8">
                  <div>
                    <Label className="text-lg font-semibold mb-4 block text-center">
                      Budget par personne (hors dépenses personnelles)
                    </Label>
                    
                    <BudgetChart value={data.budget} max={5000} />
                    
                    <div className="mt-6 space-y-4">
                      <Slider
                        value={[data.budget]}
                        onValueChange={(value) => setData({ ...data, budget: value[0] })}
                        max={5000}
                        min={0}
                        step={50}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>€0</span>
                        <span>€1,250</span>
                        <span>€2,500</span>
                        <span>€3,750</span>
                        <span>€5,000+</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200">
                    <p className="text-sm text-muted-foreground mb-2">Budget total estimé</p>
                    <p className="text-4xl font-bold text-cyan-600">
                      €{(data.budget * data.travelers.length).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      pour {data.travelers.length} voyageur{data.travelers.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 8: Style & Rythme */}
          {currentSection === 8 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  🎨 Votre style de voyage
                </h2>

                <div className="space-y-8">
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Styles de voyage</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { id: "cultural", label: "Culturel", icon: Book },
                        { id: "adventure", label: "Aventure", icon: Compass },
                        { id: "relaxation", label: "Détente", icon: Coffee },
                        { id: "gastronomy", label: "Gastronomie", icon: Utensils },
                        { id: "party", label: "Festif", icon: PartyPopper },
                        { id: "romantic", label: "Romantique", icon: Heart },
                      ].map((style) => {
                        const Icon = style.icon;
                        const isSelected = data.styles.includes(style.id);
                        return (
                          <button
                            key={style.id}
                            onClick={() => toggleItem("styles", style.id)}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all hover:scale-105 flex items-center gap-3",
                              isSelected 
                                ? "bg-indigo-500 text-white border-indigo-600 shadow-lg"
                                : "bg-white hover:border-indigo-400"
                            )}
                          >
                            <Icon className="w-6 h-6" />
                            <span className="font-medium">{style.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Rythme du voyage</Label>
                    <RadioGroup 
                      value={data.rhythm} 
                      onValueChange={(v) => setData({ ...data, rhythm: v })}
                      className="grid grid-cols-3 gap-4"
                    >
                      {[
                        { value: "relaxed", label: "Relax", icon: "😌", desc: "On prend notre temps" },
                        { value: "balanced", label: "Équilibré", icon: "⚖️", desc: "Mix activités/repos" },
                        { value: "intense", label: "Intense", icon: "⚡", desc: "Action non-stop" },
                      ].map((option) => (
                        <Label
                          key={option.value}
                          htmlFor={`rhythm-${option.value}`}
                          className={cn(
                            "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                            data.rhythm === option.value 
                              ? "bg-indigo-500 text-white border-indigo-600 shadow-xl"
                              : "bg-white hover:border-indigo-400"
                          )}
                        >
                          <RadioGroupItem value={option.value} id={`rhythm-${option.value}`} className="sr-only" />
                          <span className="text-4xl mb-2">{option.icon}</span>
                          <span className="font-bold mb-1">{option.label}</span>
                          <span className={cn("text-xs", data.rhythm === option.value ? "text-white/80" : "text-muted-foreground")}>
                            {option.desc}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Préférences horaires</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {schedulePrefs.map((pref) => {
                        const Icon = pref.icon;
                        const isSelected = data.schedulePrefs.includes(pref.id);
                        return (
                          <button
                            key={pref.id}
                            onClick={() => toggleItem("schedulePrefs", pref.id)}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all hover:scale-105 flex flex-col items-center gap-2",
                              isSelected 
                                ? "bg-indigo-500 text-white border-indigo-600 shadow-lg"
                                : "bg-white hover:border-indigo-400"
                            )}
                          >
                            <Icon className="w-8 h-8" />
                            <span className="font-medium text-sm">{pref.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 9: Contraintes */}
          {currentSection === 9 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-white/80 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  ⚠️ Contraintes & Besoins spécifiques
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Mobilité</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "wheelchair", label: "Fauteuil roulant" },
                        { id: "reduced_mobility", label: "Mobilité réduite" },
                        { id: "elderly", label: "Personne âgée" },
                        { id: "pregnant", label: "Femme enceinte" },
                      ].map((mobility) => {
                        const isSelected = data.mobility.includes(mobility.id);
                        return (
                          <button
                            key={mobility.id}
                            onClick={() => toggleItem("mobility", mobility.id)}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all text-sm font-medium",
                              isSelected 
                                ? "bg-amber-500 text-white border-amber-600"
                                : "bg-white hover:border-amber-400"
                            )}
                          >
                            {mobility.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dietary" className="text-lg font-semibold mb-2 block">
                      Restrictions alimentaires
                    </Label>
                    <Textarea
                      id="dietary"
                      placeholder="Végétarien, allergies, intolérances..."
                      value={data.dietaryRestrictions || ""}
                      onChange={(e) => setData({ ...data, dietaryRestrictions: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="allergies" className="text-lg font-semibold mb-2 block">
                      Allergies
                    </Label>
                    <Textarea
                      id="allergies"
                      placeholder="Médicamenteuses, environnementales..."
                      value={data.allergies || ""}
                      onChange={(e) => setData({ ...data, allergies: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Section 10: Finalisation */}
          {currentSection === 10 && (
            <div className="space-y-8 animate-fade-in">
              <Card className="p-8 border-2 shadow-xl bg-gradient-to-br from-cyan-50 to-blue-50 backdrop-blur">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  ✨ Dernière étape !
                </h2>

                <div className="space-y-6 max-w-2xl mx-auto">
                  <div>
                    <Label htmlFor="email" className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={data.email}
                      onChange={(e) => setData({ ...data, email: e.target.value })}
                      className="h-14 text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="additional" className="text-lg font-semibold mb-2 block">
                      Informations complémentaires
                    </Label>
                    <Textarea
                      id="additional"
                      placeholder="Dites-nous en plus sur vos attentes, vos envies particulières..."
                      value={data.additionalInfo || ""}
                      onChange={(e) => setData({ ...data, additionalInfo: e.target.value })}
                      className="min-h-[150px] text-base"
                    />
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-cyan-200">
                    <h3 className="font-bold text-lg mb-4">📋 Récapitulatif</h3>
                    <div className="space-y-2 text-sm">
                      <p>👥 {data.travelers.length} voyageur{data.travelers.length > 1 ? 's' : ''}</p>
                      {data.destination && <p>📍 Destination: {data.destination}</p>}
                      {data.dateRange?.from && (
                        <p>📅 Dates: {format(data.dateRange.from, "dd/MM/yyyy")} 
                        {data.dateRange.to && ` - ${format(data.dateRange.to, "dd/MM/yyyy")}`}</p>
                      )}
                      <p>💰 Budget: €{data.budget}/personne (Total: €{data.budget * data.travelers.length})</p>
                      <p>🎯 Services: {data.helpWith.join(', ')}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    className="w-full h-16 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-xl"
                  >
                    <Sparkles className="w-6 h-6 mr-2" />
                    Créer mon voyage sur mesure
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t-2">
            <Button
              onClick={prevSection}
              disabled={currentSection === 0}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Précédent
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Section {currentSection + 1} / {totalSections}
              </p>
            </div>

            {currentSection < totalSections - 1 ? (
              <Button
                onClick={nextSection}
                size="lg"
                className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Suivant
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                size="lg"
                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <CheckCircle2 className="w-5 h-5" />
                Envoyer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireV2;
