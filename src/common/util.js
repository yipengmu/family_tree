const util = {}

// 选择fatherId === id 的所有item，最终通过children数值返回，即同一个父亲的人员小集合
function getChildren(id, arrayData) {

    let children = [];
    for (let i = 0; i < arrayData.length; i++) {
        if (arrayData[i].g_father_id === id) {
            children.push(arrayData[i]);
        }
    }

    return children;
}

function mountChildren(obj, children) {

    if (obj && children) {
        obj.children = children;
    }

}

/***
 *  不断的去找 父id===nodeId 的节点，并将该节点挂在buildResult的children字段下
 *  给buildResult 中不断添加他的children ,直到找不到孩子为止
 *  ***/
function buildJson(nodeId, buildResult, rawData) {

    debugger;

    let founded = false;
    let currentRoot = buildResult;
    for (let i = 0; i < rawData.length; i++) {

        let item = rawData[i];
        if (item.g_father_id === nodeId) {

            founded = true;

            if (buildResult && !buildResult.children) {
                buildResult.children = [];
            }

            buildResult.children.push(item);

            console.log('i=' + i + 'buildResult=' + buildResult);

            let result = buildJson(i + 1, rawData[i], rawData);
            if (result) {
                buildResult.children.push(rawData[i]);
            }


        }
    }

    if (!founded) {
        return buildResult;
    }

};


/***
 *  找到所有二级孩子
 *  ***/
function findChildren(nodeId, buildResult, rawData) {


    let childrenArr = [];
    let founded = false;

    for (let i = 0; i < rawData.length; i++) {


        let item = rawData[i];
        if (item.g_father_id === nodeId) {

            founded = true;

            if (buildResult && !buildResult.children) {
                buildResult.children = [];
            }

            buildResult.children.push(item);

            console.log('i=' + i + 'buildResult=' + buildResult);

            let result = buildJson(i + 1, rawData[i], rawData);
            if (result) {
                buildResult.children.push(rawData[i]);
            }


        }
    }

    if (!founded) {
        return buildResult;
    }

};


// 将较短的父系链条 向较长的链条进行合并，合并过程中，需要判断insert到正确的fatherId下
util.getOneTree = function (reductiveTrees) {

    // reductiveTrees 为一维多深度 数组
    let oneTree = {};


    // 将数组逆序，最长深度，即最小辈儿的节点对象放最前面
    //reductiveTrees = reductiveTrees.reverse();

    //一共20代
    for (let rank = 1; rank < 21; rank++) {


        // 600个对象，的顶级父节点一定是相同的
        for (let i = 0; i < reductiveTrees.length; i++) {


            let linkObj = deepClone(reductiveTrees[i]);

            if (rank === 1) {
                oneTree = linkObj;
                break;
            }


            // 获取单列表下，指定rank的一个obj值
            let linkObjByRank = getLinkObjByRank(linkObj, rank);

            if (linkObjByRank) {
                if(linkObjByRank.id  === 14){
                    debugger;
                }
                // 获取指定层架下，组装树的所有father节点，已数组形式存在,找到目标father
                let dFather = findFatherByRankAndId(oneTree, rank - 1, linkObjByRank.g_father_id);
                if (dFather && linkObjByRank.g_father_id === dFather.id) {
                    // 常规塞值但不存在
                    if (!dFather.children) {
                        dFather.children = [];
                    }

                    let exist = false;
                    dFather.children.map((item)=> {
                        if(item.id === linkObjByRank.id){
                            exist = true;
                        }
                    });

                    if(!exist){
                        // 如果元素不存在，则插入
                        dFather.children.push(linkObjByRank);
                    }
                }

            }

        }
    }


    return oneTree;
};


var getLinkObjByRank = function (linkObj, rank) {
    if (rank === 1 && linkObj.id === 1) {
        return linkObj;
    }

    if (linkObj instanceof  Array) {
        // 数组，代表递归到children里了
        for (let i = 0; i < linkObj.length; i++) {
            if (linkObj[i].g_rank === rank) {
                return deepClone(linkObj[i]);
            }

            if (linkObj[i].children && linkObj[i].g_rank < rank) {
                return getLinkObjByRank(linkObj[i].children, rank);
            }
        }
    }

    // 对象
    if (linkObj.g_rank === rank) {
        return deepClone(linkObj);
    }

    if (linkObj.g_rank < rank) {
        if (linkObj.children) {
            return getLinkObjByRank(linkObj.children, rank);
        }
    } else {
        return null;
    }

}


// 返回指定rank下的数据，一定是obj
// linkObj 是一棵json树
var findFatherByRankAndId = function (oneTree, rank ,findingFatherId) {

    if(rank === 3){
        debugger;
    }

    // oneTree是数组，代表递归到children里了
    if (oneTree instanceof  Array) {
        for (let i = 0; i < oneTree.length; i++) {
            if (oneTree[i].g_rank === rank && oneTree[i].id === findingFatherId) {
                return oneTree[i];
            }else{
                if (oneTree[i].children && oneTree[i].g_rank < rank) {
                    return findFatherByRankAndId(oneTree[i].children, rank,findingFatherId);
                }
            }
        }
    }else{
        if (rank === 1 && oneTree.id == findingFatherId) {
            return oneTree;
        }else{
            if(oneTree.children && oneTree.g_rank < rank){
                return findFatherByRankAndId(oneTree.children,rank,findingFatherId);
            }
        }
    }

    return oneTree;
}


// reductiveTrees[617] 为穆毅鹏的 直系父节点
util.reductFatherTrees = function (fatherTrees) {
    let reductiveTrees = [];

    for (let i = 0; i < fatherTrees.length; i++) {

        let row = deepClone(fatherTrees[i]);
        for (let j = 0; j < row.length - 1; j++) {
            if (!row[j + 1].children) {
                row[j + 1].children = [];
            }
            row[j + 1].children.push(row[j]);
        }

        reductiveTrees.push(row[row.length - 1]);
    }

    return reductiveTrees;
}

/**
 * 将二维的各id的父节点数组组合 转为为 1维的 各id的父节点json对象组合
 * **/
util.transferFatherTrees = function (fatherTrees) {
    let resultJsonObj = {};
    for (let i = 0; i < fatherTrees.length; i++) {

        // itemFathersArray 是array类型，id为fatherTrees[0]的，所有父节点的链条数组
        let itemFathersArray = fatherTrees[i];
        let gapLength = itemFathersArray.length;

        if (i == 13) {
            debugger;
        }
        for (let j = 0; j < gapLength; j++) {

            let current = deepClone(itemFathersArray[j]);
            let result = insertNode(resultJsonObj, current);

            resultJsonObj = result.root ? result.root : result;

            if (result.inserted) {
                break;
            }
        }

    }

    return resultJsonObj;
}

function insertNode(root, insertingNode) {
    let inserted = false;
    if (Array.isArray(root)) {
        // children内的数组insert递归
        for (let arrayChild in root) {
            let subRootChild = deepClone(root[arrayChild]);
            if (subRootChild.id === insertingNode.g_father_id) {
                let result = insertNode(subRootChild, insertingNode);
                root[arrayChild] = result.root;
                if (result.inserted) {
                    inserted = true;
                    break;
                }
            } else {
                if (subRootChild.children && subRootChild.children.length > 0) {
                    // 有孩子节点的话
                    subRootChild.children = insertNode(subRootChild.children, insertingNode);

                    let result = insertNode(subRootChild.children, insertingNode);
                    subRootChild.children = result.root;
                    if (result.inserted) {
                        inserted = true;
                        break;
                    }
                }
            }
        }
    } else {
        // children内的对象insert递归
        if (root && !root.id) {
            // 空对象，根节点，直接插入
            root = insertingNode;
            root.children = [];
        } else {

            if (!insertingNode || !root) {
                debugger;
            }

            if (root.g_father_id === insertingNode.g_father_id) {
                return root;
            }

            if (root.id === insertingNode.g_father_id) {
                // insertingNode 是 当前root的直接孩子
                if (!root.children) {
                    root.children = [];
                }

                if (!checkInsertNodeExist(root.children, insertingNode)) {
                    root.children.push(insertingNode);
                    inserted = true;
                }
            } else {
                if (root.children && root.children.length > 0) {
                    // 有孩子节点的话
                    let result = insertNode(root.children, insertingNode);
                    if (!result.inserted) {
                        root.children = result.root;
                    }
                }
            }
        }
    }

    return {root, inserted};
}


function getJsonDepth(object) {

    if (!object.children) {
        return 1;
    }

    return getChildren(object.children) + 1;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}


/**
 * 从children数组中找是否包含当前insertNode
 * */

function checkInsertNodeExist(childrenArr, insertingNode) {
    for (let i = 0; childrenArr && i < childrenArr.length; i++) {
        if (childrenArr[i].id === insertingNode.id) {
            return true;
        }
    }
    return false;
}

/**
 * 构造一个大json树，来表达该家族的树状关系
 * **/
util.getFatherTreesJson = function (fatherTrees) {
    let treeJson = {};

    for (let i = 0; i < fatherTrees.length; i++) {

        // id为fatherTrees[0]的，所有父节点的链条数组
        let itemFathers = fatherTrees[i];
        // itemFathers[0]为链路的叶子节点
        let itemSelf = itemFathers[0];

        console.log('当前为' + itemSelf.id + ' ' + itemSelf.g_rank + '代')
        for (let j = itemFathers.length - 1; j > 0; j--) {
            // 逆序从itemSelf最上层的父节点，开始尝试往treeJson中去 insert item
            let father = itemFathers[j];
            if (father.id == 1) {
                // 顶级根root节点
                treeJson = itemSelf;
                treeJson.children = [];
                continue;
            }
        }
    }

    return treeJson;
}

/**
 * 获得每个人的链式父亲树，返回一个联系父亲数的数字
 * **/
util.getFatherTrees = function (rawData) {
    let fatherTrees = [];

    for (let i = 0; i < rawData.length; i++) {
        let tree = this.getFatherTree(rawData[i].id, rawData, []);
        if (tree) {
            fatherTrees.push(tree);
        }
    }

    return fatherTrees;
}

/**
 * 从第startId数组索引处，找到指定id,的依次所有的父id列表，以数组方式提供，数字索引越大，代表father辈分越高
 * **/
util.getFatherTree = function (id, rawData, fatherTree) {

    if (!rawData) {
        return;
    }

    let item = this.getItem(id, rawData);

    if (!item || !item.id) {
        return;
    }

    //fatherTree.push('[' + item.id + '] ' + item.name + ' ' + item.g_rank + '代 祖上' + item.g_father_id);

    fatherTree.push(item);
    if (item.g_father_id == 0) {
        // 递归已经找到一代祖先，结束递归
        return fatherTree;
    } else {
        this.getFatherTree(item.g_father_id, rawData, fatherTree);
    }
    return fatherTree;
};

/**
 * 从第startId数组索引处，找到指定id,的依次所有的父id列表，以数组方式提供，数字索引越大，代表father辈分越高
 * **/
util.getItem = function (id, rawData) {
    for (let i = 0; i < rawData.length; i++) {
        let item = rawData[i];
        if (item.id == id) {
            return item;
        }
    }
};


export default util;
