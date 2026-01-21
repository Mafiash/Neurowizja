# Brain_view

Projekt na 5 semestr Inżynierii Oprogramowania. Brain_view zakłada rendering 3D i 2D dla dokumentacji medycznej, a dokładnie skanów głowy.

---

## Instrukcja instalacji i uruchomienia

Aby uruchomić aplikację Brain_view, potrzebujesz zainstalowanego Pythona (3.8+), Node.js (18+) oraz npm.

### 1. Instalacja zależności

**Backend (API):**

```bash
cd brain_view_api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend (UI):**

```bash
cd brain_view_ui
npm install
```

### 2. Uruchamianie aplikacji

Możesz uruchomić całą aplikację (backend + frontend) jednym poleceniem z katalogu głównego projektu:

```bash
npm run dev
```

_(Wymaga zainstalowanych zależności w obu folderach)._

Alternatywnie, możesz uruchomić je osobno:

- **Backend:** `cd brain_view_api && uvicorn main:app --reload` (lub z katalogu głównego: `uvicorn brain_view_api.main:app --reload`)
- **Frontend:** `cd brain_view_ui && npm start`

### 3. Dostęp do aplikacji

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend (API):** [http://localhost:8000](http://localhost:8000)

Jeśli pojawią się problemy z połączeniem z bazą danych, sprawdź plik `brain_view_api/config/.env`. Aplikacja uruchomi się nawet jeśli baza danych jest nieosiągalna (z ostrzeżeniem w konsoli).
