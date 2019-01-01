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
            resultArray: [],
            resultOneTree:{},
        };
    }

    componentDidMount() {
        fetch('http://172.19.235.213:7001/api/ft/queryTree')
            .then((response)=> {
                return response.json()
            }).then((json)=> {


                // 将数据库数据转为二维数组数据
                let fatherTrees = util.getFatherTrees(json.result);
                //console.log('fatherTrees 输出： ', fatherTrees);

                // 将二维数组（第二维是数组) 转化成二维的数组（第二维是一个直系父深度对象，实际已经是一个一维数组了)
                let reductiveTrees = util.reductFatherTrees(fatherTrees);
                //console.log('reductiveTrees 输出： ', reductiveTrees);
                //console.log('myp 输出： ', JSON.stringify(reductiveTrees[617]));

                // 将622条深度直系父关系，借助g_rank进行合并
                let oneTree = util.getOneTree(reductiveTrees);
                console.log('oneTree 输出： ', oneTree);

                this.setState({resultArray:json.result,resultOneTree: oneTree});

                //console.log('oneTree 输出： ', JSON.stringify(oneTree));
            }).catch((ex)=> {
                console.log('parsing failed', ex);
            })
    }

    render() {
        return (
            <div className="App">
                <p>family tree header</p>

                <div className="App-container">
                    <TreeList data={this.state.resultOneTree}/>

                    <InfoList data={this.state.resultArray}/>
                </div>
            </div>
        );
    }
}

export default App;
