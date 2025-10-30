# Brain_view

Projekt na 5 semestr Inżynierii Oprogramowania. Brain_view zakłada rendering 3D i 2D dla dokumentacji medycznej, a dokładnie skanów głowy.

---

## Instrukcja instalacji i uruchomienia

Aby uruchomić aplikację Brain_view, potrzebujesz zainstalowanego Pythona (najlepiej 3.8 lub nowszego), Node.js (najlepiej 18 lub nowszego) oraz npm (instaluje się razem z Node.js). Jeśli masz git, możesz pobrać projekt poleceniem `git clone <adres_repozytorium>`, w przeciwnym razie pobierz ZIP i rozpakuj.

Najpierw zainstaluj backend (API). Otwórz terminal, przejdź do katalogu `brain_view_api` poleceniem `cd brain_view_api`. Opcjonalnie utwórz środowisko wirtualne: `python3 -m venv venv` i aktywuj je: `source venv/bin/activate`. Następnie zainstaluj wymagane pakiety: `pip install -r requirements.txt`.

Teraz zainstaluj frontend (UI). Otwórz drugi terminal, przejdź do katalogu `brain_view_ui` poleceniem `cd brain_view_ui` i zainstaluj zależności: `npm install`.

Aby uruchomić aplikację, wpisz `npm run dev`.

Po uruchomieniu aplikacji frontend będzie dostępny pod adresem [http://localhost:3000](http://localhost:3000), a backend (API) pod adresem [http://localhost:8000](http://localhost:8000). Jeśli pojawią się problemy, sprawdź czy masz zainstalowane wszystkie wymagane pakiety (`pip install -r requirements.txt` i `npm install`). Jeśli port 3000 lub 8000 jest zajęty, zamknij inne aplikacje lub zmień port w konfiguracji. Jeśli nie masz `uvicorn`, zainstaluj go poleceniem `pip install uvicorn`.

W razie problemów napisz do autora lub zespołu. Powodzenia!
