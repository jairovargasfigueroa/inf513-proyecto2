import {
    ArrowLeftRight, CalendarDays, Camera, CircleUser, Clock, FileBarChart, FileText, Grid3x3,
    LayoutDashboard, LayoutTemplate, ListOrdered, Menu, ScrollText, TrendingUp, Tv, UserCog, Users,
} from 'lucide-react';

// Nombre del ícono guardado en la tabla menu → componente que se dibuja.
const ICONOS = {
    panel: LayoutDashboard,
    analitica: TrendingUp,
    reportes: FileBarChart,
    agenda: CalendarDays,
    notas: FileText,
    programas: Tv,
    plantillas: LayoutTemplate,
    escaletas: ListOrdered,
    personal: Users,
    turnos: Clock,
    recursos: Camera,
    prestamos: ArrowLeftRight,
    usuarios: UserCog,
    matriz: Grid3x3,
    menu: Menu,
    bitacora: ScrollText,
    perfil: CircleUser,
};

export default function Icono({ nombre, className = 'h-5 w-5' }) {
    const Componente = ICONOS[nombre] ?? CircleUser;
    return <Componente className={className} aria-hidden="true" />;
}
