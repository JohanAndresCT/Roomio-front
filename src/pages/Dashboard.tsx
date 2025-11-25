import { useState, useEffect } from 'react';
import { Video, Plus, Copy, Users, Clock, Settings, User, Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { getCurrentUser } from '../services/authService';
import { meetingAPI } from '../services/api';
import type { IUser } from '../interfaces/IUser';


interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface Meeting {
  id: string;
  title: string;
  participants: number;
  date: string;
  status: 'active' | 'scheduled' | 'completed';
}

interface AISummary {
  meetingId: string;
  meetingTitle: string;
  date: string;
  keyPoints: string[];
  decisions: number;
  actions: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showAISummary, setShowAISummary] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const [meetings] = useState<Meeting[]>([
    {
      id: 'MTG-001',
      title: 'Reunión de equipo',
      participants: 5,
      date: '2025-11-12 10:00',
      status: 'active'
    },
    {
      id: 'MTG-002',
      title: 'Presentación de proyecto',
      participants: 8,
      date: '2025-11-12 14:00',
      status: 'scheduled'
    },
    {
      id: 'MTG-003',
      title: 'Sesión de brainstorming',
      participants: 6,
      date: '2025-11-11 16:00',
      status: 'completed'
    }
  ]);

  const [aiSummaries] = useState<AISummary[]>([
    {
      meetingId: 'MTG-003',
      meetingTitle: 'Sesión de brainstorming',
      date: '2025-11-11',
      keyPoints: [
        'Revisión de la estrategia de marketing del cuarto trimestre',
        'Asignación de presupuestos para la nueva campaña',
        'Análisis de la competencia y ajustes de posicionamiento'
      ],
      decisions: 3,
      actions: 3
    },
    {
      meetingId: 'MTG-005',
      meetingTitle: 'Planificación Sprint Q4',
      date: '2025-11-10',
      keyPoints: [
        'Definición de objetivos para el próximo sprint',
        'Distribución de tareas entre el equipo de desarrollo',
        'Revisión de impedimentos técnicos actuales'
      ],
      decisions: 5,
      actions: 8
    }
  ]);

  const handleCreateMeeting = async () => {
    setCreatingMeeting(true);
    try {
      // Tipar la respuesta para que TypeScript reconozca el campo 'id'
      const response: import('../types').ApiResponse<import('../types').Meeting> = await meetingAPI.createMeeting({ name: 'Nueva reunión' });
      if (response.success && response.data && response.data.id) {
        onNavigate(`/meeting/${response.data.id}`);
      } else {
        alert('Error al crear la reunión');
      }
    } catch (err) {
      alert('Error al crear la reunión');
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoiningMeeting(true);
    try {
      const displayName = user?.displayName || 'Invitado';
      const response = await meetingAPI.joinMeeting(joinCode.trim(), displayName);
      if (response.success) {
        onNavigate(`/meeting/${joinCode.trim()}`);
      } else {
        alert(response.message || 'No se pudo unir a la reunión');
      }
    } catch (err) {
      alert('No se pudo unir a la reunión');
    } finally {
      setJoiningMeeting(false);
    }
  };

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-700 hover:bg-green-800">En curso</Badge>;
      case 'scheduled':
        return <Badge className="bg-primary hover:bg-primary/90">Programada</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completada</Badge>;
    }
  };

  // Si se está mostrando el detalle del resumen IA, renderizar esa vista
  if (showAISummary) {
    return <div>Vista de resumen IA (pendiente)</div>;
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl text-foreground">Panel de reuniones</h1>
              <span className="text-sm sm:text-base text-muted-foreground hidden md:inline">• Gestiona tus videollamadas</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('profile')}
                aria-label="Configuración"
                className="w-8 h-8 sm:w-10 sm:h-10"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border hover:opacity-80 transition-opacity"
                aria-label="Ver perfil"
              >
                <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                  <AvatarImage 
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} 
                    alt={user?.displayName || 'Usuario'} 
                  />
                  <AvatarFallback>
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="font-medium text-foreground text-sm">{user?.displayName || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create Meeting */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-foreground mb-2">Crear nueva reunión</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Inicia una videollamada instantánea y comparte el código con tus invitados
                </p>
                <Button
                  onClick={handleCreateMeeting}
                  disabled={creatingMeeting}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  <Video className="w-4 h-4 mr-2" aria-hidden="true" />
                  {creatingMeeting ? 'Creando reunión...' : 'Iniciar reunión ahora'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Join Meeting */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-foreground mb-2">Unirse a una reunión</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Ingresa el código de reunión que te compartieron
                </p>
                <form onSubmit={handleJoinMeeting} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="join-code" className="sr-only">Código de reunión</Label>
                    <input
                      id="join-code"
                      type="text"
                      placeholder="Ej: MTG-001"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Código de reunión"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={joiningMeeting}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                  >
                    {joiningMeeting ? 'Uniendo...' : 'Unirse'}
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        </div>

        {/* Meetings List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-foreground">Mis reuniones</h2>
            <Button variant="ghost" size="sm">
              Ver todas
            </Button>
          </div>

          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Video className="w-6 h-6 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-foreground">{meeting.title}</h3>
                        {getStatusBadge(meeting.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          {meeting.participants} participantes
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {meeting.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Copy className="w-4 h-4" aria-hidden="true" />
                          {meeting.id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0">
                    {meeting.status === 'active' && (
                      <Button
                        onClick={() => onNavigate('room')}
                        className="bg-green-700 hover:bg-green-800 min-w-[140px]"
                      >
                        Unirse ahora
                      </Button>
                    )}
                    {meeting.status === 'scheduled' && (
                      <Button
                        onClick={() => onNavigate('room')}
                        variant="outline"
                        className="min-w-[140px]"
                      >
                        Ver detalles
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copiar código"
                      onClick={() => {
                        navigator.clipboard.writeText(meeting.id);
                      }}
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Summaries Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-xl text-foreground">Resúmenes de reuniones por IA</h2>
            </div>
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {aiSummaries.map((summary) => (
              <Card key={summary.meetingId} className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-cyan-50/50 to-blue-50/50 border-cyan-200/50">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-foreground mb-1">{summary.meetingTitle}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>{summary.date}</span>
                        <span className="text-cyan-600">•</span>
                        <span className="text-cyan-600">{summary.meetingId}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Key Points */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lightbulb className="w-4 h-4 text-cyan-600" aria-hidden="true" />
                      <span>Puntos clave:</span>
                    </div>
                    <ul className="space-y-1.5 pl-6">
                      {summary.keyPoints.slice(0, 2).map((point, index) => (
                        <li key={index} className="text-sm text-foreground list-disc">
                          {point}
                        </li>
                      ))}
                      {summary.keyPoints.length > 2 && (
                        <li className="text-sm text-cyan-600 italic">
                          +{summary.keyPoints.length - 2} puntos más...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    className="w-full border-cyan-300 hover:bg-cyan-50 hover:border-cyan-400 mt-2"
                    size="sm"
                    onClick={() => setShowAISummary(true)}
                  >
                    Ver resumen completo
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {aiSummaries.length === 0 && (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" aria-hidden="true" />
              </div>
              <h3 className="text-foreground mb-2">No hay resúmenes disponibles</h3>
              <p className="text-sm text-muted-foreground">
                Los resúmenes de IA se generarán automáticamente después de cada reunión completada.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
