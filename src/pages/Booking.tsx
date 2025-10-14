import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTripData } from "@/hooks/useTripData";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Users, CreditCard, Shield, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const travelerSchema = z.object({
  // Informations personnelles
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(50),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  nationality: z.string().min(2, "La nationalité est requise").max(50),
  
  // Contact
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Le numéro de téléphone doit contenir au moins 10 chiffres").max(20),
  
  // Passeport
  passportNumber: z.string().min(6, "Le numéro de passeport doit contenir au moins 6 caractères").max(20),
  passportIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  passportExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  passportCountry: z.string().min(2, "Le pays d'émission est requis").max(50),
  
  // Adresse
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères").max(200),
  city: z.string().min(2, "La ville est requise").max(100),
  postalCode: z.string().min(3, "Le code postal est requis").max(20),
  country: z.string().min(2, "Le pays est requis").max(50),
  
  // Adresse de facturation
  billingAddressSame: z.boolean().default(true),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingPostalCode: z.string().optional(),
  billingCountry: z.string().optional(),
}).refine((data) => {
  if (!data.billingAddressSame) {
    return data.billingAddress && data.billingCity && data.billingPostalCode && data.billingCountry;
  }
  return true;
}, {
  message: "Veuillez remplir tous les champs de l'adresse de facturation",
  path: ["billingAddress"],
});

const Booking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const { trip, loading } = useTripData(code);
  const { toast } = useToast();
  
  // Récupérer le nombre de voyageurs depuis les données du trip
  const travelers = trip?.travelers || 1;

  const [currentTraveler, setCurrentTraveler] = useState(0);
  const [travelersData, setTravelersData] = useState<any[]>([]);
  const [acceptedCGV, setAcceptedCGV] = useState(false);

  const formSchema = travelerSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      nationality: "",
      email: "",
      phone: "",
      passportNumber: "",
      passportIssueDate: "",
      passportExpiryDate: "",
      passportCountry: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      billingAddressSame: true,
      billingAddress: "",
      billingCity: "",
      billingPostalCode: "",
      billingCountry: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const updatedData = [...travelersData];
    updatedData[currentTraveler] = values;
    setTravelersData(updatedData);

    if (currentTraveler < travelers - 1) {
      // Passer au voyageur suivant
      setCurrentTraveler(currentTraveler + 1);
      form.reset();
      toast({
        title: "Informations enregistrées",
        description: `Voyageur ${currentTraveler + 1} enregistré. Veuillez remplir les informations du voyageur ${currentTraveler + 2}.`,
      });
    } else {
      // Tous les voyageurs sont remplis
      toast({
        title: "Formulaire complet",
        description: "Toutes les informations ont été enregistrées. Le paiement sera disponible prochainement.",
      });
    }
  };

  const handlePrevious = () => {
    if (currentTraveler > 0) {
      setCurrentTraveler(currentTraveler - 1);
      const prevData = travelersData[currentTraveler - 1];
      if (prevData) {
        form.reset(prevData);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-travliaq-deep-blue to-travliaq-deep-blue/80">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-travliaq-turquoise"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-travliaq-deep-blue to-travliaq-deep-blue/80">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Voyage introuvable</h1>
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const allTravelersFilled = travelersData.length === travelers && currentTraveler === travelers - 1;
  const canProceedToPayment = allTravelersFilled && acceptedCGV;

  return (
    <div className="min-h-screen bg-gradient-to-b from-travliaq-deep-blue to-travliaq-deep-blue/80">
      <Navigation />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-montserrat text-4xl md:text-5xl font-bold text-white mb-4">
              Réservation de votre voyage
            </h1>
            <p className="text-travliaq-turquoise text-xl font-inter">
              {trip.destination}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Formulaire principal */}
            <div className="md:col-span-2">
              <Card className="bg-white/10 backdrop-blur-md border-travliaq-turquoise/30 p-8">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-travliaq-turquoise" />
                    <h2 className="text-2xl font-bold text-white font-montserrat">
                      {travelers > 1 
                        ? `Voyageur ${currentTraveler + 1} sur ${travelers}`
                        : "Information Voyageur"
                      }
                    </h2>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                    <div
                      className="bg-travliaq-turquoise h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentTraveler + 1) / travelers) * 100}%` }}
                    />
                  </div>

                  <p className="text-white/80 font-inter">
                    {currentTraveler === 0 
                      ? "Veuillez remplir vos informations personnelles (voyageur principal)"
                      : `Veuillez remplir les informations du voyageur ${currentTraveler + 1}`
                    }
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Informations personnelles */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-travliaq-turquoise">Informations personnelles</h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Prénom *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Jean"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Nom *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Dupont"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Date de naissance *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="nationality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Nationalité *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Française"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-travliaq-turquoise">Contact</h3>
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Adresse email *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="jean.dupont@example.com"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Numéro de téléphone *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="+33 6 12 34 56 78"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Passeport */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-travliaq-turquoise">Informations du passeport</h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="passportNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Numéro de passeport *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="12AB34567"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="passportCountry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Pays d'émission *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="France"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="passportIssueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Date d'émission *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="passportExpiryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Date d'expiration *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Adresse */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-travliaq-turquoise">Adresse</h3>
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Adresse complète *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="123 Rue de la République"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Ville *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Paris"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Code postal *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="75001"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Pays *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="France"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Adresse de facturation - uniquement pour le voyageur principal */}
                    {currentTraveler === 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-travliaq-turquoise">Adresse de facturation</h3>
                        <p className="text-white/60 text-sm">L'adresse de facturation sera utilisée pour tous les voyageurs</p>
                        
                        <FormField
                          control={form.control}
                          name="billingAddressSame"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-travliaq-turquoise focus:ring-travliaq-turquoise"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-white">
                                  L'adresse de facturation est la même que l'adresse ci-dessus
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        {!form.watch("billingAddressSame") && (
                          <>
                            <FormField
                              control={form.control}
                              name="billingAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Adresse de facturation *</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="123 Rue de Facturation"
                                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="billingCity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Ville *</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Paris"
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="billingPostalCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Code postal *</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="75001"
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="billingCountry"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Pays *</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="France"
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      {currentTraveler > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                          className="flex-1 border-travliaq-turquoise/50 text-white hover:bg-travliaq-turquoise/20"
                        >
                          Précédent
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="flex-1 bg-travliaq-turquoise hover:bg-travliaq-turquoise/80 text-travliaq-deep-blue font-semibold"
                      >
                        {currentTraveler < travelers - 1 ? "Suivant" : "Terminer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            </div>

            {/* Récapitulatif */}
            <div className="md:col-span-1">
              <Card className="bg-white/10 backdrop-blur-md border-travliaq-turquoise/30 p-6 sticky top-24">
                {/* Badge de sécurité */}
                <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-travliaq-turquoise/10 rounded-lg border border-travliaq-turquoise/30">
                  <Shield className="h-5 w-5 text-travliaq-turquoise" />
                  <span className="text-white text-sm font-semibold">Paiement 100% sécurisé</span>
                  <Lock className="h-4 w-4 text-travliaq-turquoise" />
                </div>

                <h3 className="text-xl font-bold text-white font-montserrat mb-4">
                  Récapitulatif
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-white/60 text-sm">Destination</p>
                    <p className="text-white font-semibold">{trip.destination}</p>
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div>
                    <p className="text-white/60 text-sm">Durée</p>
                    <p className="text-white font-semibold">{trip.total_days} jours</p>
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div>
                    <p className="text-white/60 text-sm">Nombre de voyageurs</p>
                    <p className="text-white font-semibold">{travelers}</p>
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  {/* Détail des prix */}
                  <div className="space-y-3">
                    <p className="text-white font-semibold text-sm mb-2">Détail du prix</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Billets d'avion</span>
                      <span className="text-white font-medium">
                        {trip.price_flights || "1 450 €"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Hébergement</span>
                      <span className="text-white font-medium">
                        {trip.price_hotels || "890 €"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Transferts & Transport</span>
                      <span className="text-white font-medium">
                        {trip.price_transport || "320 €"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Activités & Excursions</span>
                      <span className="text-white font-medium">
                        {trip.price_activities || "540 €"}
                      </span>
                    </div>
                  </div>
                  
                  {trip.total_price && (
                    <>
                      <Separator className="bg-white/20" />
                      <div className="flex justify-between items-center pt-2">
                        <p className="text-white font-bold text-lg">Prix total</p>
                        <p className="text-travliaq-golden-sand font-bold text-2xl">
                          {trip.total_price}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Avertissement non-annulation */}
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-white/90 text-sm">
                      <p className="font-semibold mb-1">Politique d'annulation</p>
                      <p className="text-white/70 text-xs">
                        Aucune annulation ou modification n'est possible après le paiement (vols, hôtels, activités, transports). Veuillez vérifier attentivement toutes les informations avant de procéder au paiement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acceptation CGV */}
                <div className="mb-4 flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <input
                    type="checkbox"
                    id="cgv-checkbox"
                    checked={acceptedCGV}
                    onChange={(e) => setAcceptedCGV(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-white/20 bg-white/10 text-travliaq-turquoise focus:ring-travliaq-turquoise cursor-pointer"
                  />
                  <label htmlFor="cgv-checkbox" className="text-white/90 text-sm cursor-pointer">
                    J'ai lu et j'accepte les{" "}
                    <a 
                      href="/cgv" 
                      target="_blank" 
                      className="text-travliaq-turquoise hover:text-travliaq-turquoise/80 underline font-semibold"
                    >
                      Conditions Générales de Vente
                    </a>
                    {" "}et je reconnais qu'aucune annulation ou modification ne sera possible après le paiement *
                  </label>
                </div>

                <Button
                  disabled={!canProceedToPayment}
                  className="w-full bg-travliaq-golden-sand hover:bg-travliaq-golden-sand/80 text-travliaq-deep-blue font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payer avec Stripe
                </Button>
                
                {!allTravelersFilled && (
                  <p className="text-white/60 text-xs text-center mt-2">
                    Remplissez les informations de tous les voyageurs
                  </p>
                )}
                
                {allTravelersFilled && !acceptedCGV && (
                  <p className="text-white/60 text-xs text-center mt-2">
                    Acceptez les CGV pour continuer
                  </p>
                )}

                {/* Indicateurs de sécurité */}
                <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-travliaq-turquoise" />
                    <span>Cryptage SSL 256 bits</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-travliaq-turquoise" />
                    <span>Conformité PCI-DSS</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-travliaq-turquoise" />
                    <span>Données personnelles protégées</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
