import React,{Component} from 'react'
import './index.css';
import { List } from 'antd';
import Tree from './tree/index.js'

class TreeList extends Component {
    render() {

        let result = this.props.result;

        return (
            <div >
                <Tree result={result}/>
            </div>
        );
    }
}

export default TreeList;