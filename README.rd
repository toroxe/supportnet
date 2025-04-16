README för FastAPI Web Application med MariaDB och Nginx

1. Servermiljö
IP-adresser:

Intern: 192.168.0.180
Publik: Via Loopia på domänen my.supportnet.se.
Operativsystem:

Ubuntu 20.04 LTS
Python-version:

Python 3.10 (via virtuellt environment, venv).
SSH-portar:

Primär: 22
Backup: 1022

2. Applikation och tjänster
Webserver:

Nginx, konfigurerad för att omdirigera HTTP → HTTPS.
Backend:

FastAPI, körs med Uvicorn som systemtjänst.
HTTPS-certifikat:

Hanteras via Let's Encrypt och Certbot.
Automatisk start:

FastAPI-systemtjänst konfigurerad i /etc/systemd/system/fastapi.service.
Aktiverad med sudo systemctl enable fastapi.

3. Viktiga filvägar
FastAPI-projektmapp: /home/tord/my_fastapi_project
Python-venv: /home/tord/venv
Nginx-konfiguration: /etc/nginx/sites-available/default
HTTPS-certifikat: /etc/letsencrypt/live/my.supportnet.se/

4. Kommandon för underhåll
Starta applikationen manuellt:

bash
Kopiera kod
source /home/tord/venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
Systemtjänster:

Starta om Nginx: sudo systemctl restart nginx
Starta om FastAPI: sudo systemctl restart fastapi
Kontrollera loggar:

bash
Kopiera kod
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u fastapi -f

5. Nästa steg
Frontend:
Skapa en responsiv webbsida med CSS och JS.
Använd Bootstrap, Tailwind eller Vue.js som ramverk.
Databas:
Installera och konfigurera MariaDB.
Använd SQLAlchemy eller Tortoise ORM för att integrera med FastAPI.
Deploy-process:
Hantera filöverföring och uppdateringar via FileZilla.

6. Felsökning och certifikat
Certifikatförnyelse:

Certifikaten förnyas automatiskt med ett Cron-jobb.
Verifiera med:
bash
Kopiera kod
sudo certbot renew --dry-run
Felsökning av tjänster:

Kontrollera DNS, Nginx och FastAPI-loggar.
Kontrollera tjänsternas status:
bash
Kopiera kod
sudo systemctl status nginx
sudo systemctl status fastapi

7. Tankar och vidare utveckling
Syftet med denna README:
Att ge en snabb och tydlig överblick över den nuvarande infrastrukturen, inklusive instruktioner för drift och felsökning.

Nästa steg i utvecklingen:
Dokumentera eventuella manuella ändringar som görs på servern och överväg hur detta ska integreras i framtida CI/CD-processer.

Den här dokumentationen gör det lättare att iterera och skala upp projektet, samtidigt som den minimerar potentiella problem och missförstånd under utvecklingen. 😊

# I Contract
services = relationship("ContractServices", back_populates="contract", uselist=False)

# I ContractServices
contract_id = Column(Integer, ForeignKey("contracts.contract_id"), unique=True, nullable=False)
contract = relationship("Contract", back_populates="services")

services = db.query(ContractServices).filter(ContractServices.contract_id == contract_id).first()

