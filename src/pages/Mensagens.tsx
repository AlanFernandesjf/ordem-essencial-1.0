import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, Plus, MessageCircle, User, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    status?: 'online' | 'away' | 'busy' | 'invisible';
}

interface Participant {
    user_id: string;
    profiles: Profile;
}

interface Conversation {
    id: string;
    created_at: string;
    updated_at: string;
    last_message_at: string;
    participants: Participant[];
    last_message?: string; // Derived for display
    unread_count?: number; // Added for badges
}

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean; // Confirmed schema
    is_optimistic?: boolean;
}

export default function Mensagens() {
    const { toast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // New Conversation State
    const [isNewConvOpen, setIsNewConvOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Profile[]>([]);

    useEffect(() => {
        checkUser();
    }, []);

    // We need a Ref to track selected conversation inside the effect
    const selectedConversationRef = useRef<string | null>(null);
    useEffect(() => {
        selectedConversationRef.current = selectedConversation?.id || null;
    }, [selectedConversation]);

    useEffect(() => {
        if (!currentUser) return;

        console.log("Setting up Realtime subscription for user:", currentUser.id);
        fetchConversations();

        // 1. Subscribe to new messages (Global)
        const messageChannel = supabase
            .channel('global_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'community_messages'
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    console.log("New message received via Realtime:", newMsg);
                    
                    // Update messages if this conversation is open
                    if (selectedConversationRef.current === newMsg.conversation_id) {
                         setMessages(prev => {
                            // Check for optimistic message to replace
                            const optimisticIndex = prev.findIndex(m => 
                                m.is_optimistic && 
                                m.content === newMsg.content && 
                                m.sender_id === newMsg.sender_id
                            );

                            if (optimisticIndex !== -1) {
                                // Replace optimistic with real
                                const newMessages = [...prev];
                                newMessages[optimisticIndex] = newMsg;
                                return newMessages;
                            }

                            // Dedupe by ID just in case
                            const exists = prev.some(m => m.id === newMsg.id);
                            if (exists) return prev;
                            
                            return [...prev, newMsg];
                        });
                    }

                    // Update conversation list order and unread count
                    setConversations(prev => {
                        const index = prev.findIndex(c => c.id === newMsg.conversation_id);
                        
                        // If conversation exists in list
                        if (index !== -1) {
                            const isCurrentConversation = selectedConversationRef.current === newMsg.conversation_id;
                            
                            // If it's NOT the current conversation and NOT sent by me, increment unread
                            const shouldIncrement = !isCurrentConversation && newMsg.sender_id !== currentUser.id;
                            
                            const updated = { 
                                ...prev[index], 
                                last_message_at: newMsg.created_at,
                                last_message: newMsg.content,
                                unread_count: shouldIncrement ? (prev[index].unread_count || 0) + 1 : prev[index].unread_count
                            };
                            
                            // If it IS current conversation, we might want to mark as read immediately in DB?
                            // But for UI, count stays 0.
                            if (isCurrentConversation && newMsg.sender_id !== currentUser.id) {
                                // Trigger read mark in background
                                supabase
                                    .from('community_messages')
                                    .update({ is_read: true })
                                    .eq('id', newMsg.id)
                                    .then(({ error }) => {
                                        if (error) console.error("Error marking instant message read:", error);
                                    });
                            }

                            const list = [...prev];
                            list.splice(index, 1);
                            return [updated, ...list];
                        } else {
                            // New conversation? Fetch all again to be safe
                            console.log("Message for unknown conversation, fetching all...");
                            fetchConversations();
                            return prev;
                        }
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime (Messages) connected!');
                }
            });

        // 2. Subscribe to new participations (When I'm added to a group)
        const participationChannel = supabase
            .channel('my_participations')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'community_conversation_participants',
                    filter: `user_id=eq.${currentUser.id}`
                },
                (payload) => {
                    console.log("New participation detected:", payload);
                    fetchConversations();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime (Participations) connected!');
                }
            });

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(participationChannel);
        };
    }, [currentUser]); // Only on mount/user change

    // Polling fallback: Fetch messages every 3 seconds to ensure delivery
    useEffect(() => {
        if (!selectedConversation) return;

        const interval = setInterval(() => {
            fetchMessages(selectedConversation.id, true); // true = silent (no loading state)
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedConversation]);

    const markAsRead = async (conversationId: string) => {
        if (!currentUser) return;

        // Optimistic update
        setConversations(prev => prev.map(c => 
            c.id === conversationId ? { ...c, unread_count: 0 } : c
        ));

        try {
            await supabase
                .from('community_messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', currentUser.id)
                .eq('is_read', false);
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    };

    useEffect(() => {
        if (selectedConversation) {
            markAsRead(selectedConversation.id);
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const fetchConversations = async () => {
        try {
            // First try: Standard fetch with relation
            // This requires the FK to be set up correctly between participants and profiles
            const { data, error } = await supabase
                .from('community_conversations')
                .select(`
                    *,
                    participants:community_conversation_participants(
                        user_id,
                        profiles:user_id(id, name, username, avatar_url, status)
                    )
                `)
                .order('last_message_at', { ascending: false });

            if (error) throw error;
            
            let conversationsData = data || [];
            
            // --- Unread Count Logic ---
            // Fetch all unread messages for me to map to conversations
            // We do this in a separate query to keep things simple
            if (currentUser && conversationsData.length > 0) {
                const convIds = conversationsData.map(c => c.id);
                const { data: unreadMessages } = await supabase
                    .from('community_messages')
                    .select('conversation_id')
                    .eq('is_read', false)
                    .neq('sender_id', currentUser.id)
                    .in('conversation_id', convIds);
                
                // Count per conversation
                const unreadMap = new Map();
                unreadMessages?.forEach(msg => {
                    const current = unreadMap.get(msg.conversation_id) || 0;
                    unreadMap.set(msg.conversation_id, current + 1);
                });

                conversationsData = conversationsData.map(c => ({
                    ...c,
                    unread_count: unreadMap.get(c.id) || 0
                }));
            }

            setConversations(conversationsData);
        } catch (error: any) {
            console.error("Error fetching conversations (standard):", error);
            
            // Fallback: Manual join if the relation is missing (PGRST200) or other issues
            if (error?.code === 'PGRST200' || error?.message?.includes('relationship')) {
                try {
                    console.log("Attempting fallback fetch...");
                    // 1. Fetch conversations
                    const { data: convs, error: convError } = await supabase
                        .from('community_conversations')
                        .select('*')
                        .order('last_message_at', { ascending: false });
                    
                    if (convError) throw convError;
                    if (!convs || convs.length === 0) {
                        setConversations([]);
                        return;
                    }

                    // 2. Fetch participants for these conversations
                    const convIds = convs.map(c => c.id);
                    const { data: parts, error: partError } = await supabase
                        .from('community_conversation_participants')
                        .select('conversation_id, user_id')
                        .in('conversation_id', convIds);

                    if (partError) throw partError;

                    // 3. Fetch profiles for these participants
                    const userIds = [...new Set(parts?.map(p => p.user_id) || [])];
                    const { data: profiles, error: profError } = await supabase
                        .from('profiles')
                        .select('id, name, username, avatar_url, status')
                        .in('id', userIds);

                    if (profError) throw profError;

                    // 4. Stitch it together
                    const profileMap = new Map(profiles?.map(p => [p.id, p]));
                    
                    const conversationsWithParticipants = convs.map(conv => {
                        const convParts = parts?.filter(p => p.conversation_id === conv.id) || [];
                        const participantsWithProfiles = convParts.map(p => ({
                            user_id: p.user_id,
                            profiles: profileMap.get(p.user_id) || {
                                id: p.user_id,
                                name: 'Usuário',
                                username: 'usuario',
                                avatar_url: ''
                            } as Profile
                        }));
                        
                        return {
                            ...conv,
                            participants: participantsWithProfiles
                        };
                    });

                    setConversations(conversationsWithParticipants);
                    console.log("Fetched conversations:", conversationsWithParticipants.length);
                } catch (fallbackError) {
                    console.error("Error in fallback fetch:", fallbackError);
                    toast({ variant: "destructive", title: "Erro ao carregar conversas" });
                }
            } else {
                 toast({ variant: "destructive", title: "Erro ao carregar conversas" });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchMessagesAbortController = useRef<AbortController | null>(null);

    const fetchMessages = async (conversationId: string, silent = false) => {
        // Cancel previous request if it exists
        if (fetchMessagesAbortController.current) {
            fetchMessagesAbortController.current.abort();
        }
        
        const controller = new AbortController();
        fetchMessagesAbortController.current = controller;

        if (!silent) setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from('community_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .abortSignal(controller.signal);

            if (error) {
                // If aborted, don't throw, just exit
                if (error.code === '20' || error.message?.includes('Aborted')) return;
                throw error;
            }
            
            setMessages(data || []);
            
            // Scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        } catch (error: any) {
            // Ignore abort errors
            if (error.name === 'AbortError' || error.message?.includes('Aborted')) return;
            
            // Also ignore "Failed to fetch" which can happen on rapid navigation/cancellation
            if (error.message?.includes('Failed to fetch') || JSON.stringify(error).includes('Failed to fetch')) return;
            
            console.error("Error fetching messages:", error);
        } finally {
            // Only turn off loading if this is still the active request
            if (fetchMessagesAbortController.current === controller) {
                setLoadingMessages(false);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !currentUser) return;

        const msgContent = newMessage;
        setNewMessage(""); // Optimistic clear

        try {
            const { error } = await supabase
                .from('community_messages')
                .insert({
                    conversation_id: selectedConversation.id,
                    sender_id: currentUser.id,
                    content: msgContent
                });

            if (error) throw error;

            // Update local messages (or wait for subscription/refetch)
            // For now, simple refetch or append
            // fetchMessages(selectedConversation.id); // Or append locally
            
            const newMsgObj: Message = {
                id: Math.random().toString(), // Temp ID
                conversation_id: selectedConversation.id,
                sender_id: currentUser.id,
                content: msgContent,
                created_at: new Date().toISOString(),
                is_optimistic: true
            };
            setMessages(prev => [...prev, newMsgObj]);

            // Update conversation last_message_at
            await supabase
                .from('community_conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', selectedConversation.id);

            fetchConversations(); // Refresh list order
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ variant: "destructive", title: "Erro ao enviar mensagem" });
        }
    };

    const handleSearchUsers = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`name.ilike.%${term}%,username.ilike.%${term}%`)
                .neq('id', currentUser.id)
                .limit(5);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error("Error searching users:", error);
        }
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const startConversation = async (targetUser: Profile) => {
        if (!currentUser) return;

        // Check if conversation already exists (client-side)
        const existing = conversations.find(c => 
            c.participants.some(p => p.user_id === targetUser.id)
        );

        if (existing) {
            setSelectedConversation(existing);
            setIsNewConvOpen(false);
            return;
        }

        try {
            // Generate ID client-side to avoid RLS "select after insert" issues
            const newConvId = generateUUID();

            // Create new conversation
            const { error: convError } = await supabase
                .from('community_conversations')
                .insert({ id: newConvId });

            if (convError) throw convError;

            // Add participants
            const participants = [
                { conversation_id: newConvId, user_id: currentUser.id },
                { conversation_id: newConvId, user_id: targetUser.id }
            ];

            const { error: partError } = await supabase
                .from('community_conversation_participants')
                .insert(participants);

            if (partError) throw partError;

            setIsNewConvOpen(false);
            
            // Optimistically add to list and select
            const newConv: Conversation = {
                id: newConvId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
                participants: [
                    { user_id: currentUser.id, profiles: { id: currentUser.id, name: 'Eu', username: '', avatar_url: '' } }, // Placeholder for self
                    { user_id: targetUser.id, profiles: targetUser }
                ]
            };
            
            setConversations(prev => [newConv, ...prev]);
            setSelectedConversation(newConv);
            
            // Refresh in background
            fetchConversations();
        } catch (error) {
            console.error("Error starting conversation:", error);
            toast({ variant: "destructive", title: "Erro ao iniciar conversa" });
        }
    };

    const getOtherParticipant = (conversation: Conversation) => {
        if (!currentUser) return null;
        const other = conversation.participants.find(p => p.user_id !== currentUser.id);
        
        // Fallback if we can't find the other participant (e.g. RLS issue or data inconsistency)
        if (!other) {
            // If there are participants but we can't distinguish, or only 1 participant (self)
            if (conversation.participants.length > 0) {
                 // return a placeholder
                     return {
                         id: 'unknown',
                         name: 'Usuário Desconhecido',
                         username: 'unknown',
                         avatar_url: '',
                         status: 'invisible'
                     } as Profile;
            }
            return null;
        }
        
        return other.profiles;
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'online': return 'border-green-500';
            case 'away': return 'border-yellow-500';
            case 'busy': return 'border-red-500';
            case 'invisible': return 'border-transparent opacity-50';
            default: return 'border-transparent';
        }
    };

    const getStatusTooltip = (status?: string) => {
        switch (status) {
            case 'online': return 'Online';
            case 'away': return 'Ausente';
            case 'busy': return 'Ocupado';
            case 'invisible': return 'Invisível';
            default: return '';
        }
    };

    return (
        <MainLayout>
            <div className="flex h-[calc(100vh-140px)] gap-6">
                {/* Sidebar - Conversations List */}
                <div className={`w-full md:w-80 flex flex-col gap-4 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MessageCircle className="w-6 h-6" /> Mensagens
                        </h2>
                        <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => fetchConversations()} title="Atualizar">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                            <Dialog open={isNewConvOpen} onOpenChange={setIsNewConvOpen}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost"><Plus /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nova Conversa</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar usuário..." 
                                            className="pl-8"
                                            value={searchTerm}
                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {searchResults.map(user => (
                                            <div key={user.id} 
                                                className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                                                onClick={() => startConversation(user)}
                                            >
                                                <Avatar className={`border-2 ${getStatusColor(user.status)}`}>
                                                    <AvatarImage src={user.avatar_url} />
                                                    <AvatarFallback>{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {searchResults.length === 0 && searchTerm.length > 1 && (
                                            <div className="text-center text-sm text-muted-foreground py-4">
                                                Nenhum usuário encontrado.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        </div>
                    </div>

                    <Card className="flex-1 overflow-hidden flex flex-col">
                        <div className="p-3 border-b bg-muted/30">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Filtrar conversas..." className="pl-8 h-9" />
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {loading ? (
                                    <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
                                ) : conversations.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm px-4">
                                        Nenhuma conversa ainda.<br/>Inicie uma nova clicando no +
                                    </div>
                                ) : (
                                    conversations.map(conv => {
                                        const otherUser = getOtherParticipant(conv);
                                        // If we still can't find a user (and getOtherParticipant returned null), skip
                                        if (!otherUser) return null;
                                        
                                        return (
                                            <div key={conv.id} 
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedConversation?.id === conv.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                                onClick={() => setSelectedConversation(conv)}
                                            >
                                                <Avatar className={`border-2 ${getStatusColor(otherUser.status)}`} title={getStatusTooltip(otherUser.status)}>
                                                    <AvatarImage src={otherUser.avatar_url} />
                                                    <AvatarFallback>{otherUser.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className="font-medium truncate">{otherUser.name}</span>
                                                        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                                                            {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: ptBR }) : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                                                            {conv.last_message || "Clique para ver as mensagens"}
                                                        </p>
                                                        {conv.unread_count && conv.unread_count > 0 ? (
                                                            <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-bold text-white bg-green-500 rounded-full animate-in zoom-in duration-200">
                                                                {conv.unread_count}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col h-full ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    {selectedConversation ? (
                        <Card className="flex-1 flex flex-col overflow-hidden">
                            {/* Chat Header */}
                            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setSelectedConversation(null)}>
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                    <Avatar className={`border-2 ${getStatusColor(getOtherParticipant(selectedConversation)?.status)}`} title={getStatusTooltip(getOtherParticipant(selectedConversation)?.status)}>
                                        <AvatarImage src={getOtherParticipant(selectedConversation)?.avatar_url} />
                                        <AvatarFallback>{getOtherParticipant(selectedConversation)?.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{getOtherParticipant(selectedConversation)?.name}</div>
                                        <div className="text-xs text-muted-foreground">@{getOtherParticipant(selectedConversation)?.username}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {loadingMessages ? (
                                    <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm"></span></div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground text-sm">
                                        Nenhuma mensagem ainda. Diga oi!
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === currentUser?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                                    isMe 
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                        : 'bg-muted text-foreground rounded-tl-none'
                                                }`}>
                                                    {msg.content}
                                                    <div className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t bg-background">
                                <form 
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }}
                                >
                                    <Input 
                                        placeholder="Digite sua mensagem..." 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </Card>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center border rounded-lg bg-muted/10 border-dashed m-1">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                                <MessageCircle className="w-8 h-8 opacity-50" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">Suas Mensagens</h3>
                            <p className="text-sm max-w-xs">
                                Selecione uma conversa na lista ao lado ou inicie um novo bate-papo.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}

// Icon helper
function ArrowLeft({ className, onClick }: { className?: string, onClick?: () => void }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
            onClick={onClick}
        >
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
        </svg>
    )
}
