import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  user_id: string;
  profiles: {
    name: string;
    username?: string;
    avatar_url: string;
  };
}

export function SocialFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get following IDs
      const { data: following } = await supabase
        .from('community_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      const visibleUserIds = [...followingIds, user.id];

      // Fetch posts from these users
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          user_id,
          profiles:user_id (name, username, avatar_url)
        `)
        .in('user_id', visibleUserIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching social feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  
  return (
    <div className="notion-card mb-6 animate-slide-up">
      <div className="notion-card-header bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Users className="w-4 h-4" />
          <span className="font-semibold">Comunidade</span>
        </div>
        <Link to="/comunidade">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/50">
            {posts.length > 0 ? "Ver tudo" : "Explorar"} <ArrowRight size={12} />
          </Button>
        </Link>
      </div>
      <div className="p-4 space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.profiles.avatar_url} />
                <AvatarFallback>{post.profiles.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm font-medium truncate">{post.profiles.name}</span>
                    {post.profiles.username && (
                      <span className="text-xs text-muted-foreground truncate">@{post.profiles.username}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Heart size={12} className={post.likes_count > 0 ? "fill-red-500 text-red-500" : ""} />
                  {post.likes_count}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Conecte-se com outros usuários para ver atualizações aqui.</p>
            <Link to="/comunidade">
              <Button size="sm" variant="outline" className="gap-2">
                <Users size={14} />
                Encontrar conexões
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
