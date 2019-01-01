import createG2 from 'g2-react';
import { Stat ,G2} from 'g2';
import TreeModel from '../treeModel/index.js'
import React,{Component} from 'react'

class Tree extends Component{
    constructor(props) {
        super(props);
        var data = [{
            "name": "总经理",
            "children": [{
                "name": "运营总监",
                "children": [{
                    "name": "职能总监",
                    "children": [{
                        "name": "人事部"
                    },{
                        "name": "行政部"
                    },{
                        "name": "财务部"
                    }]
                },{
                    "name": "服务总监",
                    "children": [{
                        "name": "技术部"
                    },{
                        "name": "客服部"
                    },{
                        "name": "售后部"
                    }]
                },{
                    "name": "市场总监",
                    "children": [{
                        "name": "企划部"
                    },{
                        "name": "推广部"
                    },{
                        "name": "广告部"
                    },{
                        "name": "公关部"
                    }]
                }]
            }]
        }];

        let ftData = [{
            "id": 1,
            "name": "穆茂",
            "g_rank": 1,
            "g_father_id": 0,
            "children": [{
                "id": 2,
                "name": "穆贵",
                "g_rank": 2,
                "g_father_id": 1,
                "children": [{
                    "id": 6,
                    "name": "穆经",
                    "g_rank": 3,
                    "g_father_id": 2
                }]
            }, {
                "id": 3,
                "name": "穆叢(cong)",
                "g_rank": 2,
                "g_father_id": 1,
                "children": [{
                    "id": 7,
                    "name": "穆宣",
                    "g_rank": 3,
                    "g_father_id": 3,
                    "children": [{
                        "id": 14,
                        "name": "穆永吉",
                        "g_rank": 4,
                        "g_father_id": 7,
                        "children": [{
                            "id": 35,
                            "name": "穆以弟",
                            "g_rank": 5,
                            "g_father_id": 14,
                            "children": [{
                                "id": 57,
                                "name": "穆遇春",
                                "g_rank": 6,
                                "g_father_id": 35,
                                "children": [{
                                    "id": 60,
                                    "name": "穆文灼",
                                    "g_rank": 7,
                                    "g_father_id": 57
                                }, {
                                    "id": 61,
                                    "name": "穆文煠（ye）",
                                    "g_rank": 7,
                                    "g_father_id": 57
                                }]
                            }, {
                                "id": 58,
                                "name": "穆际春",
                                "g_rank": 6,
                                "g_father_id": 35,
                                "children": [{
                                    "id": 62,
                                    "name": "穆文焕",
                                    "g_rank": 7,
                                    "g_father_id": 58,
                                    "children": [{
                                        "id": 69,
                                        "name": "穆之仪",
                                        "g_rank": 8,
                                        "g_father_id": 62
                                    }, {
                                        "id": 70,
                                        "name": "穆之伟",
                                        "g_rank": 8,
                                        "g_father_id": 62
                                    }, {
                                        "id": 71,
                                        "name": "穆之允",
                                        "g_rank": 8,
                                        "g_father_id": 62,
                                        "children": [{
                                            "id": 84,
                                            "name": "穆藩宸",
                                            "g_rank": 9,
                                            "g_father_id": 71,
                                            "children": [{
                                                "id": 98,
                                                "name": "穆大綸",
                                                "g_rank": 10,
                                                "g_father_id": 84
                                            }]
                                        }]
                                    }, {
                                        "id": 72,
                                        "name": "穆之斌",
                                        "g_rank": 8,
                                        "g_father_id": 62,
                                        "children": [{
                                            "id": 85,
                                            "name": "穆钦宸",
                                            "g_rank": 9,
                                            "g_father_id": 72,
                                            "children": [{
                                                "id": 99,
                                                "name": "穆大经",
                                                "g_rank": 10,
                                                "g_father_id": 85
                                            }]
                                        }]
                                    }, {
                                        "id": 73,
                                        "name": "穆之让",
                                        "g_rank": 8,
                                        "g_father_id": 62,
                                        "children": [{
                                            "id": 86,
                                            "name": "穆勷（xiang）宸",
                                            "g_rank": 9,
                                            "g_father_id": 73,
                                            "children": [{
                                                "id": 100,
                                                "name": "穆大鹏",
                                                "g_rank": 10,
                                                "g_father_id": 86,
                                                "children": [{
                                                    "id": 113,
                                                    "name": "穆（失名）",
                                                    "g_rank": 11,
                                                    "g_father_id": 100,
                                                    "children": [{
                                                        "id": 130,
                                                        "name": "穆淮",
                                                        "g_rank": 12,
                                                        "g_father_id": 113,
                                                        "children": [{
                                                            "id": 154,
                                                            "name": "穆汝玉",
                                                            "g_rank": 13,
                                                            "g_father_id": 130
                                                        }]
                                                    }]
                                                }]
                                            }]
                                        }]
                                    }, {
                                        "id": 74,
                                        "name": "穆之德",
                                        "g_rank": 8,
                                        "g_father_id": 62
                                    }]
                                }, {
                                    "id": 63,
                                    "name": "穆文粲（can）",
                                    "g_rank": 7,
                                    "g_father_id": 58,
                                    "children": [{
                                        "id": 65,
                                        "name": "穆之栋",
                                        "g_rank": 8,
                                        "g_father_id": 63,
                                        "children": [{
                                            "id": 75,
                                            "name": "穆治宸（chen）",
                                            "g_rank": 9,
                                            "g_father_id": 65,
                                            "children": [{
                                                "id": 87,
                                                "name": "穆大倫（lun）",
                                                "g_rank": 10,
                                                "g_father_id": 75,
                                                "children": [{
                                                    "id": 114,
                                                    "name": "穆昌林",
                                                    "g_rank": 11,
                                                    "g_father_id": 87
                                                }, {
                                                    "id": 115,
                                                    "name": "穆光林",
                                                    "g_rank": 11,
                                                    "g_father_id": 87,
                                                    "children": [{
                                                        "id": 131,
                                                        "name": "穆兰",
                                                        "g_rank": 12,
                                                        "g_father_id": 115,
                                                        "children": [{
                                                            "id": 155,
                                                            "name": "穆守成",
                                                            "g_rank": 13,
                                                            "g_father_id": 131,
                                                            "children": [{
                                                                "id": 160,
                                                                "name": "穆思安",
                                                                "g_rank": 14,
                                                                "g_father_id": 155
                                                            }]
                                                        }, {
                                                            "id": 156,
                                                            "name": "穆顺成",
                                                            "g_rank": 13,
                                                            "g_father_id": 131,
                                                            "children": [{
                                                                "id": 161,
                                                                "name": "穆思礼",
                                                                "g_rank": 14,
                                                                "g_father_id": 156
                                                            }, {
                                                                "id": 162,
                                                                "name": "穆思仁",
                                                                "g_rank": 14,
                                                                "g_father_id": 156,
                                                                "children": [{
                                                                    "id": 206,
                                                                    "name": "穆道熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 162
                                                                }]
                                                            }, {
                                                                "id": 163,
                                                                "name": "穆思文",
                                                                "g_rank": 14,
                                                                "g_father_id": 156,
                                                                "children": [{
                                                                    "id": 207,
                                                                    "name": "穆瑞熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 163
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 157,
                                                            "name": "穆玉成",
                                                            "g_rank": 13,
                                                            "g_father_id": 131,
                                                            "children": [{
                                                                "id": 164,
                                                                "name": "穆思智",
                                                                "g_rank": 14,
                                                                "g_father_id": 157,
                                                                "children": [{
                                                                    "id": 208,
                                                                    "name": "穆朝熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 164,
                                                                    "children": [{
                                                                        "id": 278,
                                                                        "name": "穆维坤",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 208,
                                                                        "children": [{
                                                                            "id": 429,
                                                                            "name": "穆金盛",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 278,
                                                                            "children": [{
                                                                                "id": 546,
                                                                                "name": "穆清赛",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 429
                                                                            }, {
                                                                                "id": 547,
                                                                                "name": "穆清兢（jing）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 429
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 165,
                                                                "name": "穆思正",
                                                                "g_rank": 14,
                                                                "g_father_id": 157,
                                                                "children": [{
                                                                    "id": 209,
                                                                    "name": "穆林熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 165,
                                                                    "children": [{
                                                                        "id": 279,
                                                                        "name": "穆敬兰",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 209,
                                                                        "children": [{
                                                                            "id": 430,
                                                                            "name": "穆金盛",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 279
                                                                        }, {
                                                                            "id": 431,
                                                                            "name": "穆金成",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 279
                                                                        }, {
                                                                            "id": 432,
                                                                            "name": "穆金田",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 279
                                                                        }]
                                                                    }, {
                                                                        "id": 280,
                                                                        "name": "穆敬芝",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 209,
                                                                        "children": [{
                                                                            "id": 433,
                                                                            "name": "穆金田",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 280,
                                                                            "children": [{
                                                                                "id": 548,
                                                                                "name": "穆清谊（yi）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 433
                                                                            }, {
                                                                                "id": 549,
                                                                                "name": "穆清友",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 433
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 158,
                                                            "name": "穆有成",
                                                            "g_rank": 13,
                                                            "g_father_id": 131,
                                                            "children": [{
                                                                "id": 166,
                                                                "name": "穆思敬",
                                                                "g_rank": 14,
                                                                "g_father_id": 158,
                                                                "children": [{
                                                                    "id": 210,
                                                                    "name": "穆积熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 166
                                                                }]
                                                            }, {
                                                                "id": 167,
                                                                "name": "穆思恭",
                                                                "g_rank": 14,
                                                                "g_father_id": 158,
                                                                "children": [{
                                                                    "id": 211,
                                                                    "name": "穆诚熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 167
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }, {
                                                    "id": 116,
                                                    "name": "穆化林",
                                                    "g_rank": 11,
                                                    "g_father_id": 87,
                                                    "children": [{
                                                        "id": 132,
                                                        "name": "穆凰",
                                                        "g_rank": 12,
                                                        "g_father_id": 116,
                                                        "children": [{
                                                            "id": 159,
                                                            "name": "穆金成",
                                                            "g_rank": 13,
                                                            "g_father_id": 132,
                                                            "children": [{
                                                                "id": 168,
                                                                "name": "穆思可",
                                                                "g_rank": 14,
                                                                "g_father_id": 159,
                                                                "children": [{
                                                                    "id": 212,
                                                                    "name": "穆亮熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 168
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }]
                                            }, {
                                                "id": 88,
                                                "name": "穆大任",
                                                "g_rank": 10,
                                                "g_father_id": 75,
                                                "children": [{
                                                    "id": 101,
                                                    "name": "穆顕（xian）林",
                                                    "g_rank": 11,
                                                    "g_father_id": 88
                                                }, {
                                                    "id": 102,
                                                    "name": "穆成林",
                                                    "g_rank": 11,
                                                    "g_father_id": 88
                                                }, {
                                                    "id": 103,
                                                    "name": "穆荣林",
                                                    "g_rank": 11,
                                                    "g_father_id": 88,
                                                    "children": [{
                                                        "id": 117,
                                                        "name": "穆凤",
                                                        "g_rank": 12,
                                                        "g_father_id": 103,
                                                        "children": [{
                                                            "id": 143,
                                                            "name": "穆惠成",
                                                            "g_rank": 13,
                                                            "g_father_id": 117
                                                        }]
                                                    }]
                                                }, {
                                                    "id": 104,
                                                    "name": "穆正林",
                                                    "g_rank": 11,
                                                    "g_father_id": 88
                                                }]
                                            }]
                                        }, {
                                            "id": 76,
                                            "name": "穆元宸",
                                            "g_rank": 9,
                                            "g_father_id": 65,
                                            "children": [{
                                                "id": 89,
                                                "name": "穆大受",
                                                "g_rank": 10,
                                                "g_father_id": 76,
                                                "children": [{
                                                    "id": 105,
                                                    "name": "穆桂林",
                                                    "g_rank": 11,
                                                    "g_father_id": 89,
                                                    "children": [{
                                                        "id": 118,
                                                        "name": "穆占鳌",
                                                        "g_rank": 12,
                                                        "g_father_id": 105
                                                    }, {
                                                        "id": 119,
                                                        "name": "穆占魁",
                                                        "g_rank": 12,
                                                        "g_father_id": 105
                                                    }]
                                                }, {
                                                    "id": 106,
                                                    "name": "穆廷林",
                                                    "g_rank": 11,
                                                    "g_father_id": 89,
                                                    "children": [{
                                                        "id": 120,
                                                        "name": "穆占科",
                                                        "g_rank": 12,
                                                        "g_father_id": 106,
                                                        "children": [{
                                                            "id": 144,
                                                            "name": "穆汝贵",
                                                            "g_rank": 13,
                                                            "g_father_id": 120,
                                                            "children": [{
                                                                "id": 169,
                                                                "name": "穆思信",
                                                                "g_rank": 14,
                                                                "g_father_id": 144,
                                                                "children": [{
                                                                    "id": 213,
                                                                    "name": "穆畅熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 169,
                                                                    "children": [{
                                                                        "id": 281,
                                                                        "name": "穆维寿",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 213,
                                                                        "children": [{
                                                                            "id": 434,
                                                                            "name": "穆金玉",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 281,
                                                                            "children": [{
                                                                                "id": 550,
                                                                                "name": "穆清卫",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 434
                                                                            }, {
                                                                                "id": 551,
                                                                                "name": "穆清麒（qi）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 434
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 282,
                                                                        "name": "穆维福",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 213
                                                                    }]
                                                                }, {
                                                                    "id": 214,
                                                                    "name": "穆俊熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 169,
                                                                    "children": [{
                                                                        "id": 283,
                                                                        "name": "穆维富",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 214,
                                                                        "children": [{
                                                                            "id": 435,
                                                                            "name": "穆金旺",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 283
                                                                        }, {
                                                                            "id": 436,
                                                                            "name": "穆金团",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 283,
                                                                            "children": [{
                                                                                "id": 552,
                                                                                "name": "穆清水",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 436
                                                                            }, {
                                                                                "id": 553,
                                                                                "name": "穆清源",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 436
                                                                            }]
                                                                        }, {
                                                                            "id": 437,
                                                                            "name": "穆金殿",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 283,
                                                                            "children": [{
                                                                                "id": 554,
                                                                                "name": "穆清源",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 437
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 145,
                                                            "name": "穆庆云",
                                                            "g_rank": 13,
                                                            "g_father_id": 120,
                                                            "children": [{
                                                                "id": 170,
                                                                "name": "穆思存",
                                                                "g_rank": 14,
                                                                "g_father_id": 145,
                                                                "children": [{
                                                                    "id": 215,
                                                                    "name": "穆禄熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 170,
                                                                    "children": [{
                                                                        "id": 284,
                                                                        "name": "穆维址",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 215
                                                                    }]
                                                                }, {
                                                                    "id": 216,
                                                                    "name": "穆福熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 170,
                                                                    "children": [{
                                                                        "id": 285,
                                                                        "name": "穆维墀（chi）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 216
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 171,
                                                                "name": "穆思诚",
                                                                "g_rank": 14,
                                                                "g_father_id": 145,
                                                                "children": [{
                                                                    "id": 217,
                                                                    "name": "穆令熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 171,
                                                                    "children": [{
                                                                        "id": 286,
                                                                        "name": "穆维福",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 217,
                                                                        "children": [{
                                                                            "id": 438,
                                                                            "name": "穆金柱",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 286,
                                                                            "children": [{
                                                                                "id": 555,
                                                                                "name": "穆清洋",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 438
                                                                            }]
                                                                        }, {
                                                                            "id": 439,
                                                                            "name": "穆金辂（lu）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 286,
                                                                            "children": [{
                                                                                "id": 556,
                                                                                "name": "穆清世",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 439
                                                                            }]
                                                                        }, {
                                                                            "id": 440,
                                                                            "name": "穆金銮（luan）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 286,
                                                                            "children": [{
                                                                                "id": 557,
                                                                                "name": "穆清治（zhi）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 440
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 146,
                                                            "name": "穆汝楫（ji）",
                                                            "g_rank": 13,
                                                            "g_father_id": 120,
                                                            "children": [{
                                                                "id": 172,
                                                                "name": "穆思美",
                                                                "g_rank": 14,
                                                                "g_father_id": 146,
                                                                "children": [{
                                                                    "id": 218,
                                                                    "name": "穆屏熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 172,
                                                                    "children": [{
                                                                        "id": 287,
                                                                        "name": "穆维奎",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 218
                                                                    }, {
                                                                        "id": 288,
                                                                        "name": "穆维墀（chi）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 218
                                                                    }, {
                                                                        "id": 354,
                                                                        "name": "穆维章",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 218
                                                                    }, {
                                                                        "id": 355,
                                                                        "name": "穆维堵",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 218
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 147,
                                                            "name": "穆汝舟",
                                                            "g_rank": 13,
                                                            "g_father_id": 120,
                                                            "children": [{
                                                                "id": 173,
                                                                "name": "穆思聪",
                                                                "g_rank": 14,
                                                                "g_father_id": 147,
                                                                "children": [{
                                                                    "id": 219,
                                                                    "name": "穆文熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 173
                                                                }, {
                                                                    "id": 220,
                                                                    "name": "穆晨熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 173,
                                                                    "children": [{
                                                                        "id": 356,
                                                                        "name": "穆维坊（fang）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 220
                                                                    }, {
                                                                        "id": 357,
                                                                        "name": "穆维堡（pu）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 220,
                                                                        "children": [{
                                                                            "id": 441,
                                                                            "name": "穆金舟",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 357
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 174,
                                                                "name": "穆思和",
                                                                "g_rank": 14,
                                                                "g_father_id": 147,
                                                                "children": [{
                                                                    "id": 221,
                                                                    "name": "穆文熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 174
                                                                }]
                                                            }, {
                                                                "id": 175,
                                                                "name": "穆思清",
                                                                "g_rank": 14,
                                                                "g_father_id": 147,
                                                                "children": [{
                                                                    "id": 222,
                                                                    "name": "穆晨熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 175
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }]
                                            }]
                                        }, {
                                            "id": 77,
                                            "name": "穆正宸",
                                            "g_rank": 9,
                                            "g_father_id": 65,
                                            "children": [{
                                                "id": 90,
                                                "name": "穆大成",
                                                "g_rank": 10,
                                                "g_father_id": 77,
                                                "children": [{
                                                    "id": 107,
                                                    "name": "穆兆（zhao）林",
                                                    "g_rank": 11,
                                                    "g_father_id": 90,
                                                    "children": [{
                                                        "id": 121,
                                                        "name": "穆祥",
                                                        "g_rank": 12,
                                                        "g_father_id": 107,
                                                        "children": [{
                                                            "id": 148,
                                                            "name": "穆汝勷（xiang）",
                                                            "g_rank": 13,
                                                            "g_father_id": 121,
                                                            "children": [{
                                                                "id": 176,
                                                                "name": "穆思任",
                                                                "g_rank": 14,
                                                                "g_father_id": 148,
                                                                "children": [{
                                                                    "id": 223,
                                                                    "name": "穆炯熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 176,
                                                                    "children": [{
                                                                        "id": 358,
                                                                        "name": "穆维藩（fan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 223,
                                                                        "children": [{
                                                                            "id": 442,
                                                                            "name": "穆金平",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 358
                                                                        }, {
                                                                            "id": 443,
                                                                            "name": "穆金铭(ming)",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 358,
                                                                            "children": [{
                                                                                "id": 558,
                                                                                "name": "穆清津（jin）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 443
                                                                            }]
                                                                        }, {
                                                                            "id": 444,
                                                                            "name": "穆金車（che）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 358,
                                                                            "children": [{
                                                                                "id": 559,
                                                                                "name": "穆清贤",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 444
                                                                            }, {
                                                                                "id": 560,
                                                                                "name": "穆清勲（xun）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 444
                                                                            }]
                                                                        }, {
                                                                            "id": 445,
                                                                            "name": "穆金兰",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 358,
                                                                            "children": [{
                                                                                "id": 561,
                                                                                "name": "穆清余",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 445
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 177,
                                                                "name": "穆思精",
                                                                "g_rank": 14,
                                                                "g_father_id": 148,
                                                                "children": [{
                                                                    "id": 224,
                                                                    "name": "穆宇熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 177,
                                                                    "children": [{
                                                                        "id": 359,
                                                                        "name": "穆文明",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 224,
                                                                        "children": [{
                                                                            "id": 446,
                                                                            "name": "穆金盈",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 359,
                                                                            "children": [{
                                                                                "id": 562,
                                                                                "name": "穆清落",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 446
                                                                            }, {
                                                                                "id": 563,
                                                                                "name": "穆清磊",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 446
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 225,
                                                                    "name": "穆承熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 177,
                                                                    "children": [{
                                                                        "id": 360,
                                                                        "name": "穆文明",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 225
                                                                    }, {
                                                                        "id": 361,
                                                                        "name": "穆文清",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 225,
                                                                        "children": [{
                                                                            "id": 447,
                                                                            "name": "穆金冬",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 361
                                                                        }, {
                                                                            "id": 448,
                                                                            "name": "穆金春",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 361
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 226,
                                                                    "name": "穆常熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 177,
                                                                    "children": [{
                                                                        "id": 362,
                                                                        "name": "穆文郁",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 226,
                                                                        "children": [{
                                                                            "id": 449,
                                                                            "name": "穆金礼",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 362,
                                                                            "children": [{
                                                                                "id": 564,
                                                                                "name": "穆清拉",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 449
                                                                            }, {
                                                                                "id": 565,
                                                                                "name": "穆清非",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 449
                                                                            }, {
                                                                                "id": 566,
                                                                                "name": "穆清亚",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 449
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 227,
                                                                    "name": "穆芳熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 177,
                                                                    "children": [{
                                                                        "id": 363,
                                                                        "name": "穆文周",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 227,
                                                                        "children": [{
                                                                            "id": 450,
                                                                            "name": "穆金房",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 363
                                                                        }, {
                                                                            "id": 451,
                                                                            "name": "穆金梁",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 363,
                                                                            "children": [{
                                                                                "id": 567,
                                                                                "name": "穆清修",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 451
                                                                            }, {
                                                                                "id": 568,
                                                                                "name": "穆清教",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 451
                                                                            }, {
                                                                                "id": 569,
                                                                                "name": "穆清邦",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 451
                                                                            }]
                                                                        }, {
                                                                            "id": 452,
                                                                            "name": "穆金仓",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 363
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 149,
                                                            "name": "穆汝功",
                                                            "g_rank": 13,
                                                            "g_father_id": 121,
                                                            "children": [{
                                                                "id": 178,
                                                                "name": "穆树栗（li）",
                                                                "g_rank": 14,
                                                                "g_father_id": 149,
                                                                "children": [{
                                                                    "id": 228,
                                                                    "name": "穆恒熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 178,
                                                                    "children": [{
                                                                        "id": 364,
                                                                        "name": "穆维壇（tan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 228,
                                                                        "children": [{
                                                                            "id": 453,
                                                                            "name": "穆金坡",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 364,
                                                                            "children": [{
                                                                                "id": 570,
                                                                                "name": "穆清安",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 453
                                                                            }, {
                                                                                "id": 571,
                                                                                "name": "穆清瑞（rui）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 453
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 229,
                                                                    "name": "穆雍熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 178,
                                                                    "children": [{
                                                                        "id": 365,
                                                                        "name": "穆维尧（yao）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 229,
                                                                        "children": [{
                                                                            "id": 454,
                                                                            "name": "穆金坡",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 365
                                                                        }, {
                                                                            "id": 455,
                                                                            "name": "穆金丽",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 365,
                                                                            "children": [{
                                                                                "id": 581,
                                                                                "name": "穆清宝",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 455
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 150,
                                                            "name": "穆汝成",
                                                            "g_rank": 13,
                                                            "g_father_id": 121,
                                                            "children": [{
                                                                "id": 179,
                                                                "name": "穆思纯",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 230,
                                                                    "name": "穆德熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 179,
                                                                    "children": [{
                                                                        "id": 366,
                                                                        "name": "穆文岐（qi）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 230,
                                                                        "children": [{
                                                                            "id": 456,
                                                                            "name": "穆金楷",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 366,
                                                                            "children": [{
                                                                                "id": 578,
                                                                                "name": "穆清直",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 456
                                                                            }, {
                                                                                "id": 579,
                                                                                "name": "穆清武",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 456
                                                                            }, {
                                                                                "id": 580,
                                                                                "name": "穆清学",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 456
                                                                            }]
                                                                        }, {
                                                                            "id": 457,
                                                                            "name": "穆金星",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 366
                                                                        }, {
                                                                            "id": 458,
                                                                            "name": "穆金梧",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 366,
                                                                            "children": [{
                                                                                "id": 577,
                                                                                "name": "穆清直",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 458
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 231,
                                                                    "name": "穆明熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 179
                                                                }, {
                                                                    "id": 232,
                                                                    "name": "穆持熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 179
                                                                }]
                                                            }, {
                                                                "id": 180,
                                                                "name": "穆思道",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 233,
                                                                    "name": "穆廷义",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 180,
                                                                    "children": [{
                                                                        "id": 367,
                                                                        "name": "穆文渊",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 233,
                                                                        "children": [{
                                                                            "id": 459,
                                                                            "name": "穆金声",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 367,
                                                                            "children": [{
                                                                                "id": 576,
                                                                                "name": "穆清才",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 459,
                                                                                "children": [{
                                                                                    "id": 680,
                                                                                    "name": "穆荣震",
                                                                                    "g_rank": 19,
                                                                                    "g_father_id": 576,
                                                                                    "children": [{
                                                                                        "id": 685,
                                                                                        "name": "穆毅鹏",
                                                                                        "g_rank": 20,
                                                                                        "g_father_id": 680
                                                                                    }]
                                                                                }, {
                                                                                    "id": 681,
                                                                                    "name": "穆荣滋",
                                                                                    "g_rank": 19,
                                                                                    "g_father_id": 576,
                                                                                    "children": [{
                                                                                        "id": 686,
                                                                                        "name": "穆栋",
                                                                                        "g_rank": 20,
                                                                                        "g_father_id": 681
                                                                                    }]
                                                                                }, {
                                                                                    "id": 682,
                                                                                    "name": "穆荣润",
                                                                                    "g_rank": 19,
                                                                                    "g_father_id": 576,
                                                                                    "children": [{
                                                                                        "id": 687,
                                                                                        "name": "穆垠（yin）彤",
                                                                                        "g_rank": 20,
                                                                                        "g_father_id": 682
                                                                                    }]
                                                                                }, {
                                                                                    "id": 683,
                                                                                    "name": "穆荣挺",
                                                                                    "g_rank": 19,
                                                                                    "g_father_id": 576,
                                                                                    "children": [{
                                                                                        "id": 688,
                                                                                        "name": "穆昊楠",
                                                                                        "g_rank": 20,
                                                                                        "g_father_id": 683
                                                                                    }]
                                                                                }, {
                                                                                    "id": 684,
                                                                                    "name": "穆荣峰",
                                                                                    "g_rank": 19,
                                                                                    "g_father_id": 576,
                                                                                    "children": [{
                                                                                        "id": 689,
                                                                                        "name": "穆雅馨",
                                                                                        "g_rank": 20,
                                                                                        "g_father_id": 684
                                                                                    }]
                                                                                }]
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 234,
                                                                    "name": "穆廷贤",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 180,
                                                                    "children": [{
                                                                        "id": 368,
                                                                        "name": "穆文俊",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 234,
                                                                        "children": [{
                                                                            "id": 460,
                                                                            "name": "穆金朝",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 368
                                                                        }, {
                                                                            "id": 461,
                                                                            "name": "穆金宝",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 368
                                                                        }, {
                                                                            "id": 462,
                                                                            "name": "穆金声",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 368
                                                                        }]
                                                                    }, {
                                                                        "id": 369,
                                                                        "name": "穆文德",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 234,
                                                                        "children": [{
                                                                            "id": 463,
                                                                            "name": "穆金爵（jue）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 369,
                                                                            "children": [{
                                                                                "id": 574,
                                                                                "name": "穆清遂（sui）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 463
                                                                            }]
                                                                        }, {
                                                                            "id": 464,
                                                                            "name": "穆金胪（lu）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 369,
                                                                            "children": [{
                                                                                "id": 572,
                                                                                "name": "穆清绪（xu）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 464
                                                                            }, {
                                                                                "id": 573,
                                                                                "name": "穆清遂（sui）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 464
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 181,
                                                                "name": "穆思杰",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 235,
                                                                    "name": "穆延熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 181,
                                                                    "children": [{
                                                                        "id": 370,
                                                                        "name": "穆文豹",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 235
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 182,
                                                                "name": "穆思行",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 236,
                                                                    "name": "穆逢熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 182,
                                                                    "children": [{
                                                                        "id": 371,
                                                                        "name": "穆文会",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 236,
                                                                        "children": [{
                                                                            "id": 465,
                                                                            "name": "穆金铃",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 371,
                                                                            "children": [{
                                                                                "id": 582,
                                                                                "name": "穆清怀",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 465
                                                                            }]
                                                                        }, {
                                                                            "id": 466,
                                                                            "name": "穆金松",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 371,
                                                                            "children": [{
                                                                                "id": 583,
                                                                                "name": "穆清伦",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 466
                                                                            }]
                                                                        }, {
                                                                            "id": 467,
                                                                            "name": "穆金传",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 371,
                                                                            "children": [{
                                                                                "id": 584,
                                                                                "name": "穆清英",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 467
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 183,
                                                                "name": "穆思齐",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 237,
                                                                    "name": "穆廷秀",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 183,
                                                                    "children": [{
                                                                        "id": 372,
                                                                        "name": "穆文同",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 237,
                                                                        "children": [{
                                                                            "id": 468,
                                                                            "name": "穆金宝",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 372,
                                                                            "children": [{
                                                                                "id": 585,
                                                                                "name": "穆清习",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 468
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 238,
                                                                    "name": "穆来熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 183,
                                                                    "children": [{
                                                                        "id": 373,
                                                                        "name": "穆文俊",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 238,
                                                                        "children": [{
                                                                            "id": 469,
                                                                            "name": "穆金锋",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 373,
                                                                            "children": [{
                                                                                "id": 586,
                                                                                "name": "穆清宗",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 469
                                                                            }, {
                                                                                "id": 587,
                                                                                "name": "穆清道",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 469
                                                                            }, {
                                                                                "id": 588,
                                                                                "name": "穆清富",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 469
                                                                            }, {
                                                                                "id": 589,
                                                                                "name": "穆清仁",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 469
                                                                            }]
                                                                        }, {
                                                                            "id": 470,
                                                                            "name": "穆金朝",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 373,
                                                                            "children": [{
                                                                                "id": 575,
                                                                                "name": "穆清举",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 470
                                                                            }]
                                                                        }, {
                                                                            "id": 471,
                                                                            "name": "穆金善",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 373,
                                                                            "children": [{
                                                                                "id": 590,
                                                                                "name": "穆清厚",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 471
                                                                            }, {
                                                                                "id": 591,
                                                                                "name": "穆清纯",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 471
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 184,
                                                                "name": "穆思忠",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 239,
                                                                    "name": "穆遄（chuan）熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 184,
                                                                    "children": [{
                                                                        "id": 374,
                                                                        "name": "穆文聚",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 239,
                                                                        "children": [{
                                                                            "id": 472,
                                                                            "name": "穆金书",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 374,
                                                                            "children": [{
                                                                                "id": 592,
                                                                                "name": "穆清兆",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 472
                                                                            }]
                                                                        }, {
                                                                            "id": 473,
                                                                            "name": "穆金富",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 374
                                                                        }, {
                                                                            "id": 474,
                                                                            "name": "穆金泉",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 374
                                                                        }, {
                                                                            "id": 475,
                                                                            "name": "穆金标",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 374,
                                                                            "children": [{
                                                                                "id": 593,
                                                                                "name": "穆清惠",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 475
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 240,
                                                                    "name": "穆廷旺",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 184,
                                                                    "children": [{
                                                                        "id": 375,
                                                                        "name": "穆文肃",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 240,
                                                                        "children": [{
                                                                            "id": 476,
                                                                            "name": "穆金柜",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 375
                                                                        }, {
                                                                            "id": 477,
                                                                            "name": "穆金箱",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 375
                                                                        }]
                                                                    }, {
                                                                        "id": 376,
                                                                        "name": "穆文锦",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 240,
                                                                        "children": [{
                                                                            "id": 478,
                                                                            "name": "穆金富",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 376,
                                                                            "children": [{
                                                                                "id": 594,
                                                                                "name": "穆清兆",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 478
                                                                            }, {
                                                                                "id": 595,
                                                                                "name": "穆清惠",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 478
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 377,
                                                                        "name": "穆文斗",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 240,
                                                                        "children": [{
                                                                            "id": 479,
                                                                            "name": "穆金瑞",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 377,
                                                                            "children": [{
                                                                                "id": 596,
                                                                                "name": "穆清芝",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 479
                                                                            }, {
                                                                                "id": 597,
                                                                                "name": "穆清兰",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 479
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 378,
                                                                        "name": "穆文聚",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 240
                                                                    }, {
                                                                        "id": 379,
                                                                        "name": "穆文均（jun）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 240,
                                                                        "children": [{
                                                                            "id": 480,
                                                                            "name": "穆金义",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 379
                                                                        }, {
                                                                            "id": 481,
                                                                            "name": "穆金泉",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 379,
                                                                            "children": [{
                                                                                "id": 598,
                                                                                "name": "穆清云",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 481
                                                                            }, {
                                                                                "id": 599,
                                                                                "name": "穆清花",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 481
                                                                            }, {
                                                                                "id": 600,
                                                                                "name": "穆清荣",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 481
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 185,
                                                                "name": "穆思温",
                                                                "g_rank": 14,
                                                                "g_father_id": 150,
                                                                "children": [{
                                                                    "id": 241,
                                                                    "name": "穆旺熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 185,
                                                                    "children": [{
                                                                        "id": 380,
                                                                        "name": "穆文祥",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 241,
                                                                        "children": [{
                                                                            "id": 482,
                                                                            "name": "穆金寿",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 380
                                                                        }, {
                                                                            "id": 483,
                                                                            "name": "穆金禄",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 380,
                                                                            "children": [{
                                                                                "id": 601,
                                                                                "name": "穆清茂",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 483
                                                                            }, {
                                                                                "id": 602,
                                                                                "name": "穆清禧",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 483
                                                                            }]
                                                                        }, {
                                                                            "id": 484,
                                                                            "name": "穆金福",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 380,
                                                                            "children": [{
                                                                                "id": 603,
                                                                                "name": "穆清杰",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 484
                                                                            }]
                                                                        }, {
                                                                            "id": 485,
                                                                            "name": "穆金恒",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 380,
                                                                            "children": [{
                                                                                "id": 604,
                                                                                "name": "穆清杰",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 485
                                                                            }, {
                                                                                "id": 605,
                                                                                "name": "穆清俊",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 485
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 242,
                                                                    "name": "穆俾（bi）熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 185,
                                                                    "children": [{
                                                                        "id": 381,
                                                                        "name": "穆文升",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 242
                                                                    }]
                                                                }, {
                                                                    "id": 243,
                                                                    "name": "穆庆熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 185,
                                                                    "children": [{
                                                                        "id": 382,
                                                                        "name": "穆文升",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 243
                                                                    }, {
                                                                        "id": 383,
                                                                        "name": "穆干城",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 243
                                                                    }, {
                                                                        "id": 384,
                                                                        "name": "穆宗城",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 243
                                                                    }]
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }]
                                            }, {
                                                "id": 91,
                                                "name": "穆大鹤",
                                                "g_rank": 10,
                                                "g_father_id": 77
                                            }]
                                        }]
                                    }, {
                                        "id": 66,
                                        "name": "穆之梧",
                                        "g_rank": 8,
                                        "g_father_id": 63,
                                        "children": [{
                                            "id": 78,
                                            "name": "穆仁传",
                                            "g_rank": 9,
                                            "g_father_id": 66,
                                            "children": [{
                                                "id": 92,
                                                "name": "穆大士",
                                                "g_rank": 10,
                                                "g_father_id": 78,
                                                "children": [{
                                                    "id": 108,
                                                    "name": "穆典章",
                                                    "g_rank": 11,
                                                    "g_father_id": 92,
                                                    "children": [{
                                                        "id": 122,
                                                        "name": "穆凤翔",
                                                        "g_rank": 12,
                                                        "g_father_id": 108,
                                                        "children": [{
                                                            "id": 151,
                                                            "name": "穆汝钦（qin）",
                                                            "g_rank": 13,
                                                            "g_father_id": 122,
                                                            "children": [{
                                                                "id": 186,
                                                                "name": "穆树芳",
                                                                "g_rank": 14,
                                                                "g_father_id": 151,
                                                                "children": [{
                                                                    "id": 244,
                                                                    "name": "穆廷麟（lin）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 186,
                                                                    "children": [{
                                                                        "id": 385,
                                                                        "name": "穆序垣（yuan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 244
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 152,
                                                            "name": "穆汝砺（li）",
                                                            "g_rank": 13,
                                                            "g_father_id": 122,
                                                            "children": [{
                                                                "id": 187,
                                                                "name": "穆树屏",
                                                                "g_rank": 14,
                                                                "g_father_id": 152,
                                                                "children": [{
                                                                    "id": 245,
                                                                    "name": "穆廷麟（lin）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 187,
                                                                    "children": [{
                                                                        "id": 386,
                                                                        "name": "穆序垣（yuan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 245,
                                                                        "children": [{
                                                                            "id": 486,
                                                                            "name": "穆镇武",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 386,
                                                                            "children": [{
                                                                                "id": 606,
                                                                                "name": "穆清沂（yi）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 486
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }]
                                                    }, {
                                                        "id": 123,
                                                        "name": "穆鹤鸣",
                                                        "g_rank": 12,
                                                        "g_father_id": 108,
                                                        "children": [{
                                                            "id": 153,
                                                            "name": "穆汝梅",
                                                            "g_rank": 13,
                                                            "g_father_id": 123,
                                                            "children": [{
                                                                "id": 188,
                                                                "name": "穆树桂",
                                                                "g_rank": 14,
                                                                "g_father_id": 153,
                                                                "children": [{
                                                                    "id": 246,
                                                                    "name": "穆祥熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 188,
                                                                    "children": [{
                                                                        "id": 387,
                                                                        "name": "穆效垣（yuan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 246
                                                                    }, {
                                                                        "id": 388,
                                                                        "name": "穆序垣（yuan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 246
                                                                    }]
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }, {
                                                    "id": 109,
                                                    "name": "穆宪章",
                                                    "g_rank": 11,
                                                    "g_father_id": 92,
                                                    "children": [{
                                                        "id": 124,
                                                        "name": "穆鹏举",
                                                        "g_rank": 12,
                                                        "g_father_id": 109,
                                                        "children": [{
                                                            "id": 133,
                                                            "name": "穆汝霖",
                                                            "g_rank": 13,
                                                            "g_father_id": 124,
                                                            "children": [{
                                                                "id": 189,
                                                                "name": "穆树楷",
                                                                "g_rank": 14,
                                                                "g_father_id": 133,
                                                                "children": [{
                                                                    "id": 247,
                                                                    "name": "穆袭（xi）熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 189,
                                                                    "children": [{
                                                                        "id": 389,
                                                                        "name": "穆殿甲",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 247,
                                                                        "children": [{
                                                                            "id": 487,
                                                                            "name": "穆金涛",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 389,
                                                                            "children": [{
                                                                                "id": 607,
                                                                                "name": "穆清仑",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 487
                                                                            }, {
                                                                                "id": 608,
                                                                                "name": "穆清昆",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 487
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 390,
                                                                        "name": "穆殿英",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 247,
                                                                        "children": [{
                                                                            "id": 488,
                                                                            "name": "穆金荣",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 390
                                                                        }, {
                                                                            "id": 489,
                                                                            "name": "穆金彩",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 390,
                                                                            "children": [{
                                                                                "id": 609,
                                                                                "name": "穆清森",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 489
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 248,
                                                                    "name": "穆廷玉",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 189,
                                                                    "children": [{
                                                                        "id": 391,
                                                                        "name": "穆殿义",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 248,
                                                                        "children": [{
                                                                            "id": 490,
                                                                            "name": "穆金祥",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 391
                                                                        }, {
                                                                            "id": 491,
                                                                            "name": "穆金喜",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 391,
                                                                            "children": [{
                                                                                "id": 610,
                                                                                "name": "穆清滨",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 491
                                                                            }, {
                                                                                "id": 611,
                                                                                "name": "穆清濠",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 491
                                                                            }, {
                                                                                "id": 612,
                                                                                "name": "穆清淋（lin）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 491
                                                                            }, {
                                                                                "id": 613,
                                                                                "name": "穆清游",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 491
                                                                            }]
                                                                        }, {
                                                                            "id": 492,
                                                                            "name": "穆金财",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 391,
                                                                            "children": [{
                                                                                "id": 614,
                                                                                "name": "穆清滨",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 492
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 249,
                                                                    "name": "穆正熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 189,
                                                                    "children": [{
                                                                        "id": 392,
                                                                        "name": "穆殿章",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 249,
                                                                        "children": [{
                                                                            "id": 493,
                                                                            "name": "穆金祥",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 392
                                                                        }]
                                                                    }, {
                                                                        "id": 393,
                                                                        "name": "穆殿楹（ying）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 249,
                                                                        "children": [{
                                                                            "id": 494,
                                                                            "name": "穆金泰",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 393
                                                                        }]
                                                                    }, {
                                                                        "id": 394,
                                                                        "name": "穆殿武",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 249,
                                                                        "children": [{
                                                                            "id": 497,
                                                                            "name": "穆金中",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 394,
                                                                            "children": [{
                                                                                "id": 615,
                                                                                "name": "穆清马",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 497
                                                                            }, {
                                                                                "id": 616,
                                                                                "name": "穆清玉",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 497
                                                                            }, {
                                                                                "id": 617,
                                                                                "name": "穆清建",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 497
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 395,
                                                                        "name": "穆殿文",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 249,
                                                                        "children": [{
                                                                            "id": 498,
                                                                            "name": "穆金泰",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 395,
                                                                            "children": [{
                                                                                "id": 618,
                                                                                "name": "穆清玉",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 498
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 190,
                                                                "name": "穆树桐",
                                                                "g_rank": 14,
                                                                "g_father_id": 133,
                                                                "children": [{
                                                                    "id": 250,
                                                                    "name": "穆锦熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 190,
                                                                    "children": [{
                                                                        "id": 396,
                                                                        "name": "穆殿陞（sheng）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 250,
                                                                        "children": [{
                                                                            "id": 499,
                                                                            "name": "穆金雨",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 396,
                                                                            "children": [{
                                                                                "id": 619,
                                                                                "name": "穆清汉",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 499
                                                                            }]
                                                                        }, {
                                                                            "id": 500,
                                                                            "name": "穆金仁",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 396
                                                                        }]
                                                                    }, {
                                                                        "id": 397,
                                                                        "name": "穆殿元",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 250,
                                                                        "children": [{
                                                                            "id": 501,
                                                                            "name": "穆金流",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 397
                                                                        }]
                                                                    }, {
                                                                        "id": 398,
                                                                        "name": "穆殿鸣（ming）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 250,
                                                                        "children": [{
                                                                            "id": 502,
                                                                            "name": "穆金顺",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 398,
                                                                            "children": [{
                                                                                "id": 620,
                                                                                "name": "穆清银",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 502
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 399,
                                                                        "name": "穆殿堦（jie）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 250,
                                                                        "children": [{
                                                                            "id": 503,
                                                                            "name": "穆金镕（rong）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 399,
                                                                            "children": [{
                                                                                "id": 621,
                                                                                "name": "穆清哲",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 503
                                                                            }, {
                                                                                "id": 622,
                                                                                "name": "穆清圃",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 503
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 251,
                                                                    "name": "穆迓（ya）熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 190,
                                                                    "children": [{
                                                                        "id": 400,
                                                                        "name": "穆殿臣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 251,
                                                                        "children": [{
                                                                            "id": 504,
                                                                            "name": "穆金镕（rong）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 400
                                                                        }, {
                                                                            "id": 505,
                                                                            "name": "穆金顺",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 400
                                                                        }, {
                                                                            "id": 506,
                                                                            "name": "穆金奎",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 400
                                                                        }, {
                                                                            "id": 507,
                                                                            "name": "穆金和",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 400,
                                                                            "children": [{
                                                                                "id": 623,
                                                                                "name": "穆清哲",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 507
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 252,
                                                                    "name": "穆望熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 190,
                                                                    "children": [{
                                                                        "id": 401,
                                                                        "name": "穆殿均",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 252,
                                                                        "children": [{
                                                                            "id": 508,
                                                                            "name": "穆金雨",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 401
                                                                        }, {
                                                                            "id": 509,
                                                                            "name": "穆金风",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 401
                                                                        }, {
                                                                            "id": 510,
                                                                            "name": "穆金相",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 401
                                                                        }, {
                                                                            "id": 511,
                                                                            "name": "穆金瓒（zan）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 401
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 134,
                                                            "name": "穆汝谐",
                                                            "g_rank": 13,
                                                            "g_father_id": 124,
                                                            "children": [{
                                                                "id": 191,
                                                                "name": "穆树桢（zhen）",
                                                                "g_rank": 14,
                                                                "g_father_id": 134,
                                                                "children": [{
                                                                    "id": 253,
                                                                    "name": "穆存熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 191,
                                                                    "children": [{
                                                                        "id": 402,
                                                                        "name": "穆维壁",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 253,
                                                                        "children": [{
                                                                            "id": 512,
                                                                            "name": "穆金恭（gong）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 402
                                                                        }, {
                                                                            "id": 513,
                                                                            "name": "穆金良",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 402,
                                                                            "children": [{
                                                                                "id": 624,
                                                                                "name": "穆清纲",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 513
                                                                            }, {
                                                                                "id": 625,
                                                                                "name": "穆清浩",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 513
                                                                            }]
                                                                        }, {
                                                                            "id": 514,
                                                                            "name": "穆金温",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 402,
                                                                            "children": [{
                                                                                "id": 626,
                                                                                "name": "穆清钧（jun）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 514
                                                                            }, {
                                                                                "id": 627,
                                                                                "name": "穆清璨（can）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 514
                                                                            }, {
                                                                                "id": 628,
                                                                                "name": "穆清禄（lu）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 514
                                                                            }, {
                                                                                "id": 629,
                                                                                "name": "穆清河",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 514
                                                                            }, {
                                                                                "id": 630,
                                                                                "name": "穆清湖",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 514
                                                                            }, {
                                                                                "id": 631,
                                                                                "name": "穆清暄",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 514
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 192,
                                                                "name": "穆树模",
                                                                "g_rank": 14,
                                                                "g_father_id": 134,
                                                                "children": [{
                                                                    "id": 254,
                                                                    "name": "穆存熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 192
                                                                }, {
                                                                    "id": 255,
                                                                    "name": "穆振熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 192,
                                                                    "children": [{
                                                                        "id": 403,
                                                                        "name": "穆维墉（yong）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 255,
                                                                        "children": [{
                                                                            "id": 515,
                                                                            "name": "穆金恭",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 403,
                                                                            "children": [{
                                                                                "id": 632,
                                                                                "name": "穆清久",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 515
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 404,
                                                                        "name": "穆维壁",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 255
                                                                    }, {
                                                                        "id": 405,
                                                                        "name": "穆维堦（jie）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 255,
                                                                        "children": [{
                                                                            "id": 516,
                                                                            "name": "穆金俭（jian）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 405,
                                                                            "children": [{
                                                                                "id": 633,
                                                                                "name": "穆清砚（yan）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 516
                                                                            }, {
                                                                                "id": 634,
                                                                                "name": "穆清年",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 516
                                                                            }, {
                                                                                "id": 635,
                                                                                "name": "穆清聪",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 516
                                                                            }, {
                                                                                "id": 636,
                                                                                "name": "穆清桂",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 516
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 256,
                                                                    "name": "穆敬熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 192
                                                                }]
                                                            }, {
                                                                "id": 193,
                                                                "name": "穆树萱",
                                                                "g_rank": 14,
                                                                "g_father_id": 134,
                                                                "children": [{
                                                                    "id": 257,
                                                                    "name": "穆敬熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 193,
                                                                    "children": [{
                                                                        "id": 406,
                                                                        "name": "穆维城",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 257,
                                                                        "children": [{
                                                                            "id": 517,
                                                                            "name": "穆金让",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 406,
                                                                            "children": [{
                                                                                "id": 637,
                                                                                "name": "穆清忠",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 517
                                                                            }, {
                                                                                "id": 638,
                                                                                "name": "穆清英",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 517
                                                                            }, {
                                                                                "id": 639,
                                                                                "name": "穆清明",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 517
                                                                            }, {
                                                                                "id": 640,
                                                                                "name": "穆清烈",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 517
                                                                            }, {
                                                                                "id": 641,
                                                                                "name": "穆清传",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 517
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }, {
                                                    "id": 110,
                                                    "name": "穆成章",
                                                    "g_rank": 11,
                                                    "g_father_id": 92,
                                                    "children": [{
                                                        "id": 125,
                                                        "name": "穆顕（xian）煜（yu）",
                                                        "g_rank": 12,
                                                        "g_father_id": 110,
                                                        "children": [{
                                                            "id": 135,
                                                            "name": "穆睿",
                                                            "g_rank": 13,
                                                            "g_father_id": 125,
                                                            "children": [{
                                                                "id": 194,
                                                                "name": "穆树敏",
                                                                "g_rank": 14,
                                                                "g_father_id": 135,
                                                                "children": [{
                                                                    "id": 258,
                                                                    "name": "穆廷兰",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 194,
                                                                    "children": [{
                                                                        "id": 407,
                                                                        "name": "穆泮（pan）垣（yuan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 258
                                                                    }, {
                                                                        "id": 408,
                                                                        "name": "穆景垣（yuan）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 258,
                                                                        "children": [{
                                                                            "id": 518,
                                                                            "name": "穆镇亚",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 408,
                                                                            "children": [{
                                                                                "id": 642,
                                                                                "name": "穆清有",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 518
                                                                            }, {
                                                                                "id": 643,
                                                                                "name": "穆清田",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 518
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 259,
                                                                    "name": "穆廷炆（wen）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 194,
                                                                    "children": [{
                                                                        "id": 409,
                                                                        "name": "穆辰垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 259,
                                                                        "children": [{
                                                                            "id": 519,
                                                                            "name": "穆镇海",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 409
                                                                        }, {
                                                                            "id": 520,
                                                                            "name": "穆镇东",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 409
                                                                        }]
                                                                    }, {
                                                                        "id": 410,
                                                                        "name": "穆星垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 259,
                                                                        "children": [{
                                                                            "id": 521,
                                                                            "name": "穆镇东",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 410,
                                                                            "children": [{
                                                                                "id": 644,
                                                                                "name": "穆清潮",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 521
                                                                            }, {
                                                                                "id": 645,
                                                                                "name": "穆清旺",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 521
                                                                            }, {
                                                                                "id": 646,
                                                                                "name": "穆清盛",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 521
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 411,
                                                                        "name": "穆建垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 259,
                                                                        "children": [{
                                                                            "id": 522,
                                                                            "name": "穆镇邦",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 411,
                                                                            "children": [{
                                                                                "id": 647,
                                                                                "name": "穆清渭",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 522
                                                                            }, {
                                                                                "id": 648,
                                                                                "name": "穆清沈",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 522
                                                                            }, {
                                                                                "id": 649,
                                                                                "name": "穆清洞",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 522
                                                                            }, {
                                                                                "id": 650,
                                                                                "name": "穆清沾（zhan）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 522
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 260,
                                                                    "name": "穆廷焕",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 194,
                                                                    "children": [{
                                                                        "id": 412,
                                                                        "name": "穆紫垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 260
                                                                    }, {
                                                                        "id": 413,
                                                                        "name": "穆青垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 260
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 136,
                                                            "name": "穆生鳌",
                                                            "g_rank": 13,
                                                            "g_father_id": 125
                                                        }, {
                                                            "id": 137,
                                                            "name": "穆汝明",
                                                            "g_rank": 13,
                                                            "g_father_id": 125,
                                                            "children": [{
                                                                "id": 195,
                                                                "name": "穆树楠",
                                                                "g_rank": 14,
                                                                "g_father_id": 137,
                                                                "children": [{
                                                                    "id": 261,
                                                                    "name": "穆廷勲(xun)",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 195,
                                                                    "children": [{
                                                                        "id": 414,
                                                                        "name": "穆丰垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 261,
                                                                        "children": [{
                                                                            "id": 523,
                                                                            "name": "穆镇魁（kui）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 414,
                                                                            "children": [{
                                                                                "id": 651,
                                                                                "name": "穆清佳",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 523
                                                                            }]
                                                                        }, {
                                                                            "id": 524,
                                                                            "name": "穆镇藩（fan）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 414,
                                                                            "children": [{
                                                                                "id": 652,
                                                                                "name": "穆清江",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 524
                                                                            }, {
                                                                                "id": 653,
                                                                                "name": "穆清海",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 524
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 262,
                                                                    "name": "穆廷熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 195,
                                                                    "children": [{
                                                                        "id": 415,
                                                                        "name": "穆岐（qi）垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 262,
                                                                        "children": [{
                                                                            "id": 525,
                                                                            "name": "穆镇朝",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 415,
                                                                            "children": [{
                                                                                "id": 654,
                                                                                "name": "穆清龙",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 525
                                                                            }]
                                                                        }, {
                                                                            "id": 526,
                                                                            "name": "穆镇国",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 415,
                                                                            "children": [{
                                                                                "id": 655,
                                                                                "name": "穆清廉",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 526
                                                                            }]
                                                                        }, {
                                                                            "id": 527,
                                                                            "name": "穆镇华",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 415,
                                                                            "children": [{
                                                                                "id": 656,
                                                                                "name": "穆清亮",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 527
                                                                            }, {
                                                                                "id": 657,
                                                                                "name": "穆清廉",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 527
                                                                            }]
                                                                        }, {
                                                                            "id": 528,
                                                                            "name": "穆镇中",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 415,
                                                                            "children": [{
                                                                                "id": 658,
                                                                                "name": "穆清敏",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 528
                                                                            }, {
                                                                                "id": 659,
                                                                                "name": "穆清龙",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 528
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 196,
                                                                "name": "穆树棠(tang)",
                                                                "g_rank": 14,
                                                                "g_father_id": 137,
                                                                "children": [{
                                                                    "id": 263,
                                                                    "name": "穆廷喣（xu）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 196,
                                                                    "children": [{
                                                                        "id": 416,
                                                                        "name": "穆勤垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 263,
                                                                        "children": [{
                                                                            "id": 529,
                                                                            "name": "穆镇纯",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 416,
                                                                            "children": [{
                                                                                "id": 660,
                                                                                "name": "穆清洪",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 529
                                                                            }]
                                                                        }]
                                                                    }, {
                                                                        "id": 417,
                                                                        "name": "穆市垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 263,
                                                                        "children": [{
                                                                            "id": 530,
                                                                            "name": "穆镇山",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 417,
                                                                            "children": [{
                                                                                "id": 661,
                                                                                "name": "穆清洲",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 530
                                                                            }]
                                                                        }, {
                                                                            "id": 531,
                                                                            "name": "穆镇江",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 417,
                                                                            "children": [{
                                                                                "id": 662,
                                                                                "name": "穆清藻",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 531
                                                                            }, {
                                                                                "id": 663,
                                                                                "name": "穆清池",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 531
                                                                            }]
                                                                        }, {
                                                                            "id": 532,
                                                                            "name": "穆镇武",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 417
                                                                        }, {
                                                                            "id": 533,
                                                                            "name": "穆镇文",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 417,
                                                                            "children": [{
                                                                                "id": 664,
                                                                                "name": "穆清渠",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 533
                                                                            }, {
                                                                                "id": 665,
                                                                                "name": "穆清沂（yi）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 533
                                                                            }, {
                                                                                "id": 666,
                                                                                "name": "穆清溉（gai）",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 533
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 138,
                                                            "name": "穆汝翼",
                                                            "g_rank": 13,
                                                            "g_father_id": 125,
                                                            "children": [{
                                                                "id": 197,
                                                                "name": "穆树绩",
                                                                "g_rank": 14,
                                                                "g_father_id": 138,
                                                                "children": [{
                                                                    "id": 264,
                                                                    "name": "穆廷燦（can）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 197,
                                                                    "children": [{
                                                                        "id": 418,
                                                                        "name": "穆志均（jun）",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 264
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 198,
                                                                "name": "穆树声",
                                                                "g_rank": 14,
                                                                "g_father_id": 138,
                                                                "children": [{
                                                                    "id": 265,
                                                                    "name": "穆廷照",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 198,
                                                                    "children": [{
                                                                        "id": 419,
                                                                        "name": "穆僖（xi）垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 265
                                                                    }]
                                                                }, {
                                                                    "id": 266,
                                                                    "name": "穆廷杰",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 198,
                                                                    "children": [{
                                                                        "id": 420,
                                                                        "name": "穆三垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 266
                                                                    }, {
                                                                        "id": 421,
                                                                        "name": "穆僖（xi）垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 266
                                                                    }, {
                                                                        "id": 422,
                                                                        "name": "穆宣垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 266,
                                                                        "children": [{
                                                                            "id": 534,
                                                                            "name": "穆庆钧（jun）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 422
                                                                        }, {
                                                                            "id": 535,
                                                                            "name": "穆庆铎（duo）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 422
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 267,
                                                                    "name": "穆廷光",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 198
                                                                }]
                                                            }, {
                                                                "id": 199,
                                                                "name": "穆树德",
                                                                "g_rank": 14,
                                                                "g_father_id": 138,
                                                                "children": [{
                                                                    "id": 268,
                                                                    "name": "穆廷燕",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 199,
                                                                    "children": [{
                                                                        "id": 423,
                                                                        "name": "穆三垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 268,
                                                                        "children": [{
                                                                            "id": 536,
                                                                            "name": "穆庆银",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 423,
                                                                            "children": [{
                                                                                "id": 667,
                                                                                "name": "穆清科",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 536
                                                                            }, {
                                                                                "id": 668,
                                                                                "name": "穆清现",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 536
                                                                            }, {
                                                                                "id": 669,
                                                                                "name": "穆清珠",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 536
                                                                            }, {
                                                                                "id": 670,
                                                                                "name": "穆清长",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 536
                                                                            }, {
                                                                                "id": 671,
                                                                                "name": "穆清存",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 536
                                                                            }]
                                                                        }, {
                                                                            "id": 537,
                                                                            "name": "穆庆钱",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 423,
                                                                            "children": [{
                                                                                "id": 672,
                                                                                "name": "穆清科",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 537
                                                                            }]
                                                                        }, {
                                                                            "id": 538,
                                                                            "name": "穆庆铨（quan）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 423,
                                                                            "children": [{
                                                                                "id": 677,
                                                                                "name": "穆清珍",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 538
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 200,
                                                                "name": "穆树型",
                                                                "g_rank": 14,
                                                                "g_father_id": 138,
                                                                "children": [{
                                                                    "id": 269,
                                                                    "name": "穆廷燃",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 200,
                                                                    "children": [{
                                                                        "id": 424,
                                                                        "name": "穆周垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 269,
                                                                        "children": [{
                                                                            "id": 539,
                                                                            "name": "穆庆镒（yi）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 424,
                                                                            "children": [{
                                                                                "id": 673,
                                                                                "name": "穆清宽",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 539
                                                                            }, {
                                                                                "id": 674,
                                                                                "name": "穆清宣",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 539
                                                                            }, {
                                                                                "id": 675,
                                                                                "name": "穆清风",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 539
                                                                            }, {
                                                                                "id": 676,
                                                                                "name": "穆清华",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 539
                                                                            }]
                                                                        }, {
                                                                            "id": 540,
                                                                            "name": "穆庆铁",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 424,
                                                                            "children": [{
                                                                                "id": 678,
                                                                                "name": "穆清宣",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 540
                                                                            }]
                                                                        }, {
                                                                            "id": 541,
                                                                            "name": "穆庆铜",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 424
                                                                        }]
                                                                    }]
                                                                }, {
                                                                    "id": 270,
                                                                    "name": "穆廷辉",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 200,
                                                                    "children": [{
                                                                        "id": 425,
                                                                        "name": "穆长垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 270,
                                                                        "children": [{
                                                                            "id": 542,
                                                                            "name": "穆庆铜",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 425,
                                                                            "children": [{
                                                                                "id": 679,
                                                                                "name": "穆清新",
                                                                                "g_rank": 18,
                                                                                "g_father_id": 542
                                                                            }]
                                                                        }]
                                                                    }]
                                                                }]
                                                            }, {
                                                                "id": 201,
                                                                "name": "穆树本",
                                                                "g_rank": 14,
                                                                "g_father_id": 138,
                                                                "children": [{
                                                                    "id": 271,
                                                                    "name": "穆廷光",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 201,
                                                                    "children": [{
                                                                        "id": 426,
                                                                        "name": "穆聚垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 271,
                                                                        "children": [{
                                                                            "id": 543,
                                                                            "name": "穆庆锡（xi）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 426
                                                                        }, {
                                                                            "id": 544,
                                                                            "name": "穆庆镛（yong）",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 426
                                                                        }]
                                                                    }, {
                                                                        "id": 427,
                                                                        "name": "穆维垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 271,
                                                                        "children": [{
                                                                            "id": 545,
                                                                            "name": "穆庆贤",
                                                                            "g_rank": 17,
                                                                            "g_father_id": 427
                                                                        }]
                                                                    }]
                                                                }]
                                                            }]
                                                        }]
                                                    }, {
                                                        "id": 126,
                                                        "name": "穆鱼化",
                                                        "g_rank": 12,
                                                        "g_father_id": 110,
                                                        "children": [{
                                                            "id": 139,
                                                            "name": "穆汝弼（bi）",
                                                            "g_rank": 13,
                                                            "g_father_id": 126,
                                                            "children": [{
                                                                "id": 202,
                                                                "name": "穆树田",
                                                                "g_rank": 14,
                                                                "g_father_id": 139,
                                                                "children": [{
                                                                    "id": 272,
                                                                    "name": "穆廷耀",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 202
                                                                }, {
                                                                    "id": 273,
                                                                    "name": "穆廷焜（kun）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 202
                                                                }, {
                                                                    "id": 274,
                                                                    "name": "穆廷炽（chi）",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 202,
                                                                    "children": [{
                                                                        "id": 428,
                                                                        "name": "穆襄垣",
                                                                        "g_rank": 16,
                                                                        "g_father_id": 274
                                                                    }]
                                                                }]
                                                            }]
                                                        }]
                                                    }]
                                                }]
                                            }, {
                                                "id": 93,
                                                "name": "穆大生",
                                                "g_rank": 10,
                                                "g_father_id": 78,
                                                "children": [{
                                                    "id": 111,
                                                    "name": "穆玉林",
                                                    "g_rank": 11,
                                                    "g_father_id": 93,
                                                    "children": [{
                                                        "id": 127,
                                                        "name": "穆森",
                                                        "g_rank": 12,
                                                        "g_father_id": 111,
                                                        "children": [{
                                                            "id": 140,
                                                            "name": "穆汝英",
                                                            "g_rank": 13,
                                                            "g_father_id": 127,
                                                            "children": [{
                                                                "id": 203,
                                                                "name": "穆树松",
                                                                "g_rank": 14,
                                                                "g_father_id": 140,
                                                                "children": [{
                                                                    "id": 275,
                                                                    "name": "穆至熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 203
                                                                }, {
                                                                    "id": 276,
                                                                    "name": "穆福熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 203
                                                                }, {
                                                                    "id": 277,
                                                                    "name": "穆运熙",
                                                                    "g_rank": 15,
                                                                    "g_father_id": 203
                                                                }]
                                                            }]
                                                        }, {
                                                            "id": 141,
                                                            "name": "穆洪东",
                                                            "g_rank": 13,
                                                            "g_father_id": 127
                                                        }]
                                                    }]
                                                }, {
                                                    "id": 112,
                                                    "name": "穆上林",
                                                    "g_rank": 11,
                                                    "g_father_id": 93,
                                                    "children": [{
                                                        "id": 128,
                                                        "name": "穆铎（duo）",
                                                        "g_rank": 12,
                                                        "g_father_id": 112,
                                                        "children": [{
                                                            "id": 142,
                                                            "name": "穆汝英",
                                                            "g_rank": 13,
                                                            "g_father_id": 128
                                                        }]
                                                    }, {
                                                        "id": 129,
                                                        "name": "穆贞",
                                                        "g_rank": 12,
                                                        "g_father_id": 112
                                                    }]
                                                }]
                                            }]
                                        }]
                                    }, {
                                        "id": 67,
                                        "name": "穆之俊",
                                        "g_rank": 8,
                                        "g_father_id": 63,
                                        "children": [{
                                            "id": 79,
                                            "name": "穆辅宸",
                                            "g_rank": 9,
                                            "g_father_id": 67,
                                            "children": [{
                                                "id": 94,
                                                "name": "穆起凤",
                                                "g_rank": 10,
                                                "g_father_id": 79
                                            }]
                                        }]
                                    }, {
                                        "id": 68,
                                        "name": "穆之周",
                                        "g_rank": 8,
                                        "g_father_id": 63,
                                        "children": [{
                                            "id": 80,
                                            "name": "穆言传",
                                            "g_rank": 9,
                                            "g_father_id": 68
                                        }, {
                                            "id": 81,
                                            "name": "穆啓（qi）传",
                                            "g_rank": 9,
                                            "g_father_id": 68
                                        }, {
                                            "id": 82,
                                            "name": "穆体传",
                                            "g_rank": 9,
                                            "g_father_id": 68,
                                            "children": [{
                                                "id": 95,
                                                "name": "穆大智",
                                                "g_rank": 10,
                                                "g_father_id": 82
                                            }, {
                                                "id": 96,
                                                "name": "穆大勇",
                                                "g_rank": 10,
                                                "g_father_id": 82
                                            }]
                                        }, {
                                            "id": 83,
                                            "name": "穆道传",
                                            "g_rank": 9,
                                            "g_father_id": 68,
                                            "children": [{
                                                "id": 97,
                                                "name": "穆大典",
                                                "g_rank": 10,
                                                "g_father_id": 83
                                            }]
                                        }]
                                    }]
                                }]
                            }]
                        }, {
                            "id": 36,
                            "name": "穆以孝",
                            "g_rank": 5,
                            "g_father_id": 14
                        }]
                    }, {
                        "id": 15,
                        "name": "穆永丰",
                        "g_rank": 4,
                        "g_father_id": 7,
                        "children": [{
                            "id": 37,
                            "name": "穆以教",
                            "g_rank": 5,
                            "g_father_id": 15
                        }, {
                            "id": 38,
                            "name": "穆琚",
                            "g_rank": 5,
                            "g_father_id": 15,
                            "children": [{
                                "id": 59,
                                "name": "穆汝琏",
                                "g_rank": 6,
                                "g_father_id": 38,
                                "children": [{
                                    "id": 64,
                                    "name": "穆守直",
                                    "g_rank": 7,
                                    "g_father_id": 59
                                }]
                            }]
                        }]
                    }, {
                        "id": 16,
                        "name": "穆永贞",
                        "g_rank": 4,
                        "g_father_id": 7,
                        "children": [{
                            "id": 39,
                            "name": "穆以莊",
                            "g_rank": 5,
                            "g_father_id": 16
                        }, {
                            "id": 40,
                            "name": "穆以臣",
                            "g_rank": 5,
                            "g_father_id": 16
                        }]
                    }, {
                        "id": 17,
                        "name": "穆永隆",
                        "g_rank": 4,
                        "g_father_id": 7,
                        "children": [{
                            "id": 41,
                            "name": "穆以仁",
                            "g_rank": 5,
                            "g_father_id": 17
                        }]
                    }, {
                        "id": 18,
                        "name": "穆永享",
                        "g_rank": 4,
                        "g_father_id": 7,
                        "children": [{
                            "id": 42,
                            "name": "穆以中",
                            "g_rank": 5,
                            "g_father_id": 18
                        }, {
                            "id": 43,
                            "name": "穆珮",
                            "g_rank": 5,
                            "g_father_id": 18
                        }]
                    }]
                }, {
                    "id": 8,
                    "name": "穆太",
                    "g_rank": 3,
                    "g_father_id": 3,
                    "children": [{
                        "id": 19,
                        "name": "穆永成",
                        "g_rank": 4,
                        "g_father_id": 8,
                        "children": [{
                            "id": 25,
                            "name": "穆嚁(di)",
                            "g_rank": 5,
                            "g_father_id": 19,
                            "children": [{
                                "id": 44,
                                "name": "穆遇山",
                                "g_rank": 6,
                                "g_father_id": 25
                            }, {
                                "id": 45,
                                "name": "穆应夏",
                                "g_rank": 6,
                                "g_father_id": 25
                            }]
                        }, {
                            "id": 26,
                            "name": "穆朗",
                            "g_rank": 5,
                            "g_father_id": 19,
                            "children": [{
                                "id": 46,
                                "name": "穆得春",
                                "g_rank": 6,
                                "g_father_id": 26
                            }]
                        }]
                    }]
                }, {
                    "id": 9,
                    "name": "穆振",
                    "g_rank": 3,
                    "g_father_id": 3,
                    "children": [{
                        "id": 20,
                        "name": "穆永奎",
                        "g_rank": 4,
                        "g_father_id": 9,
                        "children": [{
                            "id": 27,
                            "name": "穆淮",
                            "g_rank": 5,
                            "g_father_id": 20,
                            "children": [{
                                "id": 47,
                                "name": "穆自价",
                                "g_rank": 6,
                                "g_father_id": 27
                            }, {
                                "id": 48,
                                "name": "穆自僮",
                                "g_rank": 6,
                                "g_father_id": 27
                            }]
                        }]
                    }, {
                        "id": 21,
                        "name": "穆永昌",
                        "g_rank": 4,
                        "g_father_id": 9
                    }]
                }]
            }, {
                "id": 4,
                "name": "穆锦",
                "g_rank": 2,
                "g_father_id": 1,
                "children": [{
                    "id": 10,
                    "name": "穆潭",
                    "g_rank": 3,
                    "g_father_id": 4
                }, {
                    "id": 11,
                    "name": "穆兰",
                    "g_rank": 3,
                    "g_father_id": 4,
                    "children": [{
                        "id": 22,
                        "name": "穆永学",
                        "g_rank": 4,
                        "g_father_id": 11,
                        "children": [{
                            "id": 28,
                            "name": "穆以廉",
                            "g_rank": 5,
                            "g_father_id": 22,
                            "children": [{
                                "id": 49,
                                "name": "穆洧（wei）",
                                "g_rank": 6,
                                "g_father_id": 28
                            }]
                        }]
                    }]
                }, {
                    "id": 12,
                    "name": "穆全",
                    "g_rank": 3,
                    "g_father_id": 4,
                    "children": [{
                        "id": 23,
                        "name": "穆永时",
                        "g_rank": 4,
                        "g_father_id": 12,
                        "children": [{
                            "id": 29,
                            "name": "穆以平",
                            "g_rank": 5,
                            "g_father_id": 23,
                            "children": [{
                                "id": 50,
                                "name": "穆自贤",
                                "g_rank": 6,
                                "g_father_id": 29
                            }, {
                                "id": 51,
                                "name": "穆自恭",
                                "g_rank": 6,
                                "g_father_id": 29
                            }]
                        }]
                    }]
                }]
            }, {
                "id": 5,
                "name": "穆森",
                "g_rank": 2,
                "g_father_id": 1,
                "children": [{
                    "id": 13,
                    "name": "穆珣",
                    "g_rank": 3,
                    "g_father_id": 5,
                    "children": [{
                        "id": 24,
                        "name": "穆永高",
                        "g_rank": 4,
                        "g_father_id": 13,
                        "children": [{
                            "id": 30,
                            "name": "穆大有",
                            "g_rank": 5,
                            "g_father_id": 24,
                            "children": [{
                                "id": 52,
                                "name": "穆渐",
                                "g_rank": 6,
                                "g_father_id": 30
                            }]
                        }, {
                            "id": 31,
                            "name": "穆以宗",
                            "g_rank": 5,
                            "g_father_id": 24,
                            "children": [{
                                "id": 53,
                                "name": "穆淳",
                                "g_rank": 6,
                                "g_father_id": 31
                            }]
                        }, {
                            "id": 32,
                            "name": "穆以读",
                            "g_rank": 5,
                            "g_father_id": 24
                        }, {
                            "id": 33,
                            "name": "穆以恩",
                            "g_rank": 5,
                            "g_father_id": 24,
                            "children": [{
                                "id": 54,
                                "name": "穆润",
                                "g_rank": 6,
                                "g_father_id": 33
                            }, {
                                "id": 55,
                                "name": "穆滋",
                                "g_rank": 6,
                                "g_father_id": 33
                            }]
                        }, {
                            "id": 34,
                            "name": "穆以耕",
                            "g_rank": 5,
                            "g_father_id": 24,
                            "children": [{
                                "id": 56,
                                "name": "穆应春",
                                "g_rank": 6,
                                "g_father_id": 34
                            }]
                        }]
                    }]
                }]
            }]
        }];
        
        
        this.state = {
            data: ftData,
            forceFit: true,
            width: 500,
            height: 450,
            plotCfg: {
                margin: [20, 50]
            },
        };
    }


    render() {
        var G2 = require('g2');

        let Chart = createG2(chart => {
            // 自定义部门的图形
            G2.Shape.registShape('point', 'depart', {
                drawShape: function(cfg, group) {
                    var x = cfg.x;
                    var y = cfg.y;
                    var width = 44;
                    var height = 20;
                    var shape = group.addShape('rect', {
                        attrs: {
                            x: x - width / 2,
                            y: y - height / 2,
                            width: width,
                            height: height,
                            fill: '#fff',
                            stroke: 'black'
                        }
                    });
                    return shape;
                }
            });
            var Layout = G2.Layout;
            var Stat = G2.Stat;
            chart.animate(false);
            // 不显示title
            chart.tooltip({
                title: null
            });
            // 不显示图例
            chart.legend(false);
            var data = chart.get('data');
            data = data.toJSON();
            // 使用layout，用户可以自己编写自己的layout
            // 仅约定输出的节点 存在 id,x，y字段即可
            var layout = new Layout.Tree({
                nodes: data,
                dx: 80 / 1000 // 单位宽度，由于按照宽高 1来计算的，所以需要传入比例值
            });
            var nodes = layout.getNodes();
            var edges = layout.getEdges();
            // 首先绘制 edges，点要在边的上面
            // 创建单独的视图
            var edgeView = chart.createView();
            edgeView.source(edges);
            edgeView.coord().reflect(); //
            edgeView.axis(false);
            edgeView.tooltip(false);
            // Stat.link 方法会生成 ..x, ..y的字段类型，数值范围是 0-1
            edgeView.edge()
                .position(Stat.link('source*target',nodes))
                .shape('vhv')
                .color('#ccc');
            // 创建节点视图
            var nodeView = chart.createView();
            nodeView.coord().reflect(); //'polar'
            nodeView.axis(false);
            // 节点的x,y范围是 0，1
            // 因为边的范围也是 0,1所以正好统一起来
            nodeView.source(nodes, {
                x: {min: 0,max:1},
                y: {min: 0, max:1},
                value: {min: 0}
            });
            nodeView.point().position('x*y').color('steelblue')
                .shape('depart')
                .label('name', {
                    offset: 0
                })
                .tooltip('name');
            chart.render();
        });

        return (
            <div>
                <TreeModel rawData={this.props.result}/>
                <Chart
                    data={this.state.data}
                    width={this.state.width}
                    height={this.state.height}
                    plotCfg={this.state.plotCfg}
                    forceFit={this.state.forceFit} />
            </div>
        );
    }
}

export default Tree;