import { MainLayout } from "@/components/layout/MainLayout";
import { Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Apps() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Aplicativos</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Em breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta seção trará recomendações de aplicativos úteis para complementar sua organização.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
