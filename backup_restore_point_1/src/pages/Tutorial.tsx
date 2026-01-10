import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
}

interface TutorialFAQ {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export default function Tutorial() {
  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [faqs, setFaqs] = useState<TutorialFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchVideos(), fetchFaqs()]);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('tutorial_videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setVideos(data);
  };

  const fetchFaqs = async () => {
    const { data } = await supabase
      .from('tutorial_faqs')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setFaqs(data);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tutoriais</h1>
          <p className="text-muted-foreground">Aprenda a aproveitar ao máximo o Ordem Essencial.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
                <CardDescription>Respostas rápidas para suas dúvidas</CardDescription>
              </CardHeader>
              <CardContent>
                {faqs.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={faq.id} value={`item-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>
                            {faq.answer}
                        </AccordionContent>
                        </AccordionItem>
                    ))}
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma pergunta cadastrada no momento.</p>
                )}
              </CardContent>
            </Card>

            {/* Videos Section */}
            <div>
                <h2 className="text-2xl font-semibold mb-4">Vídeos Tutoriais</h2>
                {videos.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-3">
                    {videos.map((video) => (
                        <Card key={video.id} className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedVideo(video)}>
                        <CardContent className="pt-6">
                            <div className="aspect-video rounded-md bg-muted flex items-center justify-center mb-4 relative overflow-hidden group">
                                {video.url.includes('youtube') ? (
                                    <img 
                                        src={`https://img.youtube.com/vi/${video.url.split('v=')[1]?.split('&')[0]}/hqdefault.jpg`} 
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : null}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <PlayCircle className="h-12 w-12 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <h3 className="font-semibold mb-1 line-clamp-1">{video.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                        </CardContent>
                        </Card>
                    ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Nenhum vídeo disponível no momento.</p>
                )}
            </div>
          </>
        )}

        {/* Video Player Modal */}
        <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-black border-none">
                {selectedVideo && (
                    <div className="aspect-video w-full">
                        <iframe 
                            src={selectedVideo.url.replace('watch?v=', 'embed/')} 
                            className="w-full h-full" 
                            title={selectedVideo.title} 
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
