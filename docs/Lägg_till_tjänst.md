# ✨ Så lägger du till en ny tjänst i systemet

Detta dokument beskriver steg-för-steg hur du lägger till en ny tjänst i Supportnet-systemet. Tjänsten ska gå från databasen, via backend och frontend, hela vägen till dashboarden.

---

## 1. 🧠 Planera tjänsten
- Vad ska den heta? (t.ex. "Survey", "NyTjänst")
- Behövs en separat HTML/JS-sida?
- Ska den visas i dashboarden?

---

## 2. 🧹 Uppdatera backend

### Databas (MariaDB)
```sql
ALTER TABLE contract_services ADD COLUMN ny_tjanst TINYINT(1) DEFAULT 0;
```

### SQLAlchemy-modellen i `models.py`
```python
ny_tjanst = Column(Boolean, default=False)
```

### FastAPI (i `contracts.py`)

#### I `create_contract()` och `update_contract()`:
```python
ny_tjanst=service.get("ny_tjanst", False),
```

#### I `get_all_contracts()` och `get_contract_by_id()`:
```python
"ny_tjanst": s.ny_tjanst
```

---

## 3. 📅 Frontend – `contract.html`

### HTML
Lägg till en ny checkbox i sektionen för tjänster:
```html
<label class="checkbox-label">
  <input type="checkbox" id="ny_tjanst"> Ny tjänst
</label>
```

### JavaScript (`contract.js`)

#### I `getServices()`:
```js
ny_tjanst: document.getElementById("ny_tjanst").checked
```

#### I `loadServices()`:
```js
if (service.ny_tjanst) document.getElementById("ny_tjanst").checked = true;
```

---

## 4. 📊 Frontend – Dashboard (`userDashboard.js`)

### Lägg till i `serviceLinks`:
```js
"Ny Tjänst": "/userpages/ny.html"
```

### Visa i dashboard:
```js
if (services.includes("Ny Tjänst")) {
  // Visa kort/knapp/länk
}
```

---

## 5. 🚀 Klart!
Tjänsten är nu:
- Markerbar i kontrakt
- Sparas till databasen
- Går att ladda från backend
- Visas i dashboard

---

## 📝 Tips
- Håll namngivning konsekvent (t.ex. `survey`, `survey.html`, `survey.js`)
- Testa alla flöden (nytt kontrakt, redigera, radera)
- Bekräfta att `survey` är med i `contract.services` i responsen

---

Happy hacking! 🚀
/ Tord & AINA

 