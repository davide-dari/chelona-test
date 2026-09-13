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
  "updatedAt": "2026-09-13T22:28:08.385Z",
  "source": "centrovolantini.it",
  "chains": [
    {
      "slug": "mediaworld-italia",
      "name": "Mediaworld",
      "flyers": [
        {
          "id": 157,
          "title": "Volantino Mediaworld Bis",
          "subtitle": "Il Clima Che Cercavi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/mediaworld_157_1.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667133c1a59af491d",
          "authid": "DIB4XhzCgJAj"
        },
        {
          "id": 370,
          "title": "Volantino Mediaworld",
          "subtitle": "Back To School",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/mediaworld_370.jpg",
          "from": "2026-09-01T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "0010667136985aca76ec4",
          "authid": "9ekL7qW2oWYO"
        }
      ]
    },
    {
      "slug": "expert-italia",
      "name": "Expert",
      "flyers": [
        {
          "id": 1945,
          "title": "Volantino Gruppo Gaer",
          "subtitle": "Continua Tech to School",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_1945.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "0010667139f797deafc46",
          "authid": "cW2xrbXgcEtz"
        },
        {
          "id": 1855,
          "title": "Volantino Expert DG Group Speciale",
          "subtitle": "SELECTION: con il meglio di Samsung hai in regalo Galaxy Tab A11",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_1855.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713347f97ec7651",
          "authid": "ssVYGa56gvGD"
        },
        {
          "id": 1863,
          "title": "Volantino Expert DG group",
          "subtitle": "CONTINUA TECH TO SCHOOL",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_1863_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "0010667130b9195bee45f",
          "authid": "2rQpTPgMdUzk"
        },
        {
          "id": 473,
          "title": "Volantino Expert (Gruppo Somma): Campania",
          "subtitle": "Esci Da Esperto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_473_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713f0dc4eea5b99",
          "authid": "ZncdxYnPtR0s"
        },
        {
          "id": 551,
          "title": "Volantino Expert Mallardo",
          "subtitle": "Compri Oggi Inizi A Pagare Da Novembre",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_551_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "00106671315ad3c47a2f7",
          "authid": "WIggR1T1e3gc"
        },
        {
          "id": 529,
          "title": "Volantino Expert Teverola Di Lella",
          "subtitle": "Tech to School",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_529_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713acacf7fafdcb",
          "authid": "lC4UTLX9zLjR"
        },
        {
          "id": 654,
          "title": "Volantino Expert Calabria",
          "subtitle": "Scegli La Tua Rata",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/expert_it_654.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "0010667135e64b69f6036",
          "authid": "ffndQhay81ER"
        }
      ]
    },
    {
      "slug": "carrefour",
      "name": "Carrefour",
      "logoId": "carrefour",
      "flyers": [
        {
          "id": 44,
          "title": "Volantino Carrefour",
          "subtitle": "Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_44_0.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-09-25T00:00:00+02:00",
          "bkcode": "001066713f9f9e615c8ff",
          "authid": "nMkfNsXy40r8"
        },
        {
          "id": 2307,
          "title": "Catalogo Carrefour Iper: Speciale Bis",
          "subtitle": "Punti Sprint Payback",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2307.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-09-28T00:00:00+02:00",
          "bkcode": "001066713d1dfc91201ca",
          "authid": "FCA8zOxMbpHy"
        },
        {
          "id": 2338,
          "title": "Catalogo Carrefour Market Speciale",
          "subtitle": "Punti Sprint Payback",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2338_0.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-09-25T00:00:00+02:00",
          "bkcode": "0010667132d3fefd5a575",
          "authid": "6ZxcYL7Wj8lZ"
        },
        {
          "id": 2306,
          "title": "Volantino Carrefour Iper  Speciale",
          "subtitle": "Speciale Coca-Cola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2306_0.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-10-12T00:00:00+02:00",
          "bkcode": "0010667138f8c0789665f",
          "authid": "sRYZfWqDfAVi"
        },
        {
          "id": 2358,
          "title": "Volantino Carrefour Market Speciale Ter",
          "subtitle": "Speciale Coca-Cola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2358_1.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-10-12T00:00:00+02:00",
          "bkcode": "001066713269bf5c6762d",
          "authid": "TuVmLINNgcDi"
        },
        {
          "id": 566,
          "title": "Volantino Carrefour Market",
          "subtitle": "Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_566_0.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-09-25T00:00:00+02:00",
          "bkcode": "00106671340bafa3494cc",
          "authid": "vG5uOZAbj12R"
        },
        {
          "id": 2341,
          "title": "Volantino Carrefour Express Speciale Bis",
          "subtitle": "Speciale cura casa",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2341.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "001066713888833198824",
          "authid": "NSqzlCAuIXbq"
        },
        {
          "id": 2340,
          "title": "Volantino Carrefour Express Speciale",
          "subtitle": "Speciale Coca-Cola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2340.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-10-06T00:00:00+02:00",
          "bkcode": "0010667131533cf858862",
          "authid": "C1O6hNvKogb3"
        },
        {
          "id": 56,
          "title": "Volantino Carrefour Express",
          "subtitle": "Sconti fino al 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_56_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "001066713913c9e65e4c2",
          "authid": "XBMOxO6SrQuU"
        },
        {
          "id": 2103,
          "title": "Volantino Carrefour Market Roma",
          "subtitle": "Sottocosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2103.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671370e448004979",
          "authid": "UvrjZV2jDfOK"
        },
        {
          "id": 1975,
          "title": "Volantino Carrefour Roma e Lazio",
          "subtitle": "Sottocosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_1975.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671396f6fd6c09f9",
          "authid": "kw0DhE1H4Qjh"
        },
        {
          "id": 54,
          "title": "Volantino Carrefour",
          "subtitle": "Sottocosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_54_0.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671385f0ba0ebfc2",
          "authid": "TnoqwZQ8N3p0"
        },
        {
          "id": 2339,
          "title": "Catalogo Carrefour Market Speciale Bis",
          "subtitle": "Speciale Colgate",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2339.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "001066713da80c66814c0",
          "authid": "CTOfE36Hjj6P"
        },
        {
          "id": 2305,
          "title": "Volantino Carrefour Market Speciale Bis",
          "subtitle": "Speciale casa",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2305_0.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "0010667133fea362dfea9",
          "authid": "Pl9KseWkNBZP"
        },
        {
          "id": 53,
          "title": "Volantino Carrefour Market",
          "subtitle": "Sottocosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_53.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "0010667135448da2dfb91",
          "authid": "stMyvzM8QQXI"
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
          "id": 2027,
          "title": "Volantino Carrefour Sud",
          "subtitle": "Sottocosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/carrefour_it_2027_0.jpg",
          "from": "2026-09-04T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671335f98fb41e27",
          "authid": "lQI0Gr4P2RfH"
        }
      ]
    },
    {
      "slug": "coop",
      "name": "Coop",
      "logoId": "coop",
      "flyers": [
        {
          "id": 2159,
          "title": "Volantino Coop Sicilia Bis",
          "subtitle": "30% 40% 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2159_1.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-21T00:00:00+02:00",
          "bkcode": "0010667130d464f03271a",
          "authid": "FeiMjOzYohfa"
        },
        {
          "id": 1941,
          "title": "Volantino Ipercoop Sicilia",
          "subtitle": "30% 40% 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1941_0.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-21T00:00:00+02:00",
          "bkcode": "001066713018cc18c95b7",
          "authid": "ENoHHft9WLHe"
        },
        {
          "id": 1965,
          "title": "Volantino Coop Trento e Trentino",
          "subtitle": "Grandi marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1965_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713bc8dee74e2c9",
          "authid": "vuW3quXjVd6V"
        },
        {
          "id": 1967,
          "title": "Volantino Coop Nordest (veneto, friuli, emilia romagna)",
          "subtitle": "Grandi marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1967.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667134ed594e8618d",
          "authid": "7dM6dTs37XPs"
        },
        {
          "id": 89,
          "title": "Volantino Coop Adriatica - Ipercoop",
          "subtitle": "Grandi marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_89.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713d7d0eac4248d",
          "authid": "qHUd9VCZG674"
        },
        {
          "id": 94,
          "title": "Volantino Coop: Ipercoop Estense",
          "subtitle": "Grandi marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_94.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667133deb8136f3ae",
          "authid": "xgvPoMZqphMX"
        },
        {
          "id": 86,
          "title": "Volantino IperCoop: Lombardia",
          "subtitle": "Scegli Tu Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_86_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713bb721df5d032",
          "authid": "6O9WOzntLO6V"
        },
        {
          "id": 1969,
          "title": "Volantino Supermercati Coop Firenze",
          "subtitle": "Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1969_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713eceb0657531e",
          "authid": "5FhS9qsbxYPd"
        },
        {
          "id": 2366,
          "title": "Coop Lombardia Bis",
          "subtitle": "Scegli Tu Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2366_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713f452d10157a1",
          "authid": "tbX5Tlll1Qlw"
        },
        {
          "id": 85,
          "title": "Volantino Coop Lombardia",
          "subtitle": "Prezzi Giù",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_85_1.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "00106671321258baf766b",
          "authid": "JrwS9UcMUvxq"
        },
        {
          "id": 2301,
          "title": "Volantino Speciale Coop Lombardia Bis",
          "subtitle": "Scuola",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2301_0.jpg",
          "from": "2026-08-27T00:00:00+02:00",
          "to": "2026-10-04T00:00:00+02:00",
          "bkcode": "001066713c521c8490ada",
          "authid": "P9MGzHrpr3cw"
        },
        {
          "id": 377,
          "title": "Volantino IperCoop Speciale",
          "subtitle": "Un rientro felice",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_377.jpg",
          "from": "2026-08-27T00:00:00+02:00",
          "to": "2026-10-07T00:00:00+02:00",
          "bkcode": "0010667133c9283f4d362",
          "authid": "bx34BZJSkg6e"
        },
        {
          "id": 2157,
          "title": "Volantino Coop Piemonte",
          "subtitle": "Prezzi Giù",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2157_1.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "00106671391f9963419fa",
          "authid": "U825PxHiud1r"
        },
        {
          "id": 495,
          "title": "Volantino Coop: Ipercoop Nordest e TecnoStore",
          "subtitle": "Grandi marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_495_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713d652555fa22f",
          "authid": "EhpcpwVyvZLP"
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
          "id": 1913,
          "title": "Volantino Ipercoop Piemonte Novacoop",
          "subtitle": "Scegli Tu Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1913.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713ebdfdd458255",
          "authid": "Qvr2zYMmZrWz"
        },
        {
          "id": 2158,
          "title": "Volantino Coop Sicilia",
          "subtitle": "30% 40% 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_2158_0.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-21T00:00:00+02:00",
          "bkcode": "001066713139a735d29cc",
          "authid": "qunJ8eBnzHZD"
        },
        {
          "id": 1867,
          "title": "Volantino Coop: Ipercoop Estense Sud",
          "subtitle": "Grandi marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_1867.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671310aa847d49d7",
          "authid": "Q9lzJj0VbwYA"
        },
        {
          "id": 90,
          "title": "Volantino IperCoop Liguria",
          "subtitle": "Scegli Tu Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/coop_90_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667130a4ec9846c05",
          "authid": "J0At7PABHjWk"
        }
      ]
    },
    {
      "slug": "conad",
      "name": "Conad",
      "logoId": "conad",
      "flyers": [
        {
          "id": 1891,
          "title": "Volantino Spazio Conad Lazio",
          "subtitle": "Scorta Convenienza + prendi - spendi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1891.jpg",
          "from": "2026-09-15T00:00:00+02:00",
          "to": "2026-09-21T00:00:00+02:00",
          "bkcode": "001066713e1682161f6d8",
          "authid": "PCKrZcGEPjSo"
        },
        {
          "id": 723,
          "title": "Volantino Spazio Conad Adriatico: Puglia, Abruzzo, Molise",
          "subtitle": "1, 2, 3€",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_723_0.jpg",
          "from": "2026-09-14T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667132ad39a5d6e43",
          "authid": "eGEbOLFCtkL9"
        },
        {
          "id": 714,
          "title": "Volantino Conad Veneto, Friuli, Marche, Romagna",
          "subtitle": "BIS",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_714.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-17T00:00:00+02:00",
          "bkcode": "001066713c75f9cbeba11",
          "authid": "nq6wWxFJB4ab"
        },
        {
          "id": 173,
          "title": "Volantino Conad Superstore Tirreno: Toscana, Lazio e Sardegna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_173_1.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713d4e04bfe8068",
          "authid": "nqQUoYhIGK9e"
        },
        {
          "id": 174,
          "title": "Volantino Conad Superstore Nordiconad: Piemonte, Liguria, Trentino, Valle d&#039;Aosta, Romagna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_174_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667134c6f235c927c",
          "authid": "yCBE9yXiQ49h"
        },
        {
          "id": 1852,
          "title": "Volantino Conad Superstore Lombardia ed Emilia",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1852_0.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "0010667132bf01be75759",
          "authid": "PzrEVLHJ1mFr"
        },
        {
          "id": 344,
          "title": "Volantino Conad Superstore: Lazio e Campania",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_344_0.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "00106671364bf15b41d4d",
          "authid": "4Qi1oWANI4uO"
        },
        {
          "id": 715,
          "title": "Volantino Conad Sicilia",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_715_0.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713cc790bb9a783",
          "authid": "8LhezZGpGm2q"
        },
        {
          "id": 398,
          "title": "Volantino Conad Adriatico: Abruzzo, Molise, Puglia, Marche, Basilicata",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_398.jpg",
          "from": "2026-09-08T00:00:00+02:00",
          "to": "2026-09-19T00:00:00+02:00",
          "bkcode": "0010667130f3f441eb9af",
          "authid": "nWoBAZFSQ1RQ"
        },
        {
          "id": 81,
          "title": "Volantino Conad Lombardia ed Emilia",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_81_0.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "001066713f12b16134034",
          "authid": "1qNYC6fZkOtz"
        },
        {
          "id": 1920,
          "title": "Volantino Conad Margherita Nordiconad",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1920_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713af3fafae2c72",
          "authid": "GFNBLenWsSai"
        },
        {
          "id": 1836,
          "title": "Volantino Conad Superstore Nordiconad: Piemonte, Liguria, Trentino, Valle d&#039;Aosta, Romagna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1836_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671372f08110746c",
          "authid": "BiXludSGuH7g"
        },
        {
          "id": 286,
          "title": "Volantino Margherita",
          "subtitle": "Il Tuo Miglior Vicino Di Casa",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_286.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "0010667132884de49e76f",
          "authid": "myuvyKcz9yJv"
        },
        {
          "id": 342,
          "title": "Volantino Margherita: Lazio e Campania",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_342.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "0010667135a09cc87c266",
          "authid": "PWziURGh8rWq"
        },
        {
          "id": 424,
          "title": "Volantino Margherita Tirreno: Toscana, Lazio e Sardegna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_424_0.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "001066713b7d94bbe66f0",
          "authid": "twrMNiC6YdXg"
        },
        {
          "id": 1943,
          "title": "Volantino Conad Tirreno: Toscana, Lazio e Sardegna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_1943_1.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671353abf2b0bc29",
          "authid": "9ozHXADJHNCe"
        },
        {
          "id": 2148,
          "title": "Volantino Conad Campania",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2148.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713801f0fe61062",
          "authid": "Ibn6n7gETfX8"
        },
        {
          "id": 713,
          "title": "Volantino Conad Nordiconad: Piemonte, Liguria, Trentino, Valle d&#039;Aosta, Romagna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_713_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713a0a916f40b65",
          "authid": "tRwj7T9oUgig"
        },
        {
          "id": 2144,
          "title": "Volantino Conad Superstore Sardegna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2144.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671360c230b5c01f",
          "authid": "OIpf1iapVpk6"
        },
        {
          "id": 343,
          "title": "Volantino Conad: Lazio e Campania",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_343.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713cbb28f25c1ff",
          "authid": "sVyGtH3z1ueq"
        },
        {
          "id": 82,
          "title": "Volantino Conad City Lombardia ed Emilia",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_82.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-22T00:00:00+02:00",
          "bkcode": "00106671338aab2e997eb",
          "authid": "x2jzfeEbZovA"
        },
        {
          "id": 2149,
          "title": "Volantino Conad Superstore Campania",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2149.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "0010667134bbc47a486ce",
          "authid": "WWOSHY93YX81"
        },
        {
          "id": 2147,
          "title": "Volantino Conad City Campania",
          "subtitle": "Campioni del Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2147.jpg",
          "from": "2026-09-09T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "00106671371c8999b3df1",
          "authid": "M3rVYd9nCQPh"
        },
        {
          "id": 2142,
          "title": "Volantino Conad Sardegna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2142.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671337789ccdf232",
          "authid": "1a5wTJ8SDJZl"
        },
        {
          "id": 2146,
          "title": "Volantino Conad City Sardegna",
          "subtitle": "CAMPIONI DEL RISPARMIO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/conad_2146_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713f1524b14aff6",
          "authid": "O3BgPFq6ktxC"
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
          "id": 569,
          "title": "Volantino Anteprima Lidl",
          "subtitle": "XXL",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_569_0.jpg",
          "from": "2026-09-17T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667132bc79c4906c5",
          "authid": "npMk77oZr7Ju"
        },
        {
          "id": 559,
          "title": "Volantino Lidl",
          "subtitle": "Piccoli Prezzi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_559_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713bee2bcea27d7",
          "authid": "EavhM9pU5CF3"
        },
        {
          "id": 754,
          "title": "Volantino Lidl Viaggi",
          "subtitle": "I viaggi del mese",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_754.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-10-31T00:00:00+01:00",
          "bkcode": "001066713d3934cdd8c61",
          "authid": "s8yUlmDxvJfM"
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
          "id": 789,
          "title": "Volantino Esselunga: Speciale Bis",
          "subtitle": "Cura E Bellezza",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_789.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713e55074b99a88",
          "authid": "DFU2LH70rnt8"
        },
        {
          "id": 160,
          "title": "Volantino Esselunga Superstore",
          "subtitle": "Un Carico Di Offerte Imperdibili",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_160_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713876132e43ea1",
          "authid": "PsXLSLM6FWI9"
        },
        {
          "id": 2304,
          "title": "Catalogo Esselunga Speciale",
          "subtitle": "La Collezione Che è Già una Hit",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2304_0.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-12-02T00:00:00+01:00",
          "bkcode": "001066713c23c45c94334",
          "authid": "OLiCUknHHlcs"
        },
        {
          "id": 2141,
          "title": "Volantino Esselunga Toscana",
          "subtitle": "Offerte",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2141_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713d277aeab9840",
          "authid": "afUWg51YhrHr"
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
          "id": 2139,
          "title": "Volantino Esselunga Lazio",
          "subtitle": "Un Carico Di Offerte Imperdibili",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2139.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671372d703319651",
          "authid": "B7aS0tOhkUFt"
        },
        {
          "id": 2140,
          "title": "Volantino Esselunga Piemonte",
          "subtitle": "Un Carico Di Offerte Imperdibili",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/esselunga_2140.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713439c23334c70",
          "authid": "pbDIhenBJLix"
        }
      ]
    },
    {
      "slug": "euronics",
      "name": "Euronics",
      "flyers": [
        {
          "id": 149,
          "title": "Volantino Euronics CDS Butali: Toscana, Marche, Umbria, Lazio, Emilia Romagna",
          "subtitle": "Sotto Costo",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_149_0.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667139b2ef38c5533",
          "authid": "lKUACIRSTIU8"
        },
        {
          "id": 154,
          "title": "Volantino Euronics (Gruppo Tufano): Lazio, Campania, Calabria",
          "subtitle": "-70%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_154_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713c225de6bfb9c",
          "authid": "lQgf8G8YqZrl"
        },
        {
          "id": 152,
          "title": "Volantino Euronics (Gruppo Siem): Abruzzo, Molise, Campania, Puglia, Basilicata, Calabria",
          "subtitle": "Cashback Stellare",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_152_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667139e54e4c26ba9",
          "authid": "3QkjZJcxzosT"
        },
        {
          "id": 536,
          "title": "Volantino Euronics (Gruppo La Via Lattea): Sicilia",
          "subtitle": "Anniversario Sottocosto",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_536.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713e36c6966e69d",
          "authid": "w4E9DEgYENwZ"
        },
        {
          "id": 151,
          "title": "Volantino Euronics (Gruppo Dimo)",
          "subtitle": "Sotto Costo",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_151.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667139f86aa016607",
          "authid": "Tdj0cmckxIO6"
        },
        {
          "id": 259,
          "title": "Volantino Euronics (Gruppo Bruno): Sicilia",
          "subtitle": "Per Quest&#039;Anno Non Pagare",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/euronics_259.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713e9f1aacfcdc9",
          "authid": "Nvv9LULfbehK"
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
          "id": 2213,
          "title": "Volantino Aldi",
          "subtitle": "Prezzi Bassi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/aldi_it_2213_0.jpg",
          "from": "2026-09-14T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713922844e03f3c",
          "authid": "xjLOvpiHB4u4"
        },
        {
          "id": 2328,
          "title": "Volantino Aldi: Anteprima",
          "subtitle": "Prezzi Bassi",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/aldi_it_2328_1.jpg",
          "from": "2026-09-14T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713922844e03f3c",
          "authid": "xjLOvpiHB4u4"
        }
      ]
    },
    {
      "slug": "unieuro",
      "name": "Unieuro",
      "flyers": [
        {
          "id": 143,
          "title": "Volantino Unieuro: Speciale",
          "subtitle": "Samsung",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/unieuro_143_1.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "001066713af7a0c237a46",
          "authid": "dadutjbaPQM9"
        },
        {
          "id": 147,
          "title": "Volantino Unieuro",
          "subtitle": "Settembre ti sorprende",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/unieuro_147_1.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-09-17T00:00:00+02:00",
          "bkcode": "00106671383f957303474",
          "authid": "jFYGKL4TLZPb"
        },
        {
          "id": 460,
          "title": "Volantino Unieuro Ter",
          "subtitle": "Electroline",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/unieuro_460_0.jpg",
          "from": "2026-09-01T00:00:00+02:00",
          "to": "2026-09-30T00:00:00+02:00",
          "bkcode": "0010667135d9a086fa7a2",
          "authid": "sIdWB0gKkrJZ"
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
          "id": 105,
          "title": "Volantino Eurospin",
          "subtitle": "GRANDI DEL RISPARMIO, ALPENSPITZ E FESTA DELLA BIRRA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_105.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713cefbbc2ea16b",
          "authid": "5TT6Y7TO1sJW"
        },
        {
          "id": 1959,
          "title": "Volantino Eurospin Speciale",
          "subtitle": "OFFERTE FRESCHE DELLA SETTIMANA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_1959_1.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "001066713654dee5cb513",
          "authid": "5pcDELYoDGVI"
        },
        {
          "id": 1974,
          "title": "Volantino Eurospin Speciale Roma e Lazio",
          "subtitle": "GRANDI DEL RISPARMIO, ALPENSPITZ E FESTA DELLA BIRRA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_1974_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "0010667132939a93fb1ef",
          "authid": "axKI1gSztk2r"
        },
        {
          "id": 2154,
          "title": "Volantino Eurospin Sicilia",
          "subtitle": "GRANDI DEL RISPARMIO, ALPENSPITZ E FESTA DELLA BIRRA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_2154_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713c1f2c57b4b56",
          "authid": "w4dEa1Sc59nF"
        },
        {
          "id": 2153,
          "title": "Volantino Eurospin Toscana",
          "subtitle": "GRANDI DEL RISPARMIO, ALPENSPITZ E FESTA DELLA BIRRA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/eurospin_2153_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713b75cbf4ca87a",
          "authid": "cYwA7NhSQZq1"
        }
      ]
    },
    {
      "slug": "md-discount",
      "name": "MD Discount",
      "logoId": "md",
      "flyers": [
        {
          "id": 246,
          "title": "Volantino MD Lombardia",
          "subtitle": "Buona Spesa, Italia!",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/md_discont_246.jpg",
          "from": "2026-09-08T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "00106671344a1bbf6393d",
          "authid": "7eSy2sgdiw39"
        },
        {
          "id": 114,
          "title": "Volantino MD Discount",
          "subtitle": "Sconti fino al 40%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/md_discont_114.jpg",
          "from": "2026-09-08T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713f381e4e89ff2",
          "authid": "hRGYZKPrekCN"
        }
      ]
    },
    {
      "slug": "mondo-convenienza",
      "name": "Mondo Convenienza",
      "flyers": [
        {
          "id": 658,
          "title": "Catalogo Mondo Convenienza",
          "subtitle": "La Certezza Del Miglior Prezzo",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/mondoconvenienza_658_0.jpg",
          "from": "2026-09-01T00:00:00+02:00",
          "to": "2026-12-31T00:00:00+01:00",
          "bkcode": "0010667135d114de232ad",
          "authid": "NUeiMe8pM3BH"
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
          "subtitle": "Grandi Marche Sconti 30% 40% 50%",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667131813db2eca9c",
          "authid": "8X5qOmTHWi46"
        },
        {
          "id": 1862,
          "title": "Volantino Bennet Ter",
          "subtitle": "Offerte Extra",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_1862_1.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713ed2f66414fa5",
          "authid": "RdxmGC9HoxQj"
        },
        {
          "id": 100,
          "title": "Volantino Bennet Bis",
          "subtitle": "Dolce Buongiorno",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_100_1.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "0010667133d4a6486107a",
          "authid": "5DqBYqBHrqcF"
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
          "subtitle": "Sotto Prezzo",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/panorama_545.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667132535ae8a94a2",
          "authid": "ZSglfmDsoM4l"
        },
        {
          "id": 318,
          "title": "Volantino Panorama",
          "subtitle": "Occasioni Extra",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/panorama_318_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671338c5f4602e42",
          "authid": "XvgyeKXDjsWe"
        }
      ]
    },
    {
      "slug": "iper-la-grande-i",
      "name": "Iper, La grande i",
      "flyers": [
        {
          "id": 51,
          "title": "Volantino Iper: Speciale",
          "subtitle": "RISCOPRI IL BENESSERE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_51.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-24T00:00:00+02:00",
          "bkcode": "0010667136ecafd34fc5e",
          "authid": "pGeTFxFKxzUi"
        },
        {
          "id": 163,
          "title": "Volantino Iper, la grande i",
          "subtitle": "Sconti Eccezionali",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_163_0.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "00106671332a8a007c888",
          "authid": "JCTjw6yJa6iQ"
        },
        {
          "id": 2226,
          "title": "Catalogo Iper la Grande I speciale",
          "subtitle": "RISCOPRI IL BENESSERE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_2226.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-24T00:00:00+02:00",
          "bkcode": "0010667136b3c3493c72b",
          "authid": "A3XFWRl0Rs0P"
        },
        {
          "id": 3,
          "title": "Volantino Iper, la grande i: Speciale",
          "subtitle": "PROFUMO DI PULITO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_3_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713a8cf2237ad31",
          "authid": "emdAgf2Vio9X"
        },
        {
          "id": 50,
          "title": "Volantino Iper, la grande i",
          "subtitle": "OPERAZIONE IMBATTIBILI 2",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_50.jpg",
          "from": "2026-08-31T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671327eed6452cbc",
          "authid": "Ae2jXFvhXoDX"
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
          "subtitle": "Sconti Eccezionali",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_2240_0.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "0010667139193837d142e",
          "authid": "NDywwQkBkpN8"
        },
        {
          "id": 412,
          "title": "Volantino Iper: Milano Portello",
          "subtitle": "Sconti Eccezionali",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_412_0.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713c0915e068b33",
          "authid": "PtDOsxcpAbcf"
        },
        {
          "id": 2241,
          "title": "Volantino Iper Serravalle",
          "subtitle": "OPERAZIONE IMBATTIBILI 2",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_2241.jpg",
          "from": "2026-08-31T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671304ed9f6f3b1d",
          "authid": "a5xJJEoe6m3W"
        },
        {
          "id": 2359,
          "title": "Volantino Iper La Grande I Monza",
          "subtitle": "Sconti Eccezionali",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/iper_la_grande_i_2359.jpg",
          "from": "2026-09-11T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "001066713dd857258a3ed",
          "authid": "HpA1K4SUaICJ"
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
          "subtitle": "Il Meno Caro Lo Paghi La Metà",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/trony_145.jpg",
          "from": "2026-08-24T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713b50fa2800baf",
          "authid": "Nj4kogYLt8NP"
        },
        {
          "id": 194,
          "title": "Volantino Trony Province Salerno, Avellino",
          "subtitle": "Il Meno Caro Lo Paghi La Metà",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/trony_194.jpg",
          "from": "2026-08-24T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713bc624804fecb",
          "authid": "bEdMMuYuYl3X"
        },
        {
          "id": 195,
          "title": "Volantino Trony Sardegna",
          "subtitle": "Il Meno Caro Lo Paghi La Metà",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/trony_195_0.jpg",
          "from": "2026-08-24T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713c9b9ec5da508",
          "authid": "iNBaI67IoQSm"
        }
      ]
    },
    {
      "slug": "il-gigante",
      "name": "Il Gigante",
      "logoId": "ilgigante",
      "flyers": [
        {
          "id": 9,
          "title": "Volantino Il Gigante",
          "subtitle": "Festa del vino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/il_gigante_9_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-21T00:00:00+02:00",
          "bkcode": "001066713530ecd9e87c6",
          "authid": "s0kT2qwJV31H"
        },
        {
          "id": 58,
          "title": "Volantino Il Gigante",
          "subtitle": "Grandi Marche",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/il_gigante_58_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "0010667134c019611d08a",
          "authid": "9PGkoG9uWuii"
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
        }
      ]
    },
    {
      "slug": "comet",
      "name": "Comet",
      "flyers": [
        {
          "id": 497,
          "title": "Volantino Comet: Speciale Videogiochi",
          "subtitle": "Speciale Audio E Video",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_497.jpg",
          "from": "2026-09-12T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713c9379eb8c4df",
          "authid": "xOGcuOiGhaW6"
        },
        {
          "id": 457,
          "title": "Volantino Comet: Studio Luce",
          "subtitle": "Piccoli Elettrodomestici",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_457_0.jpg",
          "from": "2026-09-12T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667136c104cbd2afe",
          "authid": "OuCqdbgezJx4"
        },
        {
          "id": 456,
          "title": "Volantino Comet",
          "subtitle": "Piccoli Elettrodomestici",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_456_0.jpg",
          "from": "2026-09-12T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667130784ebde8108",
          "authid": "B2n3lCGV1GW3"
        },
        {
          "id": 467,
          "title": "Volantino Comet",
          "subtitle": "Pagamenti Elettronici",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_467_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-10-07T00:00:00+02:00",
          "bkcode": "0010667130ee8509dafa6",
          "authid": "ZHVNykPurmmM"
        },
        {
          "id": 169,
          "title": "Volantino Comet",
          "subtitle": "Moulinex",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_169_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-10-11T00:00:00+02:00",
          "bkcode": "0010667136dc454c1f157",
          "authid": "x1oOiZC9eO7N"
        },
        {
          "id": 170,
          "title": "Volantino Comet",
          "subtitle": "Back To School",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_170_0.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "0010667134f63444a3d29",
          "authid": "Y2DIuIhY0Odf"
        },
        {
          "id": 475,
          "title": "Volantino Comet: Speciale",
          "subtitle": "Haier",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_475.jpg",
          "from": "2026-08-24T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "001066713ca4c94cd0067",
          "authid": "VDLmHVJAMKxE"
        },
        {
          "id": 496,
          "title": "Volantino Comet: Speciale",
          "subtitle": "Rowenta",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/comet_496.jpg",
          "from": "2026-08-20T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671392b5964f5cb1",
          "authid": "ivzhCEHvhwFa"
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
          "subtitle": "Promozioni",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/penny_market_69.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "00106671312a5075cbffb",
          "authid": "9s3NojTFMniE"
        }
      ]
    },
    {
      "slug": "famila",
      "name": "Famila",
      "logoId": "famila",
      "flyers": [
        {
          "id": 512,
          "title": "Volantino IperFamila",
          "subtitle": "TANTI PRODOTTI DA 0,50 A 3 €",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_512.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "0010667136c87a826d9eb",
          "authid": "iCCDm8RujIjV"
        },
        {
          "id": 110,
          "title": "Volantino Famila Superstore Bis",
          "subtitle": "CATALOGO RINNOVIAMO LA CASA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_110_0.jpg",
          "from": "2026-09-07T00:00:00+02:00",
          "to": "2026-09-30T00:00:00+02:00",
          "bkcode": "0010667136c79171d50b2",
          "authid": "sqi63nttUkGx"
        },
        {
          "id": 363,
          "title": "Volantino Famila Superstore: Veneto",
          "subtitle": "SOTTOCOSTO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_363_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "00106671301eec248f1c7",
          "authid": "bBZbKdWTJgxc"
        },
        {
          "id": 1968,
          "title": "Volantino Famila Toscana e Umbria",
          "subtitle": "SOTTOCOSTO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_1968_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713741e9442fe66",
          "authid": "WNE802aoBceY"
        },
        {
          "id": 364,
          "title": "Volantino Famila: Piemonte",
          "subtitle": "SOTTOCOSTO+SOTTOPREZZO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_364.jpg",
          "from": "2026-09-02T00:00:00+02:00",
          "to": "2026-09-15T00:00:00+02:00",
          "bkcode": "001066713b5e6001255e9",
          "authid": "jFC8vzPsNiYY"
        },
        {
          "id": 108,
          "title": "Volantino Famila: Lombardia ed Emilia",
          "subtitle": "SOTTOCOSTO",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_108.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-16T00:00:00+02:00",
          "bkcode": "001066713001fa21ec7b7",
          "authid": "rNPrh96PRpfx"
        },
        {
          "id": 107,
          "title": "Volantino Famila Superstore",
          "subtitle": "CATALOGO SCUOLA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_107_0.jpg",
          "from": "2026-08-17T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "00106671358996a54f320",
          "authid": "h1go8FAlU58I"
        },
        {
          "id": 109,
          "title": "Volantino Famila",
          "subtitle": "CATALOGO ZAINI SCUOLA",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_109_0.jpg",
          "from": "2026-07-23T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "001066713586348256d08",
          "authid": "y7g3oCwyYcw9"
        },
        {
          "id": 2131,
          "title": "Volantino Famila Emilia Romagna",
          "subtitle": "STORE SELEX SETTEMBRE",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/famila_2131.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-30T00:00:00+02:00",
          "bkcode": "001066713ff4f7491387b",
          "authid": "AnW08R0eAJVI"
        }
      ]
    },
    {
      "slug": "brico-io",
      "name": "Brico Io",
      "flyers": [
        {
          "id": 504,
          "title": "Volantino Brico Io",
          "subtitle": "Un Rientro Pieno Di Offerte",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/brico_io_504_0.jpg",
          "from": "2026-09-03T00:00:00+02:00",
          "to": "2026-09-20T00:00:00+02:00",
          "bkcode": "0010667130d6e100dd636",
          "authid": "OuMoW571yEPn"
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
          "subtitle": "Tutti A Scuola Di Risparmio",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bricofer_2112_0.jpg",
          "from": "2026-08-27T00:00:00+02:00",
          "to": "2026-09-13T00:00:00+02:00",
          "bkcode": "00106671354d1177b09a8",
          "authid": "jRjhyuJ4DYPP"
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
          "subtitle": "Affari A...",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/emisfero_292_1.jpg",
          "from": "2026-09-10T00:00:00+02:00",
          "to": "2026-09-23T00:00:00+02:00",
          "bkcode": "001066713f7fb79c3d907",
          "authid": "Ul0s2KafFyv7"
        }
      ]
    }
  ]
};
