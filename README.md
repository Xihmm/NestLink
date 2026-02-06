# 🏠 NestLink | AI-Powered Student Housing & Roommate Platform

![Status](https://img.shields.io/badge/Status-MVP_80%25-orange)
![Tech](https://img.shields.io/badge/Tech-React_Native_%7C_Firebase-blue)
![Role](https://img.shields.io/badge/Role-Founder_%26_Full--stack_Dev-green)

**NestLink** is a production-ready mobile application designed to solve the fragmented and privacy-deficient nature of student housing markets (specifically for the UR/RIT community). By replacing scattered WeChat groups and Facebook posts with a structured, high-privacy platform, NestLink empowers students to find compatible roommates and sublets with ease. 
---

## 🚀 Product Vision & AI Strategy (PM Insight)
As the **Founder**, I identified key pain points in the international student housing journey: information asymmetry and lack of trust. 

* **AI-Assisted Matching Pipeline:** Beyond basic filters, NestLink is architected to include a matching pipeline that scores user compatibility using structured profile features and weighted heuristics. 
* **Explainable Matching:** Unlike opaque "black-box" rankings, our system prioritizes transparency, explicitly handling "cold-start" users to ensure fair visibility for new listings. 
* **Privacy-First Design:** Features an anonymous posting system and a "Request-to-Connect" model to protect user identity until mutual interest is confirmed.

---

## 🛠️ Tech Stack & Engineering (SWE Focus)
I implemented the full application stack with a focus on modularity and scalability: 

* **Frontend:** React Native with **TypeScript** and **Expo Router** for a robust, file-based navigation system (Feed, Post, Detail pages). 
* **Backend & Auth:** Integrated **Firebase Authentication** (including Anonymous Auth) and **Cloud Firestore** for secure identity management and real-time data modeling. 
* **Data Persistence:** Resolved complex persistence initialization issues in the React Native environment using **AsyncStorage**.
* **API Design:** Designed backend schemas to enable efficient profile ingestion and real-time updates while maintaining high performance. 

---

## 📂 Current Progress (MVP 80%)
| Feature | Status | Description |
| :--- | :--- | :--- |
| **Core UI Architecture** | ✅ Done | Complete Expo Router tab system & card-based Feed UI. |
| **Dynamic Posting System** | ✅ Done | Complex form logic with dynamic field validation & anonymous toggle. |
| **Firebase Integration** | ✅ Done | Auth & SDK initialization with persistence fixes. |
| **Firestore Cloud Sync** | 🚧 WIP | Migrating local mock data to live Cloud Firestore. |
| **Real-time Updates** | 🚧 WIP | Implementing listeners for instant Feed refreshes. |

---

## 📁 Repository Structure
```text
.
├── app/                # Expo Router - File-based navigation
├── components/         # Reusable UI components (Cards, Forms, Buttons)
├── constants/          # Theme, Config, and Mock Data
├── hooks/              # Custom React hooks for Firebase & UI logic
├── lib/                # Firebase initialization & Utility functions
├── types/              # TypeScript interfaces for Post & User models
└── app.json            # Expo configuration
