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

/**
 * 将二维的各id的父节点数组组合 转为为 1维的 各id的父节点json对象组合
 * **/
util.transferFatherTrees = function (fatherTrees) {
    let resultJsonObj ={};
    for (let i = 0; i < fatherTrees.length; i++) {

        // itemFathersArray 是array类型，id为fatherTrees[0]的，所有父节点的链条数组
        let itemFathersArray = fatherTrees[i];
        let gapLength = itemFathersArray.length;

        if(i == 13){
            debugger;
        }
        for (let j = 0; j < gapLength; j++) {

            let current = deepClone(itemFathersArray[j]);
            let result = insertNode(resultJsonObj, current);

            resultJsonObj = result.root?result.root: result;
            
            if(result.inserted){
                break;
            }
        }

    }

    return resultJsonObj;
}

function insertNode(root ,insertingNode){
    let inserted = false;
    if(Array.isArray(root)){
        // children内的数组insert递归
        for(let arrayChild in root){
            let subRootChild = deepClone(root[arrayChild]);
            if(subRootChild.id === insertingNode.g_father_id){
                let result = insertNode(subRootChild, insertingNode);
                root[arrayChild] = result.root;
                if(result.inserted){
                    inserted = true;
                    break;
                }
            }else{
                if(subRootChild.children && subRootChild.children.length > 0){
                    // 有孩子节点的话
                    subRootChild.children = insertNode(subRootChild.children, insertingNode);

                    let result = insertNode(subRootChild.children, insertingNode);
                    subRootChild.children = result.root;
                    if(result.inserted){
                        inserted = true;
                        break;
                    }
                }
            }
        }
    }else{
        // children内的对象insert递归
        if(root && !root.id){
            // 空对象，根节点，直接插入
            root = insertingNode;
            root.children = [];
        }else{

            if(!insertingNode || !root){
                debugger;
            }

            if(root.g_father_id === insertingNode.g_father_id){
                return root;
            }

            if(root.id === insertingNode.g_father_id){
                // insertingNode 是 当前root的直接孩子
                if(!root.children){
                    root.children = [];
                }

                if(!checkInsertNodeExist(root.children,insertingNode)){
                    root.children.push(insertingNode);
                    inserted = true;
                }
            } else{
                if(root.children && root.children.length > 0){
                    // 有孩子节点的话
                    let result = insertNode(root.children, insertingNode);
                    if(!result.inserted){
                        root.children = result.root;
                    }
                }
            }
        }
    }

    return {root,inserted};
}


function getJsonDepth(object){

    if(!object.children){
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

function checkInsertNodeExist(childrenArr , insertingNode){
    for(let i =0;childrenArr && i<childrenArr.length;i++){
        if(childrenArr[i].id === insertingNode.id){
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
