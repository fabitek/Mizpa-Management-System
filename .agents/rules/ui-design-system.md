---
trigger: always_on
---

# Rule: UI Design System & Component Guidelines

1. **Fuente de Verdad**: Consulta `Design.md` en la raíz antes de crear o refactorizar cualquier componente visual.
2. **Tokens Obligatorios**:
   - Fondo de lienzo: `bg-zinc-950` (`#09090b`).
   - Superficie Bento/Tarjetas: `bg-[#121214]` con bordes `border-zinc-800`.
   - Superficie elevada/Modales: `bg-[#1a1a1e]`.
   - Acento primario / Estados confirmados: `emerald-500` (`#10b981`).
   - Alertas / Waitlist: `amber-500` (`#f59e0b`).
   - Partidos Live / Deudas: `red-500` (`#ef4444`).
3. **Distribución Bento**: Estructura de dashboard inspirada en analítica deportiva (Sidebar fijo con indicador lateral esmeralda, Live Ticker superior y Bento Grid para el partido destacado).
4. **Prohibiciones**:
   - No usar paletas `slate` o `gray`. Usar exclusivamente la escala `zinc` y tokens personalizados de `Design.md`.
   - No alterar la inmutabilidad de la contabilidad (`financial_entries`) al diseñar flujos de liquidación.