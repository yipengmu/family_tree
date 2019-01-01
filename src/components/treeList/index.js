import React,{Component} from 'react'
import './index.css';
import { List } from 'antd';
import Tree from './tree/index.js'

class TreeList extends Component {
    render() {

        return (
            <div >
                <Tree data={this.props.data}/>
            </div>
        );
    }
}

export default TreeList;