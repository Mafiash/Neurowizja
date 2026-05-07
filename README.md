# **Neurowizja \- Aplikacja do wizualizacji 2D/3D skanów mózgu.**  {#neurowizja---aplikacja-do-wizualizacji-2d/3d-skanów-mózgu.}

## *Aplikacja w wersji Desktop do wizualizacji i oznaczania sektorów zdjęć tomograficznych mózgu w formie warstw 2D i modelu 3D. Projekt bazuje na danych medycznych Medical Decathlon. * 

| AUTORZY: | Kacper Bieiek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela   |
| :---- | :---- |
| STWORZONO: | 21 Październik 2025 |
| OSTATNIA MODYFIKACJA: | 15 Luty 2026 |
| WERSJA: | \[6.0.0\] |
|  |  |

 

### Spis treści: {#spis-treści:}

[**Neurowizja \- Aplikacja do wizualizacji 2D/3D skanów mózgu.	1**](#neurowizja---aplikacja-do-wizualizacji-2d/3d-skanów-mózgu.)

[Spis treści:	2](#spis-treści:)

[1\. Historia modyfikacji dokumentu:	3](#historia-modyfikacji-dokumentu:)

[2\. Wstępna specyfikacja systemu:	4](#wstępna-specyfikacja-systemu:)

[2.1. Opis ogólny:	4](#opis-ogólny:)

[2.2. Architektura i widoki aplikacji:	4](#architektura-i-widoki-aplikacji:)

[2.4. Format i przechowywanie danych:	4](#format-i-przechowywanie-danych:)

[2.5. Przeznaczenie i zastosowanie:	4](#przeznaczenie-i-zastosowanie:)

[2.6. Odbiorcy projektu:	4](#heading=h.knv2939nggiy)

[2.7. Założenia funkcjonalne:](#odbiorcy-projektu:)	5

2.8. Założenia niefunkcjonalne	6

[3\. Porównanie widoków 3D oraz 2D](#porównanie-widoków-3d-oraz-2d)	7

4\. Diagramy przypadków	8-17

5\. Diagram klas	18-20

6.Diagram sekwencji	21

7.Testy	22

8[. Słownik pojęć dokumentu:](#słownik-pojęć-dokumentu:)	23

9[. Załączniki i  źródła:](#załączniki-i-źródła:)	24

	

1. ## **Historia modyfikacji dokumentu:** {#historia-modyfikacji-dokumentu:}

| Wersja: | Data: | Autor zmian: | Zatwierdzenie i prezentacja zmian: | Opis zmian: |
| :---- | :---- | :---- | :---- | :---- |
| 1.0.0 | 21/10/2025 | Kacper Bieniek, Kamil Kasperek, Mateusz Smuda, Olivier Trela | Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik | Rozpoczęcie prac nad układem dokumentacji projektu, przygotowanie pod etap: WSS \- Wstępna Specyfikacja Systemu |
| 1.2.0 | 04/11/2025 | Kacper Bieniek, Mateusz Smuda | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Mateusz Smuda  | Dodanie założeń niefunkcjonalnych oraz szczegółowe porównanie widoków 2D i 3D w formie tabeli  |
| 1.3.0 | 11/11/2025 | Mateusz Smuda | Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Poprawa założeń funkcjonalnych oraz niefunkcjonalnych  |
| 2.0.0 | 03/12/2025 | Kacper Bieniek, Kamil Kasperek, Mateusz Smuda | Kamil Kasperek, Mateusz Smuda | Stworzenie Diagramów przypadków wraz z scenariuszami |
| 3.0.0 | 03/02/2026 | Kamil Kasperek, Mateusz Smuda | Krzysztof Czerwonka, Kamil Kasperek, Mateusz Smuda | Stworzenie Diagramu Klas |
| 4.0.0 | 04/02/2026 | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Stworzenie Diagramów sekwencji |
| 5.0.0 | 11/02/2026 | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Implementacja |
| 6.0.0 | 12/02/2026 | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Kacper Bieniek, Krzysztof Czerwonka, Kamil Kasperek, Piotr Ptasznik, Mateusz Smuda, Olivier Trela | Stworzenie testów jednostkowych i integracyjnych |

2. ## **Wstępna specyfikacja systemu:** {#wstępna-specyfikacja-systemu:}

   1. ##### **Opis ogólny:**  {#opis-ogólny:}

Aplikacja umożliwia wizualizację skanów mózgu w widoku trójwymiarowym (3D) oraz dwuwymiarowym (2D) na podstawie danych medycznych zapisanych w formacie [NIfTI](#bookmark=id.sw6ahz7xa6t7) (.nii / .nii.gz). System przeznaczony jest do analizy obrazów medycznych typu [FLAIR](#bookmark=id.tl16ahnpj6tz), [T1w](#bookmark=id.5uk7f6n96b7j), [T1gd](#bookmark=id.evl0ngb8wfl8) oraz [T2w](#bookmark=id.f8r3s9exkx7q).

2. #####  **Architektura i widoki aplikacji:** {#architektura-i-widoki-aplikacji:}

   1. **Główny widok (model 3D):** Domyślny tryb uruchamiania aplikacji prezentuje przestrzenny model mózgu na podstawie wczytanego pliku [NIfTI](#bookmark=id.sw6ahz7xa6t7). W tym widoku możliwe jest obracanie modelu wzdłuż osi pionowej, przybliżanie i oddalanie widoku ([zoom](#bookmark=id.7wigcc6r421d)) oraz wykonanie odbicia lustrzanego ([flip](#bookmark=id.isketuqmfti7)) całego modelu 3D.

      2. **Widok 2D:** Po przejściu do widoku 2D możliwa jest analiza mózgu w trzech płaszczyznach: [strzałkowej](#bookmark=id.muclyuh4wanz), [czołowej](#bookmark=id.yroqu6n1alyu) i [poprzecznej](#bookmark=id.qkou1eemhoyg). W tym widoku dostępne są narzędzia umożliwiające przewijanie obrazu w obrębie wybranego przekroju, wykonanie [odbicia lustrzanego](#bookmark=id.isketuqmfti7), regulację kontrastu i jasności oraz zmianę kolorystyki poszczególnych płaszczyzn.

   

   3. **Narzędzie obrysu i notatek:** 

Widok 2D udostępnia użytkownikowi możliwość dokonania [obrys](#bookmark=id.e5f5koru6bic)u dowolnego fragmentu przekroju przy użyciu przybornika. Utworzony [obrys](#bookmark=id.e5f5koru6bic) jest zapisywany w osobnym pliku, dzięki czemu nie modyfikuje oryginalnego skanu. [Obrysy](#bookmark=id.e5f5koru6bic) można eksportować i przesyłać innym użytkownikom oraz opisać notatką zawierającą komentarz lub interpretację zaznaczonego obszaru.

4. ##### **Format i przechowywanie danych:**  {#format-i-przechowywanie-danych:}

Aplikacja obsługuje dane wejściowe w formacie [NIfTI](#bookmark=id.sw6ahz7xa6t7) (.nii / .nii.gz), natomiast dane pomocnicze, takie jak obrysy i notatki, są zapisywane w formatach zewnętrznych kompatybilnych z aplikacją. Oryginalne dane medyczne pozostają nienaruszone.

5. ##### **Przeznaczenie i zastosowanie:** {#przeznaczenie-i-zastosowanie:}

 Aplikacja jest przeznaczona do analiz obrazów mózgu w celach diagnostycznych i dydaktycznych, może być wykorzystywana w środowiskach klinicznych i akademickich i działa na systemach desktopowych.

6. ##### **Odbiorcy projektu:**  {#odbiorcy-projektu:}

Odbiorcami projektu są lekarze specjaliści, w szczególności radiolodzy i neurolodzy, pracownicy naukowi i dydaktyczni oraz studenci kierunków medycznych

7. ##### **Wymagania funkcjonalne:**

##### **WF1. Import i zarządzanie danymi**

* System umożliwia wczytanie plików NIfTI (.nii / .nii.gz) z dysku lokalnego 

* Po wczytaniu aplikacja prezentuje podsumowanie danych (wymiary, rozdzielczość, orientacja, typ: FLAIR, T1w, T1gd, T2w).

* System zapewnia nienaruszalność danych źródłowych: wszelkie adnotacje/obrysy zapisywane są poza plikiem NIfTI.

* Możliwość zapisu i ponownego wczytania

**WF2. Widok 3D**

* Domyślny ekran po uruchomieniu: render 3D wczytanych danych z pliku.

* Interakcje:  
- Obrót wokół osi pionowej.  
- Zoom.  
- Flip całego modelu 3D.

* Przełączanie trybów wizualizacji.

* Przejście do widoku 2D.

**WF3. Widok 2D**

* Dostępne trzy płaszczyzny: strzałkowa, czołowa, poprzeczna.

* Interakcje:  
- Przewijanie warstw w każdej płaszczyźnie.  
- Flip dla aktualnej płaszczyzny.  
- Regulacja kontrastu.  
- Zmiana kolorystyki płaszczyzn.

* Synchronizacja poprzez  równoległe przewijanie.

**WF4. Narzędzie obrysu i notatek**

* Tryb rysowania obrysu na aktywnej warstwie przy użyciu narzędzi: pióro, gumka; regulacja grubości pióra.

* Notatki opisowe przypisane do wybranego obrysu/przekroju

* Eksport/Import obrysów i notatek do plików zewnętrznych.

**WF5. Eksport i udostępnianie**

* Eksport obrysów/notatek.

* Możliwość zapisania plików do wskazanego folderu, pliki są widoczne w bazie danych

**WF6. Obsługa błędów i walidacja**

* Komunikat o nieobsługiwanym lub uszkodzonym pliku NIfTI (z logiem błędu).

* Ostrzeżenia przy niespójności lub braku danych kluczowych.

  8. .**Wymagania niefunkcjonalne:**

**WNF1.Wydajność:**  
Czas wczytywania pliku w formacie NIfTI (.nii / .nii.gz) około 3 sekundy dla pliku o wielkości do 100 MB. System ma zapewniać płynne działanie i renderowanie danych wolumetrycznych bez widocznych opóźnień. Jest to zależne od szybkości łącza internetowego.

**WNF2. Responsywność interfejsu**  
Wszystkie interakcje użytkownika, takie jak obracanie modelu 3D, przybliżanie i oddalanie widoku (zoom), czy przewijanie przekrojów w trybie 2D odbywają się w czasie rzeczywistym, bez zauważalnych opóźnień.

**WNF3. Stabilność**  
Aplikacja zachowuje stabilność działania nawet przy pracy z plikami NIfTI do 30MB oraz przy jednoczesnym otwarciu kilku widoków.

**WNF4. Przenośność**  
System jest kompatybilny z innymi systemami różnymi przeglądarkami internetowymi – Google Chrome(od wersji 141), Microsoft Edge(od wersji 141), Mozilla Firefox(od wersji 143), Safari(od wersji 18.6)

**WNF5. Bezpieczeństwo danych**  
Oryginalne dane medyczne nie są  modyfikowane przez aplikację. Wszelkie obrysy i notatki tworzone przez użytkownika są zapisywane w osobnych plikach pomocniczych, aby nie naruszyć integralności pliku źródłowego.

**WNF6. Użyteczność**  
Interfejs użytkownika jest przejrzysty, intuicyjny i dostosowany do potrzeb lekarzy oraz studentów medycyny. Elementy interfejsu są rozmieszczone rozmieszczone tak aby obsługa narzędzi była szybka i prosta.

**WNF7. Skalowalność**  
Architektura aplikacji umożliwia łatwe rozszerzanie o dodatkowe moduły, np.funkcje segmentacji tkanek, analizy AI czy automatyczne wykrywanie zmian patologicznych.

**WNF8. Kompatybilność**  
System w pełni obsługuje dane w formacie NIfTI (.nii, .nii.gz), zgodne ze standardami wykorzystywanymi w neuroobrazowaniu.

**WNF9. Łatwość utrzymania**  
Kod źródłowy aplikacji jest dobrze udokumentowany, co umożliwia łatwe wprowadzanie poprawek, aktualizacji i dalszy rozwój projektu.

**WNF10. Jakość wizualizacji**  
System zapewnia wysoką jakość renderowania obrazów 2D i modeli 3D, w Full HD bez utraty szczegółów strukturalnych. Wizualizacje powinny umożliwiać dokładną analizę i interpretację danych medycznych.

**WNF11. Zgodność z etyką i regulacjami**  
Aplikacja nie dokonuje automatycznej interpretacji ani diagnozy na podstawie danych medycznych. System pełni funkcję narzędzia wspomagającego wizualizację i analizę, zgodnie z zasadami etyki i przepisami medycznymi.

3. ## **Porównanie widoków 3D oraz 2D** {#porównanie-widoków-3d-oraz-2d}

| Widok 3D | Widok 2D |
| ----- | ----- |
| Opis ogólny: Prezentuje przestrzenny model mózgu z możliwością interakcji w przestrzeni trójwymiarowej. | Opis ogólny: Prezentuje modele przekrojów w przestrzeni dwuwymiarowej oraz umożliwia analizę przekrojów mózgu w trzech płaszczyznach: strzałkowej, czołowej i poprzecznej. |
| Główne zastosowanie: Wizualizacja ogólnego kształtu mózgu i rozmieszczenia poszczególnych struktur. | Główne zastosowanie: Dokładna analiza struktur wewnętrznych mózgu na poziomie przekrojów. |
| Interakcja z użytkownikiem: Obrót modelu wokół osi pionowej, przybliżanie/oddalanie (zoom), odbicie lustrzane (flip). | Interakcja z użytkownikiem: Przewijanie warstw, zmiana płaszczyzny widoku, regulacja kontrastu i jasności, odbicie lustrzane (flip). |
| Dodatkowe narzędzia do analizy: Brak bezpośrednich narzędzi obrysów, tylko wizualizacja poglądowa. | Dodatkowe narzędzia do analizy: Możliwość tworzenia obrysów i notatek opisowych dla wybranych fragmentów obrazu. |
| Możliwość eksportu danych: Brak – widok poglądowy bez eksportu danych. | Możliwość eksportu danych: Możliwość zapisu obrysów i notatek w plikach zewnętrznych |
| Tryb pracy: Domyślny po uruchomieniu aplikacji. | Tryb pracy: Dostępny po przełączeniu się z widoku 3D na 2D. |
| Dane wejściowe: pliki NIfTI, renderowane jako model 3D. | Dane wejściowe: pliki NIfTI, renderowane jako obrazy przekrojów 2D. |
| Zastosowanie: Ułatwia zrozumienie przestrzennej budowy mózgu, pozwala na zobaczenie relacji między strukturami i ich położenie | Zastosowanie: Uczy interpretacji przekrojów obrazowych, pozwala osobom na dokładnie przeanalizowanie przekroju oraz opis poszczególnych elementów |

4. ## **Diagramy przypadków:**

1. Logowanie: diagram przedstawia proces logowania. Najpierw użytkownik wpisuje login oraz hasło a następnie system sprawdza czy dane są poprawne. 

   ![][image1]

   ![][image2]

   ![][image3]

   

2. Wgrywanie i pobieranie plików: diagram przedstawia proces wgrywania plików do programu oraz ich pobierania z bazy danych. Podczas wgrywania pliku system sprawdza czy jest on w poprawnym formacie.

   ![][image4]

   ![][image5]

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

3. Operacje na widokach 2D oraz 3D: diagram przedstawia czynności które użytkownik może wykonać podczas korzystania z danego widoku. Widoki oferują funkcje zawarte w punktach 2 oraz 3 dokumentacji.

   ![][image6]

   ![][image7]

   ![][image8]

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

   

4. Tworzenie obrysów w widoku 2D: diagram przedstawia operację na widoku 3D jaką jest tworzenie notatek poprzez obrysowanie za pomocą odpowiedniego narzędzia fragmentu przekroju a także dodanie komentarza do odpowiedniego obrysu.

   

   ![][image9]

   ![][image10]

   

   

5. ## **Diagram Klas**

Aplikacja jest oparta na architekturze klient-serwer. Server dzieli się na Model, Services oraz Router, a Client dzieli się na Api oraz Views. Services to klasy, które są pośrednikiem między modelem a zapytaniem jakie przychodzi od klienta do endpointa, wykonują one operacje na modelu. 

Client odpowiada za renderowanie widoków i ich przetrzymywanie po wysłaniu zapytania do serwera

![][image11]

![][image12]

![][image13]

6. ## **Diagramy sekwencji**

1. Diagram sekwencji pobrania skanu:

![][image14]

2. Diagram sekwencji stworzenia adnotacji:

![][image15]

7. ## **Testy**

**Testy jednostkowe:**

**test\_nifti**

* Obejmuje komponent walidacji i metadanych plików NIfTI w warstwie usług.  
* Sprawdza, że poprawne dane NIfTI są akceptowane, niepoprawne bajty są odrzucane, a podstawowe metadane (kształt, rozmiar wokseli, typ danych) są poprawnie wyciągane.  
* Zakres: logika usług związana z nagłówkiem i metadanymi, bez udziału API.

**test\_services**

* Obejmuje usługę wyznaczania konturu mózgu z danych 3D.  
* Sprawdza, że syntetyczny skan daje niepusty kontur i że punkty mieszczą się w oczekiwanych granicach przestrzennych.  
* Weryfikuje działanie dla płaszczyzn osiowej, czołowej i strzałkowej.  
* Zakres: logika przetwarzania obrazu, bez HTTP i bazy danych.

**Testy integracyjne:**

**test\_annotations**

* Obejmuje przepływ API dla adnotacji z testową bazą danych i nadpisanymi zależnościami.  
* Sprawdza tworzenie adnotacji przez API przy zamockowanej warstwie przechowywania.  
* Sprawdza, że lista skanów użytkownika jest pusta, gdy brak zasianych skanów.  
* Zakres: warstwa API \+ baza danych \+ zamockowane usługi zapisu.

**test\_integration\_api**

* Obejmuje kluczowe endpointy API na bazie w pamięci z zasianymi użytkownikami i skanem.  
* Sprawdza health check, logowanie i format odpowiedzi, generowanie URL dostępu do skanu (z mockiem storage), listę skanów użytkownika oraz listę użytkowników dla admina.  
* Zakres: routing API \+ modele bazy \+ integracja autoryzacji, z zamockowanym storage.

8. ## **Słownik pojęć dokumentu:** {#słownik-pojęć-dokumentu:}

| Termin | Skrót | Definicja |
| ----- | ----- | ----- |
| FLAIR | \- | Technika MRI, w której sygnał płynu mózgowo-rdzeniowego jest stłumiony |
| Flip / odbicie lustrzane | \- | Obrócenie orientacji skanu w osi poziomej lub pionowej |
| NIfTI | .nii / .nii.gz | Format plików do przechowywania obrazów medycznych w trójwymiarowej macierzy |
| Obrys | segmentation / contouring | Proces zaznaczania granic struktur mózgowych lub zmian patologicznych |
| Przekrój czołowy | coronal | Pionowy przekrój dzielący mózg na część przednią i tylną |
| Przekrój poprzeczny / osiowy | axial / transverse | Poziomy przekrój dzielący mózg na część górną i dolną |
| Przekrój strzałkowy | sagittal | Pionowy przekrój dzielący mózg na lewą i prawą połowę |
| T1-weighted | T1w | Obraz MRI o ważeniu T1, pokazujący różnice w czasie relaksacji T1 tkanek |
| T1-weighted z kontrastem gadolinowym | T1gd | Obraz T1w z użyciem środka kontrastowego na bazie gadolinu |
| T2-weighted | T2w | Obraz MRI o ważeniu T2, w którym płyny mają jasny sygnał |
| Zoom | \- | Funkcja powiększania lub pomniejszania obrazu |

9. ## **Załączniki i  źródła:** {#załączniki-i-źródła:}

| Źródło: | Co zawiera? Co pobrano? | Link: |
| :---- | :---- | :---- |
| Medical Segmentation Decathlon | Baza modeli 3D mózgów w formacie | [http://medicaldecathlon.com/](http://medicaldecathlon.com/) |
| IMAIOS | Poglądowa aplikacja do przeglądu modeli skanów Głowy w formacie nii.gz | [https://www.imaios.com/en/e-anatomy/brain/mri-axial-brain](https://www.imaios.com/en/e-anatomy/brain/mri-axial-brain) |
