# AINA PLATFORM

## 🧠 Översikt

AINA Platform är en modulär tjänsteplattform för digitala affärssystem, automation och AI-stöd.

Systemet är byggt för att vara:

* Skalbart
* Säkert
* Modulärt
* Produktionsredo

---

## 🧱 Arkitektur

Plattformen är uppbyggd som en **modular monolith på väg mot microservices**.

```text
Client → Proxy → Backend → Data Layer
```

---

## 🧩 Komponenter

### Proxy

* Reverse proxy (Nginx)
* TLS termination
* Routing

### Backend

* FastAPI (Python)
* API + affärslogik
* Modulär struktur

### Data Layer

* SQL-databas
* Cache (Redis)

---

## 📦 Applikationer

Systemet består av flera interna tjänster:

* Platform (core: auth, users, contracts)
* Tasks (task & todo)
* Notes (post-it)
* Insight (analys)
* Eco (ekonomi)
* Invoice (under utveckling)

---

## ⚙️ Teknikstack

* FastAPI
* Nginx
* MariaDB
* Redis
* HTML / JS frontend

---

## 🔐 Säkerhet

* Reverse proxy isolering
* HTTPS (TLS)
* JWT autentisering
* Intern segmentering

---

## 🚀 Status

* Backend: aktiv
* Proxy: aktiv
* Databas: aktiv
* Modularisering: pågående

---

## 🧭 Designprinciper

* Separation of concerns
* Modularitet först
* Microservices vid behov
* Minimal attack surface

---

## 📌 Notering

Detta repository innehåller endast publik struktur.

Intern konfiguration och nätverk är separerat av säkerhetsskäl.
