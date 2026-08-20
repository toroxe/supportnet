# Aina-idp01 – identitet, contract och sessionsblueprint

> **Status:** Arkitekturbas för implementation<br>
> **Version:** 0.1<br>
> **Datum:** 2026-08-19<br>
> **Beslutsägare:** Tord<br>
> **Teknisk verifiering:** Aina_Core

## 1. Syfte

`Aina-idp01` ska vara MySupportNets separata identitets- och sessionsplattform. Den ska autentisera människor, hålla deras medlemskap i ett eller flera contract och ge övriga Aina-tjänster ett verifierat säkerhetskontext.

Lösningen ska från början stödja:

- en global identitet per människa;
- medlemskap i ett eller flera contract;
- olika roller i olika contract;
- MySupportNet-administratörer med plattformsbehörighet;
- ett aktivt contract per browsersession;
- serverlagrade, återkallningsbara sessioner;
- AI-funktioner, budgetar och begränsningar per contract;
- separata utvecklings-, QA- och produktionsmiljöer.

## 2. Grundprinciper

1. **Identitet är global.** En e-postadress motsvarar en identitet, inte en identitet per contract.
2. **Contract är säkerhetsgränsen.** Affärsdata, AI-policy och användarbehörighet isoleras per contract.
3. **Medlemskapet binder ihop identitet och contract.** Rollen tillhör medlemskapet.
4. **Administrator är en roll och ett scope.** Det ska inte finnas ett separat administratörslösenordssystem.
5. **Browsern äger inte autentiseringshemligheten.** Inga auth-token lagras i `localStorage` eller `sessionStorage`.
6. **Servern avgör behörighet.** Frontend får visa contract och roller men får aldrig vara beslutspunkt.
7. **Allt säkerhetsrelevant ska kunna återkallas och loggas.** Sessioner, medlemskap och roller ska kunna spärras omedelbart.
8. **Inga credentials i filer eller scripts.** Hemligheter injiceras via miljö/secret store och får aldrig versionshanteras.

## 3. Arkitektur

```text
Internet / Browser
        |
        | HTTPS
        v
my.supportnet.se / reverse proxy
        |
        +---------------------> Aina-app01
        |                        - frontend
        |                        - verksamhets-API
        |                        - affärsdata
        |                        - AI-anrop
        |
        +---------------------> Aina-idp01
                                 - autentisering
                                 - sessionsvalidering
                                 - contractkatalog
                                 - medlemskap och roller
                                 - AI-policykälla
                                 - säkerhetslogg
                                        |
                                        v
                                 aina_identity_<miljö>
```

### 3.1 Serveransvar

| Komponent | Ansvar | Ska inte innehålla |
|---|---|---|
| `Aina-idp01` | Identiteter, lösenordshashar, medlemskap, roller, sessioner, säkerhetslogg och contractpolicy | Affärsdokument och applikationsdata |
| `Aina-app01` | Frontend, verksamhetslogik, contractbunden affärsdata och AI-orchestrering | Lösenord, refresh-token eller egen parallell användarkatalog |
| Identity DB | IdP:ns enda beständiga källa | Klartextlösenord eller produktionsdata i `_dev` |
| App DB | Affärsdata med `contract_id` och `idp_subject` | Autentiseringshemligheter |

Kommunikation mellan `Aina-app01` och `Aina-idp01` ska gå över ett skyddat internt nät. Produktionsmålet är ömsesidigt autentiserad TLS eller motsvarande serviceidentitet.

## 4. Domänmodell

```text
Identity
  |
  +-- PlatformRole (valfri)
  |
  +-- ContractMembership -- Contract
  |         |                 |
  |         +-- role          +-- AI policy
  |         +-- status        +-- plan/status
  |         +-- giltighet     +-- usage/quota
  |
  +-- Session
            +-- active_contract_id
```

### 4.1 Identity

En människa har exakt en global identitet. E-post normaliseras och är globalt unik. Samma identitet kan vara medlem i flera contract.

### 4.2 Contract

Contract är den översta tenant- och företagsnivån. MySupportNet skapar, aktiverar, spärrar och administrerar contract tills en framtida delegerad modell beslutas.

Föreslagna contracttyper:

- `system` – interna MySupportNet-funktioner;
- `lab` – avgränsad test- och utvärderingsmiljö;
- `customer` – aktiv kundmiljö.

### 4.3 ContractMembership

Medlemskapet kopplar en identitet till ett contract. Samma person kan exempelvis vara:

- `contract_admin` i Contract A;
- `user` i Contract B;
- `user` i ett eget labbcontract.

Det ska bara finnas ett medlemskap per kombination av identitet och contract.

### 4.4 Roller

| Roll | Scope | Avsikt |
|---|---|---|
| `platform_admin` | Plattform | Hanterar contract, plattformsroller och säkerhetsincidenter |
| `contract_admin` | Contract | Framtida delegerad administration inom ett contract |
| `user` | Contract | Använder tillåtna funktioner inom contractets gränser |

`platform_admin` ska inte automatiskt få tillgång till kunddata. Åtkomst till kunddata ska vara en separat, loggad och uttrycklig supportfunktion.

## 5. Labbmodell

Alla blivande kunder ska inte dela ett aktivt labbcontract. I stället används en mall:

```text
LAB_TEMPLATE
    |
    +-- skapar --> LAB-<UUID>
```

Varje labbcontract får egen:

- datayta;
- medlemslista;
- AI-policy;
- tokenbudget och rate limit;
- revisionslogg;
- livscykel och utgångsdatum.

Ett godkänt labbcontract kan senare ändras från `lab` till `customer` utan att identiteter eller affärsdata behöver flyttas.

## 6. Databasblueprint

Alla primärnycklar bör vara UUID. Tider lagras i UTC. E-post ska normaliseras före jämförelse och få ett unikt index.

### 6.1 Centrala tabeller

```text
identities
  identity_id UUID PK
  email_original VARCHAR
  email_normalized VARCHAR UNIQUE
  password_hash VARCHAR
  status ENUM(pending, active, locked, disabled)
  email_verified_at DATETIME NULL
  created_at DATETIME
  updated_at DATETIME
  password_changed_at DATETIME NULL

contracts
  contract_id UUID PK
  contract_code VARCHAR UNIQUE
  display_name VARCHAR
  contract_type ENUM(system, lab, customer)
  status ENUM(pending, active, suspended, closed)
  ai_policy_id UUID
  created_at DATETIME
  updated_at DATETIME

contract_memberships
  membership_id UUID PK
  identity_id UUID FK
  contract_id UUID FK
  role ENUM(contract_admin, user)
  status ENUM(invited, active, suspended, revoked)
  valid_from DATETIME
  valid_until DATETIME NULL
  created_at DATETIME
  updated_at DATETIME
  UNIQUE(identity_id, contract_id)

platform_roles
  identity_id UUID FK
  role ENUM(platform_admin)
  status ENUM(active, suspended, revoked)
  created_at DATETIME
  UNIQUE(identity_id, role)

sessions
  session_id UUID PK
  session_secret_hash VARCHAR UNIQUE
  identity_id UUID FK
  active_contract_id UUID FK NULL
  created_at DATETIME
  last_seen_at DATETIME
  idle_expires_at DATETIME
  absolute_expires_at DATETIME
  revoked_at DATETIME NULL
  revoked_reason VARCHAR NULL

ai_policies
  ai_policy_id UUID PK
  name VARCHAR UNIQUE
  allowed_models JSON
  allowed_tools JSON
  monthly_token_limit BIGINT
  request_rate_limit INT
  retention_days INT
  status ENUM(active, disabled)

contract_ai_usage
  usage_id UUID PK
  contract_id UUID FK
  identity_id UUID FK
  model VARCHAR
  input_tokens BIGINT
  output_tokens BIGINT
  occurred_at DATETIME

audit_events
  event_id UUID PK
  occurred_at DATETIME
  actor_identity_id UUID NULL
  contract_id UUID NULL
  session_id_hash VARCHAR NULL
  event_type VARCHAR
  result ENUM(success, denied, failure)
  metadata JSON
```

Ytterligare tabeller kommer att behövas för inbjudningar, e-postverifiering, lösenordsåterställning, MFA och blockerade autentiseringsförsök. Engångshemligheter ska lagras hashade och ha kort giltighetstid.

## 7. Sessionsmodell

Browsern får en ogenomskinlig, slumpmässig sessionshemlighet. Endast hashvärdet lagras i databasen.

Sessionshemligheten ska ha minst 256 bitars entropi. För databassökning lagras ett HMAC-SHA-256-värde med en separat serverhemlighet; rå sessionshemlighet får aldrig loggas eller sparas.

```http
Set-Cookie: __Host-aina_session=<opaque-secret>;
            Secure;
            HttpOnly;
            SameSite=Strict;
            Path=/
```

Cookien ska sakna `Domain`, `Max-Age` och `Expires`. Det gör den icke-beständig. Servern ska dessutom använda:

- inaktivitetsgräns, föreslaget 30 minuter;
- absolut maxlivslängd, föreslaget 8 timmar;
- sessionrotation efter login, contractbyte och behörighetsökning;
- omedelbar spärr vid logout, kontospärr eller medlemskapsändring;
- `Cache-Control: no-store` för autentiserade svar.

Browsers stängningsbeteende kan inte ensamt vara säkerhetsgräns eftersom vissa browsers återställer sessionstillstånd. Serverns sessionstabell, timeout och återkallning är slutlig auktoritet.

## 8. Aktivt contract

Varje browsersession har exakt ett `active_contract_id`.

### 8.1 Efter login

- Noll aktiva medlemskap: neka åtkomst och visa supportväg.
- Ett aktivt medlemskap: välj contract automatiskt.
- Flera aktiva medlemskap: visa contractsida och kräv val.

### 8.2 Contractbyte

1. Browsern begär byte till ett `contract_id`.
2. IdP:n verifierar ett aktivt medlemskap.
3. Sessionens `active_contract_id` uppdateras.
4. Sessionshemligheten roteras.
5. Händelsen loggas.
6. Appens contractbundna cache och vy återställs.

Frontendens `contract_id` är indata, aldrig bevis på behörighet. Backend ska alltid härleda den slutliga säkerhetskontexten från validerad session.

## 9. AI-policy och verkställighet

IdP:n är källa för contractets identitet och policy. Själva verkställigheten sker vid varje AI-anrop i serverlagret.

Kontrollen ska minst omfatta:

- aktiv session;
- aktivt medlemskap i valt contract;
- tillåten funktion och modell;
- kvarvarande contractbudget;
- rate limit;
- datalagrings- och loggningspolicy;
- explicit nekande om policy saknas.

Ingen AI-begränsning får enbart ligga i frontend, i ett JWT-claim eller i systemprompten.

## 10. Föreslagna gränssnitt

Exakta URL:er fastställs efter kodinventering. Följande förmågor behövs:

```text
POST /auth/login
POST /auth/logout
GET  /auth/session
GET  /auth/contracts
POST /auth/session/contract

POST /admin/contracts
PATCH /admin/contracts/{contract_id}
POST /admin/contracts/{contract_id}/memberships
PATCH /admin/memberships/{membership_id}

POST /internal/session/validate
GET  /internal/contracts/{contract_id}/ai-policy
POST /internal/contracts/{contract_id}/ai-usage
```

`/internal/*` ska aldrig vara publikt åtkomligt. Ett etablerat OIDC-flöde är långsiktigt föredraget framför ett egenbyggt tokenprotokoll. Ingen egen kryptografi ska konstrueras.

## 11. Konfigurationsblueprint

Följande är nyckelnamn, inte riktiga värden:

```dotenv
AINA_IDP_ENV=dev
AINA_IDP_BIND_HOST=127.0.0.1
AINA_IDP_BIND_PORT=8100

AINA_IDP_DATABASE_URL=<injected-secret>
AINA_IDP_DATABASE_POOL_SIZE=5
AINA_IDP_DATABASE_POOL_RECYCLE_SECONDS=1800

AINA_IDP_COOKIE_NAME=__Host-aina_dev_session
AINA_IDP_COOKIE_SECURE=true
AINA_IDP_COOKIE_HTTPONLY=true
AINA_IDP_COOKIE_SAMESITE=strict
AINA_IDP_COOKIE_PATH=/

AINA_IDP_SESSION_IDLE_SECONDS=1800
AINA_IDP_SESSION_ABSOLUTE_SECONDS=28800
AINA_IDP_SESSION_ROTATE_ON_CONTRACT_SWITCH=true

AINA_IDP_PASSWORD_HASHER=argon2id
AINA_IDP_PASSWORD_MIN_LENGTH=15
AINA_IDP_LOGIN_MAX_ATTEMPTS=5
AINA_IDP_LOGIN_WINDOW_SECONDS=900

AINA_IDP_PUBLIC_ORIGIN=https://dev.example.invalid
AINA_IDP_TRUSTED_ORIGINS=https://dev.example.invalid
AINA_IDP_INTERNAL_AUDIENCE=aina-app01-dev

AINA_IDP_AUDIT_LEVEL=security
AINA_IDP_LOG_SESSION_SECRETS=false
```

Regler:

- Dev, QA och produktion ska ha olika databaser, cookies, nycklar och serviceidentiteter.
- Produktionshemligheter får aldrig kopieras till `_dev`.
- `Secure=false` får endast tillåtas på uttryckligt lokal `localhost` utan riktiga användare.
- Bootstrap-admin skapas med ett engångskommando och interaktiv hemlighet, inte med ett permanent lösenord i `.env`.

## 12. Utvecklingsdatabas

Första implementationen ska använda:

```text
Databas:      aina_identity_dev
Servicekonto: aina_idp_dev
Ägare:        Aina-idp01 utvecklingsmiljö
Data:         syntetiska testidentiteter och testcontract
```

Servicekontot ska endast ha nödvändiga rättigheter i `aina_identity_dev`. Schema skapas genom versionshanterade migrationer och inte genom manuella produktionskommandon.

Minsta seeddata:

- ett `system`-contract;
- en labbpolicy;
- två separata labbcontract;
- en testidentitet med ett medlemskap;
- en testidentitet med medlemskap i två contract;
- en testidentitet med olika roller i två contract;
- en bootstrapad testadmin utan produktionsbehörighet.

## 13. Migrering från nuvarande databas

1. Inventera nuvarande `users`, `contracts`, hashmetod, relationer och authkod.
2. Skapa IdP-schemat och stabila UUID:n.
3. Lägg till `idp_subject` där appdatabasen behöver identitetsreferens.
4. Backfilla `contract_memberships` från nuvarande användar-contractkoppling.
5. Importera endast kompatibla säkra lösenordshashar. Annars krävs lösenordsåterställning.
6. Kör gamla credentialfält skrivskyddade under parallell QA.
7. Verifiera login, logout, contractbyte, admin/user och tenantisolering.
8. Tord fattar separat beslut om cutover.
9. Gamla credentialkolumner raderas först efter verifierad backup och uttryckligt destruktivt beslut.

Ingen migration får flytta eller logga klartextlösenord.

## 14. Testblueprint

### 14.1 Identitet och login

- korrekt login;
- fel lösenord utan informationsläckage;
- låsning/rate limit;
- inaktiv och spärrad identitet;
- sessionrotation efter login;
- logout och återanvändning av gammal session.

### 14.2 Contractisolering

- user med ett contract;
- user med flera contract;
- olika roller i olika contract;
- nekat byte till contract utan medlemskap;
- spärrat medlemskap;
- inga data från föregående contract efter byte;
- samtidiga anrop under contractbyte.

### 14.3 Administrator

- platform admin kan administrera contract;
- vanlig user nekas adminendpoint;
- supportåtkomst kräver separat, loggad handling;
- privilegieändring roterar session;
- admin-MFA före produktionsgodkännande.

### 14.4 AI-policy

- tillåten och nekad modell;
- budgetgräns;
- rate limit;
- usage bokförs på aktivt contract;
- labbdata kan inte läsas från annat labbcontract;
- deny-by-default när policy saknas.

### 14.5 Session

- `Secure`, `HttpOnly`, `SameSite=Strict` och host-only-cookie;
- ingen `Max-Age` eller `Expires`;
- idle timeout;
- absolut timeout;
- serverinvalidering;
- `Cache-Control: no-store`;
- inga token i browserstorage, URL eller logg.

## 15. Implementationsordning

1. Inventera `Aina-idp01`, nuvarande authkod och databasschema.
2. Fastställ protokoll och intern trafikväg.
3. Skapa `aina_identity_dev` och migrationsstruktur.
4. Implementera identities, contracts och memberships.
5. Implementera lösenordshashning och login med rate limit.
6. Implementera serverlagrade sessioner och säker cookie.
7. Implementera contractval och contractbyte.
8. Implementera appens sessionsmiddleware.
9. Implementera AI-policykontroll och usage.
10. Migrera syntetisk data och kör hela testmatrisen.
11. Migrera befintliga QA-identiteter kontrollerat.
12. Genomför säkerhetsgranskning före produktionsbeslut.

## 16. Beslutsgrindar

Följande kräver Tords uttryckliga beslut:

- val av IdP-ramverk/protokoll;
- fysisk placering och backup för identity DB;
- produktionsdomän och proxyväg;
- admin-MFA-metod;
- timeoutvärden;
- migrering av riktiga användare;
- produktionscutover;
- radering av gamla credentialkolumner.

## 17. Definition of Done för första `_dev`-steget

Steget är klart först när:

- `Aina-idp01` kör isolerat från `Aina-app01`;
- `aina_identity_dev` skapas av migrationer;
- testidentiteter kan ha medlemskap i flera contract;
- login skapar en serverlagrad session och säker cookie;
- sessionen får ett verifierat aktivt contract;
- contractbyte roterar session och loggas;
- tenantisolering har negativa tester;
- AI-policy nekas som standard och verkställs per contract;
- inga auth-token finns i browserstorage;
- inga hemligheter eller personuppgifter finns i versionshanterade filer;
- rollback och återställning är observerbart testade.

---

Denna blueprint beskriver målarkitekturen. Exakta tabelltyper, migrationsfiler, API-kontrakt och driftscript fastställs efter inventering av den faktiska koden och `Aina-idp01`-miljön.

## 18. Säkerhetsreferenser

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B – Authentication and Lifecycle Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
