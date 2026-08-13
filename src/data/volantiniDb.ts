// GENERATO da scripts/update-volantini.mjs — non modificare a mano.
// Fonte: https://www.centrovolantini.it
export interface VolantinoFlyer {
  id: number;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  from?: string;
  to?: string;
  bkcode?: string;
  authid?: string;
}

export interface VolantinoChain {
  slug: string;
  name: string;
  logoId?: string;
  flyers: VolantinoFlyer[];
}

export interface VolantiniDb {
  updatedAt: string;
  source: string;
  chains: VolantinoChain[];
}

export const VOLANTINI_DB: VolantiniDb = {
  "updatedAt": "2026-08-13T14:09:17.351Z",
  "source": "centrovolantini.it",
  "chains": [
    {
      "slug": "mediaworld-italia",
      "name": "Mediaworld",
      "flyers": [
        {
          "id": 278,
          "title": "Volantino Mediaworld Speciale",
          "subtitle": "Mega Sconti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/mediaworld_278.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713cc88abcbfbc5",
          "authid": "cqjfH2oXl3IL"
        },
        {
          "id": 370,
          "title": "Volantino Mediaworld",
          "subtitle": "Prestazioni Al Top",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/mediaworld_370.jpg",
          "from": "2026-08-01T00:00:00+02:00",
          "to": "2026-08-14T00:00:00+02:00",
          "bkcode": "001066713b83225ced345",
          "authid": "y0LiSad3kaeW"
        }
      ]
    },
    {
      "slug": "expert-italia",
      "name": "Expert",
      "flyers": [
        {
          "id": 1863,
          "title": "Volantino Expert DG group",
          "subtitle": "FUORITUTTO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_1863_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671379d55da56932",
          "authid": "OqUogkTvD8pZ"
        },
        {
          "id": 1945,
          "title": "Volantino Gruppo Gaer",
          "subtitle": "FUORITUTTO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_1945.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713b4375c25bf23",
          "authid": "kxyLvI8RWXWW"
        },
        {
          "id": 473,
          "title": "Volantino Expert (Gruppo Somma): Campania",
          "subtitle": "Compri Adesso E Inizi A Pagare A Gennaio 2027",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_473_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667131140d4d08b0a",
          "authid": "s2LOghI0YQQd"
        },
        {
          "id": 551,
          "title": "Volantino Expert Mallardo",
          "subtitle": "Fuori Tutto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_551_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667132b14c325704a",
          "authid": "vRsDjOpLCAya"
        },
        {
          "id": 529,
          "title": "Volantino Expert Teverola Di Lella",
          "subtitle": "Fuoritutto Agosto 2026",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_529_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713e4b3e1c888b3",
          "authid": "vLaSPp49m1HZ"
        },
        {
          "id": 654,
          "title": "Volantino Expert Calabria",
          "subtitle": "Regalo Exagerato",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_654.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671343b6f642354e",
          "authid": "cGorKW9BPnTb"
        }
      ]
    },
    {
      "slug": "carrefour",
      "name": "Carrefour",
      "logoId": "carrefour",
      "flyers": [
        {
          "id": 56,
          "title": "Volantino Carrefour Express",
          "subtitle": "Sconti d&#039;estate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_56.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-25T00:00:00+02:00",
          "bkcode": "0010667138b0b13b4461a",
          "authid": "M16g1RcYo8Ik"
        },
        {
          "id": 2339,
          "title": "Catalogo Carrefour Market Speciale Bis",
          "subtitle": "Speciale bellezza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2339_1.jpg",
          "from": "2026-08-07T00:00:00+02:00",
          "to": "2026-08-27T00:00:00+02:00",
          "bkcode": "00106671321ba0ec97a78",
          "authid": "ZYswY09kk2JB"
        },
        {
          "id": 2103,
          "title": "Volantino Carrefour Market Roma",
          "subtitle": "Prezzi Bollenti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2103.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713b3e63c245776",
          "authid": "CQUpADvPv8pz"
        },
        {
          "id": 1975,
          "title": "Volantino Carrefour Roma e Lazio",
          "subtitle": "Prezzi Bollenti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_1975.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713178bcd96eea2",
          "authid": "cSIpGYWpHbtQ"
        },
        {
          "id": 54,
          "title": "Volantino Carrefour",
          "subtitle": "Prezzi Bollenti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_54_2.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671398702541db3b",
          "authid": "H2hpJcXsRUs9"
        },
        {
          "id": 2306,
          "title": "Volantino Carrefour Iper  Speciale",
          "subtitle": "Speciale lavazza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2306_1.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713ad68aba01360",
          "authid": "FsHf9LAjmopI"
        },
        {
          "id": 2338,
          "title": "Catalogo Carrefour Market Speciale",
          "subtitle": "Punti Sprint Payback",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2338.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713c5d8b19d8b7a",
          "authid": "J35Ie6cNghIw"
        },
        {
          "id": 2307,
          "title": "Catalogo Carrefour Iper: Speciale Bis",
          "subtitle": "Punti Sprint Payback",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2307_0.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713ede2419415ce",
          "authid": "dxN2xcvmOIlC"
        },
        {
          "id": 2337,
          "title": "Volantino Carrefour Iper Speciale Bis",
          "subtitle": "Speciale coccolino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2337.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "0010667136f64e69ceb5d",
          "authid": "Vn4lvUiQhxcb"
        },
        {
          "id": 53,
          "title": "Volantino Carrefour Market",
          "subtitle": "Prezzi Bollenti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_53_1.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667132f5c51581d20",
          "authid": "kPEmpW3AT3Hu"
        },
        {
          "id": 538,
          "title": "Volantino Carrefour: Speciale",
          "subtitle": "Offerte d&#039;estate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_538_0.jpg",
          "from": "2026-08-03T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "0010667139ceef8fb4c46",
          "authid": "IWqS7aOMOGVw"
        },
        {
          "id": 2340,
          "title": "Volantino Carrefour Express Speciale",
          "subtitle": "Offerte d&#039;estate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2340_0.jpg",
          "from": "2026-08-03T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "001066713219c422108a0",
          "authid": "2sbGxQbMBbJf"
        },
        {
          "id": 57,
          "title": "Volantino Carrefour: Speciale",
          "subtitle": "Catalogo Scuola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_57_0.jpg",
          "from": "2026-07-22T00:00:00+02:00",
          "to": "2026-09-06T00:00:00+02:00",
          "bkcode": "001066713e5e90ed516fd",
          "authid": "h1LemZWPeBWW"
        },
        {
          "id": 2027,
          "title": "Volantino Carrefour Sud",
          "subtitle": "Prezzi Bollenti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2027_0.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667136ec4acb6f1d9",
          "authid": "4UiE53jJAdH8"
        }
      ]
    },
    {
      "slug": "coop",
      "name": "Coop",
      "logoId": "coop",
      "flyers": [
        {
          "id": 94,
          "title": "Volantino Coop: Ipercoop Estense",
          "subtitle": "Convenienza Senza Fine",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_94.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713b9761893c435",
          "authid": "rzL2CcEDGBNL"
        },
        {
          "id": 495,
          "title": "Volantino Coop: Ipercoop Nordest e TecnoStore",
          "subtitle": "Offerte per te",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_495_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667133ac84fb1c733",
          "authid": "1kEwfdBCE9UW"
        },
        {
          "id": 89,
          "title": "Volantino Coop Adriatica - Ipercoop",
          "subtitle": "Offerte per te",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_89.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713595990369c5a",
          "authid": "LJ5qjZWl0v0k"
        },
        {
          "id": 1965,
          "title": "Volantino Coop Trento e Trentino",
          "subtitle": "Gran Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1965_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "00106671304f252500662",
          "authid": "IMS1LL0shIap"
        },
        {
          "id": 86,
          "title": "Volantino IperCoop: Lombardia",
          "subtitle": "Extra Offerte",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_86_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713e50aa9c9b086",
          "authid": "0pmCAepzAsDN"
        },
        {
          "id": 2048,
          "title": "Volantino Coop Firenze Speciale",
          "subtitle": "La scuola che fa per tutti",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2048_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713f73ef710c84c",
          "authid": "bcg9XVg6p5d1"
        },
        {
          "id": 1969,
          "title": "Volantino Supermercati Coop Firenze",
          "subtitle": "Promozioni",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1969_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713e5dbfb1cd964",
          "authid": "0MwUpovu9Bog"
        },
        {
          "id": 1913,
          "title": "Volantino Ipercoop Piemonte Novacoop",
          "subtitle": "Extra Offerte",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1913.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713769245674d39",
          "authid": "Di9Gw0ytYtug"
        },
        {
          "id": 2159,
          "title": "Volantino Coop Sicilia Bis",
          "subtitle": "Prepara Il Tuo Ferragosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2159_0.jpg",
          "from": "2026-08-11T00:00:00+02:00",
          "to": "2026-08-20T00:00:00+02:00",
          "bkcode": "0010667135ef1dc6351a9",
          "authid": "6iTBQ3F7aVup"
        },
        {
          "id": 1941,
          "title": "Volantino Ipercoop Sicilia",
          "subtitle": "Ferragosto Al Meglio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1941_1.jpg",
          "from": "2026-08-11T00:00:00+02:00",
          "to": "2026-08-20T00:00:00+02:00",
          "bkcode": "001066713c18790c4b6a5",
          "authid": "q7terU1Baznq"
        },
        {
          "id": 85,
          "title": "Volantino Coop Lombardia",
          "subtitle": "Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_85_1.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671356d9ca9eb253",
          "authid": "4NI3FTRdlPr8"
        },
        {
          "id": 2158,
          "title": "Volantino Coop Sicilia",
          "subtitle": "Prepara Il Tuo Ferragosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2158_1.jpg",
          "from": "2026-08-11T00:00:00+02:00",
          "to": "2026-08-20T00:00:00+02:00",
          "bkcode": "0010667138419d6bf0b1c",
          "authid": "mYSzaKOSKBZq"
        },
        {
          "id": 1967,
          "title": "Volantino Coop Nordest (veneto, friuli, emilia romagna)",
          "subtitle": "Convenienza Senza Fine",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1967.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713f3ebfba5c466",
          "authid": "vvHzIun5QtGx"
        },
        {
          "id": 2301,
          "title": "Volantino Speciale Coop Lombardia Bis",
          "subtitle": "Scuola: Un Rientro Alla Grande",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2301.jpg",
          "from": "2026-07-09T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667134fc0bbc414b4",
          "authid": "b99tJyzAPebS"
        },
        {
          "id": 2300,
          "title": "Volantino Speciale Coop Lombardia",
          "subtitle": "Saldi D&#039;Estate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2300_1.jpg",
          "from": "2026-07-04T00:00:00+02:00",
          "to": "2026-09-01T00:00:00+02:00",
          "bkcode": "0010667136f2cd2312ef8",
          "authid": "tRYf0zXuCARB"
        },
        {
          "id": 2157,
          "title": "Volantino Coop Piemonte",
          "subtitle": "Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2157_1.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667137fa5d7fdd7e3",
          "authid": "5ArHcvPz9fm7"
        },
        {
          "id": 1867,
          "title": "Volantino Coop: Ipercoop Estense Sud",
          "subtitle": "Offerte per te",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1867.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667132ba086ab840f",
          "authid": "MzDyGZK99Nfe"
        },
        {
          "id": 90,
          "title": "Volantino IperCoop Liguria",
          "subtitle": "Extra Offerte",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_90_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667139566774aec3f",
          "authid": "c1NeYYJFNwcn"
        }
      ]
    },
    {
      "slug": "conad",
      "name": "Conad",
      "logoId": "conad",
      "flyers": [
        {
          "id": 714,
          "title": "Volantino Conad Veneto, Friuli, Marche, Romagna",
          "subtitle": "TUTTO AL COSTO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_714.jpg",
          "from": "2026-08-14T00:00:00+02:00",
          "to": "2026-08-20T00:00:00+02:00",
          "bkcode": "001066713097298a1c02e",
          "authid": "Qr2bo1MQtFnW"
        },
        {
          "id": 173,
          "title": "Volantino Conad Superstore Tirreno: Toscana, Lazio e Sardegna",
          "subtitle": "CONVENIENZA GRANDE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_173_1.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "00106671352e251c5e435",
          "authid": "xpG7Nr6QzJra"
        },
        {
          "id": 174,
          "title": "Volantino Conad Superstore Nordiconad: Piemonte, Liguria, Trentino, Valle d&#039;Aosta, Romagna",
          "subtitle": "FRESCHI DI CONVENIENZA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_174_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667133bda9ca65224",
          "authid": "LdiywNlPfvLT"
        },
        {
          "id": 1852,
          "title": "Volantino Conad Superstore Lombardia ed Emilia",
          "subtitle": "Bis",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1852_0.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-25T00:00:00+02:00",
          "bkcode": "001066713a2ae8f8e0920",
          "authid": "X3TGnvbyOJUW"
        },
        {
          "id": 344,
          "title": "Volantino Conad Superstore: Lazio e Campania",
          "subtitle": "Convenienza GRANDE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_344_0.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "00106671320391f29cb3c",
          "authid": "3A4aBM5Y4xJw"
        },
        {
          "id": 723,
          "title": "Volantino Spazio Conad Adriatico: Puglia, Abruzzo, Molise",
          "subtitle": "PREZZI IMBATTIBILI",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_723_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "00106671388b92da88458",
          "authid": "MB6mweaK5SgT"
        },
        {
          "id": 715,
          "title": "Volantino Conad Sicilia",
          "subtitle": "Convenienza GRANDE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_715_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "0010667135ca98d565cde",
          "authid": "uyxDe19qUJ6n"
        },
        {
          "id": 1891,
          "title": "Volantino Spazio Conad Lazio",
          "subtitle": "1,2,3, euro",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1891_0.jpg",
          "from": "2026-08-11T00:00:00+02:00",
          "to": "2026-08-24T00:00:00+02:00",
          "bkcode": "001066713a7975bcd80d3",
          "authid": "b3NQezioBX5k"
        },
        {
          "id": 398,
          "title": "Volantino Conad Adriatico: Abruzzo, Molise, Puglia, Marche, Basilicata",
          "subtitle": "SUPER RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_398.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-25T00:00:00+02:00",
          "bkcode": "00106671305c4bb3c2d90",
          "authid": "rZgrsS3CjaM3"
        },
        {
          "id": 1920,
          "title": "Volantino Conad Margherita Nordiconad",
          "subtitle": "SPECIALE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1920_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713f775e1e11e88",
          "authid": "zlgmbt6keFUI"
        },
        {
          "id": 1836,
          "title": "Volantino Conad Superstore Nordiconad: Piemonte, Liguria, Trentino, Valle d&#039;Aosta, Romagna",
          "subtitle": "CONVENIENZA GRANDE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1836_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "00106671376bae242b7bc",
          "authid": "Vmux0UmLngOX"
        },
        {
          "id": 286,
          "title": "Volantino Margherita",
          "subtitle": "SUPER RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_286.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-25T00:00:00+02:00",
          "bkcode": "001066713d6112988d488",
          "authid": "t7F0bd8eEd4N"
        },
        {
          "id": 342,
          "title": "Volantino Margherita: Lazio e Campania",
          "subtitle": "FRESCHI di Convenienza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_342.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "0010667130c5754f418fb",
          "authid": "eG2k2gyoJP2H"
        },
        {
          "id": 1943,
          "title": "Volantino Conad Tirreno: Toscana, Lazio e Sardegna",
          "subtitle": "FRESCHI DI CONVENIENZA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1943_1.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713469436b537b8",
          "authid": "aeppdy8cb4f9"
        },
        {
          "id": 2148,
          "title": "Volantino Conad Campania",
          "subtitle": "FRESCHI di Convenienza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2148.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713ae041d60f42e",
          "authid": "mH32sbn0DTu0"
        },
        {
          "id": 713,
          "title": "Volantino Conad Nordiconad: Piemonte, Liguria, Trentino, Valle d&#039;Aosta, Romagna",
          "subtitle": "FRESCHI DI CONVENIENZA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_713_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "00106671333a94606feb4",
          "authid": "302wt5BdorBs"
        },
        {
          "id": 2144,
          "title": "Volantino Conad Superstore Sardegna",
          "subtitle": "CONVENIENZA GRANDE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2144.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713cb0563309e2c",
          "authid": "BVuIhUbm11mM"
        },
        {
          "id": 343,
          "title": "Volantino Conad: Lazio e Campania",
          "subtitle": "FRESCHI di Convenienza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_343.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713638565666704",
          "authid": "c64zICu2COf8"
        },
        {
          "id": 82,
          "title": "Volantino Conad City Lombardia ed Emilia",
          "subtitle": "SUPER RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_82.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-25T00:00:00+02:00",
          "bkcode": "001066713dc346a713b97",
          "authid": "c83YsOYnKCjB"
        },
        {
          "id": 81,
          "title": "Volantino Conad Lombardia ed Emilia",
          "subtitle": "CONAD 22 PDV OS 18",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_81_0.jpg",
          "from": "2026-08-12T00:00:00+02:00",
          "to": "2026-08-25T00:00:00+02:00",
          "bkcode": "001066713627cff54d71e",
          "authid": "sD5tsCqj9jJx"
        },
        {
          "id": 2149,
          "title": "Volantino Conad Superstore Campania",
          "subtitle": "Convenienza GRANDE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2149.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713a0785f5ac02d",
          "authid": "kKdw1rFScdWU"
        },
        {
          "id": 2147,
          "title": "Volantino Conad City Campania",
          "subtitle": "FRESCHI di Convenienza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2147.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713355c1eb83782",
          "authid": "ZYZ43zEpIhRX"
        },
        {
          "id": 2142,
          "title": "Volantino Conad Sardegna",
          "subtitle": "FRESCHI DI CONVENIENZA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2142.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "00106671358968ee0c6e5",
          "authid": "4oOCZKI6YEc4"
        },
        {
          "id": 2146,
          "title": "Volantino Conad City Sardegna",
          "subtitle": "SPECIALE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2146_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667133e8ac7640a06",
          "authid": "Pic2MVpxJxTh"
        }
      ]
    },
    {
      "slug": "acqua-e-sapone",
      "name": "Acqua e Sapone",
      "logoId": "acqua-e-sapone",
      "flyers": []
    },
    {
      "slug": "lidl",
      "name": "Lidl",
      "logoId": "lidl",
      "flyers": [
        {
          "id": 559,
          "title": "Volantino Lidl",
          "subtitle": "Ferragosto Al -50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_559_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671368b5dd8038bf",
          "authid": "rVgO7QK38lhD"
        },
        {
          "id": 569,
          "title": "Volantino Anteprima Lidl",
          "subtitle": "Ferragosto fino al -50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_569_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667133a670d96705b",
          "authid": "dgA4hmMqdDtr"
        },
        {
          "id": 2068,
          "title": "Volantino Lidl Speciale Bis",
          "subtitle": "Offerte valide dal 6/08 al 12/08",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_2068_0.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-12T00:00:00+02:00",
          "bkcode": "001066713db6a98e67963",
          "authid": "XEjJ72jXsfNt"
        },
        {
          "id": 754,
          "title": "Volantino Lidl Viaggi",
          "subtitle": "I viaggi del mese",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_754_0.jpg",
          "from": "2026-07-01T00:00:00+02:00",
          "to": "2026-09-06T00:00:00+02:00",
          "bkcode": "0010667132038509ebb52",
          "authid": "99UEsF3WbimF"
        },
        {
          "id": 484,
          "title": "Volantino Lidl Bis",
          "subtitle": "Dal nostro assortimento",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_484.jpg",
          "from": "2026-04-29T00:00:00+02:00",
          "to": "2027-12-31T00:00:00+01:00",
          "bkcode": "0010667136550e81b6192",
          "authid": "mZl4cnRRxjPb"
        },
        {
          "id": 1883,
          "title": "Volantino Lidl Speciale",
          "subtitle": "Vacanze da sogno per la tua estate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_1883_0.jpg",
          "from": "2026-03-11T00:00:00+01:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713b87860cfb04e",
          "authid": "TJl4pcZNktNU"
        }
      ]
    },
    {
      "slug": "esselunga",
      "name": "Esselunga",
      "logoId": "esselunga",
      "flyers": [
        {
          "id": 160,
          "title": "Volantino Esselunga Superstore",
          "subtitle": "Sconti Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_160_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713e030e27fc6e4",
          "authid": "KlJFLkrPmmpF"
        },
        {
          "id": 2360,
          "title": "Catalogo Esselunga Speciale Bis",
          "subtitle": "Fidaty",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2360_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667137dcad75cf20e",
          "authid": "CQlQE7wCL5Tb"
        },
        {
          "id": 2141,
          "title": "Volantino Esselunga Toscana",
          "subtitle": "Sconti Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2141_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713834aa06b9f9d",
          "authid": "MwDNPXAKbMl9"
        },
        {
          "id": 789,
          "title": "Volantino Esselunga: Speciale Bis",
          "subtitle": "Speciale Cura Della Persona",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_789.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-12T00:00:00+02:00",
          "bkcode": "001066713fb8f99c563ac",
          "authid": "cQNKvu4ATQW8"
        },
        {
          "id": 79,
          "title": "Volantino Esselunga: Speciale",
          "subtitle": "Freschi E Convenienti Sempre",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_79.jpg",
          "from": "2026-07-02T00:00:00+02:00",
          "to": "2026-12-31T00:00:00+01:00",
          "bkcode": "001066713d9f837b160cf",
          "authid": "rc0Q9GsSsIan"
        },
        {
          "id": 616,
          "title": "Volantino Esselunga Servizio Viaggi",
          "subtitle": "Un Mare Di Offerte",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_616_1.jpg",
          "from": "2026-05-01T00:00:00+02:00",
          "to": "2026-09-30T00:00:00+02:00",
          "bkcode": "001066713b9188353d514",
          "authid": "BVWB8NZ70hlH"
        },
        {
          "id": 2138,
          "title": "Volantino Esselunga Emilia Romagna",
          "subtitle": "Sconti Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2138.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713f6af67ad1add",
          "authid": "kDabBvKx2IFU"
        },
        {
          "id": 2139,
          "title": "Volantino Esselunga Lazio",
          "subtitle": "Sconti Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2139.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713d1594c3b0224",
          "authid": "jXUbO9eIaEqG"
        },
        {
          "id": 2140,
          "title": "Volantino Esselunga Piemonte",
          "subtitle": "Sconti Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2140.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713c53b28f2b6a7",
          "authid": "O0qUtQKTDOaq"
        }
      ]
    },
    {
      "slug": "euronics",
      "name": "Euronics",
      "flyers": [
        {
          "id": 152,
          "title": "Volantino Euronics (Gruppo Siem): Abruzzo, Molise, Campania, Puglia, Basilicata, Calabria",
          "subtitle": "Più Prendi Meno Spendi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_152_0.jpg",
          "from": "2026-08-03T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "00106671351ae54f72ba9",
          "authid": "ZotIWtjrfyfI"
        },
        {
          "id": 149,
          "title": "Volantino Euronics CDS Butali: Toscana, Marche, Umbria, Lazio, Emilia Romagna",
          "subtitle": "Svuota Tutto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_149_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713d4b719d39712",
          "authid": "uF42Ixj7dC3D"
        },
        {
          "id": 536,
          "title": "Volantino Euronics (Gruppo La Via Lattea): Sicilia",
          "subtitle": "Agosto Black",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_536.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671346d9b04623da",
          "authid": "McBL1WzmOUR5"
        },
        {
          "id": 151,
          "title": "Volantino Euronics (Gruppo Dimo)",
          "subtitle": "Star Tech",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_151.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671303014f060c8b",
          "authid": "h78uxMaijgKE"
        },
        {
          "id": 154,
          "title": "Volantino Euronics (Gruppo Tufano): Lazio, Campania, Calabria",
          "subtitle": "Fino a 300€ Di Sconto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_154_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671352a240a1b7b0",
          "authid": "M8j8D9RTxV2c"
        }
      ]
    },
    {
      "slug": "ipercoop",
      "name": "Ipercoop",
      "flyers": []
    },
    {
      "slug": "aldi",
      "name": "Logo Aldi",
      "logoId": "aldi",
      "flyers": [
        {
          "id": 2328,
          "title": "Volantino Aldi: Anteprima",
          "subtitle": "Prezzi Bassi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/aldi_it_2328_1.jpg",
          "from": "2026-08-17T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713e258362e3fb7",
          "authid": "wcoBAuwY3b2z"
        },
        {
          "id": 2213,
          "title": "Volantino Aldi",
          "subtitle": "Prezzi Bassi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/aldi_it_2213_1.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-16T00:00:00+02:00",
          "bkcode": "001066713550eb623687e",
          "authid": "Ga63lznPcFY1"
        }
      ]
    },
    {
      "slug": "unieuro",
      "name": "Unieuro",
      "flyers": [
        {
          "id": 147,
          "title": "Volantino Unieuro",
          "subtitle": "Il Vero Fuoritutto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/unieuro_147_1.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "0010667138bbb70c81f79",
          "authid": "SbWTRD0Gs41e"
        }
      ]
    },
    {
      "slug": "despar",
      "name": "Despar",
      "logoId": "despar",
      "flyers": []
    },
    {
      "slug": "eurospin",
      "name": "Eurospin",
      "logoId": "eurospin",
      "flyers": [
        {
          "id": 2024,
          "title": "Volantino Eurospin Viaggi Bis",
          "subtitle": "ALTRE OFFERTE FRUTTA E VERDURA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_2024_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-16T00:00:00+02:00",
          "bkcode": "00106671302ae6294d290",
          "authid": "dBqjcHhhdqPA"
        },
        {
          "id": 1974,
          "title": "Volantino Eurospin Speciale Roma e Lazio",
          "subtitle": "SPECIALE APERITIVO, SARDELIZIE, PASCOLI E ATHENA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_1974_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "00106671338539cf6973c",
          "authid": "kl3Ei9IEDXNA"
        },
        {
          "id": 105,
          "title": "Volantino Eurospin",
          "subtitle": "SPECIALE APERITIVO, SARDELIZIE, PASCOLI E ATHENA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_105.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "00106671318ca5061eda1",
          "authid": "mfJXuRZN6pMt"
        },
        {
          "id": 2154,
          "title": "Volantino Eurospin Sicilia",
          "subtitle": "SPECIALE APERITIVO, SARDELIZIE, PASCOLI E ATHENA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_2154_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "0010667132dd8729ad972",
          "authid": "TUdUOPjgXkS6"
        },
        {
          "id": 2153,
          "title": "Volantino Eurospin Toscana",
          "subtitle": "SPECIALE APERITIVO, SARDELIZIE, PASCOLI E ATHENA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_2153_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "0010667131c1b682a2ea7",
          "authid": "DTk9Kvtr4a3Z"
        }
      ]
    },
    {
      "slug": "md-discount",
      "name": "MD Discount",
      "logoId": "md",
      "flyers": [
        {
          "id": 114,
          "title": "Volantino MD Discount",
          "subtitle": "Buona Spesa, Italia!",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/md_discont_114.jpg",
          "from": "2026-08-11T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713bdc9a8433c3d",
          "authid": "gcQNebUllpqN"
        },
        {
          "id": 246,
          "title": "Volantino MD Lombardia",
          "subtitle": "Buona Spesa, Italia!",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/md_discont_246.jpg",
          "from": "2026-08-11T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "0010667131906061123e5",
          "authid": "gQkisOo9GkRF"
        }
      ]
    },
    {
      "slug": "mondo-convenienza",
      "name": "Mondo Convenienza",
      "flyers": [
        {
          "id": 232,
          "title": "Catalogo Mondo Convenienza",
          "subtitle": "Speciale Camere",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/mondoconvenienza_232.jpg",
          "from": "2026-07-01T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "0010667137318c33a075d",
          "authid": "JA6IJw3XrkDy"
        }
      ]
    },
    {
      "slug": "leroy-merlin",
      "name": "Leroy Merlin",
      "flyers": [
        {
          "id": 589,
          "title": "Volantino Leroy Merlin Bis",
          "subtitle": "Catalogo Giardino 2026",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/leroy_merlin_it_589.jpg",
          "from": "2026-05-01T00:00:00+02:00",
          "to": "2026-09-30T00:00:00+02:00",
          "bkcode": "0010667138a06e59bcd55",
          "authid": "zdhoMXvHpS7E"
        }
      ]
    },
    {
      "slug": "bennet",
      "name": "Bennet",
      "logoId": "bennet",
      "flyers": [
        {
          "id": 101,
          "title": "Volantino Bennet",
          "subtitle": "Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        },
        {
          "id": 100,
          "title": "Volantino Bennet Bis",
          "subtitle": "Dalla Brace Alla Tavola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_100_1.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "001066713959ad5f53feb",
          "authid": "rQHY5Xym1JkP"
        },
        {
          "id": 171,
          "title": "Volantino Bennet: Speciale",
          "subtitle": "Scuola 1",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_171_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713aea57fcb096f",
          "authid": "cE9vmFCLgsZe"
        },
        {
          "id": 1862,
          "title": "Volantino Bennet Ter",
          "subtitle": "Offerte Extra",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_1862_1.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-12T00:00:00+02:00",
          "bkcode": "001066713346a79a4ee39",
          "authid": "xI29GXHgS5j8"
        }
      ]
    },
    {
      "slug": "panorama",
      "name": "Panorama",
      "flyers": [
        {
          "id": 545,
          "title": "Volantino Panorama",
          "subtitle": "Offerte Irresistibili",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/panorama_545.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667131e673ec9665c",
          "authid": "dvnfT2mW2b5A"
        },
        {
          "id": 318,
          "title": "Volantino Panorama",
          "subtitle": "Occasioni Extra",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/panorama_318_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-12T00:00:00+02:00",
          "bkcode": "001066713a278390ffe86",
          "authid": "hHaxbKy0bS1L"
        }
      ]
    },
    {
      "slug": "iper-la-grande-i",
      "name": "Iper, La grande i",
      "flyers": [
        {
          "id": 50,
          "title": "Volantino Iper, la grande i",
          "subtitle": "SCONTI GUSTOSI",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_50_0.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-21T00:00:00+02:00",
          "bkcode": "0010667132730f4f3b3fa",
          "authid": "ivHniPTBPUEP"
        },
        {
          "id": 506,
          "title": "Volantino Iper Speciale",
          "subtitle": "PRONTI, SCUOLA, VIA!",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_506.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-10-11T00:00:00+02:00",
          "bkcode": "001066713c26268366d9b",
          "authid": "EZmcbmgIZwRi"
        },
        {
          "id": 51,
          "title": "Volantino Iper: Speciale",
          "subtitle": "SPECIALE PET FOOD",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_51_0.jpg",
          "from": "2026-07-29T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "001066713799d30b6739c",
          "authid": "BlMNTDFeGbfe"
        },
        {
          "id": 3,
          "title": "Volantino Iper, la grande i: Speciale",
          "subtitle": "FESTA DELLA BIRRA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_3.jpg",
          "from": "2026-07-27T00:00:00+02:00",
          "to": "2026-08-16T00:00:00+02:00",
          "bkcode": "00106671399ef2cc4a70e",
          "authid": "dyMa5zOXCjjR"
        },
        {
          "id": 1909,
          "title": "Volantino Iper, la grande i: Speciale Bis",
          "subtitle": "LA SCUOLA CHIAMA!",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_1909_0.jpg",
          "from": "2026-07-09T00:00:00+02:00",
          "to": "2026-09-27T00:00:00+02:00",
          "bkcode": "0010667136e3ea93b29eb",
          "authid": "gekt7lXNvaK6"
        },
        {
          "id": 2240,
          "title": "Volantino Iper Busnago",
          "subtitle": "SCONTI GUSTOSI",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_2240.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-21T00:00:00+02:00",
          "bkcode": "0010667136ee3ebd59571",
          "authid": "izsw3jj2CeHU"
        },
        {
          "id": 412,
          "title": "Volantino Iper: Milano Portello",
          "subtitle": "SCONTI GUSTOSI",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_412.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-21T00:00:00+02:00",
          "bkcode": "001066713886aeb31a4dc",
          "authid": "kKIGusxwSIfQ"
        },
        {
          "id": 2241,
          "title": "Volantino Iper Serravalle",
          "subtitle": "SCONTI GUSTOSI",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_2241.jpg",
          "from": "2026-08-10T00:00:00+02:00",
          "to": "2026-08-21T00:00:00+02:00",
          "bkcode": "0010667134d5152ef09be",
          "authid": "s4RG69p4wsBg"
        }
      ]
    },
    {
      "slug": "trony",
      "name": "Trony",
      "flyers": [
        {
          "id": 145,
          "title": "Volantino Trony: Province di Milano, Bergamo, Brescia, Verona, Cremona, Vercelli, Alessandria, Lodi, Mantova",
          "subtitle": "Fuori Tutto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/trony_145_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "00106671382762c101898",
          "authid": "fk8BrdALbsr0"
        },
        {
          "id": 194,
          "title": "Volantino Trony Province Salerno, Avellino",
          "subtitle": "Black Friday",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/trony_194_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713df91f1a06a95",
          "authid": "w2uM9nTYhPlw"
        },
        {
          "id": 198,
          "title": "Volantino Trony Trento",
          "subtitle": "Fuori Tutto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/trony_198_1.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-23T00:00:00+02:00",
          "bkcode": "001066713aeb1ccc878f3",
          "authid": "E0uyN5I0zx6N"
        }
      ]
    },
    {
      "slug": "il-gigante",
      "name": "Il Gigante",
      "logoId": "ilgigante",
      "flyers": [
        {
          "id": 58,
          "title": "Volantino Il Gigante",
          "subtitle": "Sconti 30% 40% 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/il_gigante_58_0.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667138b29cd887cc5",
          "authid": "8EYb5KYLaacy"
        },
        {
          "id": 59,
          "title": "Catalogo Il Gigante",
          "subtitle": "Catalogo Scuola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/il_gigante_59.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-09-30T00:00:00+02:00",
          "bkcode": "00106671366c822b91831",
          "authid": "Ike9lvOIhwzP"
        },
        {
          "id": 9,
          "title": "Volantino Il Gigante",
          "subtitle": "Brico Estate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/il_gigante_9.jpg",
          "from": "2026-07-16T00:00:00+02:00",
          "to": "2026-09-09T00:00:00+02:00",
          "bkcode": "001066713fc3b3cf0898d",
          "authid": "4KdBQyfLDWLm"
        }
      ]
    },
    {
      "slug": "comet",
      "name": "Comet",
      "flyers": [
        {
          "id": 496,
          "title": "Volantino Comet: Speciale",
          "subtitle": "Piccoli Elettrodomestici",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_496_0.jpg",
          "from": "2026-07-31T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "0010667130ec3f3eb57f9",
          "authid": "9xCOO64djqgJ"
        },
        {
          "id": 169,
          "title": "Volantino Comet",
          "subtitle": "Telefonia",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_169_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671355b165257069",
          "authid": "I3BM3LYwORwK"
        },
        {
          "id": 170,
          "title": "Volantino Comet",
          "subtitle": "Sconti Fino Al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_170_0.jpg",
          "from": "2026-07-30T00:00:00+02:00",
          "to": "2026-08-19T00:00:00+02:00",
          "bkcode": "00106671355fda1276177",
          "authid": "mXbztxFELHWI"
        },
        {
          "id": 467,
          "title": "Volantino Comet",
          "subtitle": "Climatizzazione Senza Pensieri",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_467.jpg",
          "from": "2026-05-14T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "0010667134a7a4e618b93",
          "authid": "J5S8QwL5Bz2g"
        }
      ]
    },
    {
      "slug": "tecnomat",
      "name": "Bricoman",
      "flyers": []
    },
    {
      "slug": "metro",
      "name": "Metro",
      "flyers": []
    },
    {
      "slug": "penny-market",
      "name": "Penny Market",
      "logoId": "penny",
      "flyers": [
        {
          "id": 69,
          "title": "Volantino Penny Market",
          "subtitle": "A Tutta Birra",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/penny_market_69.jpg",
          "from": "2026-08-13T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "00106671372e4e783b025",
          "authid": "qMqvFOZY0D9x"
        }
      ]
    },
    {
      "slug": "famila",
      "name": "Famila",
      "logoId": "famila",
      "flyers": []
    },
    {
      "slug": "brico-io",
      "name": "Brico Io",
      "flyers": [
        {
          "id": 329,
          "title": "Catalogo Brico Io: Speciale",
          "subtitle": "Arredo Giardino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/brico_io_329.jpg",
          "from": "2026-03-30T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "0010667130cb69074d709",
          "authid": "V3xAIRUdnb9f"
        },
        {
          "id": 504,
          "title": "Volantino Brico Io",
          "subtitle": "Barbecue",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/brico_io_504.jpg",
          "from": "2026-03-30T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "001066713e479c1bf2ae3",
          "authid": "UCq4GzouIcLd"
        },
        {
          "id": 330,
          "title": "Volantino Brico Io Bis",
          "subtitle": "Macchine Da Gairdino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/brico_io_330.jpg",
          "from": "2026-03-30T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "001066713abd86bbb7f9c",
          "authid": "EPQhuGwAtzs7"
        }
      ]
    },
    {
      "slug": "bricofer",
      "name": "Loo Bricofer",
      "flyers": [
        {
          "id": 2112,
          "title": "Volantino Bricofer",
          "subtitle": "Primavera Estate 2026",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bricofer_2112.jpg",
          "from": "2026-05-05T00:00:00+02:00",
          "to": "2026-08-31T00:00:00+02:00",
          "bkcode": "0010667132afa68526101",
          "authid": "0OB9DfNVAxwe"
        },
        {
          "id": 2113,
          "title": "Catalogo Bricofer",
          "subtitle": "Benessere Che Ti Avvolege Ogni Giorno",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bricofer_2113.jpg",
          "from": "2025-10-01T00:00:00+02:00",
          "to": "2026-12-31T00:00:00+01:00",
          "bkcode": "001066713172e9b06f868",
          "authid": "3VFPYbSNEHF3"
        }
      ]
    },
    {
      "slug": "emisfero-ipermercati",
      "name": "Emisfero Ipermercati",
      "flyers": [
        {
          "id": 292,
          "title": "Volantino Emisfero",
          "subtitle": "Risparmio Da Scoprire",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/emisfero_292_1.jpg",
          "from": "2026-08-06T00:00:00+02:00",
          "to": "2026-08-26T00:00:00+02:00",
          "bkcode": "0010667133602ccf19c84",
          "authid": "7wuONDJeeRkg"
        }
      ]
    }
  ]
};
