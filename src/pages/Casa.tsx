import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Plus, Pencil, Trash2 } from "lucide-react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  category_id?: string;
}

interface ShoppingCategory {
  id: string;
  name: string;
  color: string;
  colorBg: string; // mapped to color_bg in DB
  items: ShoppingItem[];
}

interface CleaningTask {
  id: string;
  task: string;
  frequency: string;
  lastDone: string; // mapped to last_done
  room: string;
}

interface ChoreItem {
  id: string;
  name: string;
  dueDate: string; // mapped to due_date
  time?: string;
  priority: "alta" | "media" | "baixa";
  done: boolean;
}

type TabType = "mercado" | "limpeza" | "afazeres";

const Casa = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("mercado");
  
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [chores, setChores] = useState<ChoreItem[]>([]);
  
  // Modal states
  const [itemModal, setItemModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [cleaningModal, setCleaningModal] = useState(false);
  const [choreModal, setChoreModal] = useState(false);
  
  // Edit states
  const [editingItem, setEditingItem] = useState<{categoryId: string, item: ShoppingItem} | null>(null);
  const [editingCategory, setEditingCategory] = useState<ShoppingCategory | null>(null);
  const [editingCleaning, setEditingCleaning] = useState<CleaningTask | null>(null);
  const [editingChore, setEditingChore] = useState<ChoreItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Form states
  const [formItemName, setFormItemName] = useState("");
  const [formCategoryName, setFormCategoryName] = useState("");
  const [formCategoryColor, setFormCategoryColor] = useState("hsl(140 50% 50%)");
  const [formCleanTask, setFormCleanTask] = useState("");
  const [formCleanFreq, setFormCleanFreq] = useState("");
  const [formCleanLast, setFormCleanLast] = useState("");
  const [formCleanRoom, setFormCleanRoom] = useState("");
  const [formChoreName, setFormChoreName] = useState("");
  const [formChoreDue, setFormChoreDue] = useState("");
  const [formChoreTime, setFormChoreTime] = useState("");
  const [formChorePriority, setFormChorePriority] = useState<"alta" | "media" | "baixa">("media");

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Categories
      const { data: catsData, error: catsError } = await supabase
        .from('home_shopping_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (catsError) throw catsError;

      // 2. Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('home_shopping_items')
        .select('*')
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      // Seed if empty
      // Seeding removed


      // Merge items into categories
      const mappedCategories: ShoppingCategory[] = (catsData || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        colorBg: cat.color_bg,
        items: (itemsData || [])
          .filter((item: any) => item.category_id === cat.id)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            checked: item.checked,
            category_id: item.category_id
          }))
      }));

      setCategories(mappedCategories);

      // 3. Fetch Cleaning Tasks
      const { data: cleanData, error: cleanError } = await supabase
        .from('home_cleaning_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (cleanError) throw cleanError;

      if (cleanData) {
        setCleaningTasks(cleanData.map((t: any) => ({
          id: t.id,
          task: t.task,
          frequency: t.frequency,
          lastDone: t.last_done,
          room: t.room
        })));
      }

      // 4. Fetch Chores
      const { data: choreData, error: choreError } = await supabase
        .from('home_chores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (choreError) throw choreError;

      setChores(choreData ? choreData.map((c: any) => ({
        id: c.id,
        name: c.name,
        dueDate: c.due_date,
        time: c.time,
        priority: c.priority,
        done: c.done
      })) : []);

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



  const toggleItem = async (categoryId: string, itemId: string) => {
    // Optimistic update
    const category = categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    if (!item) return;

    const newChecked = !item.checked;

    setCategories(prev => prev.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map(i =>
            i.id === itemId ? { ...i, checked: newChecked } : i
          )
        };
      }
      return cat;
    }));

    try {
      const { error } = await supabase
        .from('home_shopping_items')
        .update({ checked: newChecked })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
    }
  };

  const toggleChore = async (choreId: string) => {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;
    
    const newDone = !chore.done;

    setChores(prev => prev.map(c =>
      c.id === choreId ? { ...c, done: newDone } : c
    ));

    try {
      const { error } = await supabase
        .from('home_chores')
        .update({ done: newDone })
        .eq('id', choreId);

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao atualizar afazer:", error);
    }
  };

  // Item CRUD
  const openItemModal = (categoryId: string, item?: ShoppingItem) => {
    setSelectedCategoryId(categoryId);
    if (item) {
      setEditingItem({ categoryId, item });
      setFormItemName(item.name);
    } else {
      setEditingItem(null);
      setFormItemName("");
    }
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!formItemName.trim() || !selectedCategoryId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingItem) {
        const { error } = await supabase
          .from('home_shopping_items')
          .update({ name: formItemName })
          .eq('id', editingItem.item.id);
        
        if (error) throw error;

        setCategories(prev => prev.map(cat => {
          if (cat.id === editingItem.categoryId) {
            return {
              ...cat,
              items: cat.items.map(item => 
                item.id === editingItem.item.id ? { ...item, name: formItemName } : item
              )
            };
          }
          return cat;
        }));
      } else {
        const { data, error } = await supabase
          .from('home_shopping_items')
          .insert({
            user_id: user.id,
            category_id: selectedCategoryId,
            name: formItemName,
            checked: false
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCategories(prev => prev.map(cat => {
            if (cat.id === selectedCategoryId) {
              return {
                ...cat,
                items: [...cat.items, { id: data.id, name: data.name, checked: data.checked, category_id: data.category_id }]
              };
            }
            return cat;
          }));
        }
      }
      setItemModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar item",
        description: error.message
      });
    }
  };

  const deleteItem = async () => {
    if (!editingItem) return;
    try {
      const { error } = await supabase
        .from('home_shopping_items')
        .delete()
        .eq('id', editingItem.item.id);
      
      if (error) throw error;

      setCategories(prev => prev.map(cat => {
        if (cat.id === editingItem.categoryId) {
          return {
            ...cat,
            items: cat.items.filter(item => item.id !== editingItem.item.id)
          };
        }
        return cat;
      }));
      setItemModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir item",
        description: error.message
      });
    }
  };

  // Category CRUD
  const openCategoryModal = (category?: ShoppingCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormCategoryName(category.name);
      setFormCategoryColor(category.color);
    } else {
      setEditingCategory(null);
      setFormCategoryName("");
      setFormCategoryColor("hsl(140 50% 50%)");
    }
    setCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!formCategoryName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const colorBg = formCategoryColor.replace("50%)", "94%)").replace("55%)", "94%)").replace("60%)", "94%)");

      if (editingCategory) {
        const { error } = await supabase
          .from('home_shopping_categories')
          .update({ name: formCategoryName, color: formCategoryColor, color_bg: colorBg })
          .eq('id', editingCategory.id);

        if (error) throw error;

        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? { ...cat, name: formCategoryName, color: formCategoryColor, colorBg } : cat
        ));
      } else {
        const { data, error } = await supabase
          .from('home_shopping_categories')
          .insert({
            user_id: user.id,
            name: formCategoryName,
            color: formCategoryColor,
            color_bg: colorBg
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCategories(prev => [...prev, {
            id: data.id,
            name: data.name,
            color: data.color,
            colorBg: data.color_bg,
            items: []
          }]);
        }
      }
      setCategoryModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar categoria",
        description: error.message
      });
    }
  };

  const deleteCategory = async () => {
    if (!editingCategory) return;
    try {
      const { error } = await supabase
        .from('home_shopping_categories')
        .delete()
        .eq('id', editingCategory.id);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== editingCategory.id));
      setCategoryModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir categoria",
        description: error.message
      });
    }
  };

  // Cleaning Task CRUD
  const openCleaningModal = (task?: CleaningTask) => {
    if (task) {
      setEditingCleaning(task);
      setFormCleanTask(task.task);
      setFormCleanFreq(task.frequency);
      setFormCleanLast(task.lastDone);
      setFormCleanRoom(task.room);
    } else {
      setEditingCleaning(null);
      setFormCleanTask("");
      setFormCleanFreq("");
      setFormCleanLast("");
      setFormCleanRoom("");
    }
    setCleaningModal(true);
  };

  const saveCleaning = async () => {
    if (!formCleanTask.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingCleaning) {
        const { error } = await supabase
          .from('home_cleaning_tasks')
          .update({
            task: formCleanTask,
            frequency: formCleanFreq,
            last_done: formCleanLast,
            room: formCleanRoom
          })
          .eq('id', editingCleaning.id);
        
        if (error) throw error;

        setCleaningTasks(prev => prev.map(t =>
          t.id === editingCleaning.id
            ? { ...t, task: formCleanTask, frequency: formCleanFreq, lastDone: formCleanLast, room: formCleanRoom }
            : t
        ));
      } else {
        const { data, error } = await supabase
          .from('home_cleaning_tasks')
          .insert({
            user_id: user.id,
            task: formCleanTask,
            frequency: formCleanFreq,
            last_done: formCleanLast,
            room: formCleanRoom
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCleaningTasks(prev => [...prev, {
            id: data.id,
            task: data.task,
            frequency: data.frequency,
            lastDone: data.last_done,
            room: data.room
          }]);
        }
      }
      setCleaningModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar tarefa",
        description: error.message
      });
    }
  };

  const deleteCleaning = async () => {
    if (!editingCleaning) return;
    try {
      const { error } = await supabase
        .from('home_cleaning_tasks')
        .delete()
        .eq('id', editingCleaning.id);

      if (error) throw error;
      setCleaningTasks(prev => prev.filter(t => t.id !== editingCleaning.id));
      setCleaningModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir tarefa",
        description: error.message
      });
    }
  };

  // Chore CRUD
  const openChoreModal = (chore?: ChoreItem) => {
    if (chore) {
      setEditingChore(chore);
      setFormChoreName(chore.name);
      setFormChoreDue(chore.dueDate);
      setFormChoreTime(chore.time || "");
      setFormChorePriority(chore.priority);
    } else {
      setEditingChore(null);
      setFormChoreName("");
      setFormChoreDue("");
      setFormChoreTime("");
      setFormChorePriority("media");
    }
    setChoreModal(true);
  };

  const saveChore = async () => {
    if (!formChoreName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingChore) {
        const { error } = await supabase
          .from('home_chores')
          .update({
            name: formChoreName,
            due_date: formChoreDue,
            time: formChoreTime,
            priority: formChorePriority
          })
          .eq('id', editingChore.id);

        if (error) throw error;

        setChores(prev => prev.map(c =>
          c.id === editingChore.id
            ? { ...c, name: formChoreName, dueDate: formChoreDue, time: formChoreTime, priority: formChorePriority }
            : c
        ));
      } else {
        const { data, error } = await supabase
          .from('home_chores')
          .insert({
            user_id: user.id,
            name: formChoreName,
            due_date: formChoreDue,
            time: formChoreTime,
            priority: formChorePriority,
            done: false
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setChores(prev => [...prev, {
            id: data.id,
            name: data.name,
            dueDate: data.due_date,
            time: data.time,
            priority: data.priority,
            done: data.done
          }]);
        }
      }
      setChoreModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar afazer",
        description: error.message
      });
    }
  };

  const deleteChore = async () => {
    if (!editingChore) return;
    try {
      const { error } = await supabase
        .from('home_chores')
        .delete()
        .eq('id', editingChore.id);

      if (error) throw error;
      setChores(prev => prev.filter(c => c.id !== editingChore.id));
      setChoreModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir afazer",
        description: error.message
      });
    }
  };

  return (
    <MainLayout title="Casa & Compras">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-100 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("mercado")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === "mercado"
                ? "bg-white text-emerald-600 border-b-2 border-emerald-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Lista de Mercado
          </button>
          <button
            onClick={() => setActiveTab("limpeza")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === "limpeza"
                ? "bg-white text-emerald-600 border-b-2 border-emerald-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Rotina de Limpeza
          </button>
          <button
            onClick={() => setActiveTab("afazeres")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === "afazeres"
                ? "bg-white text-emerald-600 border-b-2 border-emerald-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Afazeres Gerais
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <>
            {/* MERCADO CONTENT */}
            {activeTab === "mercado" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Categorias</h2>
                  <Button onClick={() => openCategoryModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div
                        className="p-4 flex justify-between items-center"
                        style={{ backgroundColor: category.colorBg }}
                      >
                        <h3 className="font-semibold" style={{ color: category.color }}>{category.name}</h3>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => openItemModal(category.id)}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors text-gray-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openCategoryModal(category)}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors text-gray-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1">
                        <div className="space-y-2">
                          {category.items.length === 0 && (
                            <p className="text-sm text-gray-400 italic">Nenhum item</p>
                          )}
                          {category.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleItem(category.id, item.id)}
                                  className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    item.checked
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-gray-300 hover:border-emerald-500 text-transparent"
                                  )}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <span className={cn(
                                  "text-sm transition-colors",
                                  item.checked ? "text-gray-400 line-through" : "text-gray-700"
                                )}>
                                  {item.name}
                                </span>
                              </div>
                              <button 
                                onClick={() => openItemModal(category.id, item)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-600 transition-all"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIMPEZA CONTENT */}
            {activeTab === "limpeza" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Rotina da Casa</h2>
                  <Button onClick={() => openCleaningModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tarefa</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Frequência</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Última vez</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cômodo</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cleaningTasks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500">Nenhuma tarefa cadastrada.</td>
                          </tr>
                        )}
                        {cleaningTasks.map((task) => (
                          <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-700">{task.task}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                {task.frequency}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{task.lastDone}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{task.room}</td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={() => openCleaningModal(task)}
                                className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
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

            {/* AFAZERES CONTENT */}
            {activeTab === "afazeres" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Lista de Tarefas</h2>
                  <Button onClick={() => openChoreModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Afazer
                  </Button>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="space-y-1">
                    {chores.length === 0 && (
                      <p className="text-center text-gray-500 py-4">Nenhum afazer cadastrado.</p>
                    )}
                    {chores.map((chore) => (
                      <div 
                        key={chore.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm",
                          chore.done ? "bg-gray-50 border-gray-100" : "bg-white border-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleChore(chore.id)}
                            className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                              chore.done
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-gray-300 hover:border-emerald-500 text-transparent"
                            )}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className={cn("flex flex-col", chore.done && "opacity-50")}>
                            <span className={cn(
                              "font-medium text-gray-700",
                              chore.done && "line-through"
                            )}>
                              {chore.name}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>Vence: {chore.dueDate}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded font-medium",
                                chore.priority === "alta" && "bg-red-50 text-red-600",
                                chore.priority === "media" && "bg-orange-50 text-orange-600",
                                chore.priority === "baixa" && "bg-green-50 text-green-600"
                              )}>
                                {chore.priority.charAt(0).toUpperCase() + chore.priority.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => openChoreModal(chore)}
                          className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODALS */}
        
        {/* Item Modal */}
        <CrudModal
          open={itemModal}
          onOpenChange={setItemModal}
          title={editingItem ? "Editar Item" : "Novo Item"}
          onSave={saveItem}
          onDelete={editingItem ? deleteItem : undefined}
        >
          <FormField label="Nome do Item">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formItemName}
              onChange={(e) => setFormItemName(e.target.value)}
              placeholder="Ex: Leite"
            />
          </FormField>
        </CrudModal>

        {/* Category Modal */}
        <CrudModal
          open={categoryModal}
          onOpenChange={setCategoryModal}
          title={editingCategory ? "Editar Categoria" : "Nova Categoria"}
          onSave={saveCategory}
          onDelete={editingCategory ? deleteCategory : undefined}
        >
          <FormField label="Nome da Categoria">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formCategoryName}
              onChange={(e) => setFormCategoryName(e.target.value)}
              placeholder="Ex: Mercearia"
            />
          </FormField>
          <FormField label="Cor (HSL)">
            <div className="flex gap-2 items-center">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formCategoryColor}
                onChange={(e) => setFormCategoryColor(e.target.value)}
                placeholder="hsl(140 50% 50%)"
              />
              <div className="w-8 h-8 rounded border" style={{ backgroundColor: formCategoryColor }}></div>
            </div>
          </FormField>
        </CrudModal>

        {/* Cleaning Modal */}
        <CrudModal
          open={cleaningModal}
          onOpenChange={setCleaningModal}
          title={editingCleaning ? "Editar Tarefa" : "Nova Tarefa"}
          onSave={saveCleaning}
          onDelete={editingCleaning ? deleteCleaning : undefined}
        >
          <FormField label="Tarefa">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formCleanTask}
              onChange={(e) => setFormCleanTask(e.target.value)}
              placeholder="Ex: Aspirar a casa"
            />
          </FormField>
          <FormField label="Frequência">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formCleanFreq}
              onChange={(e) => setFormCleanFreq(e.target.value)}
              placeholder="Ex: Semanal"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Última Vez">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formCleanLast}
                onChange={(e) => setFormCleanLast(e.target.value)}
                placeholder="Ex: Dom"
              />
            </FormField>
            <FormField label="Cômodo">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formCleanRoom}
                onChange={(e) => setFormCleanRoom(e.target.value)}
                placeholder="Ex: Sala"
              />
            </FormField>
          </div>
        </CrudModal>

        {/* Chore Modal */}
        <CrudModal
          open={choreModal}
          onOpenChange={setChoreModal}
          title={editingChore ? "Editar Afazer" : "Novo Afazer"}
          onSave={saveChore}
          onDelete={editingChore ? deleteChore : undefined}
        >
          <FormField label="O que fazer?">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formChoreName}
              onChange={(e) => setFormChoreName(e.target.value)}
              placeholder="Ex: Pagar conta de luz"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vencimento">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formChoreDue}
                onChange={(e) => setFormChoreDue(e.target.value)}
                placeholder="Ex: 10/01"
              />
            </FormField>
            <FormField label="Horário">
              <input
                type="time"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formChoreTime}
                onChange={(e) => setFormChoreTime(e.target.value)}
              />
            </FormField>
            <FormField label="Prioridade">
              <Select value={formChorePriority} onValueChange={(v: any) => setFormChorePriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </CrudModal>

      </div>
    </MainLayout>
  );
};

export default Casa;
