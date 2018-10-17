import React, { Component } from 'react';
import './App.css';
import TreeList from './components/treeList/index.js'

import 'whatwg-fetch'

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            result: {},
        };
    }

    componentDidMount() {
        fetch('http://localhost:7002/api/ft/queryTree')
            .then((response)=> {
                return response.json()
            }).then((json)=> {
                this.setState({result:json.result});
                console.log('parsed json', json.result);
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
                </div>
            </div>
        );
    }
}

export default App;
