# „Gauti pasiūlymą“: turinys, duomenys ir jų kelias

Dokumentas aprašo, ką rodo ir ko prašo pasiūlymo užklausos forma, kokia struktūra perduodami
duomenys, kur jie saugomi ir kas su jais vyksta toliau. Jis skirtas verslui (ką klausiame ir kodėl)
ir programuotojui (kaip prijungti serverio dalį).

**Dabartinė būsena (2026-10-28).** Forma veikia svetainėje (`js/quote.js`, langas `#pasiulymas`):
4 žingsniai, validacija, gyva santrauka, LT/EN, demonstracinis patvirtinimas. Duomenys **niekur
nesiunčiami ir nesaugomi**: kol `QUOTE_ENDPOINT` tuščias, lankytojas mato užrašą „Demonstracinė
versija“. Serverio dalis įgyvendinama pagal šį planą.

---

## 1. Tikslas ir principai

Tikslas – gauti tiek informacijos, kad vadybininkas galėtų **paskambinti jau žinodamas projektą**
ir paruošti preliminarų pasiūlymą, bet neatbaidyti lankytojo ilga forma.

- **Mažai privalomų laukų.** Privaloma tik tai, be ko negalime atsakyti: ko reikia, kokie gaminiai,
  kur, kaip susisiekti, sutikimas. Visa kita – nebūtina arba su numatytąja reikšme „Patarkite“.
- **Žingsniai, o ne vienas ilgas lapas.** Kiekvienas žingsnis telpa į ekraną, matosi progresas.
- **Gyva santrauka.** Lankytojas visada mato, ką jau nurodė; tai mažina klaidas ir nerimą.
- **„Nežinau“ yra normalus atsakymas.** Matmenys, profilis, stiklas, spalva – galima palikti
  specialistui. Tikslius duomenis vis tiek patikslina matavimas.
- **Pasitikėjimas prie mygtuko.** Šalia formos: nemokamas matavimas, atsakymas per 1 darbo dieną,
  jokių įsipareigojimų.
- **Kontekstas iš showroomo.** Paspaudus „Gauti pasiūlymą“ ant konkretaus 3D gaminio, tas gaminys
  ir kategorija užpildomi automatiškai.

## 2. Ką lankytojas mato

| Vieta | Turinys |
|---|---|
| Antraštė | „Jūsų projektas – mūsų pasiūlymas“ + kas bus po užklausos (preliminarus pasiūlymas per 1 d. d., nemokamas matavimas) |
| Progreso juosta | 1 Projektas · 2 Gaminiai · 3 Objektas · 4 Kontaktai (užbaigti žingsniai paspaudžiami) |
| Santrauka (šone) | Gaminiai, darbai, montavimas, gaminių sąrašas su matmenimis, pageidavimai, objektas, terminas, nuotraukų skaičius, kontaktas |
| Pasitikėjimo elementai | Nemokamas matavimas · Atsakymas per 1 darbo dieną · Jokių įsipareigojimų |
| Klaidos | Prie konkretaus lauko, aiškia kalba („Nurodykite miestą ar rajoną.“) |
| Patvirtinimas | „Ačiū! Užklausa gauta.“, užklausos numeris (pvz. `VK-20261028-4821`), 3 tolesni žingsniai, mygtukai „Grįžti į showroomą“ / „Nauja užklausa“ |
| Privatumas | Sutikimo tekstas su nuoroda į privatumo politiką (puslapį reikia sukurti) |

**Dar verta pridėti, kai bus tikri duomenys:** telefono numeris tiems, kas nenori pildyti formos;
1–2 atsiliepimai ar atliktų darbų skaičius; aptarnaujami regionai; vidutinis pasiūlymo paruošimo laikas.

## 3. Ko prašome (laukai)

`*` – privaloma. Reikšmės (`value`) yra techniniai kodai, kuriuos gauna serveris.

### 1 žingsnis · Projektas

| Laukas | Tipas | Reikšmės | Kodėl reikia |
|---|---|---|---|
| Gaminiai `*` | pasirinkimas | `windows` · `doors` · `both` | Kas ruoš pasiūlymą, kokie gaminiai |
| Darbų pobūdis | pasirinkimas, numatyta `replace` | `replace` (senų keitimas) · `new` (naujas objektas) | Keitimas = išmontavimas, angų būklė |
| Montavimas | pasirinkimas, numatyta `yes` | `yes` · `no` (tik gaminiai) | Montavimas parduodamas kaip atskira paslauga |
| Išmontavimas ir utilizavimas | varnelė (rodoma tik keičiant) | `true/false` | Papildoma kainos eilutė |

### 2 žingsnis · Gaminiai

| Laukas | Tipas | Reikšmės | Kodėl reikia |
|---|---|---|---|
| Gaminių sąrašas `*` | eilutės (galima pridėti) | gaminys `*`, kiekis `*` 1–99, plotis ir aukštis cm 30–1000 (nebūtina) | Preliminari kaina |
| Gaminio tipas | pasirinkimas | `tilt`, `slide`, `fixed`, `french`, `patio`, `entry`, `other` (iš showroomo katalogo) | Bendri tipai, be gamintojų duomenų |
| Matmenų nežinau | varnelė | `true/false` | Žinome, kad kaina bus tik po matavimo |
| Profilis | pasirinkimas, numatyta `advise` | `pvc` · `aluminium` · `wood` · `advise` | Kainos intervalas |
| Stiklo paketas | pasirinkimas, numatyta `advise` | `double` · `triple` · `advise` | Kainos intervalas, šiluminė varža |
| Spalva | pasirinkimas, numatyta `advise` | `white` · `anthracite` · `wood` · `advise` | Gamybos terminas, kaina |
| Gamintojas | pasirinkimas (rodomas tik kai sąrašas netuščias) | `any` + gamintojų ID iš administravimo | Žr. 8 skyrių |

### 3 žingsnis · Objektas

| Laukas | Tipas | Reikšmės | Kodėl reikia |
|---|---|---|---|
| Objektas | pasirinkimas, numatyta `house` | `house` · `apartment` · `commercial` | Montavimo sąlygos, aukštingumas |
| Miestas ar rajonas `*` | tekstas | – | Aptarnavimo zona, kelionės kaina, kas važiuos matuoti |
| Adresas | tekstas | – | Nebūtina; tikslinama skambučio metu |
| Terminas | pasirinkimas, numatyta `1-3m` | `asap` · `1m` · `1-3m` · `planning` | Prioritetas vadybininkui |
| Nuotraukos | failai, iki 5, ≤ 10 MB, JPG/PNG/HEIC/WebP | – | Angų būklė, ar reikės papildomų darbų |
| Komentaras | tekstas | – | Viskas, kas netilpo į laukus |

### 4 žingsnis · Kontaktai

| Laukas | Tipas | Kodėl reikia |
|---|---|---|
| Vardas `*` | tekstas | Kreipinys |
| Telefonas `*` | tel., bent 7 skaitmenys | Greičiausias kontaktas |
| El. paštas `*` | el. paštas | Pasiūlymo siuntimas ir patvirtinimo laiškas |
| Kaip patogiau | `phone` · `email` | Gerbiame pasirinkimą |
| Sutikimas tvarkyti duomenis `*` | varnelė | BDAR, žr. 6 skyrių |
| Naujienos ir pasiūlymai | varnelė, **nepažymėta** | Atskiras, savanoriškas sutikimas rinkodarai |
| `company` (paslėptas) | spąstai robotams | Jei užpildytas – užklausa tyliai atmetama |

**Sąmoningai neklausiame:** asmens kodo, tikslaus biudžeto, gimimo datos, įmonės rekvizitų (jei reikės –
tik B2B atveju vėliau). Mažiau duomenų – mažiau rizikos ir didesnė konversija.

## 4. Duomenų struktūra (payload)

Forma surenka vieną JSON objektą (`buildPayload()` faile `quote.js`). Serveris jį tikrina pagal tą pačią schemą.

```json
{
  "schema": "vakema.quote_request/v1",
  "submitted_at": "2026-10-28T10:15:00.000Z",
  "locale": "lt",
  "source": { "page": "/", "entry": "product:patio" },
  "project": { "scope": "doors", "work_type": "replace", "installation": true, "removal": true },
  "items": [
    { "product_type": "patio", "quantity": 1, "width_cm": 300, "height_cm": 240 }
  ],
  "measurements_known": true,
  "preferences": { "profile": "advise", "glazing": "triple", "color": "anthracite", "manufacturer": null },
  "property": { "type": "house", "city": "Kaunas", "address": null, "timing": "1-3m" },
  "attachments": [{ "name": "anga.jpg", "type": "image/jpeg", "size": 2480133 }],
  "comment": null,
  "contact": { "name": "Vardas", "phone": "+370 600 00000", "email": "vardas@pavyzdys.lt", "preferred_channel": "phone" },
  "consent": { "privacy": true, "marketing": false, "policy_version": "2026-10" },
  "honeypot": ""
}
```

`source.entry`: `nav` (meniu), `hero` (pagrindinis mygtukas), `link` (nuoroda `#pasiulymas` iš kito puslapio) arba `product:<id>` (3D gaminio kortelė arba nuoroda `#pasiulymas=<id>` puslapiuose Langai / Durys) –
leidžia matyti, kurie gaminiai generuoja užklausas.

Serverio atsakymas: `{ "reference": "VK-20261028-0042", "upload_urls": [ … ] }`.

## 5. Kur keliauja ir saugomi duomenys

### Architektūra

```
Naršyklė (GitHub Pages, statinis)
   │  POST JSON (HTTPS)                          ┌─► El. laiškas vadybininkams
   ▼                                             │
Serverless API  /quote ──► validacija ──► DB ────┼─► Patvirtinimo laiškas klientui
(ES regionas)       anti-spam   rate limit       │
   │                                             └─► CRM / Slack pranešimas
   └─► vienkartinės įkėlimo nuorodos ──► Privati failų saugykla (nuotraukos)
```

Svetainė yra statinė, todėl formai reikia nedidelės serverio funkcijos. Rekomenduojama:

| Dalis | Rekomendacija | Alternatyvos |
|---|---|---|
| API | Cloudflare Workers arba Vercel / Netlify Functions, ES regionas | Mažas Node.js serveris |
| Duomenų bazė | Supabase (PostgreSQL, Frankfurto regionas) | Neon, savas PostgreSQL |
| Nuotraukos | Privatus objektų saugyklos „bucket“ (Supabase Storage / Cloudflare R2), įkėlimas per vienkartines nuorodas | – |
| El. laiškai | Resend arba Postmark (ES duomenų tvarkymas, DPA) | Įmonės SMTP |
| Anti-spam | Paslėptas laukas + Cloudflare Turnstile + limitas pagal IP | hCaptcha |
| CRM | Webhook į naudojamą CRM (pvz. Pipedrive / HubSpot) | Paprasta administravimo lentelė |

### Duomenų bazės lentelės

- `quote_requests`: `id`, `reference`, `status`, `created_at`, `locale`, `source_entry`, `scope`, `work_type`,
  `installation`, `removal`, `measurements_known`, `profile`, `glazing`, `color`, `manufacturer_id`,
  `property_type`, `city`, `address`, `timing`, `comment`, `contact_name`, `contact_phone`, `contact_email`,
  `preferred_channel`, `consent_privacy`, `consent_marketing`, `policy_version`, `assigned_to`, `delete_after`
- `quote_items`: `id`, `request_id`, `product_type`, `quantity`, `width_cm`, `height_cm`
- `quote_attachments`: `id`, `request_id`, `storage_key`, `mime`, `size`, `delete_after`
- `quote_events`: `id`, `request_id`, `at`, `actor`, `type` (`created`, `contacted`, `measured`, `offer_sent`, `won`, `lost`), `note`
- `manufacturers`: `id`, `name`, `active`, `product_types[]`, `sort` (žr. 8 skyrių)

### Užklausos būsenos

`new` → `contacted` → `measurement_scheduled` → `offer_sent` → `won` / `lost`
(+ `spam` atmestoms). Kiekvienas pakeitimas rašomas į `quote_events`.

### Kas vyksta pateikus

1. API patikrina schemą, laukų ilgius ir formatus, `honeypot`, Turnstile žetoną ir užklausų limitą.
2. Sugeneruoja `reference`, įrašo užklausą ir gaminius į DB (būsena `new`).
3. Jei yra nuotraukų – grąžina vienkartines įkėlimo nuorodas, naršyklė įkelia failus tiesiai į saugyklą.
4. Išsiunčia laišką vadybininkams: santrauka, nuoroda į užklausą administravime, **be nuotraukų priedų**.
5. Išsiunčia patvirtinimą klientui: numeris, ką nurodė, kas bus toliau, kontaktai.
6. Perduoda į CRM (webhook) ir, jei norima, trumpą pranešimą į Slack / Teams (be asmens duomenų).
7. Grąžina `reference` – lankytojas mato patvirtinimą su numeriu.

Jei API nepasiekiamas, forma rodo klaidą ir siūlo paskambinti; įvesti duomenys nedingsta.

## 6. Privatumas (BDAR)

- **Teisinis pagrindas:** veiksmai prieš sudarant sutartį kliento prašymu (BDAR 6 str. 1 d. b p.).
  Rinkodarai – atskiras, savanoriškas, iš anksto nepažymėtas sutikimas (a p.).
- **Duomenų minimizavimas:** renkame tik 3 skyriuje nurodytus laukus.
- **Saugojimo terminai:** nesudarius sutarties – ištrinti arba anonimizuoti po 12 mėn.; nuotraukas – po
  pasiūlymo pateikimo arba ne vėliau kaip po 90 d.; sudarius sutartį – pagal sutarčių ir apskaitos
  reikalavimus. Lauke `delete_after` saugoma data, kasdienė užduotis trina pasibaigusius įrašus.
- **Vieta:** visi tiekėjai – ES regione, su pasirašytomis duomenų tvarkymo sutartimis (DPA).
- **Teisės:** el. paštas užklausoms dėl duomenų peržiūros, taisymo, ištrynimo; atsakymas per 30 d.
- **Privatumo politika:** atskiras puslapis (LT/EN), sutikimo tekste – nuoroda; `policy_version` saugo,
  su kuria versija sutikta.
- **Analitika** – tik su slapukų sutikimu, be asmens duomenų (žr. 9 skyrių).

## 7. Saugumas

- Tik HTTPS; CORS leidžiamas tik iš svetainės domeno.
- Visa validacija kartojama serveryje; laukų ilgio ribos (pvz. komentaras ≤ 2000 simbolių).
- Užklausų limitas (pvz. 5 per valandą iš vieno IP), Turnstile, paslėptas laukas.
- Failai: tik leidžiami MIME tipai, ≤ 10 MB, ≤ 5 vnt., privati saugykla, peržiūra per trumpalaikes nuorodas.
- Raktai ir slaptažodžiai – tik serverio aplinkos kintamuosiuose, niekada ne svetainės kode.
- Žurnaluose (logs) – `reference` ir techninė informacija, be vardų, telefonų ir el. pašto.
- Asmens duomenys niekada nededami į URL.

## 8. Gamintojai ir montavimas

- Gamintojų sąrašas valdomas administravime (lentelė `manufacturers`): galima pridėti, išjungti,
  pakeisti eiliškumą, nurodyti, kokiems gaminių tipams jie tinka.
- Svetainė gauna aktyvių gamintojų sąrašą (JSON). Kol jis tuščias, laukas formoje **nerodomas**
  (`MANUFACTURERS` faile `quote.js`). Tikrų gamintojų duomenų dabar nenaudojame.
- Montavimas yra atskira paslauga: klientas gali pasirinkti „Tik gaminiai“, o pasiūlyme montavimas,
  išmontavimas ir utilizavimas rodomi atskiromis eilutėmis.

## 9. Matavimas ir analitika (be asmens duomenų)

Įvykiai: `quote_open` (su `entry`), `quote_step_complete` (1–4), `quote_submit`, `quote_error`.
Iš jų matosi, kuriame žingsnyje lankytojai pasiduoda. Analitika įjungiama tik gavus slapukų sutikimą.

## 10. Laiškų turinys

**Vadybininkui** – tema `Nauja užklausa VK-… · Durys · Kaunas · per 1–3 mėn.`; santrauka, gaminių lentelė,
kontaktas ir pageidaujamas būdas, šaltinis (`product:patio`), nuoroda į administravimą.

**Klientui** – tema `Gavome jūsų užklausą VK-…`; padėka, nurodytų duomenų santrauka, 3 tolesni žingsniai,
kontaktai, nuoroda į privatumo politiką. Kalba – pagal `locale`.

## 11. Įgyvendinimo eiga

| Etapas | Darbai | Rezultatas |
|---|---|---|
| 0 – padaryta | Forma, validacija, santrauka, LT/EN, demonstracinis patvirtinimas, payload struktūra | Galima rodyti ir testuoti UX |
| 1 – MVP | Serverless `/quote`, validacija, anti-spam, DB įrašas, laiškai vadybininkui ir klientui, privatumo politika; `QUOTE_ENDPOINT` nustatymas | Užklausos realiai pasiekia įmonę |
| 2 | Nuotraukų įkėlimas, administravimo sąrašas su būsenomis, automatinis trynimas | Patogus darbas su užklausomis |
| 3 | CRM integracija, gamintojų valdymas, analitika, B2B laukai (jei reikia) | Pardavimų procesas vienoje vietoje |

## 12. Klausimai verslui prieš 1 etapą

1. Kas gauna užklausas (el. pašto adresai) ir kas atsakingas už atsakymą per 1 darbo dieną?
2. Kokie regionai aptarnaujami? Ar užklausas iš kitų regionų priimti?
3. Ar naudojate CRM? Kurį?
4. Ar reikia preliminarios kainos iškart svetainėje (skaičiuoklė), ar tik po skambučio?
5. Kokie profiliai, stiklo paketai ir spalvos realiai siūlomi (kad pasirinkimai atitiktų asortimentą)?
6. Kokie gamintojai bus rodomi ir ar klientas turi galėti juos rinktis?
7. Ar būna verslo (B2B) klientų, kuriems reikia įmonės rekvizitų?
8. Tikri kontaktai, darbo laikas ir būstinės adresas (dabar svetainėje – pavyzdiniai).
