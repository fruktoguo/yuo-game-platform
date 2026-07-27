/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：config/products
 */
define("config/products", [], function() {
  return {
    "timeTravelTicketValue": 3,
    "layout": {
      "specials": [
        "researchproduction",
        "researchproduction2",
        "extraticks",
        "extraprofit"
      ],
      "bonusTicks": [
        "bonusticks1",
        "bonusticks2",
        "bonusticks3",
        "bonusticks4",
        "bonusticks5"
      ],
      "timeTravelTickets": [
        "timetravel1",
        "timetravel2",
        "timetravel3",
        "timetravel4",
        "timetravel5"
      ]
    },
    "items": [
      {
        "id": "bonusticks1",
        "idNum": 1,
        "name": "80 000 bonus ticks",
        "description": "Getting there faster",
        "consumable": true,
        "strategy": {
          "type": "bonusTicks",
          "amount": 8e4
        },
        "priceStr": {
          "local": "1u"
        }
      },
      {
        "id": "bonusticks2",
        "idNum": 2,
        "name": "240 000 bonus ticks",
        "description": "+50% more",
        "consumable": true,
        "strategy": {
          "type": "bonusTicks",
          "amount": 24e4
        },
        "priceStr": {
          "local": "2u"
        }
      },
      {
        "id": "bonusticks3",
        "idNum": 3,
        "name": "800 000 bonus ticks",
        "description": "+200% more",
        "consumable": true,
        "strategy": {
          "type": "bonusTicks",
          "amount": 8e5
        },
        "priceStr": {
          "local": "3u"
        }
      },
      {
        "id": "bonusticks4",
        "idNum": 4,
        "name": "2 400 000 bonus ticks",
        "description": "+350% more",
        "consumable": true,
        "strategy": {
          "type": "bonusTicks",
          "amount": 24e5
        },
        "priceStr": {
          "local": "4u"
        }
      },
      {
        "id": "bonusticks5",
        "idNum": 5,
        "name": "12 000 000 bonus ticks",
        "description": "+650% more",
        "consumable": true,
        "strategy": {
          "type": "bonusTicks",
          "amount": 12e6
        },
        "priceStr": {
          "local": "5u"
        }
      },
      {
        "id": "bonusticks6",
        "idNum": 6,
        "name": "40 000 000 bonus ticks",
        "description": "+1145% more",
        "consumable": true,
        "strategy": {
          "type": "bonusTicks",
          "amount": 4e7
        },
        "priceStr": {
          "local": "6u"
        }
      },
      {
        "id": "timetravel1",
        "idNum": 7,
        "name": "1 ticket (3h)",
        "description": "Wow, really?",
        "consumable": true,
        "strategy": {
          "type": "timeTravelTickets",
          "amount": 1
        },
        "priceStr": {
          "local": "1u"
        }
      },
      {
        "id": "timetravel2",
        "idNum": 8,
        "name": "3 tickets  (3x3h)",
        "description": "50% cheaper!",
        "consumable": true,
        "strategy": {
          "type": "timeTravelTickets",
          "amount": 3
        },
        "priceStr": {
          "local": "2u"
        }
      },
      {
        "id": "timetravel3",
        "idNum": 9,
        "name": "8 tickets  (8x3h)",
        "description": "140% cheaper!",
        "consumable": true,
        "strategy": {
          "type": "timeTravelTickets",
          "amount": 8
        },
        "priceStr": {
          "local": "3u"
        }
      },
      {
        "id": "timetravel4",
        "idNum": 10,
        "name": "25 tickets (25x3h)",
        "description": "270% cheaper!",
        "consumable": true,
        "strategy": {
          "type": "timeTravelTickets",
          "amount": 25
        },
        "priceStr": {
          "local": "4u"
        }
      },
      {
        "id": "timetravel5",
        "idNum": 11,
        "name": "100 tickets (100x3h)",
        "description": "400% cheaper!",
        "consumable": true,
        "strategy": {
          "type": "timeTravelTickets",
          "amount": 100
        },
        "priceStr": {
          "local": "5u"
        }
      },
      {
        "id": "timetravel6",
        "idNum": 12,
        "name": "300 tickets (300x3h)",
        "description": "650% cheaper!",
        "consumable": true,
        "strategy": {
          "type": "timeTravelTickets",
          "amount": 300
        },
        "priceStr": {
          "local": "6u"
        }
      },
      {
        "id": "researchproduction",
        "idNum": 13,
        "name": "Evolved brain",
        "description": "3x research points production",
        "consumable": false,
        "strategy": {
          "type": "researchProductionBonus",
          "bonus": 3
        },
        "priceStr": {
          "local": "6u"
        }
      },
      {
        "id": "researchproduction2",
        "idNum": 14,
        "name": "Alien brain",
        "description": "4x research points production",
        "consumable": false,
        "requiresProduct": "researchproduction",
        "strategy": {
          "type": "researchProductionBonus",
          "bonus": 4
        },
        "priceStr": {
          "local": "6u"
        }
      },
      {
        "id": "extraticks",
        "idNum": 15,
        "name": "Chronobooster",
        "description": "+8 extra ticks per second",
        "consumable": false,
        "strategy": {
          "type": "extraTicks",
          "bonus": 8
        },
        "priceStr": {
          "local": "7u"
        }
      },
      {
        "id": "extraprofit",
        "idNum": 16,
        "name": "Tax evasion",
        "description": "3x profit!",
        "consumable": false,
        "requiresProduct": "extraticks",
        "strategy": {
          "type": "extraProfit",
          "bonus": 3
        },
        "priceStr": {
          "local": "7u"
        }
      },
      {
        "id": "starter1",
        "idNum": 18,
        "name": "Starter pack",
        "description": "8 time travel tickets + 300 000 bonus ticks &nbsp; &nbsp; &nbsp;",
        "consumable": true,
        "special": true,
        "strategy": {
          "type": "starter",
          "timeTravelTickets": 8,
          "bonusTicks": 3e5
        },
        "priceStr": {
          "local": "3u"
        }
      },
      {
        "id": "starter2",
        "idNum": 17,
        "name": "Fun pack",
        "description": "3 time travel tickets + 60 000 bonus ticks &nbsp; &nbsp; &nbsp;",
        "consumable": true,
        "special": true,
        "strategy": {
          "type": "starter",
          "timeTravelTickets": 3,
          "bonusTicks": 6e4
        },
        "priceStr": {
          "local": "2u"
        }
      }
    ]
  };
});
