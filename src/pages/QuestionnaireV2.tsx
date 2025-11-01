import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Users, Heart, Baby, UserCircle, Plane, Hotel, Compass, 
  MapPin, Calendar as CalendarIcon, Euro, Sparkles, Mountain,
  Waves, Sun, Snowflake, CheckCircle2, Mail
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CitySearch } from "@/components/questionnaire/CitySearch";

interface QuestionnaireData {
  travelGroup?: string;
  destination?: string;
  departureCity?: string;
  dateRange?: { from: Date; to?: Date };
  services: string[];
  budget?: number;
  styles: string[];
  climates: string[];
  email?: string;
  additionalInfo?: string;
}

const QuestionnaireV2 = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<QuestionnaireData>({
    services: [],
    styles: [],
    climates: []
  });

  const travelGroups = [
    { id: "solo", label: "Solo", icon: UserCircle },
    { id: "duo", label: "Duo", icon: Heart },
    { id: "family", label: "Family", icon: Baby },
    { id: "friends", label: "Friends", icon: Users },
  ];

  const services = [
    { id: "flights", label: "Flights", icon: Plane },
    { id: "accommodation", label: "Accommodation", icon: Hotel },
    { id: "activities", label: "Activities", icon: Compass },
  ];

  const styles = [
    { id: "cultural", label: "Cultural", icon: Sparkles },
    { id: "nature", label: "Nature", icon: Mountain },
    { id: "beach", label: "Beach", icon: Waves },
    { id: "adventure", label: "Adventure", icon: Compass },
  ];

  const climates = [
    { id: "hot", label: "Hot", icon: Sun },
    { id: "mild", label: "Mild", icon: Sparkles },
    { id: "cold", label: "Cold", icon: Snowflake },
  ];

  const toggleItem = (key: keyof QuestionnaireData, value: string) => {
    const array = data[key] as string[];
    if (array.includes(value)) {
      setData({ ...data, [key]: array.filter(v => v !== value) });
    } else {
      setData({ ...data, [key]: [...array, value] });
    }
  };

  const isComplete = () => {
    return data.travelGroup && 
           data.services.length > 0 && 
           data.budget && 
           data.email;
  };

  const handleSubmit = () => {
    console.log("Submitting:", data);
    // TODO: Submit to API
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Plan Your Perfect Trip
          </h1>
          <p className="text-muted-foreground text-lg">
            Visual, simple, and intuitive - design your journey in minutes
          </p>
        </div>

        <div className="space-y-8">
          {/* Travel Group */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">Who's traveling?</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {travelGroups.map((group) => {
                const Icon = group.icon;
                const isSelected = data.travelGroup === group.id;
                return (
                  <Button
                    key={group.id}
                    variant={isSelected ? "default" : "outline"}
                    className="h-24 flex flex-col gap-2 relative"
                    onClick={() => setData({ ...data, travelGroup: group.id })}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5" />
                    )}
                    <Icon className="w-8 h-8" />
                    <span>{group.label}</span>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Destination */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">Where to?</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Destination
                </Label>
                <CitySearch
                  value={data.destination || ""}
                  onChange={(city) => setData({ ...data, destination: city })}
                  placeholder="Search destination..."
                />
              </div>
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Departure City
                </Label>
                <CitySearch
                  value={data.departureCity || ""}
                  onChange={(city) => setData({ ...data, departureCity: city })}
                  placeholder="Search departure city..."
                />
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">When?</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-4">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {data.dateRange?.from ? (
                    data.dateRange.to ? (
                      <>
                        {format(data.dateRange.from, "LLL dd, y")} -{" "}
                        {format(data.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(data.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick your travel dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
          </Card>

          {/* Services */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">What do you need help with?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map((service) => {
                const Icon = service.icon;
                const isSelected = data.services.includes(service.id);
                return (
                  <Button
                    key={service.id}
                    variant={isSelected ? "default" : "outline"}
                    className="h-20 flex flex-col gap-2 relative"
                    onClick={() => toggleItem("services", service.id)}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5" />
                    )}
                    <Icon className="w-6 h-6" />
                    <span>{service.label}</span>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Travel Style */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">Travel style (select all that apply)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {styles.map((style) => {
                const Icon = style.icon;
                const isSelected = data.styles.includes(style.id);
                return (
                  <Button
                    key={style.id}
                    variant={isSelected ? "default" : "outline"}
                    className="h-20 flex flex-col gap-2 relative"
                    onClick={() => toggleItem("styles", style.id)}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4" />
                    )}
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{style.label}</span>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Climate */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">Preferred climate</Label>
            <div className="grid grid-cols-3 gap-4">
              {climates.map((climate) => {
                const Icon = climate.icon;
                const isSelected = data.climates.includes(climate.id);
                return (
                  <Button
                    key={climate.id}
                    variant={isSelected ? "default" : "outline"}
                    className="h-20 flex flex-col gap-2 relative"
                    onClick={() => toggleItem("climates", climate.id)}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4" />
                    )}
                    <Icon className="w-6 h-6" />
                    <span>{climate.label}</span>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Budget */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Budget per person
            </Label>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  €{data.budget || 0}
                </span>
                <Badge variant="outline">Per person</Badge>
              </div>
              <Slider
                value={[data.budget || 0]}
                onValueChange={(value) => setData({ ...data, budget: value[0] })}
                max={5000}
                min={0}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>€0</span>
                <span>€1,000</span>
                <span>€2,500</span>
                <span>€5,000+</span>
              </div>
            </div>
          </Card>

          {/* Additional Info */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 block">Anything else we should know?</Label>
            <Textarea
              placeholder="Dietary restrictions, special requests, specific interests..."
              value={data.additionalInfo || ""}
              onChange={(e) => setData({ ...data, additionalInfo: e.target.value })}
              className="min-h-[100px] resize-none"
            />
          </Card>

          {/* Email */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-all">
            <Label className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email
            </Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={data.email || ""}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="text-lg py-6"
            />
          </Card>

          {/* Submit */}
          <div className="flex gap-4 justify-center pb-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/questionnaire")}
              className="px-8"
            >
              Try Classic Version
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!isComplete()}
              className="px-12 py-6 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get My Custom Trip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireV2;
