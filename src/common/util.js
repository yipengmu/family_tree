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

function carryArrayToJson(rawData, buildResult:{}) {

    console.log(' in ' + JSON.stringify(rawData));

    rawData.forEach(function (value, index, array) {

        if (value.g_father_id === 0) {
            buildResult = value;
            buildResult.children = [];

            array.shift();
        } else {
            findMountChildren(value, buildResult);
        }
    });

    console.log(' out ' + JSON.stringify(buildResult));

}


function findMountChildren(value, buildResult) {

    for (let filed in buildResult) {

        if (value.g_father_id === filed.id) {
            buildResult.children.push(value);
            return buildResult;
        } else {
            buildResult.children.forEach((childrenValue, index, children) => {
                findMountChildren(value, buildResult.children)
            });
        }
    }

}


util.getJsonFromDBResult = function (nodeId, buildResult, rawData) {
    console.log('function');
    //return buildJson(nodeId, buildResult, rawData);

    return carryArrayToJson(dbJson, buildResult);

};

// 从第startId数组索引处，找到指定id,的依次所有的父id列表，以数组方式提供，数字索引越大，代表father辈分越高
util.getFatherTree = function (id, rawData, fatherTree) {
    debugger;
    for (let i = id; i < rawData.length && i > 0; i--) {
        let item = this.getItem(i, rawData);
        if (item.g_father_id == 0) {
            fatherTree.push('[' + item.id + '] ' + item.name + ' ' + item.g_rank + '代 祖上' + item.g_father_id);
            break;
        } else {
            fatherTree.push('[' + item.id + '] ' + item.name + ' ' + item.g_rank + '代 祖上' + item.g_father_id);
            this.getFatherTree(item.g_father_id, rawData, fatherTree);
            break;
        }
    }
    return fatherTree;
};

// 从第startId数组索引处，找到指定id,的依次所有的父id列表，以数组方式提供，数字索引越大，代表father辈分越高
util.getItem = function (id, rawData) {
    for (let i = 0; i < rawData.length; i++) {
        let item = rawData[i];
        if (item.id == id) {
            return item;
        }
    }
};



export default util;
