import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Users, MessageSquare, Calendar, Heart, MapPin, Plus, Trash2, UserPlus, UserMinus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Profile {
  id: string;
  name: string;
  username?: string;
  avatar_url: string;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  created_at: string;
  user_id: string;
  profiles?: Profile;
  user_has_liked?: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  created_at: string;
  creator_id: string;
  profiles?: Profile;
  participants_count?: number;
  user_is_participant?: boolean;
}

export default function Comunidade() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  
  // Event Form
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    max_participants: 10
  });

  useEffect(() => {
    checkUser();
    fetchPosts();
    fetchEvents();
    fetchUsers();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (id, name, username, avatar_url)
        `);

      if (user) {
        // Filter by connections + self
        const { data: following } = await supabase
            .from('community_follows')
            .select('following_id')
            .eq('follower_id', user.id);
            
        const followingIds = following?.map(f => f.following_id) || [];
        query = query.in('user_id', [...followingIds, user.id]);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Check likes for current user
      let postsWithLikes = data || [];
      if (user && data && data.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: myLikes } = await supabase
            .from('community_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds);
            
        const likedPostIds = new Set(myLikes?.map(l => l.post_id));
        
        postsWithLikes = data.map(post => ({
            ...post,
            user_has_liked: likedPostIds.has(post.id)
        }));
      } else {
         postsWithLikes = data.map(post => ({ ...post, user_has_liked: false }));
      }

      setPosts(postsWithLikes);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('community_events')
        .select(`
          *,
          profiles:creator_id (id, name, username, avatar_url)
        `);

      if (user) {
         // Filter by connections + self
         const { data: following } = await supabase
             .from('community_follows')
             .select('following_id')
             .eq('follower_id', user.id);
             
         const followingIds = following?.map(f => f.following_id) || [];
         query = query.in('creator_id', [...followingIds, user.id]);
      }

      const { data, error } = await query.order('event_date', { ascending: true });

      if (error) throw error;

      let eventsWithParticipants = data || [];
      if (data && data.length > 0) {
          const eventIds = data.map(e => e.id);
          let myParticipations = new Set();
          
          if (user) {
              const { data: parts } = await supabase
                  .from('community_event_participants')
                  .select('event_id')
                  .eq('user_id', user.id)
                  .in('event_id', eventIds);
              parts?.forEach(p => myParticipations.add(p.event_id));
          }

          eventsWithParticipants = await Promise.all(data.map(async (event) => {
             const { count } = await supabase
                .from('community_event_participants')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.id);
             
             return { 
                 ...event, 
                 participants_count: count || 0,
                 user_is_participant: myParticipations.has(event.id)
             };
          }));
      }

      setEvents(eventsWithParticipants);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content: newPostContent
        });

      if (error) throw error;

      setNewPostContent("");
      fetchPosts();
      toast({ title: "Post publicado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao publicar", description: error.message });
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (post: Post) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (post.user_has_liked) {
        // Unlike
        await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
          
        setPosts(posts.map(p => 
            p.id === post.id 
                ? { ...p, likes_count: Math.max(0, p.likes_count - 1), user_has_liked: false } 
                : p
        ));
      } else {
        // Like
        await supabase
          .from('community_likes')
          .insert({ post_id: post.id, user_id: user.id });

        setPosts(posts.map(p => 
            p.id === post.id 
                ? { ...p, likes_count: p.likes_count + 1, user_has_liked: true } 
                : p
        ));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDeletePost = async (postId: string) => {
      try {
          const { error } = await supabase.from('community_posts').delete().eq('id', postId);
          if (error) throw error;
          setPosts(posts.filter(p => p.id !== postId));
          toast({ title: "Post removido" });
      } catch (error) {
          console.error("Error deleting post:", error);
      }
  };

  const handleCreateEvent = async () => {
      if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location) {
          toast({ variant: "destructive", title: "Preencha os campos obrigatórios" });
          return;
      }

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Usuário não autenticado");

          const eventDateTime = new Date(`${newEvent.date}T${newEvent.time}`).toISOString();

          const { error } = await supabase.from('community_events').insert({
              creator_id: user.id,
              title: newEvent.title,
              description: newEvent.description,
              event_date: eventDateTime,
              location: newEvent.location,
              max_participants: newEvent.max_participants
          });

          if (error) throw error;

          setIsEventModalOpen(false);
          setNewEvent({ title: "", description: "", date: "", time: "", location: "", max_participants: 10 });
          fetchEvents();
          toast({ title: "Evento criado com sucesso!" });
      } catch (error: any) {
          toast({ variant: "destructive", title: "Erro ao criar evento", description: error.message });
      }
  };

  const handleJoinEvent = async (event: Event) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (event.user_is_participant) {
              // Leave
              await supabase.from('community_event_participants')
                  .delete()
                  .eq('event_id', event.id)
                  .eq('user_id', user.id);
              
              setEvents(events.map(e => 
                  e.id === event.id 
                      ? { ...e, participants_count: (e.participants_count || 1) - 1, user_is_participant: false }
                      : e
              ));
              toast({ title: "Você saiu do evento" });
          } else {
              // Join
              await supabase.from('community_event_participants')
                  .insert({ event_id: event.id, user_id: user.id });

              setEvents(events.map(e => 
                  e.id === event.id 
                      ? { ...e, participants_count: (e.participants_count || 0) + 1, user_is_participant: true }
                      : e
              ));
              toast({ title: "Presença confirmada!" });
          }
      } catch (error) {
          console.error("Error joining event:", error);
      }
  };

  const handleDeleteEvent = async (eventId: string) => {
      try {
          const { error } = await supabase.from('community_events').delete().eq('id', eventId);
          if (error) throw error;
          setEvents(events.filter(e => e.id !== eventId));
          toast({ title: "Evento cancelado" });
      } catch (error) {
          console.error("Error deleting event:", error);
      }
  };

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '00000000-0000-0000-0000-000000000000'); // Don't list self

      if (error) throw error;

      if (user) {
          const { data: myFollows } = await supabase
              .from('community_follows')
              .select('following_id')
              .eq('follower_id', user.id);
          
          const followingIds = new Set(myFollows?.map(f => f.following_id));
          
          const usersWithFollowStatus = profiles?.map(profile => ({
              ...profile,
              is_following: followingIds.has(profile.id)
          }));
          
          setUsers(usersWithFollowStatus || []);
      } else {
          setUsers(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleFollow = async (targetUser: any) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (targetUser.is_following) {
              // Unfollow
              await supabase
                  .from('community_follows')
                  .delete()
                  .eq('follower_id', user.id)
                  .eq('following_id', targetUser.id);
              
              setUsers(users.map(u => 
                  u.id === targetUser.id ? { ...u, is_following: false } : u
              ));
              toast({ title: `Você deixou de seguir ${targetUser.name}` });
          } else {
              // Follow
              await supabase
                  .from('community_follows')
                  .insert({ follower_id: user.id, following_id: targetUser.id });

              setUsers(users.map(u => 
                  u.id === targetUser.id ? { ...u, is_following: true } : u
              ));
              toast({ title: `Você está seguindo ${targetUser.name}` });
          }
      } catch (error) {
          console.error("Error toggling follow:", error);
      }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Comunidade</h1>
              <p className="text-muted-foreground">Conecte-se, compartilhe e evolua junto.</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <MessageSquare size={16} /> Feed
            </TabsTrigger>
            <TabsTrigger value="eventos" className="flex items-center gap-2">
              <Calendar size={16} /> Eventos
            </TabsTrigger>
            <TabsTrigger value="conexoes" className="flex items-center gap-2">
              <Users size={16} /> Conexões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6 mt-6">
            {/* Create Post */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarFallback>{currentUser?.email?.substring(0,2).toUpperCase() || 'EU'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <Textarea 
                        placeholder="Compartilhe sua experiência, conquista ou dúvida..." 
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleCreatePost} disabled={isPosting}>
                          {isPosting ? "Publicando..." : "Publicar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feed Items */}
            <div className="space-y-4">
              {posts.map(post => (
                  <Card key={post.id}>
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                      <Avatar>
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback>{post.profiles?.name?.substring(0,2).toUpperCase() || 'US'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1">
                        <span className="font-semibold">{post.profiles?.name || 'Usuário'}</span>
                        {post.profiles?.username && <span className="text-xs text-muted-foreground">@{post.profiles.username}</span>}
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {currentUser?.id === post.user_id && (
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeletePost(post.id)}>
                              <Trash2 size={16} />
                          </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="whitespace-pre-wrap">{post.content}</p>
                      <div className="flex items-center gap-4 pt-2 border-t mt-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`gap-2 ${post.user_has_liked ? 'text-red-500' : ''}`}
                            onClick={() => handleLikePost(post)}
                        >
                          <Heart size={16} fill={post.user_has_liked ? "currentColor" : "none"} /> 
                          {post.likes_count}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <MessageSquare size={16} /> Comentar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              ))}
              {posts.length === 0 && !loading && (
                  <div className="text-center py-10 text-muted-foreground">
                      Nenhum post ainda. Seja o primeiro a compartilhar!
                  </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="eventos" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Próximos Eventos</h2>
              
              <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                  <DialogTrigger asChild>
                      <Button className="gap-2"><Plus size={16} /> Criar Evento</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Novo Evento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                          <div className="space-y-2">
                              <Label>Título</Label>
                              <Input 
                                value={newEvent.title} 
                                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                                placeholder="Ex: Caminhada no Parque"
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>Descrição</Label>
                              <Textarea 
                                value={newEvent.description} 
                                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                                placeholder="Detalhes do evento..."
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Data</Label>
                                  <Input 
                                    type="date"
                                    value={newEvent.date} 
                                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                                  />
                              </div>
                              <div className="space-y-2">
                                  <Label>Hora</Label>
                                  <Input 
                                    type="time"
                                    value={newEvent.time} 
                                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                                  />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <Label>Local</Label>
                              <Input 
                                value={newEvent.location} 
                                onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                                placeholder="Ex: Parque Ibirapuera, Portão 7"
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>Máx. Participantes</Label>
                              <Input 
                                type="number"
                                value={newEvent.max_participants} 
                                onChange={e => setNewEvent({...newEvent, max_participants: parseInt(e.target.value)})}
                              />
                          </div>
                          <Button className="w-full" onClick={handleCreateEvent}>Criar Evento</Button>
                      </div>
                  </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(event => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                              <CardTitle>{event.title}</CardTitle>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                  <Calendar size={14} /> 
                                  {new Date(event.event_date).toLocaleDateString('pt-BR')} às {new Date(event.event_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                              </CardDescription>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                  <MapPin size={14} /> {event.location}
                              </CardDescription>
                          </div>
                          {currentUser?.id === event.creator_id && (
                              <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleDeleteEvent(event.id)}>
                                  <Trash2 size={14} />
                              </Button>
                          )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4 whitespace-pre-wrap">{event.description}</p>
                      
                      <div className="flex items-center gap-2 mb-4">
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={event.profiles?.avatar_url} />
                              <AvatarFallback>CR</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Organizado por {event.profiles?.name}</span>
                            {event.profiles?.username && <span className="text-xs text-muted-foreground">@{event.profiles.username}</span>}
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-muted-foreground">
                            {event.participants_count} / {event.max_participants} confirmados
                        </span>
                        <Button 
                            variant={event.user_is_participant ? "outline" : "default"} 
                            size="sm"
                            onClick={() => handleJoinEvent(event)}
                        >
                            {event.user_is_participant ? "Sair do Evento" : "Participar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              ))}
              {events.length === 0 && (
                  <div className="col-span-full text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                      Nenhum evento agendado. Crie o primeiro!
                  </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="conexoes" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-semibold">Pessoas para Seguir</h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou @usuário"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users
                  .filter(user => {
                    const normalizedSearch = searchTerm.toLowerCase().trim().replace(/^@/, '');
                    if (!normalizedSearch) return true;
                    
                    return (
                      user.name?.toLowerCase().includes(normalizedSearch) || 
                      user.username?.toLowerCase().includes(normalizedSearch)
                    );
                  })
                  .map(user => (
                    <Card key={user.id}>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{user.name?.substring(0,2).toUpperCase() || 'US'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col flex-1 overflow-hidden">
                                <span className="font-semibold truncate">{user.name || 'Usuário'}</span>
                                {user.username && <span className="text-xs text-muted-foreground truncate">@{user.username}</span>}
                                <span className="text-xs text-muted-foreground truncate">Membro da comunidade</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                variant={user.is_following ? "outline" : "default"} 
                                className="w-full gap-2"
                                onClick={() => handleFollow(user)}
                            >
                                {user.is_following ? <UserMinus size={16} /> : <UserPlus size={16} />}
                                {user.is_following ? "Deixar de Seguir" : "Seguir"}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
                {users.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                        Nenhum outro membro encontrado.
                    </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
