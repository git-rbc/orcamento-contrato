import { Metadata } from 'next';
import { VendedoresRanking } from '@/components/vendedores/vendedores-ranking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Award, 
  BarChart3,
  Calendar,
  Users,
  Video,
  Building,
  Clock,
  Star,
  Medal
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Performance dos Vendedores | Sistema de Gestão',
  description: 'Rankings e análises de performance: Geral, Online, Presencial e 10 dias com gráficos detalhados',
};

export default function PerformancePage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance dos Vendedores</h1>
          <p className="text-muted-foreground">
            Rankings: Geral, Online, Presencial e 10 dias com métricas avançadas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Atualizado em tempo real
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Carlos Silva</div>
            <p className="text-xs text-muted-foreground">
              127 reuniões este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Online</CardTitle>
            <Video className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">
              +18% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Presenciais</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">198</div>
            <p className="text-xs text-muted-foreground">
              -5% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.4%</div>
            <p className="text-xs text-muted-foreground">
              Reunião para proposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tabs */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            Ranking Geral
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            Online
          </TabsTrigger>
          <TabsTrigger value="presencial" className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            Presencial
          </TabsTrigger>
          <TabsTrigger value="10dias" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Últimos 10 Dias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          {/* Podium dos Top 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                Pódium Geral
              </CardTitle>
              <CardDescription>
                Top 3 vendedores por performance geral
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-end gap-4 h-32">
                {/* 2º Lugar */}
                <div className="flex flex-col items-center">
                  <Badge variant="secondary" className="mb-2">2º</Badge>
                  <div className="bg-gray-300 w-16 h-20 rounded-t flex items-end justify-center pb-2">
                    <span className="text-xs font-bold">Ana M.</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">98 reuniões</p>
                </div>

                {/* 1º Lugar */}
                <div className="flex flex-col items-center">
                  <Badge className="mb-2 bg-amber-500">1º</Badge>
                  <div className="bg-amber-400 w-16 h-24 rounded-t flex items-end justify-center pb-2">
                    <span className="text-xs font-bold">Carlos S.</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">127 reuniões</p>
                </div>

                {/* 3º Lugar */}
                <div className="flex flex-col items-center">
                  <Badge variant="outline" className="mb-2">3º</Badge>
                  <div className="bg-orange-300 w-16 h-16 rounded-t flex items-end justify-center pb-2">
                    <span className="text-xs font-bold">João P.</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">82 reuniões</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranking Component */}
          <Card>
            <CardContent className="p-0">
              <VendedoresRanking />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-500" />
                Performance Online
              </CardTitle>
              <CardDescription>
                Ranking específico para reuniões virtuais
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardContent className="p-0">
              <VendedoresRanking />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presencial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-green-500" />
                Performance Presencial
              </CardTitle>
              <CardDescription>
                Ranking específico para reuniões presenciais
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardContent className="p-0">
              <VendedoresRanking />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="10dias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                Performance dos Últimos 10 Dias
              </CardTitle>
              <CardDescription>
                Análise de tendências recentes de performance
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardContent className="p-0">
              <VendedoresRanking />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análises e Relatórios
          </CardTitle>
          <CardDescription>
            Ferramentas avançadas de análise de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatório Detalhado
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Análise Mensal
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Comparar Vendedores
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Metas e Objetivos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}