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
  "updatedAt": "2026-08-13T11:31:47.545Z",
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
    },
    {
      "slug": "coop",
      "name": "Coop",
      "logoId": "coop",
      "flyers": [
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
    },
    {
      "slug": "acqua-e-sapone",
      "name": "Acqua e Sapone",
      "logoId": "acqua-e-sapone",
      "flyers": [
        {
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
    },
    {
      "slug": "ipercoop",
      "name": "Ipercoop",
      "flyers": [
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
      "flyers": [
        {
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 559,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_559_1.jpg",
          "bkcode": "00106671368b5dd8038bf",
          "authid": "rVgO7QK38lhD"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
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
          "id": 559,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_559_1.jpg",
          "bkcode": "00106671368b5dd8038bf",
          "authid": "rVgO7QK38lhD"
        }
      ]
    },
    {
      "slug": "tecnomat",
      "name": "Bricoman",
      "flyers": [
        {
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
    },
    {
      "slug": "metro",
      "name": "Metro",
      "flyers": [
        {
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
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
      "flyers": [
        {
          "id": 101,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/bennet_101_0.jpg",
          "bkcode": "001066713ecf7ff6127c0",
          "authid": "StmmwPnF1ski"
        }
      ]
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
          "id": 559,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_559_1.jpg",
          "bkcode": "00106671368b5dd8038bf",
          "authid": "rVgO7QK38lhD"
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
          "id": 559,
          "title": "Volantino",
          "coverUrl": "https://www.centrovolantini.it/sites/default/files/styles/thumb_copertina/public/lidl_it_559_1.jpg",
          "bkcode": "00106671368b5dd8038bf",
          "authid": "rVgO7QK38lhD"
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
