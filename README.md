# Pelaajaseuranta – Basket Tracker 🏀

**Pelaajaseuranta – Basket Tracker** on responsiivinen, visuaalisesti selkeä ja helppokäyttöinen web-sovellus, jonka avulla voidaan seurata koripallojoukkueen (erityisesti juniorijoukkueen) yksittäisten pelaajien peliaikaa ja tapahtumia ottelun aikana. Sovellus on suunniteltu erityisesti valmentajalle, joka haluaa analysoida peluutusta ja pelitapahtumia reaaliajassa sekä pelin jälkeen.

Sovellus on toteutettu puhtaasti frontend-teknologioilla (HTML, CSS, JavaScript) ja se tallentaa kaiken datan paikallisesti selaimen `localStorage`:iin, joten erillistä backend-palvelinta tai tietokantaa ei tarvita.

## Ominaisuudet

### 1. Pelaajien ja Pelin Asetukset
*   **Joukkueiden Nimien Syöttö:** Anna koti- ja vierasjoukkueen nimet raportointia ja näyttöä varten.
*   **Pelaajia Kentällä -asetus:** Valitse, pelataanko 3v3, 4v4 vai 5v5. Vaikuttaa maksimipelaajamäärään kentällä.
*   **Pelaajien Lisäys:** Syötä pelaajien nimet ja pelinumerot ennen pelin alkua.
*   **Pelaajalista:** Näyttää lisätyt pelaajat selkeästi. Pelaajia voi myös poistaa listalta.

### 2. Pelin Aikainen Käyttö
*   **Pelin Aloitus/Lopetus:** Selkeät napit pelin aloittamiseen ja lopettamiseen. Jokainen merkittävä pelitapahtuma saa aikaleiman.
*   **Jaksojen Vaihto:** Mahdollisuus siirtyä seuraavaan jaksoon (1-4). Jaksovirheet nollataan jakson alussa.
*   **Pelikatkot:** Nappi pelikatkon aloittamiseen ja jatkamiseen, jotta todellinen peliaika voidaan huomioida tarkemmin (vaikuttamatta jaksovirheisiin).
*   **Sticky Controls:** Pääohjauspainikkeet pysyvät näkyvillä näytön alareunassa pelinäkymässä vierittäessä.

### 3. Pelaajakohtaiset Tapahtumat
Jokaisella pelaajalla on omat painikkeet pelinäkymässä:
*   **"Kentälle" / "Penkillä":** Vaihda pelaajan tilaa. Tila erottuu visuaalisesti. Vaikuttaa peliajan kertymiseen.
*   **Pistemerkinnät:** +1P, +2P, +3P.
*   **Virheet:** Henkilökohtaisten virheiden kirjaus (sekä kokonaisvirheisiin että käynnissä olevan jakson virheisiin).
    *   **Fouled Out:** Pelaaja siirtyy automaattisesti penkille ja pois pelistä saatuaan 5 virhettä. Pelaajakortti ilmaisee tämän tilan.
*   **Syötöt:** Koriin johtaneiden syöttöjen kirjaus.
*   **Levypallot:** Levypallojen kirjaus.
*   **Toimintojen Esto:** Pelaajan toimintonapit (pois lukien virhe) disabloidaan, jos pelaaja ei ole kentällä tai on "fouled out". Syöttö/levypallo estetään myös manuaalisen katkon aikana.

### 4. Raportointi, Historia & Analyysidata
*   **Raportti-näkymä:**
    *   Näyttää yhteenvedon pelistä (tila, kokonaispeliaika, pisteet, kotijoukkueen kokonaisvirheet).
    *   Listaa pelaajakohtaiset tilastot (P, V, S, L) sekä **lasketun peliajan** (MM:SS) ja peluutusprosentin. Päivittyy pelin aikana.
*   **Tapahtumahistoria:**
    *   Kaikki kirjatut tapahtumat (pelin aloitus/lopetus, jaksojen vaihdot, pelaajien vaihdot, pisteet, virheet jne.) näytetään aikajärjestyksessä (uusin ensin) omassa näkymässään aikaleimoin ja jakson tilan kera.
    *   **Tapahtuman Poisto:** Virheellisesti kirjatun tilastotapahtuman (pisteet, virheet, syötöt, levypallot, vast. pisteet) voi poistaa suoraan historiasta "Peru"-painikkeella. Poisto kumoaa tapahtuman vaikutukset pelaajan **kokonais**tilastoihin (ei korjaa peliaikaa tai jaksovirhelaskuria taannehtivasti).
*   **Kopiointipainike (Historia):** Kopioi koko pelihistorian (joukkueiden nimet ja lopputulos mukaan lukien) leikepöydälle tekstimuodossa, esimerkiksi tekoälyanalyysiä tai jatkokäsittelyä varten.
*   **Pelihistorian Tyhjennys:** Mahdollisuus tyhjentää vain nykyisen pelin tapahtumat ja nollata pelaajien tilastot sekä peliajat, säilyttäen kuitenkin pelaajalistan ja syötetyt joukkueiden nimet seuraavaa peliä varten.

### 5. Tallennus
*   **Automaattinen Tallennus:** Kaikki syötetty data (pelaajat, joukkueiden nimet, tapahtumat, pelin tila) tallennetaan automaattisesti selaimen `localStorage`:iin.
*   **Pysyvyys:** Data säilyy, vaikka selain suljettaisiin ja avattaisiin uudelleen.

## Käyttöliittymä ja Ulkoasu
*   **Responsiivinen Suunnittelu:** Toimii hyvin eri näyttökooilla (iPad vaakatasossa, puhelin pystyasennossa, desktop-selain).
*   **Tumma Teema:** Oletuksena käytössä silmäystävällinen tumma teema.
*   **Selkeä Visuaalisuus:**
    *   Kentällä olevat pelaajat erottuvat vihreällä korostuksella.
    *   "Fouled out" -pelaajat erottuvat punaisella korostuksella ja himmennyksellä.
    *   Painikkeet ovat suuria ja helposti klikattavia myös kosketusnäytöillä.
*   **Google Fonts:** Käytössä `Montserrat` otsikoille ja `Roboto` / `Roboto Mono` leipätekstille ja datan esitykseen ammattimaisemman ilmeen saavuttamiseksi.
*   **Näkymien Erottelu:** Selkeät näkymät eri toiminnoille: Asetukset → Pelin seuranta → Raportti → Historia, joiden välillä navigoidaan napeilla.

## Teknologiat
*   **HTML5**
*   **CSS3** (Flexbox, Grid, Custom Properties)
*   **JavaScript (ES6+)** (Vanilla JS, ei kirjastoja tai frameworkeja)
*   **JSON** (datan muoto `localStorage`:ssa)
*   **localStorage** (kaiken datan säilytyspaikka selaimessa)

## Asennus ja Käyttöönotto

Koska sovellus on puhtaasti selainpohjainen, erillistä asennusta ei tarvita.

1.  **Lataa tiedostot:** Kloonaa tämä repository tai lataa tiedostot (`index.html`, `style.css`, `script.js`, `logo_iso.png`) koneellesi.
2.  **Avaa selaimessa:** Avaa `index.html`-tiedosto web-selaimessasi.

TAI

*   **GitHub Pages:** Käytä sovellusta suoraan osoitteesta: [https://vperasto.github.io/pelaajaseuranta-2/](https://vperasto.github.io/pelaajaseuranta-2/)

## Tulevaisuuden Kehitysideoita (Mahdollisia)

*   Peliajan näyttö reaaliaikaisesti pelinäkymän pelaajakorteissa.
*   Raporttinäkymän laajentaminen (esim. +/- tilasto, heittoprosentit).
*   Tarkemmat heittotilastot (yritykset/onnistuneet).
*   Menetysten kirjaus.
*   Vastustajan pelaajakohtainen (yksinkertaistettu) tilastointi.
*   "Tallenna/Lataa kokoonpano" -toiminto eri pelejä varten.
*   Jaksoittaisten virheiden näyttö myös raportissa.

## 🔒 Lisenssi

Creative Commons Attribution-NonCommercial 4.0 International License
Tämä työ on lisensoitu nimellä: **Vesa Perasto**
[Katso lisenssi](http://creativecommons.org/licenses/by-nc/4.0/)

---

## 🙌 Kiitokset

Sovellus kehitetty omaksi avuksi ja muiden ohjaajien tueksi.
Jos teet muutoksia tai laajennuksia, säilytä alkuperäinen tekijämerkintä.
