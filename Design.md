---
version: 2.0-alpha
name: Mizpa Stadium Pro Dashboard
description: Sistema integral para la gestión operativa, deportiva y financiera de partidos de fútbol amateur. Estética nocturna inmersiva inspirada en interfaces de analítica deportiva profesional (tipo SporHub), con control móvil en campo y contabilidad de partida doble inmutable.

colors:
  primary: "#10b981"          # Emerald 500: Acento de césped iluminado, acciones activas, confirmados
  on-primary: "#ffffff"       # Texto sobre primary
  primary-hover: "#059669"    # Emerald 600
  secondary: "#f59e0b"        # Amber 500: Waitlist, advertencias, parqueadero pendiente
  on-secondary: "#000000"
  surface: "#121214"          # Zinc 900 custom: Superficies de tarjetas y contenedores Bento
  surface-elevated: "#1a1a1e" # Panel flotante y modales avanzados
  surface-subtle: "#27272a"   # Zinc 800: Bordes, separadores e inputs
  background: "#09090b"       # Zinc 950: Lienzo principal de inmersión nocturna
  text-primary: "#fafafa"     # Zinc 50: Títulos y valores críticos
  text-secondary: "#a1a1aa"   # Zinc 400: Etiquetas, notas y metadatos
  text-muted: "#71717a"       # Zinc 500: Placeholders y marcas temporales
  danger: "#ef4444"           # Red 500: Partidos en vivo, deudas, cancelaciones
  on-danger: "#ffffff"
  success: "#10b981"          # Saldo positivo, cupo asegurado

typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  h1:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body-base:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  badge-caps:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "0.06em"

spacing:
  scale:
    none: "0px"
    xs: "4px"
    sm: "8px"
    md: "12px"
    base: "16px"
    lg: "20px"
    xl: "24px"
    2xl: "32px"

rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"

components:
  sidebar-item-active:
    backgroundColor: "#10b98115"
    textColor: "{colors.primary}"
    borderLeft: "3px solid {colors.primary}"
    rounded: "0 {rounded.md} {rounded.md} 0"
    padding: "10px 16px"
  card-hero:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
    border: "1px solid {colors.surface-subtle}"
  widget-prediction:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-live:
    backgroundColor: "#ef444420"
    textColor: "#ef4444"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-status-confirmed:
    backgroundColor: "#064e3b" # Emerald 900
    textColor: "#34d399"       # Emerald 400
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-status-waitlist:
    backgroundColor: "#451a03" # Amber 950
    textColor: "#fbbf24"       # Amber 400
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

## 1. Overview & Architecture
El **Mizpa Management System** implementa una arquitectura limpia (*Clean Architecture*) en TypeScript estricto, separando el dominio puro de la infraestructura mediante contenedores de inyección de dependencias (DI Container). Permite un funcionamiento dual mediante la variable de entorno `DATA_SOURCE`:
- **`supabase`**: PostgreSQL de producción protegido con Row Level Security (RLS) y migraciones SQL nativas.
- **`in-memory`**: Persistencia local basada en archivo JSON (`.mizpa-db.json`) para entornos de desarrollo offline y pruebas unitarias rápidas.

---

## 2. Dashboard Layout & Grid System
La interfaz adopta una estructura de **Bento Dashboard** inspirada en plataformas de analítica profesional:
- **Barra Superior Ticker (`LiveTickerBar`)**: Indicador horizontal superior que muestra el estado en vivo de la jornada y accesos rápidos a partidos recientes.
- **Navegación Lateral (`SidebarNav`)**: Menú fijo izquierdo con secciones agrupadas y estados activos marcados con acento esmeralda.
- **Área de Trabajo Central**: Distribución responsiva en rejilla para el próximo partido destacado (*Hero Match*), widgets de métricas financieras y paneles de control de asistencia.

---

## 3. Colors & Surface Hierarchy
La paleta prioriza superficies oscuras profundas con contrastes limpios para visualizar alineaciones, estados de partidos y saldos contables sin fatiga visual.

| Token UI | Valor Hex / Tailwind | Propósito de Uso |
| :--- | :--- | :--- |
| **`background`** | `#09090b` (`bg-zinc-950`) | Lienzo de fondo absoluto de la aplicación. |
| **`surface`** | `#121214` (`bg-zinc-900 custom`) | Tarjetas Bento, contenedores de widgets y paneles principales. |
| **`surface-elevated`** | `#1a1a1e` | Modales flotantes, menús desplegables y tarjetas destacadas. |
| **`surface-subtle`** | `#27272a` (`bg-zinc-800`) | Bordes divisorios, campos de entrada y filas inactivas. |
| **`primary`** | `#10b981` (`bg-emerald-500`) | Botones de acción principal, estados activos de menú y confirmaciones de RSVP. |
| **`secondary`** | `#f59e0b` (`bg-amber-500`) | Indicadores de lista de espera (`WAITLIST`) y avisos de parqueadero. |
| **`danger`** | `#ef4444` (`bg-red-500`) | Indicadores de partidos en vivo (`LIVE`), faltas y saldos negativos/deudas. |

---

## 4. Domain & Business Rules Specifications

### A. Ciclo de Vida del Partido (`MatchStatus`)
- Transiciones estrictas: `DRAFT` ➔ `OPEN_REGISTRATION` ➔ `PLAYED` ➔ `SETTLED` (o `CANCELLED`).
- El estado `SETTLED` sella inmutablemente las transacciones financieras de la fecha y bloquea modificaciones directas sobre el ledger.

### B. Gestión de Asistencia y Convocatorias
- Estados: `CONFIRMED`, `WAITLIST`, `CANCELLED`, `ATTENDED`.
- Al alcanzarse el límite de `maxPlayers`, las nuevas solicitudes pasan automáticamente a `WAITLIST` por orden de llegada. La liberación de un cupo promueve instantáneamente al primer miembro en espera.
- Soporte para acompañantes (`guestName`) y registro de vehículos (`has_vehicle`, `vehicle_plate`) para tarificación de parqueadero.

### C. Módulo Financiero e Inmutabilidad Contable
- Transacciones de doble entrada mediante `FinancialEntryType` (`DEBIT` para cobro de cuotas y `CREDIT` para abonos o pagos).
- Fórmula de cuota por asistente: $\text{Cuota} = \frac{\text{Costo Alquiler} + \text{Costos Extras}}{\text{Jugadores Asistentes}}$.
- Saldo consolidado del jugador: $\sum \text{Créditos} - \sum \text{Débitos}$.

---

## 5. Components & Interactive States

### 5.1 Tarjeta de Partido Destacado (`HeroMatchCard`)
- **Estructura**: Contenedor principal con fondo `surface`, esquinas redondeadas `lg` (16px) y borde sutil en `surface-subtle`.
- **Elementos internos**: Temporizador de cuenta regresiva para el pitazo inicial, avatares de capitanes o equipos enfrentados, y botones de acción rápida con el tono `primary`.

### 5.2 Insignias de Convocatoria (`AttendanceBadge`)
- **Confirmado (`CONFIRMED`)**: Fondo verde oscuro translúcido (`#064e3b`), texto verde brillante (`#34d399`), esquinas completamente redondeadas (`full`).
- **En Espera (`WAITLIST`)**: Fondo ámbar oscuro translúcido (`#451a03`), texto ámbar brillante (`#fbbf24`), esquinas `full`.

---

## 6. Integrations & MCP Protocol
- **Herramientas MCP Stateless**: Exposición de funciones tipadas con Zod (`create_match`, `register_rsvp`, `settle_match_finances`) para automatización agentica y gestión vía IA.
- **Generación de Prompts Visuales**: Estándar para la creación de pósters de convocatoria y MVP utilizando fotografía deportiva cinematográfica con lentes 85mm f/1.4, iluminación nocturna sobre césped sintético y profundidad de campo (*bokeh*).

---

## 7. Do's and Don'ts

- **DO**: Utiliza la barra de navegación lateral con indicadores de selección activos en esmeralda para mantener al usuario ubicado en todo momento dentro de los módulos operativos.
- **DO**: Respeta la inmutabilidad de los registros contables en partidas liquidadas (`SETTLED`), reflejando los saldos en tablas con acentos de color estrictamente controlados (`success` vs `danger`).
- **DON'T**: Mezcle escalas de grises frías (`slate` o `blue-gray`); mantén toda la neutralidad cromática bajo la familia `zinc`.
- **DON'T**: Introduzca modificaciones directas sobre la base de datos de producción sin pasar por los casos de uso validados en Clean Architecture y sus adaptadores de repositorio correspondientes.