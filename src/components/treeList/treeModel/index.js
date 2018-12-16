import React,{Component} from 'react'
import { List } from 'antd';

import util from '../../../common/util.js'

class TreeModel extends Component {

    constructor(props) {
        super(props);
        this.state = {
        };
    }


    addNode(subTree){
        this.setState(subTree);
    }

    _transferFatherTrees (fatherTrees) {
        for (let i = 0; i < fatherTrees.length; i++) {

            // itemFathers 是array类型，id为fatherTrees[0]的，所有父节点的链条数组
            let itemFathersArray = fatherTrees[i];
            let gapLength = itemFathersArray.length;

            for (let j = 0; j < gapLength -1; j++) {
                if(!itemFathersArray[j+1].childrens){
                    itemFathersArray[j+1].childrens = [];
                }
                itemFathersArray[j+1].childrens.push(itemFathersArray[j]);
            }

            this.addNode(itemFathersArray[gapLength - 1]);
        }
    }

    componentDidMount() {
    }

    render(){
        let rawData = this.props.rawData;
        //if(rawData && rawData.length > 0){
        //    let fatherTrees = util.getFatherTrees(this.props.rawData);
        //    this._transferFatherTrees(fatherTrees);
        //}
        //console.log(JSON.stringify(this.state.treeModel));
        return (<div>model</div>);
    }
}

export default TreeModel;