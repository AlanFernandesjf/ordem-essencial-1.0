import { MainLayout } from "@/components/layout/MainLayout";
import { Plane, Hotel, Utensils, MapPin, Plus, Pencil, Trash2, Calendar, CalendarClock } from "lucide-react";
import { useState, useEffect } from "react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface TripInfo {
  id: string;
  destination: string;
  image: string;
  departureDate: string;
  returnDate: string;
  nights: string;
}

interface ExpenseItem {
  id: string;
  description: string;
  estimatedValue: number;
  realValue: number;
  category: "flights" | "tours" | "hotels" | "food";
}

interface PlaceItem {
  id: string;
  name: string;
}

const Viagens = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  
  // Expenses grouped by state for easier UI usage, though we could just filter a single list
  const [flights, setFlights] = useState<ExpenseItem[]>([]);
  const [tours, setTours] = useState<ExpenseItem[]>([]);
  const [hotels, setHotels] = useState<ExpenseItem[]>([]);
  const [food, setFood] = useState<ExpenseItem[]>([]);
  
  const [places, setPlaces] = useState<PlaceItem[]>([]);

  // Modal states
  const [tripModal, setTripModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [placeModal, setPlaceModal] = useState(false);

  // Edit states
  const [expenseType, setExpenseType] = useState<"flights" | "tours" | "hotels" | "food">("flights");
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editingPlace, setEditingPlace] = useState<PlaceItem | null>(null);

  // Form states
  const [formDestination, setFormDestination] = useState("");
  const [formDeparture, setFormDeparture] = useState("");
  const [formReturn, setFormReturn] = useState("");
  const [formNights, setFormNights] = useState("");
  
  // Image Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempImage, setTempImage] = useState("");

  const [formDescription, setFormDescription] = useState("");
  const [formEstimated, setFormEstimated] = useState("");
  const [formReal, setFormReal] = useState("");

  const [formPlaceName, setFormPlaceName] = useState("");

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Trip
      const { data: tripData, error: tripError } = await supabase
        .from('travel_trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tripError && tripError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw tripError;
      }

      if (!tripData) {
        setTripInfo(null);
        // No seeding
      } else {
        setTripInfo({
          id: tripData.id,
          destination: tripData.destination,
          image: tripData.image || "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=250&fit=crop",
          departureDate: tripData.departure_date,
          returnDate: tripData.return_date,
          nights: tripData.nights
        });

        // 2. Fetch Expenses
        const { data: expensesData, error: expensesError } = await supabase
          .from('travel_expenses')
          .select('*')
          .eq('trip_id', tripData.id)
          .order('created_at');

        if (expensesError) throw expensesError;

        if (expensesData) {
          const mappedExpenses: ExpenseItem[] = expensesData.map((e: any) => ({
            id: e.id,
            description: e.description,
            estimatedValue: Number(e.estimated_value),
            realValue: Number(e.real_value),
            category: e.category as "flights" | "tours" | "hotels" | "food"
          }));

          setFlights(mappedExpenses.filter(e => e.category === 'flights'));
          setTours(mappedExpenses.filter(e => e.category === 'tours'));
          setHotels(mappedExpenses.filter(e => e.category === 'hotels'));
          setFood(mappedExpenses.filter(e => e.category === 'food'));
        }

        // 3. Fetch Places
        const { data: placesData, error: placesError } = await supabase
          .from('travel_places')
          .select('*')
          .eq('trip_id', tripData.id)
          .order('created_at');

        if (placesError) throw placesError;

        if (placesData) {
          setPlaces(placesData.map((p: any) => ({
            id: p.id,
            name: p.name
          })));
        }
      }

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getExpenseList = (type: "flights" | "tours" | "hotels" | "food") => {
    switch (type) {
      case "flights": return flights;
      case "tours": return tours;
      case "hotels": return hotels;
      case "food": return food;
    }
  };

  // Trip CRUD
  const openTripModal = () => {
    if (tripInfo) {
      setFormDestination(tripInfo.destination);
      setFormDeparture(tripInfo.departureDate);
      setFormReturn(tripInfo.returnDate);
      setFormNights(tripInfo.nights);
      setTempImage(tripInfo.image);
    } else {
      setFormDestination("");
      setFormDeparture("");
      setFormReturn("");
      setFormNights("");
      setTempImage("");
    }
    setTripModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploadingImage(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('travel-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('travel-images').getPublicUrl(filePath);
      setTempImage(data.publicUrl);
      
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const saveTrip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tripData = {
        user_id: user.id,
        destination: formDestination,
        image: tempImage || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=250&fit=crop",
        departure_date: formDeparture,
        return_date: formReturn,
        nights: formNights
      };

      if (tripInfo) {
        const { error } = await supabase
          .from('travel_trips')
          .update(tripData)
          .eq('id', tripInfo.id);

        if (error) throw error;

        setTripInfo({
          ...tripInfo,
          destination: formDestination,
          image: tempImage || tripInfo.image,
          departureDate: formDeparture,
          returnDate: formReturn,
          nights: formNights,
        });
      } else {
        const { data, error } = await supabase
          .from('travel_trips')
          .insert(tripData)
          .select()
          .single();

        if (error) throw error;

        setTripInfo({
          id: data.id,
          destination: data.destination,
          image: data.image,
          departureDate: data.departure_date,
          returnDate: data.return_date,
          nights: data.nights
        });
      }

      toast({
        title: "Viagem salva!",
        description: "As informações foram salvas com sucesso."
      });
      setTripModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    }
  };

  // Expense CRUD
  const openExpenseModal = (type: "flights" | "tours" | "hotels" | "food", expense?: ExpenseItem) => {
    setExpenseType(type);
    if (expense) {
      setEditingExpense(expense);
      setFormDescription(expense.description);
      setFormEstimated(expense.estimatedValue.toString());
      setFormReal(expense.realValue.toString());
    } else {
      setEditingExpense(null);
      setFormDescription("");
      setFormEstimated("");
      setFormReal("");
    }
    setExpenseModal(true);
  };

  const saveExpense = async () => {
    if (!formDescription.trim() || !tripInfo) return;
    
    const estimated = parseFloat(formEstimated) || 0;
    const real = parseFloat(formReal) || 0;

    try {
      if (editingExpense) {
        // Update
        const { error } = await supabase
          .from('travel_expenses')
          .update({
            description: formDescription,
            estimated_value: estimated,
            real_value: real
          })
          .eq('id', editingExpense.id);

        if (error) throw error;

        // Update local state
        const updateList = (list: ExpenseItem[]) => 
          list.map(e => e.id === editingExpense.id 
            ? { ...e, description: formDescription, estimatedValue: estimated, realValue: real } 
            : e
          );

        if (expenseType === 'flights') setFlights(updateList(flights));
        else if (expenseType === 'tours') setTours(updateList(tours));
        else if (expenseType === 'hotels') setHotels(updateList(hotels));
        else if (expenseType === 'food') setFood(updateList(food));

      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('travel_expenses')
          .insert({
            user_id: user.id,
            trip_id: tripInfo.id,
            category: expenseType,
            description: formDescription,
            estimated_value: estimated,
            real_value: real
          })
          .select()
          .single();

        if (error) throw error;

        const newItem: ExpenseItem = {
          id: data.id,
          description: data.description,
          estimatedValue: Number(data.estimated_value),
          realValue: Number(data.real_value),
          category: data.category
        };

        if (expenseType === 'flights') setFlights([...flights, newItem]);
        else if (expenseType === 'tours') setTours([...tours, newItem]);
        else if (expenseType === 'hotels') setHotels([...hotels, newItem]);
        else if (expenseType === 'food') setFood([...food, newItem]);
      }

      setExpenseModal(false);
      toast({
        title: "Sucesso",
        description: "Despesa salva com sucesso."
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    }
  };

  const deleteExpense = async () => {
    if (!editingExpense) return;

    try {
      const { error } = await supabase
        .from('travel_expenses')
        .delete()
        .eq('id', editingExpense.id);

      if (error) throw error;

      const filterList = (list: ExpenseItem[]) => list.filter(e => e.id !== editingExpense.id);

      if (expenseType === 'flights') setFlights(filterList(flights));
      else if (expenseType === 'tours') setTours(filterList(tours));
      else if (expenseType === 'hotels') setHotels(filterList(hotels));
      else if (expenseType === 'food') setFood(filterList(food));

      setExpenseModal(false);
      toast({
        title: "Sucesso",
        description: "Despesa removida com sucesso."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message
      });
    }
  };

  // Place CRUD
  const openPlaceModal = (place?: PlaceItem) => {
    if (place) {
      setEditingPlace(place);
      setFormPlaceName(place.name);
    } else {
      setEditingPlace(null);
      setFormPlaceName("");
    }
    setPlaceModal(true);
  };

  const savePlace = async () => {
    if (!formPlaceName.trim() || !tripInfo) return;

    try {
      if (editingPlace) {
        // Update
        const { error } = await supabase
          .from('travel_places')
          .update({ name: formPlaceName })
          .eq('id', editingPlace.id);

        if (error) throw error;

        setPlaces(prev => prev.map(p =>
          p.id === editingPlace.id ? { ...p, name: formPlaceName } : p
        ));
      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('travel_places')
          .insert({
            user_id: user.id,
            trip_id: tripInfo.id,
            name: formPlaceName
          })
          .select()
          .single();

        if (error) throw error;

        setPlaces(prev => [...prev, { id: data.id, name: data.name }]);
      }

      setPlaceModal(false);
      toast({
        title: "Sucesso",
        description: "Local salvo com sucesso."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    }
  };

  const deletePlace = async () => {
    if (!editingPlace) return;

    try {
      const { error } = await supabase
        .from('travel_places')
        .delete()
        .eq('id', editingPlace.id);

      if (error) throw error;

      setPlaces(prev => prev.filter(p => p.id !== editingPlace.id));
      setPlaceModal(false);
      toast({
        title: "Sucesso",
        description: "Local removido com sucesso."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message
      });
    }
  };

  const formatValue = (value: number) => value === 0 ? "—" : value.toLocaleString("pt-BR");

  // Calculations
  const totalFlights = flights.reduce((sum, e) => sum + (e.realValue || e.estimatedValue), 0);
  const totalTours = tours.reduce((sum, e) => sum + (e.realValue || e.estimatedValue), 0);
  const totalHotels = hotels.reduce((sum, e) => sum + (e.realValue || e.estimatedValue), 0);
  
  // Safe parsing for nights
  const nightsCount = tripInfo ? (parseInt(tripInfo.nights) || 0) : 0;
  const totalFood = food.reduce((sum, e) => sum + (e.realValue || e.estimatedValue), 0) * nightsCount;
  
  const totalTrip = totalFlights + totalTours + totalHotels + totalFood;

  // Calculate days until trip
  const calculateDaysUntilTrip = (dateString: string | undefined) => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    
    const tripDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilTrip = tripInfo ? calculateDaysUntilTrip(tripInfo.departureDate) : null;
  const daysToTrip = daysUntilTrip ?? 0;

  const ExpenseTable = ({
    title,
    icon,
    headerClass,
    bgClass,
    items,
    type,
    showReal = true
  }: {
    title: string;
    icon: React.ReactNode;
    headerClass: string;
    bgClass: string;
    items: ExpenseItem[];
    type: "flights" | "tours" | "hotels" | "food";
    showReal?: boolean;
  }) => (
    <div className="notion-card">
      <div className={`notion-card-header ${headerClass} flex items-center gap-2`}>
        {icon}
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={bgClass}>
              <th className="p-2 text-left text-xs font-semibold border-b border-border">Descrição</th>
              <th className="p-2 text-right text-xs font-semibold border-b border-border">Valor Estimado</th>
              {showReal && <th className="p-2 text-right text-xs font-semibold border-b border-border">Valor Real</th>}
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 group">
                <td className="p-2 text-xs border-b border-border/50">{item.description}</td>
                <td className="p-2 text-xs text-right border-b border-border/50">{formatValue(item.estimatedValue)}</td>
                {showReal && <td className="p-2 text-xs text-right border-b border-border/50">{formatValue(item.realValue)}</td>}
                <td className="p-2 border-b border-border/50">
                  <button
                    onClick={() => openExpenseModal(type, item)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={showReal ? 4 : 3} className="p-2">
                <button
                  onClick={() => openExpenseModal(type)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus size={12} />
                  New
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={`p-3 ${bgClass} border-t border-border`}>
        <div className="flex justify-between text-sm font-medium">
          <span>Valor Total:</span>
          <span>R$ {items.reduce((sum, e) => sum + (e.realValue || e.estimatedValue), 0).toLocaleString("pt-BR")}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Viagens ✅</h1>
      </div>

      {!tripInfo ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-fade-in py-12">
          <div className="p-4 bg-primary/10 rounded-full">
            <Plane className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Nenhuma viagem planejada</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Comece a planejar sua próxima aventura! Defina o destino, datas e orçamento.
          </p>
          <Button onClick={() => openTripModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Nova Viagem
          </Button>
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Destination */}
        <div className="space-y-6">
          {/* Destination Card */}
          <div className="notion-card overflow-hidden group cursor-pointer" onClick={openTripModal}>
            <img
              src={tripInfo.image}
              alt={tripInfo.destination}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=250&fit=crop";
              }}
            />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-2">DESTINO: {tripInfo.destination}</h2>
                <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Countdown Section */}
              {daysUntilTrip !== null && (
                <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-center gap-4">
                   <CalendarClock className="w-8 h-8 text-primary" />
                   <div className="text-center">
                     <div className="text-2xl font-bold text-primary">
                       {daysUntilTrip > 0 ? daysUntilTrip : (daysUntilTrip === 0 ? "Hoje!" : "Viajando")}
                     </div>
                     <div className="text-xs text-muted-foreground uppercase font-semibold">
                       {daysUntilTrip > 0 ? "Dias Restantes" : (daysUntilTrip === 0 ? "É Hoje!" : "Aproveite!")}
                     </div>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <p className="text-muted-foreground text-xs">IDA</p>
                  <p className="font-medium">{tripInfo.departureDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">VOLTA</p>
                  <p className="font-medium">{tripInfo.returnDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">DURAÇÃO</p>
                  <p className="font-medium">{tripInfo.nights}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Card */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-blue flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              CONTAGEM REGRESSIVA
            </div>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">{daysToTrip > 0 ? daysToTrip : 0}</div>
              <p className="text-sm text-muted-foreground">
                {daysToTrip > 0 
                  ? `dias para sua viagem para ${tripInfo.destination}`
                  : daysToTrip === 0 
                    ? "É hoje! Boa viagem!" 
                    : "A viagem já aconteceu"}
              </p>
            </div>
          </div>

          {/* Places to Visit */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-blue flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                LOCAIS PARA CONHECER
              </div>
              <Button size="sm" variant="ghost" onClick={() => openPlaceModal()}>
                <Plus size={14} />
              </Button>
            </div>
            <div className="p-4">
              <img
                src="https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=400&h=200&fit=crop"
                alt="NYC Skyline"
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
              <ul className="space-y-2 text-sm">
                {places.map((place) => (
                  <li
                    key={place.id}
                    className="flex items-center gap-2 group cursor-pointer hover:bg-muted/30 p-1 rounded"
                    onClick={() => openPlaceModal(place)}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="flex-1">{place.name}</span>
                    <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Middle Column - Flights & Tours */}
        <div className="space-y-6">
          <ExpenseTable
            title="PASSAGENS AÉREAS"
            icon={<Plane className="w-4 h-4" />}
            headerClass="notion-header-pink"
            bgClass="bg-notion-pink-bg"
            items={flights}
            type="flights"
          />
          <ExpenseTable
            title="PASSEIOS / TURISMO"
            icon="🎯"
            headerClass="notion-header-yellow"
            bgClass="bg-notion-yellow-bg"
            items={tours}
            type="tours"
          />
        </div>

        {/* Right Column - Hotel & Food */}
        <div className="space-y-6">
          <ExpenseTable
            title="HOTEL"
            icon={<Hotel className="w-4 h-4" />}
            headerClass="notion-header-purple"
            bgClass="bg-notion-purple-bg"
            items={hotels}
            type="hotels"
            showReal={false}
          />
          <ExpenseTable
            title="ALIMENTAÇÃO"
            icon={<Utensils className="w-4 h-4" />}
            headerClass="notion-header-green"
            bgClass="bg-notion-green-bg"
            items={food}
            type="food"
          />

          {/* Total Summary */}
          <div className="notion-card p-4 bg-gradient-to-r from-primary/10 to-accent/10">
            <h3 className="font-semibold mb-2">Total Estimado da Viagem</h3>
            <p className="text-2xl font-bold text-primary">R$ {totalTrip.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>
      )}

      {/* Trip Modal */}
      <CrudModal
        open={tripModal}
        onOpenChange={setTripModal}
        title="Editar Viagem"
        onSave={saveTrip}
      >
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">Imagem de Capa</label>
          <div className="flex flex-col gap-2">
            {tempImage && (
              <img src={tempImage} alt="Capa" className="w-full h-32 object-cover rounded-md border" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 cursor-pointer"
            />
            {uploadingImage && <p className="text-xs text-muted-foreground animate-pulse">Enviando imagem...</p>}
          </div>
        </div>

        <FormField label="Destino" value={formDestination} onChange={setFormDestination} placeholder="Cidade, País" />
        <FormField label="Data Ida" value={formDeparture} onChange={setFormDeparture} placeholder="DD/MM/AAAA" />
        <FormField label="Data Volta" value={formReturn} onChange={setFormReturn} placeholder="DD/MM/AAAA" />
        <FormField label="Noites" value={formNights} onChange={setFormNights} placeholder="X noites" />
      </CrudModal>

      {/* Expense Modal */}
      <CrudModal
        open={expenseModal}
        onOpenChange={setExpenseModal}
        title={editingExpense ? "Editar Despesa" : "Nova Despesa"}
        onSave={saveExpense}
        onDelete={deleteExpense}
        isEditing={!!editingExpense}
      >
        <FormField label="Descrição" value={formDescription} onChange={setFormDescription} placeholder="Descrição" />
        <FormField label="V. Estimado" value={formEstimated} onChange={setFormEstimated} type="number" placeholder="0" />
        <FormField label="V. Real" value={formReal} onChange={setFormReal} type="number" placeholder="0" />
      </CrudModal>

      {/* Place Modal */}
      <CrudModal
        open={placeModal}
        onOpenChange={setPlaceModal}
        title={editingPlace ? "Editar Local" : "Novo Local"}
        onSave={savePlace}
        onDelete={deletePlace}
        isEditing={!!editingPlace}
      >
        <FormField label="Nome" value={formPlaceName} onChange={setFormPlaceName} placeholder="Nome do local" />
      </CrudModal>
    </MainLayout>
  );
};

export default Viagens;
