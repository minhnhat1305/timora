<div align="center">

# 🎯 TIMORA
### *Session-focused productivity redefined*

[![Version](https://img.shields.io/badge/version-2.1-emerald?style=for-the-badge&logo=semantic-release)](https://github.com/ravixalgorithm/timora)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer-Motion-0055FF?style=for-the-badge&logo=framer)](https://www.framer.com/motion/)

*A modern, feature-rich Pomodoro timer with session-specific task management and beautiful animations*

[🚀 **Live Demo**](https://timora.ravixalgorithm.dev) • [📖 **Documentation**](https://github.com/ravixalgorithm/timora/docs) • [🐛 **Report Bug**](https://github.com/ravixalgorithm/timora/issues) • [✨ **Request Feature**](https://github.com/ravixalgorithm/timora/issues)

![TIMORA Preview](https://via.placeholder.com/800x400/f3f4f6/1f2937?text=TIMORA+Preview)

</div>

---

## ✨ Features

<table>
  <tr>
    <td width="50%">

### ⏰ **Advanced Timer**
- 🕐 **Hours support** - Set timers up to 23 hours
- ⏱️ **Precision timing** - Hours, minutes, and seconds
- 🎨 **Beautiful circular progress** indicator
- ⏸️ **Smart controls** - Start, pause, reset, +5min quick add
- 🌓 **Dark/Light mode** support

### 📋 **Smart Task Management**
- 🎯 **Session-specific tasks** - Tasks tied to timer sessions
- ✅ **General task list** - Persistent tasks across sessions
- 🔄 **Auto-archiving** - Session tasks archived on completion
- 📊 **Progress tracking** - Completion rates and statistics
- 💾 **Auto-save** - All data persisted locally

    </td>
    <td width="50%">

### 📈 **Session Analytics**
- 📅 **Detailed history** - Complete session records
- 🎯 **Task completion rates** - Visual progress indicators
- 📊 **Performance insights** - Track productivity over time
- 🔍 **Session details** - Click any session for full breakdown
- 📱 **Responsive design** - Perfect on all devices

### 🎵 **Enhanced Experience**
- 🔊 **Pleasant audio alerts** - WebAudio API chimes
- 📳 **Vibration support** - Mobile haptic feedback
- ⌨️ **Keyboard shortcuts** - Space, R, C, Esc keys
- 🖥️ **Fullscreen mode** - Distraction-free focus
- 🌟 **Smooth animations** - Framer Motion powered

    </td>
  </tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ravixalgorithm/timora.git
   cd timora
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

---

## 🛠️ Tech Stack

<div align="center">

| Technology | Purpose | Version |
|------------|---------|---------|
| ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white) | UI Framework | 18+ |
| ![Tailwind](https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white) | Styling | 3+ |
| ![Framer Motion](https://img.shields.io/badge/-Framer%20Motion-0055FF?logo=framer&logoColor=white) | Animations | Latest |
| ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) | Build Tool | 4+ |
| ![WebAudio API](https://img.shields.io/badge/-WebAudio%20API-FF6B35?logo=web-audio-api&logoColor=white) | Audio | Native |

</div>

---

## 📱 Screenshots

<div align="center">

### 🖥️ Desktop Experience
![Desktop Timer](https://via.placeholder.com/600x400/f3f4f6/1f2937?text=Desktop+Timer+View)

### 📱 Mobile Responsive
<img src="https://via.placeholder.com/300x600/f3f4f6/1f2937?text=Mobile+View" width="300" alt="Mobile View">

### ⚙️ Configuration Modal
![Configure Timer](https://via.placeholder.com/600x400/f3f4f6/1f2937?text=Configuration+Modal)

</div>

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `R` | Reset timer |
| `C` | Open/Close configuration |
| `Esc` | Close modals |

---

## 🎯 Usage Guide

### Setting Up a Session

1. **Click "Configure"** to open timer settings
2. **Set duration** using hours, minutes, seconds inputs
3. **Add session name** (e.g., "Deep Work", "Study Session")
4. **Add session tasks** - specific to this timer session
5. **Click "Done"** and start your focused work!

### During Your Session

- ✅ **Check off tasks** as you complete them
- ⏰ **Monitor progress** with the circular timer
- 🎵 **Enjoy audio alerts** when time's up
- 📊 **Track completion** rates in real-time

### After Session Completion

- 📈 **Review session** in the history panel
- 🎯 **See task completion** rates and statistics
- 🔄 **Start new session** or adjust current timer
- 💾 **All data saved** automatically

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: Analytics tracking
VITE_ANALYTICS_ID=your_analytics_id

# Optional: Custom branding
VITE_APP_NAME=TIMORA
VITE_APP_VERSION=2.1
```

### Customization

TIMORA is built with customization in mind:

- **Colors**: Modify Tailwind config for custom themes
- **Sounds**: Replace audio generation in `playChime()` function
- **Storage**: Extend localStorage keys in `LS_KEYS` object
- **Features**: Add new session types or timer modes

---

## 🤝 Contributing

We love contributions! Here's how you can help make TIMORA even better:

### 🐛 Bug Reports

Found a bug? [Open an issue](https://github.com/ravixalgorithm/timora/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### ✨ Feature Requests

Have an idea? [Open a feature request](https://github.com/ravixalgorithm/timora/issues) with:
- Clear description of the feature
- Use cases and benefits
- Mockups or examples if helpful

### 🔧 Pull Requests

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 📋 Development Guidelines

- Follow existing code style and patterns
- Add comments for complex logic
- Test on multiple screen sizes
- Ensure accessibility compliance
- Update documentation as needed

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License - feel free to use, modify, and distribute!
```

---

## 🙏 Acknowledgments

<div >

### Built with ❤️ by the community

**Special thanks to:**
- 🎨 **Tailwind CSS** team for amazing utility classes
- ⚡ **Framer Motion** for smooth animations
- ⚛️ **React** team for the fantastic framework
- 🚀 **Vite** for lightning-fast development
- 🌟 **Open source community** for inspiration and feedback

### 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ravixalgorithm/timora&type=Date)](https://star-history.com/#ravixalgorithm/timora&Date)

</div>

---

<div align="center">

### 📞 Connect & Support

[![GitHub](https://img.shields.io/badge/GitHub-ravixalgorithm-181717?style=for-the-badge&logo=github)](https://github.com/ravixalgorithm)
[![Twitter](https://img.shields.io/badge/Twitter-@ravixalgorithm-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/ravixalgorithm)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-ravixalgorithm-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/ravixalgorithm)

**Love TIMORA?** Give us a ⭐ on GitHub and help others discover it!

[⭐ **Star this repo**](https://github.com/ravixalgorithm/timora) • [🐦 **Share on Twitter**](https://twitter.com/intent/tweet?text=Check%20out%20TIMORA%20-%20a%20beautiful%20productivity%20timer!%20https://github.com/ravixalgorithm/timora)

---

*Made with 💎 and ☕ by [@ravixalgorithm](https://github.com/ravixalgorithm)*

**© 2025 TIMORA - Productivity redefined**

</div>
