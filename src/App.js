import React, { Component } from 'react';
import './App.css';
import TreeList from './components/treeList/index.js'
import InfoList from './components/infoList/index.js'
import util from './common/util.js'
import 'whatwg-fetch'

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            result: {},
        };
    }

    componentDidMount() {
        fetch('http://localhost:7001/api/ft/queryTree')
            .then((response)=> {
                return response.json()
            }).then((json)=> {
                this.setState({result:json.result});
                //console.log('原始数据 parsed json', JSON.stringify(json.result));
                //let fatherTree = util.getFatherTree(545,json.result,[]);

                // 将数据库数据转为二维数组数据
                let fatherTrees = util.getFatherTrees(json.result);
                //console.log('fatherTrees 输出： ', fatherTrees);

                // 将二维数组（第二维是数组) 转化成二维的数组（第二维是一个直系父深度对象，实际已经是一个一维数组了)
                let reductiveTrees = util.reductFatherTrees(fatherTrees);
                console.log('reductiveTrees 输出： ', reductiveTrees);
                console.log('myp 输出： ', JSON.stringify(reductiveTrees[617]));
                //console.log('600 输出： ', JSON.stringify(reductiveTrees[600]));

                // 将622条深度直系父关系，借助g_rank进行合并
                let oneTree = util.getOneTree(reductiveTrees);
                console.log('oneTree 输出： ', oneTree);

                //  将二维的各id的父节点数组组合 转为为 1维的 各id的父节点json对象组合
                //let transferFatherTrees = util.transferFatherTrees(fatherTrees);
                //console.log('transferFatherTrees 输出： ', transferFatherTrees);
                //console.log('transferFatherTrees 输出： ', JSON.stringify(transferFatherTrees));

                //let fatherTreesJson = util.getFatherTreesJson(fatherTrees);
                //console.log('fatherTrees 数组长度为： ', fatherTrees.length);
                //console.log('fatherTrees 输出 ', JSON.stringify(fatherTrees));
                //console.log('fatherTreesJson 输出 ', fatherTreesJson);

            }).catch((ex)=> {
                console.log('parsing failed', ex);
            })
    }

    render() {
        return (
            <div className="App">
                <p>family tree header</p>

                <div className="App-container">
                    <TreeList result={this.state.result}/>

                    <InfoList result={this.state.result}/>
                </div>
            </div>
        );
    }
}

export default App;
