import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle } from "lucide-react";

export default function Tutorial() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tutoriais</h1>
          <p className="text-muted-foreground">Aprenda a aproveitar ao máximo o Ordem Essencial.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Primeiros Passos</CardTitle>
            <CardDescription>Guia rápido para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Como organizar minhas finanças?</AccordionTrigger>
                <AccordionContent>
                  Acesse a aba Finanças e cadastre suas receitas e despesas recorrentes. Use a nova aba de Controle Diário para lançamentos rápidos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Como usar o cronômetro de estudos?</AccordionTrigger>
                <AccordionContent>
                  Vá para a página de Estudos. Lá você encontrará um cronômetro para marcar suas sessões de foco.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Agendando consultas médicas</AccordionTrigger>
                <AccordionContent>
                  Na página de Saúde, você pode registrar consultas médicas. Elas aparecerão automaticamente nas urgências do seu Dashboard.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="hover:bg-muted/50 cursor-pointer transition-colors">
              <CardContent className="pt-6">
                <div className="aspect-video rounded-md bg-muted flex items-center justify-center mb-4">
                  <PlayCircle className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold mb-1">Vídeo Aula {i}</h3>
                <p className="text-sm text-muted-foreground">Aprenda visualmente como configurar seu painel.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
