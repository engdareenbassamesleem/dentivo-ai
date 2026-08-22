# 🦷 Dentivo AI

> **AI-powered patient engagement and clinic workflow assistant for dental practices.**

Dentivo AI is a web application designed to demonstrate how generative AI can support dental clinics by assisting with patient communication, booking requests, lead collection, and basic clinic workflow management.

The project combines a React-based dashboard with Firebase services and a Gemini-powered conversational assistant.

## ✨ Features

- 🤖 **AI Patient Assistant** — Answers common clinic questions and guides patients through booking requests.
- 📅 **Booking Request Collection** — Collects key appointment details such as name, phone number, requested service, preferred date, and preferred time.
- 👥 **Patient Management** — Provides an interface for viewing and managing patient records.
- 📊 **AI Dashboard** — Centralized dashboard interface for clinic-related information and activity.
- 🔐 **Authentication** — Supports Google sign-in and email/password authentication through Firebase Authentication.
- ☁️ **Cloud Data Storage** — Uses Cloud Firestore for application data.
- 🧠 **Structured AI Behavior** — The assistant follows a system instruction designed to keep conversations focused on clinic information, lead qualification, and booking requests.

## 🧠 How the AI Assistant Works

The Gemini-powered assistant is configured to:

1. Answer common questions about the clinic.
2. Guide patients through the appointment-request process.
3. Collect booking information step by step.
4. Handle missing information conversationally.
5. Summarize collected details before the request is forwarded for staff confirmation.
6. Avoid inventing medical advice.

> **Note:** Dentivo AI is a demonstration project and does not replace professional medical advice or clinical systems.

## 🏗️ Architecture

```text
Patient / Clinic User
        │
        ▼
 React + TypeScript UI
        │
        ├──────────────► Firebase Authentication
        │
        ├──────────────► Cloud Firestore
        │
        └──────────────► Gemini AI
                              │
                              ▼
                    Conversational Responses
                    Booking Data Collection
                    Lead Qualification
```

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 | Frontend user interface |
| TypeScript | Type-safe application development |
| Vite | Development and build tooling |
| Firebase Authentication | User authentication |
| Cloud Firestore | Application data storage |
| Google GenAI / Gemini | AI-powered conversational assistant |
| Tailwind CSS | UI styling |
| Motion | Interface animations |
| Recharts | Dashboard data visualization |
| Lucide React | Interface icons |

## 📂 Project Structure

```text
dentivo-ai/
├── src/
│   ├── App.tsx          # Main application interface
│   ├── main.tsx         # Application entry point
│   ├── index.css        # Global styles
│   └── lib/
│       ├── firebase.ts  # Firebase configuration and authentication
│       ├── gemini.ts    # Gemini AI integration
│       └── utils.ts     # Utility functions
├── firebase-applet-config.json
├── firestore.rules
├── package.json
└── vite.config.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- A Firebase project
- A Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/engdareenbassamesleem/dentivo-ai.git
cd dentivo-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file and add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

Configure Firebase using the project's Firebase configuration setup.

### 4. Run the development server

```bash
npm run dev
```

The application will run locally using the Vite development server.

## 🎯 Project Goal

Dentivo AI was built as a portfolio project exploring the combination of:

- Generative AI
- Conversational interfaces
- AI-assisted lead qualification
- Appointment-request workflows
- Firebase-based web applications
- SaaS product and system design

The project focuses on demonstrating how AI can be integrated into a practical workflow for a specific industry rather than serving as a general-purpose chatbot.

## 🔮 Future Improvements

- [ ] Automated appointment availability checking
- [ ] Structured booking workflow integration
- [ ] Admin controls for clinic-specific AI instructions
- [ ] Multi-clinic support
- [ ] Analytics and conversion tracking
- [ ] Workflow automation integrations
- [ ] Improved separation of frontend components and application services

## 👩‍💻 Author

**Dareen Esleem**

AI Engineer focused on building AI-powered applications, automation workflows, and intelligent systems.

- GitHub: https://github.com/engdareenbassamesleem
- LinkedIn: https://www.linkedin.com/in/dareenesleem2001/

---

⭐ If you find this project interesting, feel free to explore the code and follow the project for future updates.
