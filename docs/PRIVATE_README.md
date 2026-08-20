# 🔐 AINA PLATFORM – PRIVATE INFRASTRUCTURE

## 🧠 Översikt

AINA Platform körs i ett internt vDC-nät och är uppbyggt enligt en **segmenterad, modulär arkitektur** där varje nod har ett tydligt ansvar.

Systemet är designat för:

* Isolering mellan lager
* Minimal attack surface
* Enkel skalning
* Kontrollerad drift

---

## 🌐 Nätverk

```txt
Subnet: 192.168.0.0/24
Gateway: 192.168.0.1
```

### Publik ingress

* All extern trafik går via router (NAT)
* Endast portar:

  * 80 (HTTP)
  * 443 (HTTPS)

---

## 🖥️ Noder

### 🔵 proxy01 (.60)

```txt
Roll: Reverse Proxy / Ingress
Tech: Nginx
```

Ansvar:

* TLS termination (Certbot)
* HTTP → HTTPS redirect
* Routing till backend
* Security filtering
* Loggning

#### Routing

```txt
/        → app01:8000
/docs    → app01:8000/docs
```

#### Säkerhet

* Blockerade paths:

  * .env
  * .git
  * wp-admin
  * phpmyadmin
* Security headers
* WebSocket support

---

### 🟢 app01 (.55)

```txt
Roll: Applikationsserver
Tech: FastAPI (uvicorn)
```

Kör flera interna tjänster (modulär struktur):

```txt
/app
├── platform        (core)
├── tasks           (task + todo)
├── notes           (post-it)
├── insight         (usecase/analys)
├── eco             (ekonomi)
├── invoice         (planerad)
```

#### Platform (core)

* Auth (JWT)
* Users
* Contracts
* Dashboard (userboard)
* Janitor (admin)

#### Drift

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Princip

```txt
platform → inga externa beroenden
appar → får bero på platform
```

---

### 🟡 compute01 (.52)

```txt
Roll: Data layer
```

#### MariaDB

* Primär databas
* Kör på intern port
* Används av app01

Innehåller:

* Users
* Contracts
* Transactions
* Services

---

#### Redis

```txt
Port: 6379
Bind: intern IP + localhost
Auth: aktiverad
```

Används för:

* Sessions
* Cache
* (framtid) rate limiting

---

## 🔗 Trafikflöde

```txt
Client
↓
Internet
↓
Router (NAT)
↓
proxy01 (.60)
↓
app01 (.55)
↓
compute01 (.52)
```

---

## 🔐 Säkerhetsmodell

### Extern exponering

```txt
✔ Endast proxy exponeras
❌ Backend ej direkt åtkomlig
❌ DB ej exponerad
```

---

### Intern trafik

```txt
✔ Privat nät
✔ Direkt node-to-node kommunikation
```

---

### Autentisering

* JWT (FastAPI)
* Token innehåller:

  * user_id
  * contract_id
  * namn

---

### Redis säkerhet

* Password skydd
* Ej publik access
* Bindad till intern IP

---

## ⚙️ Deployment

### Nuvarande

```txt
✔ Uvicorn per app
✔ Manuell deploy
✔ Nginx routing
✔ Ingen containerisering
```

---

### Planerad

```txt
→ Containerisering (Docker)
→ Separata tjänster per app
→ Skalning vid behov
```

---

## 📁 Struktur (app01)

```txt
/app/backend
├── api/
├── auth/
├── db/
├── userapi/
├── main.py
```

(under refaktorering till modulär struktur)

---

## 🔧 Konfiguration

### Nginx

```txt
/etc/nginx/sites-enabled/aina.conf
```

---

### SSL

```txt
/etc/letsencrypt/live/
```

---

### Backend

```txt
/app/backend
```

---

## 🧪 Driftkommandon

### Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### FastAPI

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### Redis

```bash
redis-cli
AUTH <password>
PING
```

---

### MariaDB

```bash
mysql -u root -p
```

---

## 🚨 Viktiga principer

```txt
- Ingen direkt DB access utifrån
- Proxy är enda ingress
- All trafik loggas
- Ändringar testas innan reload
- Ingen “quick fix” i prod
```

---

## 📌 Status

```txt
✔ Proxy: aktiv
✔ Backend: aktiv
✔ MariaDB: aktiv
✔ Redis: aktiv
✔ Auth: aktiv
✔ Modularisering: pågående
```

---

## 🚀 Nästa steg

* Separera appar (tasks, eco, etc.)
* Införa Redis session management fullt ut
* Rate limiting
* Invoice service
* Containerisering

---

## 🧭 Notering

Detta dokument innehåller intern struktur och ska:

```txt
❌ EJ publiceras
❌ EJ delas externt
✔ hållas lokalt / privat repo
```

---

/ AINA Infra
