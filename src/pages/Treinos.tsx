import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Plus, Dumbbell, Pencil, Trash2, Upload, ImageIcon } from "lucide-react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { BodyVisualizer } from "@/components/fitness/BodyVisualizer";


interface Exercise {
  id: string;
  name: string;
  reps: string;
  done: boolean;
  workoutId: string;
}

interface WorkoutDay {
  id: string;
  day: string;
  focus: string;
  image: string;
  exercises: Exercise[];
}

interface Measurement {
  id: string;
  name: string;
  value: string;
  date: string;
}

interface DietItem {
  id: string;
  meal: string;
  description: string;
  calories: string;
}

interface CareItem {
  id: string;
  name: string;
  frequency: string;
  lastDone: string;
  category: "saude" | "beleza";
}

type TabType = "medidas" | "treinos" | "dieta" | "saude" | "beleza";

const DIET_DAYS = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO", "DIÁRIO"];

const Treinos = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("treinos");
  
  const [workouts, setWorkouts] = useState<WorkoutDay[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [diet, setDiet] = useState<DietItem[]>([]);
  const [healthItems, setHealthItems] = useState<CareItem[]>([]);
  const [beautyItems, setBeautyItems] = useState<CareItem[]>([]);
  const [gender, setGender] = useState<'male' | 'female'>('female');

  // Modal states
  const [exerciseModal, setExerciseModal] = useState(false);
  const [workoutModal, setWorkoutModal] = useState(false);
  const [measurementModal, setMeasurementModal] = useState(false);
  const [dietModal, setDietModal] = useState(false);
  const [careModal, setCareModal] = useState(false);

  // Edit states
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ workoutId: string; exercise: Exercise } | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutDay | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [editingDiet, setEditingDiet] = useState<DietItem | null>(null);
  const [editingCare, setEditingCare] = useState<CareItem | null>(null);
  const [careType, setCareType] = useState<"saude" | "beleza">("saude");

  // Form states
  const [formExName, setFormExName] = useState("");
  const [formExReps, setFormExReps] = useState("");
  const [formWorkoutDay, setFormWorkoutDay] = useState("");
  const [formWorkoutFocus, setFormWorkoutFocus] = useState("");
  const [formWorkoutImage, setFormWorkoutImage] = useState("");
  const [formMeasName, setFormMeasName] = useState("");
  const [formMeasValue, setFormMeasValue] = useState("");
  const [formMeasDate, setFormMeasDate] = useState("");
  const [formDietMeal, setFormDietMeal] = useState("");
  const [formDietDesc, setFormDietDesc] = useState("");
  const [formDietCal, setFormDietCal] = useState("");
  const [formDietDay, setFormDietDay] = useState("SEGUNDA");
  const [formCareName, setFormCareName] = useState("");
  const [formCareFreq, setFormCareFreq] = useState("");
  const [formCareLast, setFormCareLast] = useState("");
  
  // Helper to safely parse numeric values
  const getNumericValue = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    if (typeof val !== 'string') return null;
    
    // Normalize: replace comma with dot, remove non-numeric except dot
    const cleanStr = val.replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  const getMeasurementValue = (name: string) => {
    const item = measurements.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    return item ? getNumericValue(item.value) : null;
  };

  // Prepare data for visualizer
  const normMeasurements = {
    neck: getMeasurementValue('pescoço'),
    shoulders: getMeasurementValue('ombro'),
    chest: getMeasurementValue('peito') || getMeasurementValue('tórax'),
    arm: getMeasurementValue('braço') || getMeasurementValue('bíceps'),
    waist: getMeasurementValue('cintura'),
    hips: getMeasurementValue('quadril'),
    thigh: getMeasurementValue('coxa'),
    calves: getMeasurementValue('panturrilha'),
    weight: getMeasurementValue('peso'),
    height: getMeasurementValue('altura'),
  };

  // Body Fat Calculation (Navy Method)
  const calculateBodyFat = () => {
    const waist = normMeasurements.waist;
    const neck = normMeasurements.neck || 35; // default fallback
    let height = normMeasurements.height;
    const hip = normMeasurements.hips;

    if (!waist || !height || !neck) return null;

    // Normalize height (if < 3, assume meters and convert to cm)
    if (height < 3) height *= 100;

    try {
      if (gender === 'male') {
        const val = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
        return isNaN(val) || !isFinite(val) || val < 0 ? null : val;
      } else {
        if (!hip) return null;
        const val = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
        return isNaN(val) || !isFinite(val) || val < 0 ? null : val;
      }
    } catch (e) {
      return null;
    }
  };

  const bodyFat = calculateBodyFat();
  const visualizerData = {
    ...normMeasurements,
    bodyFat: bodyFat
  };

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Workouts
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('fitness_workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (workoutsError) throw workoutsError;

      // 2. Check if seeding needed (based on workouts)
      // Seeding removed


      // 3. Fetch Exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('fitness_exercises')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (exercisesError) throw exercisesError;

      // Map Workouts and Exercises
      const mappedWorkouts: WorkoutDay[] = workoutsData.map((w: any) => ({
        id: w.id,
        day: w.day,
        focus: w.focus,
        image: w.image,
        exercises: (exercisesData || [])
          .filter((e: any) => e.workout_id === w.id)
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            reps: e.reps,
            done: e.done,
            workoutId: w.id
          }))
      }));
      setWorkouts(mappedWorkouts);

      // 4. Fetch Measurements
      const { data: measData, error: measError } = await supabase
        .from('fitness_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (measError) throw measError;

      if (measData) {
        setMeasurements(measData.map((m: any) => ({
          id: m.id,
          name: m.name,
          value: m.value,
          date: m.date
        })));
      }

      // 5. Fetch Diet
      const { data: dietData, error: dietError } = await supabase
        .from('fitness_diet')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (dietError) throw dietError;

      if (dietData) {
        setDiet(dietData.map((d: any) => ({
          id: d.id,
          meal: d.meal,
          description: d.description,
          calories: d.calories
        })));
      }

      // 6. Fetch Care (Health & Beauty)
      const { data: careData, error: careError } = await supabase
        .from('fitness_care')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (careError) throw careError;

      if (careData) {
        const mappedCare: CareItem[] = careData.map((c: any) => ({
          id: c.id,
          name: c.name,
          frequency: c.frequency,
          lastDone: c.last_done,
          category: c.category
        }));

        setHealthItems(mappedCare.filter(c => c.category === 'saude'));
        setBeautyItems(mappedCare.filter(c => c.category === 'beleza'));
      }

      // 7. Fetch Gender
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('gender')
        .eq('user_id', user.id)
        .single();
        
      if (settingsData?.gender) {
        setGender(settingsData.gender as 'male' | 'female');
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



  const toggleExercise = async (workoutId: string, exerciseId: string) => {
    // Optimistic update
    const workout = workouts.find(w => w.id === workoutId);
    const exercise = workout?.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const newDone = !exercise.done;

    setWorkouts(prev => prev.map((w) => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, done: newDone } : ex
          )
        };
      }
      return w;
    }));

    try {
      const { error } = await supabase
        .from('fitness_exercises')
        .update({ done: newDone })
        .eq('id', exerciseId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Erro ao atualizar exercício:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message
      });
    }
  };

  // Exercise CRUD
  const openExerciseModal = (workoutId: string, exercise?: Exercise) => {
    setEditingWorkoutId(workoutId);
    if (exercise) {
      setEditingExercise({ workoutId, exercise });
      setFormExName(exercise.name);
      setFormExReps(exercise.reps);
    } else {
      setEditingExercise(null);
      setFormExName("");
      setFormExReps("");
    }
    setExerciseModal(true);
  };

  const saveExercise = async () => {
    if (!formExName.trim() || !editingWorkoutId) return;

    try {
      if (editingExercise) {
        // Update
        const { error } = await supabase
          .from('fitness_exercises')
          .update({ name: formExName, reps: formExReps })
          .eq('id', editingExercise.exercise.id);

        if (error) throw error;

        setWorkouts(prev => prev.map(w => {
          if (w.id === editingWorkoutId) {
            return {
              ...w,
              exercises: w.exercises.map(ex =>
                ex.id === editingExercise.exercise.id
                  ? { ...ex, name: formExName, reps: formExReps }
                  : ex
              )
            };
          }
          return w;
        }));
      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('fitness_exercises')
          .insert({
            user_id: user.id,
            workout_id: editingWorkoutId,
            name: formExName,
            reps: formExReps,
            done: false
          })
          .select()
          .single();

        if (error) throw error;

        setWorkouts(prev => prev.map(w => {
          if (w.id === editingWorkoutId) {
            return {
              ...w,
              exercises: [...w.exercises, {
                id: data.id,
                name: data.name,
                reps: data.reps,
                done: data.done,
                workoutId: editingWorkoutId
              }]
            };
          }
          return w;
        }));
      }
      setExerciseModal(false);
      toast({ title: "Exercício salvo com sucesso" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar exercício",
        description: error.message
      });
    }
  };

  const deleteExercise = async () => {
    if (!editingExercise) return;

    try {
      const { error } = await supabase
        .from('fitness_exercises')
        .delete()
        .eq('id', editingExercise.exercise.id);

      if (error) throw error;

      setWorkouts(prev => prev.map(w => {
        if (w.id === editingExercise.workoutId) {
          return {
            ...w,
            exercises: w.exercises.filter(ex => ex.id !== editingExercise.exercise.id)
          };
        }
        return w;
      }));
      setExerciseModal(false);
      toast({ title: "Exercício removido" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover exercício",
        description: error.message
      });
    }
  };

  // Workout Day CRUD
  const openWorkoutModal = (workout?: WorkoutDay) => {
    if (workout) {
      setEditingWorkout(workout);
      setFormWorkoutDay(workout.day);
      setFormWorkoutFocus(workout.focus);
      setFormWorkoutImage(workout.image || "");
    } else {
      setEditingWorkout(null);
      setFormWorkoutDay("");
      setFormWorkoutFocus("");
      setFormWorkoutImage("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=200&fit=crop");
    }
    setWorkoutModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
          toast({ variant: "destructive", title: "Imagem muito grande", description: "Use imagens menores que 500KB." });
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormWorkoutImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveWorkoutDay = async () => {
    if (!formWorkoutDay.trim()) return;

    try {
      if (editingWorkout) {
        // Update
        const { error } = await supabase
          .from('fitness_workouts')
          .update({ day: formWorkoutDay, focus: formWorkoutFocus, image: formWorkoutImage })
          .eq('id', editingWorkout.id);

        if (error) throw error;

        setWorkouts(prev => prev.map(w =>
          w.id === editingWorkout.id
            ? { ...w, day: formWorkoutDay, focus: formWorkoutFocus, image: formWorkoutImage }
            : w
        ));
      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('fitness_workouts')
          .insert({
            user_id: user.id,
            day: formWorkoutDay,
            focus: formWorkoutFocus,
            image: formWorkoutImage || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=200&fit=crop"
          })
          .select()
          .single();

        if (error) throw error;

        setWorkouts(prev => [...prev, {
          id: data.id,
          day: data.day,
          focus: data.focus,
          image: data.image,
          exercises: []
        }]);
      }
      setWorkoutModal(false);
      toast({ title: "Dia de treino salvo" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar treino",
        description: error.message
      });
    }
  };

  const deleteWorkoutDay = async () => {
    if (!editingWorkout) return;

    try {
      const { error } = await supabase
        .from('fitness_workouts')
        .delete()
        .eq('id', editingWorkout.id);

      if (error) throw error;

      setWorkouts(prev => prev.filter(w => w.id !== editingWorkout.id));
      setWorkoutModal(false);
      toast({ title: "Dia de treino removido" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover treino",
        description: error.message
      });
    }
  };

  // Measurement CRUD
  const openMeasurementModal = (meas?: Measurement) => {
    if (meas) {
      setEditingMeasurement(meas);
      setFormMeasName(meas.name);
      setFormMeasValue(meas.value);
      setFormMeasDate(meas.date);
    } else {
      setEditingMeasurement(null);
      setFormMeasName("");
      setFormMeasValue("");
      setFormMeasDate("");
    }
    setMeasurementModal(true);
  };

  const saveMeasurement = async () => {
    if (!formMeasName.trim()) return;

    try {
      if (editingMeasurement) {
        // Update
        const { error } = await supabase
          .from('fitness_measurements')
          .update({ name: formMeasName, value: formMeasValue, date: formMeasDate })
          .eq('id', editingMeasurement.id);

        if (error) throw error;

        setMeasurements(prev => prev.map(m =>
          m.id === editingMeasurement.id
            ? { ...m, name: formMeasName, value: formMeasValue, date: formMeasDate }
            : m
        ));
      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('fitness_measurements')
          .insert({
            user_id: user.id,
            name: formMeasName,
            value: formMeasValue,
            date: formMeasDate
          })
          .select()
          .single();

        if (error) throw error;

        setMeasurements(prev => [...prev, {
          id: data.id,
          name: data.name,
          value: data.value,
          date: data.date
        }]);
      }
      setMeasurementModal(false);
      toast({ title: "Medida salva" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar medida",
        description: error.message
      });
    }
  };

  const deleteMeasurement = async () => {
    if (!editingMeasurement) return;

    try {
      const { error } = await supabase
        .from('fitness_measurements')
        .delete()
        .eq('id', editingMeasurement.id);

      if (error) throw error;

      setMeasurements(prev => prev.filter(m => m.id !== editingMeasurement.id));
      setMeasurementModal(false);
      toast({ title: "Medida removida" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover medida",
        description: error.message
      });
    }
  };

  // Diet CRUD
  const openDietModal = (item?: DietItem) => {
    if (item) {
      setEditingDiet(item);
      const parts = item.meal.split(':::');
      if (parts.length > 1) {
          setFormDietDay(parts[0]);
          setFormDietMeal(parts[1]);
      } else {
          setFormDietDay("DIÁRIO");
          setFormDietMeal(item.meal);
      }
      setFormDietDesc(item.description);
      setFormDietCal(item.calories);
    } else {
      setEditingDiet(null);
      setFormDietMeal("");
      setFormDietDesc("");
      setFormDietCal("");
      setFormDietDay("SEGUNDA");
    }
    setDietModal(true);
  };

  const saveDiet = async () => {
    if (!formDietMeal.trim()) return;
    
    const fullMealName = `${formDietDay}:::${formDietMeal}`;

    try {
      if (editingDiet) {
        // Update
        const { error } = await supabase
          .from('fitness_diet')
          .update({ meal: fullMealName, description: formDietDesc, calories: formDietCal })
          .eq('id', editingDiet.id);

        if (error) throw error;

        setDiet(prev => prev.map(d =>
          d.id === editingDiet.id
            ? { ...d, meal: fullMealName, description: formDietDesc, calories: formDietCal }
            : d
        ));
      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('fitness_diet')
          .insert({
            user_id: user.id,
            meal: fullMealName,
            description: formDietDesc,
            calories: formDietCal
          })
          .select()
          .single();

        if (error) throw error;

        setDiet(prev => [...prev, {
          id: data.id,
          meal: data.meal,
          description: data.description,
          calories: data.calories
        }]);
      }
      setDietModal(false);
      toast({ title: "Refeição salva" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar refeição",
        description: error.message
      });
    }
  };

  const deleteDiet = async () => {
    if (!editingDiet) return;

    try {
      const { error } = await supabase
        .from('fitness_diet')
        .delete()
        .eq('id', editingDiet.id);

      if (error) throw error;

      setDiet(prev => prev.filter(d => d.id !== editingDiet.id));
      setDietModal(false);
      toast({ title: "Refeição removida" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover refeição",
        description: error.message
      });
    }
  };

  // Care CRUD (Health & Beauty)
  const openCareModal = (type: "saude" | "beleza", item?: CareItem) => {
    setCareType(type);
    if (item) {
      setEditingCare(item);
      setFormCareName(item.name);
      setFormCareFreq(item.frequency);
      setFormCareLast(item.lastDone);
    } else {
      setEditingCare(null);
      setFormCareName("");
      setFormCareFreq("");
      setFormCareLast("");
    }
    setCareModal(true);
  };

  const saveCare = async () => {
    if (!formCareName.trim()) return;
    
    try {
      if (editingCare) {
        // Update
        const { error } = await supabase
          .from('fitness_care')
          .update({ name: formCareName, frequency: formCareFreq, last_done: formCareLast })
          .eq('id', editingCare.id);

        if (error) throw error;

        const updateList = (list: CareItem[]) => list.map(c =>
          c.id === editingCare.id
            ? { ...c, name: formCareName, frequency: formCareFreq, lastDone: formCareLast }
            : c
        );

        if (careType === "saude") setHealthItems(updateList(healthItems));
        else setBeautyItems(updateList(beautyItems));

      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('fitness_care')
          .insert({
            user_id: user.id,
            name: formCareName,
            frequency: formCareFreq,
            last_done: formCareLast,
            category: careType
          })
          .select()
          .single();

        if (error) throw error;

        const newItem = {
          id: data.id,
          name: data.name,
          frequency: data.frequency,
          lastDone: data.last_done,
          category: data.category
        };

        if (careType === "saude") setHealthItems(prev => [...prev, newItem]);
        else setBeautyItems(prev => [...prev, newItem]);
      }
      setCareModal(false);
      toast({ title: "Item salvo" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar item",
        description: error.message
      });
    }
  };

  const deleteCare = async () => {
    if (!editingCare) return;

    try {
      const { error } = await supabase
        .from('fitness_care')
        .delete()
        .eq('id', editingCare.id);

      if (error) throw error;

      const filterList = (list: CareItem[]) => list.filter(c => c.id !== editingCare.id);
      
      if (careType === "saude") setHealthItems(filterList(healthItems));
      else setBeautyItems(filterList(beautyItems));

      setCareModal(false);
      toast({ title: "Item removido" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message
      });
    }
  };



  const tabs: { key: TabType; label: string }[] = [
    { key: "medidas", label: "MEDIDAS" },
    { key: "treinos", label: "PLANILHA DE TREINOS" },
    { key: "dieta", label: "DIETA" },
    { key: "saude", label: "SAÚDE" },
    { key: "beleza", label: "BELEZA" },
  ];

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
      <div className="mb-6 animate-slide-up flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Treinos ✅</h1>
        {activeTab === "treinos" && (
          <Button onClick={() => openWorkoutModal()} size="sm">
            <Plus size={14} className="mr-1" /> Novo Dia
          </Button>
        )}
        {activeTab === "medidas" && (
          <Button onClick={() => openMeasurementModal()} size="sm">
            <Plus size={14} className="mr-1" /> Nova Medida
          </Button>
        )}
        {activeTab === "dieta" && (
          <Button onClick={() => openDietModal()} size="sm">
            <Plus size={14} className="mr-1" /> Nova Refeição
          </Button>
        )}
        {activeTab === "saude" && (
          <Button onClick={() => openCareModal("saude")} size="sm">
            <Plus size={14} className="mr-1" /> Novo Item
          </Button>
        )}
        {activeTab === "beleza" && (
          <Button onClick={() => openCareModal("beleza")} size="sm">
            <Plus size={14} className="mr-1" /> Novo Item
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all",
              activeTab === tab.key
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "treinos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workouts.map((workout) => (
            <div key={workout.id} className="notion-card overflow-hidden group">
              {/* Workout Image */}
              <div className="relative">
                <img
                  src={workout.image}
                  alt={workout.focus}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-3 left-3 text-primary-foreground">
                  <h3 className="font-bold text-lg">{workout.day}</h3>
                </div>
                <button
                  onClick={() => openWorkoutModal(workout)}
                  className="absolute top-3 right-3 p-1 bg-background/80 rounded opacity-100 transition-opacity hover:bg-background"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Focus Area */}
              <div className="p-3 bg-notion-yellow border-b border-border">
                <span className="text-sm font-medium">{workout.focus}</span>
              </div>

              {/* Exercise Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-notion-yellow-bg">
                      <th className="p-2 text-left text-xs font-semibold border-b border-border">
                        <Check size={12} className="inline mr-1" />
                        Exercício
                      </th>
                      <th className="p-2 text-left text-xs font-semibold border-b border-border">
                        T. Repetição e Carga
                      </th>
                      <th className="p-2 text-center text-xs font-semibold border-b border-border">
                        <Dumbbell size={12} className="inline" /> Done
                      </th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {workout.exercises.map((exercise) => (
                      <tr key={exercise.id} className="hover:bg-muted/30 group/row">
                        <td className="p-2 text-sm border-b border-border/50">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            exercise.done ? "bg-success/20 text-success" : "bg-notion-yellow-bg"
                          )}>
                            {exercise.name}
                          </span>
                        </td>
                        <td className="p-2 text-xs border-b border-border/50">{exercise.reps}</td>
                        <td className="p-2 text-center border-b border-border/50">
                          <button
                            onClick={() => toggleExercise(workout.id, exercise.id)}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all",
                              exercise.done
                                ? "bg-success border-success text-success-foreground"
                                : "border-muted-foreground/30 hover:border-success"
                            )}
                          >
                            {exercise.done && <Check size={12} />}
                          </button>
                        </td>
                        <td className="p-2 border-b border-border/50">
                          <button
                            onClick={() => openExerciseModal(workout.id, exercise)}
                            className="p-1 hover:bg-muted rounded transition-all text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="p-2">
                        <button
                          onClick={() => openExerciseModal(workout.id)}
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
            </div>
          ))}
        </div>
      )}

      {activeTab === "medidas" && (
        <div className="space-y-6">
          <div className="notion-card p-6 bg-gradient-to-br from-background to-muted/20">
            <BodyVisualizer gender={gender} measurements={visualizerData} />
          </div>
          <div className="notion-card">
          <div className="notion-card-header notion-header-blue">📏 MEDIDAS CORPORAIS</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-notion-blue-bg">
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Medida</th>
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Valor</th>
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Data</th>
                  <th className="p-3 w-10 border-b border-border"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 group">
                    <td className="p-3 text-sm border-b border-border/50">{item.name}</td>
                    <td className="p-3 text-sm border-b border-border/50">{item.value}</td>
                    <td className="p-3 text-sm border-b border-border/50">{item.date}</td>
                    <td className="p-3 border-b border-border/50">
                      <button
                        onClick={() => openMeasurementModal(item)}
                        className="p-1 hover:bg-muted rounded transition-all text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {activeTab === "dieta" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DIET_DAYS.map(day => {
                const filteredItems = diet.filter(d => {
                     const parts = d.meal.split(':::');
                     const itemDay = parts.length > 1 ? parts[0] : "DIÁRIO";
                     return itemDay === day;
                });
                
                if (filteredItems.length === 0) return null;

                return (
                  <div key={day} className="notion-card h-fit">
                     <div className="notion-card-header notion-header-green flex items-center justify-between">
                        <span>{day}</span>
                        <button 
                            onClick={() => {
                                setEditingDiet(null);
                                setFormDietMeal("");
                                setFormDietDesc("");
                                setFormDietCal("");
                                setFormDietDay(day);
                                setDietModal(true);
                            }}
                            className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                            title="Adicionar nova refeição"
                        >
                           <Plus size={16} />
                        </button>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead>
                              <tr className="bg-notion-green-bg">
                                 <th className="p-3 text-left text-xs font-semibold border-b border-border">Refeição</th>
                                 <th className="p-3 text-left text-xs font-semibold border-b border-border">Descrição</th>
                                 <th className="p-3 text-left text-xs font-semibold border-b border-border">Calorias</th>
                                 <th className="p-3 w-10 border-b border-border"></th>
                              </tr>
                           </thead>
                           <tbody>
                              {filteredItems.map(item => {
                                  const realName = item.meal.split(':::')[1] || item.meal;
                                  return (
                                     <tr 
                                        key={item.id} 
                                        className="hover:bg-muted/30 group cursor-pointer"
                                        onClick={() => openDietModal(item)}
                                     >
                                        <td className="p-3 text-sm border-b border-border/50">{realName}</td>
                                        <td className="p-3 text-sm border-b border-border/50">{item.description}</td>
                                        <td className="p-3 text-sm border-b border-border/50">{item.calories}</td>
                                        <td className="p-3 border-b border-border/50">
                                           <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  openDietModal(item);
                                              }}
                                              className="p-1 hover:bg-muted rounded transition-all text-muted-foreground hover:text-foreground"
                                           >
                                              <Pencil size={14} />
                                           </button>
                                        </td>
                                     </tr>
                                  );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
                );
            })}
             {diet.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed rounded-xl">
                    <p>Nenhuma dieta cadastrada.</p>
                    <Button variant="link" onClick={() => setDietModal(true)}>Adicionar Refeição</Button>
                </div>
             )}
        </div>
      )}

      {activeTab === "saude" && (
        <div className="notion-card">
          <div className="notion-card-header notion-header-pink">🏥 SAÚDE</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-notion-pink-bg">
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Item</th>
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Frequência</th>
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Última vez</th>
                  <th className="p-3 w-10 border-b border-border"></th>
                </tr>
              </thead>
              <tbody>
                {healthItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 group">
                    <td className="p-3 text-sm border-b border-border/50">{item.name}</td>
                    <td className="p-3 text-sm border-b border-border/50">{item.frequency}</td>
                    <td className="p-3 text-sm border-b border-border/50">{item.lastDone}</td>
                    <td className="p-3 border-b border-border/50">
                      <button
                        onClick={() => openCareModal("saude", item)}
                        className="p-1 hover:bg-muted rounded transition-all text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "beleza" && (
        <div className="notion-card">
          <div className="notion-card-header notion-header-purple">💅 BELEZA</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-notion-purple-bg">
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Item</th>
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Frequência</th>
                  <th className="p-3 text-left text-xs font-semibold border-b border-border">Última vez</th>
                  <th className="p-3 w-10 border-b border-border"></th>
                </tr>
              </thead>
              <tbody>
                {beautyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 group">
                    <td className="p-3 text-sm border-b border-border/50">{item.name}</td>
                    <td className="p-3 text-sm border-b border-border/50">{item.frequency}</td>
                    <td className="p-3 text-sm border-b border-border/50">{item.lastDone}</td>
                    <td className="p-3 border-b border-border/50">
                      <button
                        onClick={() => openCareModal("beleza", item)}
                        className="p-1 hover:bg-muted rounded transition-all text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CrudModal
        open={exerciseModal}
        onOpenChange={setExerciseModal}
        title={editingExercise ? "Editar Exercício" : "Novo Exercício"}
        onSave={saveExercise}
        onDelete={deleteExercise}
        isEditing={!!editingExercise}
      >
        <FormField label="Nome" value={formExName} onChange={setFormExName} placeholder="Nome do exercício" />
        <FormField label="Séries · Reps · Carga" value={formExReps} onChange={setFormExReps} placeholder="Ex: 4 · 12 · 20kg" />
      </CrudModal>

      <CrudModal
        open={workoutModal}
        onOpenChange={setWorkoutModal}
        title={editingWorkout ? "Editar Dia de Treino" : "Novo Dia de Treino"}
        onSave={saveWorkoutDay}
        onDelete={deleteWorkoutDay}
        isEditing={!!editingWorkout}
      >
        <div className="flex flex-col gap-3 mb-4">
             <label className="text-sm font-medium">Imagem de Capa</label>
             <div className="flex items-center gap-2">
                 <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
                    {formWorkoutImage ? (
                        <img 
                          src={formWorkoutImage} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=200&fit=crop";
                          }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full"><ImageIcon size={20} className="text-muted-foreground"/></div>
                    )}
                 </div>
                 <div className="flex-1 flex flex-col gap-2">
                     <FormField label="" value={formWorkoutImage} onChange={setFormWorkoutImage} placeholder="Cole a URL da imagem..." />
                     <div className="relative">
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => document.getElementById('image-upload')?.click()}>
                            <Upload size={14} className="mr-2"/> Carregar do Dispositivo
                        </Button>
                        <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                     </div>
                 </div>
             </div>
        </div>
        <FormField label="Dia" value={formWorkoutDay} onChange={setFormWorkoutDay} placeholder="Ex: SEGUNDA" />
        <FormField label="Foco Muscular" value={formWorkoutFocus} onChange={setFormWorkoutFocus} placeholder="Ex: Pernas" />
      </CrudModal>

      <CrudModal
        open={measurementModal}
        onOpenChange={setMeasurementModal}
        title={editingMeasurement ? "Editar Medida" : "Nova Medida"}
        onSave={saveMeasurement}
        onDelete={deleteMeasurement}
        isEditing={!!editingMeasurement}
      >
        <FormField label="Nome" value={formMeasName} onChange={setFormMeasName} placeholder="Ex: Peso" />
        <FormField label="Valor" value={formMeasValue} onChange={setFormMeasValue} placeholder="Ex: 70 kg" />
        <FormField label="Data" value={formMeasDate} onChange={setFormMeasDate} placeholder="DD/MM/AAAA" />
      </CrudModal>

      <CrudModal
        open={dietModal}
        onOpenChange={setDietModal}
        title={editingDiet ? "Editar Refeição" : "Nova Refeição"}
        onSave={saveDiet}
        onDelete={deleteDiet}
        isEditing={!!editingDiet}
      >
        <div className="flex flex-col gap-2 mb-4">
            <label className="text-sm font-medium">Dia da Semana</label>
            <div className="flex gap-2 flex-wrap">
                {DIET_DAYS.map(day => (
                    <button
                        key={day}
                        type="button"
                        onClick={() => setFormDietDay(day)}
                        className={cn(
                            "px-3 py-1 text-xs rounded-full border transition-all",
                            formDietDay === day
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                        )}
                    >
                        {day}
                    </button>
                ))}
            </div>
        </div>
        <FormField label="Refeição" value={formDietMeal} onChange={setFormDietMeal} placeholder="Ex: Almoço" />
        <FormField label="Descrição" value={formDietDesc} onChange={setFormDietDesc} placeholder="O que comer..." />
        <FormField label="Calorias" value={formDietCal} onChange={setFormDietCal} placeholder="Ex: 500 kcal" />
      </CrudModal>

      <CrudModal
        open={careModal}
        onOpenChange={setCareModal}
        title={editingCare ? "Editar Item" : "Novo Item"}
        onSave={saveCare}
        onDelete={deleteCare}
        isEditing={!!editingCare}
      >
        <FormField label="Nome" value={formCareName} onChange={setFormCareName} placeholder="Nome do item" />
        <FormField label="Frequência" value={formCareFreq} onChange={setFormCareFreq} placeholder="Ex: Mensal" />
        <FormField label="Última vez" value={formCareLast} onChange={setFormCareLast} placeholder="Data ou período" />
      </CrudModal>
    </MainLayout>
  );
};

export default Treinos;
