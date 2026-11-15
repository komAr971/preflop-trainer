import type { ChartFile } from '../core/chart'

/*
 * Charts transcribed from the slides of the Greenline Poker video
 * "ВЕСЬ ПРЕФЛОП ЗА 45 МИНУТ" by coach Niyaz "Hotshot" (2026): https://youtu.be/8tAPe4Uct-c
 * See docs/sources/greenline-2026.md for how the slides were read and known discrepancies.
 * Values were checked against the percentages printed on the slides (see the notes).
 */

export const greenlineStandard: ChartFile = {
  "version": 1,
  "format": {
    "players": 6,
    "stackBb": 100
  },
  "sizings": {
    "openBb": 3,
    "sbOpenBb": 3,
    "threeBetIpX": 3,
    "threeBetOopX": 4,
    "fourBetX": 2.2,
    "isoIpBb": 4,
    "isoOopBb": 5
  },
  "name": "Greenline 2026 — стандарт",
  "description": "RFI (стандарт), защита ББ против 3x, 3-беты в позиции и с SB (3-бет или фолд), реакция на 4-бет после 3-бета в позиции, изолейт против 1 лимпера. Чарты со слайдов видео Greenline Poker «ВЕСЬ ПРЕФЛОП ЗА 45 МИНУТ» (Нияз «Hotshot», 2026), https://youtu.be/8tAPe4Uct-c.",
  "spots": [
    {
      "spot": {
        "kind": "rfi",
        "hero": "UTG"
      },
      "actions": {
        "raise": "55+,A3s+,K9s+,Q9s+,JTs,T9s,98s,87s,76s,ATo+,KQo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "HJ"
      },
      "actions": {
        "raise": "55+,A2s+,K9s+,Q9s+,J9s+,T9s,98s,87s,76s,ATo+,KJo+,QJo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "CO"
      },
      "actions": {
        "raise": "22+,A2s+,K4s+,Q7s+,J7s+,T7s+,97s+,87s,76s,65s,54s,ATo+,KTo+,QTo+,JTo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "BTN"
      },
      "actions": {
        "raise": "22+,A2s+,K2s+,Q2s+,J2s+,T6s+,96s+,85s+,74s+,63s+,53s+,43s,A2o+,K8o+,Q8o+,J8o+,T8o+,98o"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "SB"
      },
      "actions": {
        "raise": "22+,A2s+,K2s+,Q2s+,J3s+,T6s+,96s+,86s+,75s+,64s+,54s,A3o+,K9o+,Q9o+,J9o+,T9o"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "HJ",
        "villain": "UTG"
      },
      "actions": {
        "raise": "99+,AJs+,KJs+,QJs,AKo,ATs:0.5,KTs:0.5,QTs:0.5,JTs:0.5,AQo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "CO",
        "villain": "UTG"
      },
      "actions": {
        "raise": "99+,AJs+,KJs+,QJs,AKo,ATs:0.5,KTs:0.5,QTs:0.5,JTs:0.5,AQo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BTN",
        "villain": "UTG"
      },
      "actions": {
        "raise": "99+,AJs+,KJs+,QJs,AKo,ATs:0.5,KTs:0.5,QTs:0.5,JTs:0.5,AQo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "CO",
        "villain": "HJ"
      },
      "actions": {
        "raise": "88+,ATs+,KTs+,QTs+,JTs,AQo+"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BTN",
        "villain": "HJ"
      },
      "actions": {
        "raise": "88+,ATs+,KTs+,QTs+,JTs,AQo+"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BTN",
        "villain": "CO"
      },
      "actions": {
        "raise": "88+,A9s+,A5s-A4s,KTs+,QTs+,JTs,AQo+,77:0.5,K9s:0.5,Q9s:0.5,J9s:0.5,T9s:0.5,98s:0.5,87s:0.5,76s:0.5,KQo:0.5,AJo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "SB",
        "villain": "UTG"
      },
      "actions": {
        "raise": "TT+,AJs+,KQs,AKo,KJs:0.5,QJs:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "SB",
        "villain": "HJ"
      },
      "actions": {
        "raise": "TT+,ATs+,KJs+,QJs,AKo,AQo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "SB",
        "villain": "CO"
      },
      "actions": {
        "raise": "99+,ATs+,KTs+,QTs+,JTs,AQo+,KQo:0.5,AJo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "SB",
        "villain": "BTN"
      },
      "actions": {
        "raise": "88+,A9s+,A5s-A4s,KTs+,QTs+,JTs,AJo+,KQo,A3s:0.5,K9s:0.5,Q9s:0.5,77-66:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BB",
        "villain": "UTG"
      },
      "actions": {
        "call": "99-22,A9s-A6s,A3s-A2s,K9s,T9s,98s,87s,76s,65s,54s,AQo,KQo,JJ-TT:0.5,AQs-ATs:0.5,A5s-A4s:0.5,KTs:0.5,QTs:0.5,Q9s:0.5,JTs:0.5,AKo:0.5,AJo:0.5",
        "raise": "QQ+,AKs,KJs+,QJs,JJ-TT:0.5,AQs-ATs:0.5,A5s-A4s:0.5,KTs:0.5,QTs:0.5,JTs:0.5,AKo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BB",
        "villain": "HJ"
      },
      "actions": {
        "call": "88-22,A9s-A6s,A3s-A2s,K9s,Q9s,T9s,98s,87s,76s,65s,54s,AQo,KQo,AJo,TT-99:0.5,AJs-ATs:0.5,A5s-A4s:0.5,KTs:0.5,QTs:0.5,JTs:0.5,J9s:0.5,KJo:0.5,ATo:0.5",
        "raise": "JJ+,AQs+,KJs+,QJs,AKo,TT-99:0.5,AJs-ATs:0.5,A5s-A4s:0.5,KTs:0.5,QTs:0.5,JTs:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BB",
        "villain": "CO"
      },
      "actions": {
        "call": "88-22,A8s-A6s,A3s-A2s,K8s-K6s,Q8s-Q7s,J8s,T8s,98s,87s,76s,65s,54s,KQo,AJo,KJo,QJo,ATo,99:0.5,ATs-A9s:0.5,A5s-A4s:0.5,K9s:0.5,Q9s:0.5,J9s:0.5,T9s:0.5,AQo:0.5",
        "raise": "TT+,AJs+,KTs+,QTs+,JTs,AKo,99:0.5,ATs-A9s:0.5,A5s-A4s:0.5,K9s:0.5,Q9s:0.5,J9s:0.5,T9s:0.5,AQo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BB",
        "villain": "BTN"
      },
      "actions": {
        "call": "66-22,A9s-A6s,A3s-A2s,K9s-K4s,Q9s-Q8s,J9s,98s-97s,87s,76s,65s,54s,QJo,KTo,QTo,JTo,A9o,88-77:0.5,ATs:0.5,A5s-A4s:0.5,J8s:0.5,T9s:0.5,T8s:0.5,AQo:0.5,KQo:0.5,AJo:0.5,KJo:0.5,ATo:0.5",
        "raise": "99+,AJs+,KTs+,QTs+,JTs,AKo,88-77:0.5,ATs:0.5,A5s-A4s:0.5,T9s:0.5,AQo:0.5,KQo:0.5,AJo:0.5,KJo:0.5,ATo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsOpen",
        "hero": "BB",
        "villain": "SB"
      },
      "actions": {
        "call": "66-22,A8s-A6s,A2s,K8s,K5s-K2s,Q8s-Q2s,J8s-J5s,J2s,T7s-T6s,96s-93s,85s-84s,74s-73s,63s,53s-52s,43s-42s,32s,ATo-A6o,KTo-K9o,QJo-QTo,JTo,98o,87o,76o,65o,Q9s:0.75,KJo:0.75,Q9o:0.75,J9o:0.75,T9o:0.75,86s:0.75,75s:0.75,64s:0.75,88-77:0.5,A9s:0.5,A3s:0.5,K9s:0.5,K7s-K6s:0.5,QTs:0.5,J9s:0.5,J4s-J3s:0.5,T8s:0.5,T5s-T2s:0.5,97s:0.5,AJo:0.5,KQo:0.5,A5o-A2o:0.5,K8o-K5o:0.5,Q8o:0.5,J8o:0.5,T8o:0.5,99:0.25,KTs:0.25,T9s:0.25,98s:0.25,87s:0.25,76s:0.25,65s:0.25,54s:0.25",
        "raise": "TT+,ATs+,A5s-A4s,KJs+,QJs,JTs,AKo,AQo,KTs:0.75,T9s:0.75,99:0.75,98s:0.75,87s:0.75,76s:0.75,65s:0.75,54s:0.75,88-77:0.5,A9s:0.5,A3s:0.5,K9s:0.5,K7s-K6s:0.5,QTs:0.5,J9s:0.5,J4s-J3s:0.5,T8s:0.5,T5s-T2s:0.5,97s:0.5,KQo:0.5,AJo:0.5,K8o-K5o:0.5,Q8o:0.5,J8o:0.5,T8o:0.5,A5o-A2o:0.5,Q9s:0.25,KJo:0.25,Q9o:0.25,J9o:0.25,T9o:0.25,86s:0.25,75s:0.25,64s:0.25,J7o:0.25,T7o:0.25,97o:0.25"
      }
    },
    {
      "spot": {
        "kind": "vs4bet",
        "hero": "HJ",
        "villain": "UTG"
      },
      "actions": {
        "call": "QQ+,AKs,AKo,JJ:0.5"
      }
    },
    {
      "spot": {
        "kind": "vs4bet",
        "hero": "CO",
        "villain": "UTG"
      },
      "actions": {
        "call": "QQ+,AKs,AKo,JJ:0.5"
      }
    },
    {
      "spot": {
        "kind": "vs4bet",
        "hero": "BTN",
        "villain": "UTG"
      },
      "actions": {
        "call": "QQ+,AKs,AKo,JJ:0.5"
      }
    },
    {
      "spot": {
        "kind": "vs4bet",
        "hero": "CO",
        "villain": "HJ"
      },
      "actions": {
        "call": "JJ+,AKs,AKo,AQs:0.5,TT:0.5"
      }
    },
    {
      "spot": {
        "kind": "vs4bet",
        "hero": "BTN",
        "villain": "HJ"
      },
      "actions": {
        "call": "JJ+,AKs,AKo,AQs:0.5,TT:0.5"
      }
    },
    {
      "spot": {
        "kind": "vs4bet",
        "hero": "BTN",
        "villain": "CO"
      },
      "actions": {
        "call": "JJ+,AQs+,AKo,AJs:0.5,KQs:0.5,TT:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsLimp",
        "hero": "HJ",
        "limpers": 1
      },
      "actions": {
        "raise": "77+,A9s+,KTs+,QTs+,JTs,AJo+,KQo,A5s:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsLimp",
        "hero": "CO",
        "limpers": 1
      },
      "actions": {
        "raise": "77+,A5s+,KTs+,QTs+,JTs,AJo+,KQo,66:0.5,K9s:0.5,Q9s:0.5,J9s:0.5,T9s:0.5,98s:0.5,ATo:0.5,KJo:0.5,QJo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsLimp",
        "hero": "BTN",
        "limpers": 1
      },
      "actions": {
        "raise": "66+,A2s+,K9s+,Q9s+,J9s+,T9s,98s,ATo+,KJo+,QJo,55:0.5,K8s:0.5,K7s:0.5,Q8s:0.5,87s:0.5,76s:0.5,A9o:0.5,KTo:0.5,QTo:0.5,JTo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsLimp",
        "hero": "SB",
        "limpers": 1
      },
      "actions": {
        "raise": "77+,A9s+,KTs+,QTs+,JTs,AJo+,KQo,A8s:0.5,A5s:0.5,A4s:0.5,K9s:0.5,ATo:0.5,KJo:0.5",
        "call": "66-22,A7s-A6s,A3s-A2s,K8s-K2s,Q9s-Q5s,J9s-J7s,T9s-T7s,98s-97s,87s-86s,76s,65s,54s,QJo,KTo,QTo,JTo,A9o-A8o,A8s:0.5,A5s:0.5,A4s:0.5,K9s:0.5,ATo:0.5,KJo:0.5"
      }
    },
    {
      "spot": {
        "kind": "vsLimp",
        "hero": "BB",
        "limpers": 1
      },
      "actions": {
        "raise": "77+,A5s+,KTs+,QTs+,JTs,AJo+,KQo,A4s:0.5,A3s:0.5,A2s:0.5,K9s:0.5,ATo:0.5,KJo:0.5,QJo:0.5"
      }
    }
  ]
}

export const greenlineRfiTight: ChartFile = {
  "version": 1,
  "format": {
    "players": 6,
    "stackBb": 100
  },
  "sizings": {
    "openBb": 3,
    "sbOpenBb": 3,
    "threeBetIpX": 3,
    "threeBetOopX": 4,
    "fourBetX": 2.2,
    "isoIpBb": 4,
    "isoOopBb": 5
  },
  "name": "Greenline 2026 — RFI узко",
  "description": "Сужение RFI против агрессивных 3-бетторов за спиной («красные руки»). Чарты со слайдов видео Greenline Poker «ВЕСЬ ПРЕФЛОП ЗА 45 МИНУТ» (Нияз «Hotshot», 2026), https://youtu.be/8tAPe4Uct-c.",
  "spots": [
    {
      "spot": {
        "kind": "rfi",
        "hero": "UTG"
      },
      "actions": {
        "raise": "99+,ATs+,KTs+,QTs+,JTs,AQo+"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "HJ"
      },
      "actions": {
        "raise": "88+,A9s+,KTs+,QTs+,JTs,AJo+,KQo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "CO"
      },
      "actions": {
        "raise": "66+,A2s+,K8s+,Q9s+,J9s+,T9s,98s,87s,76s,ATo+,KJo+,QJo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "BTN"
      },
      "actions": {
        "raise": "66+,A2s+,K2s+,Q7s+,J8s+,T8s+,98s,87s,A9o+,K9o+,QTo+,JTo,A5o-A4o"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "SB"
      },
      "actions": {
        "raise": "22+,A2s+,K2s+,Q2s+,J3s+,T6s+,96s+,86s+,75s+,64s+,54s,A3o+,K9o+,Q9o+,J9o+,T9o"
      }
    }
  ]
}

export const greenlineRfiWide: ChartFile = {
  "version": 1,
  "format": {
    "players": 6,
    "stackBb": 100
  },
  "sizings": {
    "openBb": 3,
    "sbOpenBb": 3,
    "threeBetIpX": 3,
    "threeBetOopX": 4,
    "fourBetX": 2.2,
    "isoIpBb": 4,
    "isoOopBb": 5
  },
  "name": "Greenline 2026 — RFI широко",
  "description": "Расширение RFI: тайтовые оппоненты за спиной, фиши на блайндах (красные + оранжевые + зелёные). Чарты со слайдов видео Greenline Poker «ВЕСЬ ПРЕФЛОП ЗА 45 МИНУТ» (Нияз «Hotshot», 2026), https://youtu.be/8tAPe4Uct-c.",
  "spots": [
    {
      "spot": {
        "kind": "rfi",
        "hero": "UTG"
      },
      "actions": {
        "raise": "22+,A2s+,K9s+,Q9s+,J9s+,T9s,98s,87s,76s,65s,ATo+,KJo+,QJo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "HJ"
      },
      "actions": {
        "raise": "22+,A2s+,K9s+,Q9s+,J9s+,T9s,98s,87s,76s,65s,ATo+,KJo+,QJo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "CO"
      },
      "actions": {
        "raise": "22+,A2s+,K2s+,Q6s+,J6s+,T7s+,96s+,85s+,74s+,64s+,53s+,43s,A9o+,KTo+,QTo+,JTo"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "BTN"
      },
      "actions": {
        "raise": "22+,A2s+,K2s+,Q2s+,J2s+,T6s+,95s+,84s+,73s+,63s+,52s+,42s+,32s,A2o+,K7o+,Q8o+,J8o+,T8o+,98o,87o,76o"
      }
    },
    {
      "spot": {
        "kind": "rfi",
        "hero": "SB"
      },
      "actions": {
        "raise": "22+,A2s+,K2s+,Q2s+,J2s+,T5s+,95s+,85s+,74s+,64s+,53s+,43s,A2o+,K7o+,Q8o+,J8o+,T8o+,98o,87o,76o"
      }
    }
  ]
}
