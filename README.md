# CryptoJournal 📊

**Diario de Trading Cripto profesional** — Registra, analiza y mejora tu performance de trading.

![Dark Theme](https://img.shields.io/badge/theme-dark-1a1a2e)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-5-646cff)

## ✨ Funcionalidades

- **📊 Dashboard** — Stats del mes, Equity Curve, rendimiento por activo
- **📅 Calendario** — Vista mensual con colores por resultado
- **📈 Estadísticas** — Win rate, profit factor, Long vs Short, streaks
- **🗓 Vista Anual** — Gráfico de barras mensual y detalle por año
- **🎙 Comandos de Voz** — Registra operaciones hablando (Web Speech API + Claude)
- **💾 localStorage** — Todos los datos persisten en tu navegador
- **📱 Responsive** — Funciona en móvil y desktop

## 🚀 Stack

- **Frontend**: Vite + React 18
- **Estilos**: CSS custom (glassmorphism, dark theme)
- **Fuentes**: DM Sans, JetBrains Mono, Playfair Display
- **AI**: Anthropic Claude (para parsear voz a datos estructurados)
- **Deploy**: GitHub Pages + Railway

## 🛠 Desarrollo

```bash
npm install
npm run dev
```

## 🔨 Build

```bash
npm run build
npm run preview
```

## 🌐 Deploy

### GitHub Pages
Push a `main` — GitHub Actions hace el deploy automáticamente.
URL: `https://christianaurolomlp.github.io/cryptojournal/`

### Railway
Conecta el repositorio en Railway. El Dockerfile se encarga del build.

## 🎙 Comandos de Voz

1. Ve a **Configuración** y agrega tu API key de Anthropic
2. Haz clic en el botón **🎙 Voz** en la barra superior
3. Habla en español: *"Long en Bitcoin, temporalidad 15 minutos, margen 500 dólares, riesgo 1%, apalancamiento 50x"*
4. El formulario se pre-rellena automáticamente — confirma y guarda

## 📦 Datos

Todos los datos se guardan en `localStorage` del navegador:
- `cj_trades` — operaciones
- `cj_caps` — capital mensual
- `cj_apiKey` — API key de Anthropic

Usa **Configuración → Exportar** para hacer backups.

---

Made with ❤️ by PRAT
