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

                let fatherTree = util.getFatherTrees(json.result);
                console.log('fatherTrees 输出 ', JSON.stringify(fatherTree));
                //console.log('json build = '+ JSON.stringify(util.getJsonFromDBResult(0,{},json.result)));
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
