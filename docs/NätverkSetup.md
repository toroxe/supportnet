# 🌐 Network Setup – Aina Platform

## 📅 Datum
2026-04-19

---

## 🔑 Publik IP


37.123.142.46


- ISP: Bahnhof
- Location: Stockholm
- Status: ✅ Publik (ej CGNAT)

---

## 🌍 DNS (Loopia)


my.supportnet.se → 82.196.123.200 ❌ (gammal / död)


### ➡️ Ska ändras till:


my.supportnet.se → 37.123.142.46 ✅


---

## 🏠 Lokalt nät


Subnet: 192.168.0.0/24
Gateway: 192.168.0.1


---

## 🖥️ Servrar (vDC)

| Namn            | IP             | Roll        |
|-----------------|---------------|------------|
| Aina-core       | 192.168.0.50  | Core       |
| aina-app01      | 192.168.0.55  | App        |
| aina-compute01  | 192.168.0.52  | Compute    |
| aina-idp01      | 192.168.0.53  | Identity   |
| aina-proxy01    | 192.168.0.60  | Proxy 🌍   |

---

## 🔀 Trafikflöde


Internet
↓
37.123.142.46 (Router)
↓
192.168.0.60 (Nginx proxy)
↓
192.168.0.55 (App)


---

## 🔧 Router (D-Link)

### Port forwarding


80 → 192.168.0.60
443 → 192.168.0.60

## 🔍 Snabbkommandon

### Publik IP
curl ifconfig.me/ip

### DNS check
nslookup my.supportnet.se

### Intern test
ping 192.168.0.60

### Proxy test
curl http://192.168.0.60
