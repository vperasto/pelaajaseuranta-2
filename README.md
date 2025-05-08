# Pelaajaseuranta – Basket Tracker 🏀

**Pelaajaseuranta – Basket Tracker** on responsiivinen, visuaalisesti selkeä ja helppokäyttöinen web-sovellus, jonka avulla voidaan seurata koripallojoukkueen (erityisesti juniorijoukkueen) yksittäisten pelaajien peliaikaa ja tapahtumia ottelun aikana. Sovellus on suunniteltu erityisesti valmentajalle, joka haluaa analysoida peluutusta ja pelitapahtumia reaaliajassa sekä pelin jälkeen.

Sovellus on toteutettu puhtaasti frontend-teknologioilla (HTML, CSS, JavaScript) ja se tallentaa kaiken datan paikallisesti selaimen `localStorage`:iin, joten erillistä backend-palvelinta tai tietokantaa ei tarvita.

## Ominaisuudet

### 1. Pelaajien ja Pelin Asetukset
*   **Pelin Nimen Syöttö:** Anna pelille kuvaava nimi (esim. "Kobrat - Honsu U12").
*   **Pelaajien Lisäys:** Syötä pelaajien nimet ja pelinumerot ennen pelin alkua.
*   **Pelaajalista:** Näyttää lisätyt pelaajat selkeästi. Pelaajia voi myös poistaa listalta.

### 2. Pelin Aikainen Käyttö
*   **Pelin Aloitus/Lopetus:** Selkeät napit pelin aloittamiseen ja lopettamiseen. Jokainen merkittävä pelitapahtuma saa aikaleiman.
*   **Jaksojen Vaihto:** Mahdollisuus siirtyä seuraavaan jaksoon (1-4).
*   **Pelikatkot:** Nappi pelikatkon aloittamiseen ja jatkamiseen, jotta todellinen peliaika voidaan huomioida tarkemmin.
*   **Sticky Controls:** Pääohjauspainikkeet pysyvät näkyvillä näytön alareunassa pelinäkymässä vierittäessä.

### 3. Pelaajakohtaiset Tapahtumat
Jokaisella pelaajalla on omat painikkeet pelinäkymässä:
*   **"Kentälle" / "Penkillä":** Vaihda pelaajan tilaa. Tila erottuu visuaalisesti.
*   **Pistemerkinnät:** +1P, +2P, +3P.
*   **Virheet:** Henkilökohtaisten virheiden kirjaus.
    *   **Fouled Out:** Pelaaja siirtyy automaattisesti penkille ja pois pelistä saatuaan 5 virhettä. Pelaajakortti ilmaisee tämän tilan.
*   **Syötöt:** Koriin johtaneiden syöttöjen kirjaus.
*   **Levypallot:** Levypallojen kirjaus.
*   **Toimintojen Esto:** Pelaajan toimintonapit (pois lukien virhe) disabloidaan, jos pelaaja ei ole kentällä tai on "fouled out".

### 4. Historia & Analyysidata
*   **Tapahtumahistoria:** Kaikki kirjatut tapahtumat (pelin aloitus/lopetus, jaksojen vaihdot, pelaajien vaihdot, pisteet, virheet jne.) näytetään aikajärjestyksessä (uusin ensin) omassa näkymässään.
    *   Jokaisesta tapahtumasta näytetään aikaleima, jakso, pelaajan tiedot ja tapahtuman kuvaus.
*   **Tapahtuman Poisto:** Virheellisesti kirjatun pelaajakohtaisen tapahtuman voi poistaa suoraan historiasta miinus-painikkeella. Poisto kumoaa tapahtuman vaikutukset pelaajan tilastoihin.
*   **Kopiointipainike:** Kopioi koko pelihistorian (pelin nimi mukaan lukien) leikepöydälle tekstimuodossa, esimerkiksi tekoälyanalyysiä tai jatkokäsittelyä varten.
*   **Pelihistorian Tyhjennys:** Mahdollisuus tyhjentää vain nykyisen pelin tapahtumat ja nollata pelaajien tilastot, säilyttäen kuitenkin pelaajalistan ja pelin nimen seuraavaa peliä varten.

### 5. Tallennus
*   **Automaattinen Tallennus:** Kaikki syötetty data (pelaajat, pelin nimi, tapahtumat, pelin tila) tallennetaan automaattisesti selaimen `localStorage`:iin.
*   **Pysyvyys:** Data säilyy, vaikka selain suljettaisiin ja avattaisiin uudelleen.

## Käyttöliittymä ja Ulkoasu
*   **Responsiivinen Suunnittelu:** Toimii hyvin eri näyttökooilla (iPad vaakatasossa, puhelin pystyasennossa, desktop-selain).
*   **Tumma Teema:** Oletuksena käytössä silmäystävällinen tumma teema.
*   **Selkeä Visuaalisuus:**
    *   Kentällä olevat pelaajat erottuvat vihreällä korostuksella.
    *   "Fouled out" -pelaajat erottuvat punaisella korostuksella ja himmennyksellä.
    *   Painikkeet ovat suuria ja helposti klikattavia myös kosketusnäytöillä.
*   **Google Fonts:** Käytössä `Montserrat` otsikoille ja `Roboto` / `Roboto Mono` leipätekstille ja datan esitykseen ammattimaisemman ilmeen saavuttamiseksi.
*   **Näkymien Erottelu:** Selkeät välilehdet/näkymät eri vaiheille: Pelaajasyöttö → Pelin seuranta → Historia.

## Teknologiat
*   **HTML5**
*   **CSS3** (Flexbox, Grid, Custom Properties)
*   **JavaScript (ES6+)** (Vanilla JS, ei kirjastoja tai frameworkeja)
*   **JSON** (datan muoto `localStorage`:ssa)
*   **localStorage** (kaiken datan säilytyspaikka selaimessa)

## Asennus ja Käyttöönotto

Koska sovellus on puhtaasti selainpohjainen, erillistä asennusta ei tarvita.

1.  **Lataa tiedostot:** Kloonaa tämä repository tai lataa tiedostot (`index.html`, `style.css`, `script.js`) koneellesi.
2.  **Avaa selaimessa:** Avaa `index.html`-tiedosto web-selaimessasi.

TAI

*   **GitHub Pages:** Jos sovellus on hostattu GitHub Pagesissa, voit käyttää sitä suoraan annetusta URL-osoitteesta.

## Tulevaisuuden Kehitysideoita (Mahdollisia)

*   Pelaajien todellisen peliajan laskenta ja näyttö (myös pelin aikana).
*   Automaattisesti generoitu peliyhteenveto pelin jälkeen.
*   Tarkemmat heittotilastot (yritykset/onnistuneet).
*   Menetysten kirjaus.
*   Yksinkertaistettu vastustajan tilastointi.
*   "Tallenna/Lataa kokoonpano" -toiminto.
*   Ja paljon muuta!

## Osallistuminen

Jos sinulla on parannusehdotuksia, löydät bugeja tai haluat muuten osallistua kehitykseen, voit:
*   Luoda "Issue" tähän repositoryyn.
*   Tehdä "Pull Request" omilla muutoksillasi.

---

Toivottavasti tämä README on kattava ja informatiivinen! Voit vapaasti lisätä tai poistaa osioita tarpeen mukaan.
