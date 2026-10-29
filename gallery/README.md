# Mūsų darbai – galerijos nuotraukos

Įmeskite nuotraukas į šį aplanką ir jos atsiras svetainės galerijoje „Mūsų darbai“.

- **Formatai:** `.jpg`, `.jpeg`, `.png`, `.webp`. Didelių nuotraukų mažinti nereikia –
  publikuojant (GitHub Pages) jos automatiškai sumažinamos ir sukuriamos miniatiūros.
- **Kategorija:** poaplankis – `langai/`, `durys/` (žyma ant skaidrės). Kiti poaplankiai
  irgi tinka: jų pavadinimas tampa žyma. Nuotraukos tiesiai šiame aplanke – be žymos.
- **Tvarka:** pagal failo vardą, todėl patogu pradėti numeriu: `01-…`, `02-…`.
- **Užrašas:** iš failo vardo (`03-terasos-durys.jpg` → „Terasos durys“). Gražesnį pavadinimą
  ir aprašymą (LT ir EN) galima įrašyti į `info.json`:

```json
{
  "durys/03-terasos-durys.jpg": {
    "title": "Terasos durys",
    "text": "Prienai · Aliuminis",
    "en": { "title": "Patio doors", "text": "Prienai · Aluminium" }
  }
}
```

Vietoje (`python -m http.server`) galerija skaito aplanką tiesiogiai – užtenka perkrauti puslapį.
Publikuojant sąrašą `gallery.json` sukuria `tools/gallery.mjs` (žr. `.github/workflows/pages.yml`).
Kol aplanke nėra nuotraukų, rodomi pavyzdiniai showroomo vaizdai.
