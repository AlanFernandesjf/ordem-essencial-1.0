import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Heart, Plus, Calendar, MapPin, Clock, Pill, Sparkles, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatDateDisplay } from "@/utils/dateUtils";

interface Appointment {
  id: string;
  specialty: string;
  doctor: string;
  date: string;
  time: string;
  location: string;
  status: "scheduled" | "completed" | "canceled";
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  stock: number;
}

interface CareItem {
  id: string;
  name: string;
  frequency: string;
  last_done: string;
  next_due: string;
}

const Saude = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [careItems, setCareItems] = useState<CareItem[]>([]);

  // Modal states
  const [appointmentModal, setAppointmentModal] = useState(false);
  const [medicationModal, setMedicationModal] = useState(false);
  const [careModal, setCareModal] = useState(false);

  // Edit states
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [editingCare, setEditingCare] = useState<CareItem | null>(null);

  // Form states
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formDoctor, setFormDoctor] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formStatus, setFormStatus] = useState<"scheduled" | "completed" | "canceled">("scheduled");

  const [formMedName, setFormMedName] = useState("");
  const [formMedDosage, setFormMedDosage] = useState("");
  const [formMedFrequency, setFormMedFrequency] = useState("");
  const [formMedTime, setFormMedTime] = useState("");
  const [formMedStock, setFormMedStock] = useState("");

  const [formCareName, setFormCareName] = useState("");
  const [formCareFrequency, setFormCareFrequency] = useState("");
  const [formCareLastDone, setFormCareLastDone] = useState("");
  const [formCareNextDue, setFormCareNextDue] = useState("");

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('health_appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
      
      if (appointmentsError) throw appointmentsError;
      if (appointmentsData) setAppointments(appointmentsData as Appointment[]);

      // 2. Fetch Medications
      const { data: medicationsData, error: medicationsError } = await supabase
        .from('health_medications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (medicationsError) throw medicationsError;
      if (medicationsData) setMedications(medicationsData as Medication[]);

      // 3. Fetch Care Items
      const { data: careData, error: careError } = await supabase
        .from('health_care')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (careError) throw careError;
      if (careData) setCareItems(careData as CareItem[]);

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

  // Appointment CRUD
  const openAppointmentModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormSpecialty(appointment.specialty);
      setFormDoctor(appointment.doctor);
      setFormDate(appointment.date);
      setFormTime(appointment.time);
      setFormLocation(appointment.location);
      setFormStatus(appointment.status);
    } else {
      setEditingAppointment(null);
      setFormSpecialty("");
      setFormDoctor("");
      setFormDate("");
      setFormTime("");
      setFormLocation("");
      setFormStatus("scheduled");
    }
    setAppointmentModal(true);
  };

  const saveAppointment = async () => {
    if (!formSpecialty.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const appointmentData = {
        user_id: user.id,
        specialty: formSpecialty,
        doctor: formDoctor,
        date: formDate,
        time: formTime,
        location: formLocation,
        status: formStatus
      };

      if (editingAppointment) {
        const { error } = await supabase
          .from('health_appointments')
          .update(appointmentData)
          .eq('id', editingAppointment.id);

        if (error) throw error;

        setAppointments(prev => prev.map(a =>
          a.id === editingAppointment.id
            ? { ...a, ...appointmentData, id: editingAppointment.id }
            : a
        ));
      } else {
        const { data, error } = await supabase
          .from('health_appointments')
          .insert([appointmentData])
          .select()
          .single();

        if (error) throw error;
        if (data) setAppointments(prev => [...prev, data as Appointment]);
      }
      
      setAppointmentModal(false);
      toast({
        title: "Sucesso",
        description: "Consulta salva com sucesso."
      });
    } catch (error: any) {
      console.error("Erro ao salvar consulta:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    }
  };

  const deleteAppointment = async () => {
    if (editingAppointment) {
      try {
        const { error } = await supabase
          .from('health_appointments')
          .delete()
          .eq('id', editingAppointment.id);

        if (error) throw error;

        setAppointments(prev => prev.filter(a => a.id !== editingAppointment.id));
        setAppointmentModal(false);
        toast({
          title: "Sucesso",
          description: "Consulta removida com sucesso."
        });
      } catch (error: any) {
        console.error("Erro ao remover consulta:", error);
        toast({
          variant: "destructive",
          title: "Erro ao remover",
          description: error.message
        });
      }
    }
  };

  // Medication CRUD
  const openMedicationModal = (med?: Medication) => {
    if (med) {
      setEditingMedication(med);
      setFormMedName(med.name);
      setFormMedDosage(med.dosage);
      setFormMedFrequency(med.frequency);
      setFormMedTime(med.time);
      setFormMedStock(med.stock.toString());
    } else {
      setEditingMedication(null);
      setFormMedName("");
      setFormMedDosage("");
      setFormMedFrequency("");
      setFormMedTime("");
      setFormMedStock("");
    }
    setMedicationModal(true);
  };

  const saveMedication = async () => {
    if (!formMedName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const medData = {
        user_id: user.id,
        name: formMedName,
        dosage: formMedDosage,
        frequency: formMedFrequency,
        time: formMedTime,
        stock: parseInt(formMedStock) || 0
      };

      if (editingMedication) {
        const { error } = await supabase
          .from('health_medications')
          .update(medData)
          .eq('id', editingMedication.id);

        if (error) throw error;

        setMedications(prev => prev.map(m =>
          m.id === editingMedication.id
            ? { ...m, ...medData, id: editingMedication.id }
            : m
        ));
      } else {
        const { data, error } = await supabase
          .from('health_medications')
          .insert([medData])
          .select()
          .single();

        if (error) throw error;
        if (data) setMedications(prev => [...prev, data as Medication]);
      }

      setMedicationModal(false);
      toast({
        title: "Sucesso",
        description: "Medicamento salvo com sucesso."
      });
    } catch (error: any) {
      console.error("Erro ao salvar medicamento:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    }
  };

  const deleteMedication = async () => {
    if (editingMedication) {
      try {
        const { error } = await supabase
          .from('health_medications')
          .delete()
          .eq('id', editingMedication.id);

        if (error) throw error;

        setMedications(prev => prev.filter(m => m.id !== editingMedication.id));
        setMedicationModal(false);
        toast({
          title: "Sucesso",
          description: "Medicamento removido com sucesso."
        });
      } catch (error: any) {
        console.error("Erro ao remover medicamento:", error);
        toast({
          variant: "destructive",
          title: "Erro ao remover",
          description: error.message
        });
      }
    }
  };

  // Care CRUD
  const openCareModal = (care?: CareItem) => {
    if (care) {
      setEditingCare(care);
      setFormCareName(care.name);
      setFormCareFrequency(care.frequency);
      setFormCareLastDone(care.last_done);
      setFormCareNextDue(care.next_due);
    } else {
      setEditingCare(null);
      setFormCareName("");
      setFormCareFrequency("");
      setFormCareLastDone("");
      setFormCareNextDue("");
    }
    setCareModal(true);
  };

  const saveCare = async () => {
    if (!formCareName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const careData = {
        user_id: user.id,
        name: formCareName,
        frequency: formCareFrequency,
        last_done: formCareLastDone,
        next_due: formCareNextDue
      };

      if (editingCare) {
        const { error } = await supabase
          .from('health_care')
          .update(careData)
          .eq('id', editingCare.id);

        if (error) throw error;

        setCareItems(prev => prev.map(c =>
          c.id === editingCare.id
            ? { ...c, ...careData, id: editingCare.id }
            : c
        ));
      } else {
        const { data, error } = await supabase
          .from('health_care')
          .insert([careData])
          .select()
          .single();

        if (error) throw error;
        if (data) setCareItems(prev => [...prev, data as CareItem]);
      }

      setCareModal(false);
      toast({
        title: "Sucesso",
        description: "Cuidado pessoal salvo com sucesso."
      });
    } catch (error: any) {
      console.error("Erro ao salvar cuidado:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    }
  };

  const deleteCare = async () => {
    if (editingCare) {
      try {
        const { error } = await supabase
          .from('health_care')
          .delete()
          .eq('id', editingCare.id);

        if (error) throw error;

        setCareItems(prev => prev.filter(c => c.id !== editingCare.id));
        setCareModal(false);
        toast({
          title: "Sucesso",
          description: "Cuidado pessoal removido com sucesso."
        });
      } catch (error: any) {
        console.error("Erro ao remover cuidado:", error);
        toast({
          variant: "destructive",
          title: "Erro ao remover",
          description: error.message
        });
      }
    }
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Saúde & Cuidados
            </h1>
            <p className="text-muted-foreground">
              Gerencie consultas, medicamentos e cuidados pessoais
            </p>
          </div>
          <Button onClick={() => openAppointmentModal()} className="gap-2">
            <Plus size={16} />
            Nova Consulta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments */}
        <DashboardCard
          title="Consultas Médicas"
          icon={<Calendar size={18} />}
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`p-4 rounded-xl border cursor-pointer group ${
                  appointment.status === "completed"
                    ? "bg-success-light/50 border-success/20"
                    : "bg-card border-border hover:shadow-soft transition-shadow"
                }`}
                onClick={() => openAppointmentModal(appointment)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{appointment.specialty}</h4>
                    <p className="text-sm text-muted-foreground">{appointment.doctor}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        appointment.status === "completed"
                          ? "bg-success text-success-foreground"
                          : "bg-info text-info-foreground"
                      }`}
                    >
                      {appointment.status === "completed" ? "Realizada" : "Agendada"}
                    </span>
                    <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDateDisplay(appointment.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {appointment.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {appointment.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Medications */}
        <DashboardCard 
          title="Medicamentos & Vitaminas" 
          icon={<Pill size={18} />}
          action={
            <Button size="sm" variant="ghost" onClick={() => openMedicationModal()}>
              <Plus size={14} />
            </Button>
          }
        >
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl cursor-pointer group hover:bg-muted/50"
                onClick={() => openMedicationModal(med)}
              >
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{med.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {med.dosage} • {med.frequency} às {med.time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      med.stock > 10
                        ? "bg-success-light text-success"
                        : "bg-warning-light text-warning"
                    }`}
                  >
                    {med.stock} restantes
                  </span>
                  <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Beauty & Personal Care */}
        <DashboardCard 
          title="Cuidados Pessoais" 
          icon={<Sparkles size={18} />}
          action={
            <Button size="sm" variant="ghost" onClick={() => openCareModal()}>
              <Plus size={14} />
            </Button>
          }
        >
          <div className="space-y-3">
            {careItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl cursor-pointer group hover:bg-muted/50"
                onClick={() => openCareModal(item)}
              >
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{item.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {item.frequency} • Último: {item.last_done}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary">
                    Próximo: {item.next_due}
                  </span>
                  <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Appointment Modal */}
      <CrudModal
        open={appointmentModal}
        onOpenChange={setAppointmentModal}
        title={editingAppointment ? "Editar Consulta" : "Nova Consulta"}
        onSave={saveAppointment}
        onDelete={deleteAppointment}
        isEditing={!!editingAppointment}
      >
        <FormField label="Especialidade" value={formSpecialty} onChange={setFormSpecialty} placeholder="Dentista, Oftalmologista..." />
        <FormField label="Médico" value={formDoctor} onChange={setFormDoctor} placeholder="Dr. Nome" />
        <FormField label="Data" value={formDate} onChange={setFormDate} type="date" />
        <FormField label="Horário" value={formTime} onChange={setFormTime} placeholder="HH:MM" />
        <FormField label="Local" value={formLocation} onChange={setFormLocation} placeholder="Endereço da consulta" />
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right text-sm">Status</Label>
          <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Agendada</SelectItem>
              <SelectItem value="completed">Realizada</SelectItem>
              <SelectItem value="canceled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CrudModal>

      {/* Medication Modal */}
      <CrudModal
        open={medicationModal}
        onOpenChange={setMedicationModal}
        title={editingMedication ? "Editar Medicamento" : "Novo Medicamento"}
        onSave={saveMedication}
        onDelete={deleteMedication}
        isEditing={!!editingMedication}
      >
        <FormField label="Nome" value={formMedName} onChange={setFormMedName} placeholder="Nome do medicamento" />
        <FormField label="Dosagem" value={formMedDosage} onChange={setFormMedDosage} placeholder="1000 UI, 1g..." />
        <FormField label="Frequência" value={formMedFrequency} onChange={setFormMedFrequency} placeholder="Diário, Semanal..." />
        <FormField label="Horário" value={formMedTime} onChange={setFormMedTime} placeholder="08:00" />
        <FormField label="Estoque" value={formMedStock} onChange={setFormMedStock} type="number" placeholder="Quantidade" />
      </CrudModal>

      {/* Care Modal */}
      <CrudModal
        open={careModal}
        onOpenChange={setCareModal}
        title={editingCare ? "Editar Cuidado" : "Novo Cuidado"}
        onSave={saveCare}
        onDelete={deleteCare}
        isEditing={!!editingCare}
      >
        <FormField label="Nome" value={formCareName} onChange={setFormCareName} placeholder="Nome do cuidado" />
        <FormField label="Frequência" value={formCareFrequency} onChange={setFormCareFrequency} placeholder="Diário, Semanal..." />
        <FormField label="Último" value={formCareLastDone} onChange={setFormCareLastDone} placeholder="DD/MM" />
        <FormField label="Próximo" value={formCareNextDue} onChange={setFormCareNextDue} placeholder="DD/MM" />
      </CrudModal>
    </MainLayout>
  );
};

export default Saude;
