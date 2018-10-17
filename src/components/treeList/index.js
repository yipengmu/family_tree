import React,{Component} from 'react'
import styles from './index.css';
import { List } from 'antd';
import 'whatwg-fetch'

class TreeList extends Component {
    render() {

        let result = this.props.result;

        console.log('## render json', JSON.stringify(result));
        return (
            <div className={styles['tree-list']}>

                <List
                    itemLayout="horizontal"
                    dataSource={result}
                    renderItem={item => (
                      <List.Item>
                      {item.name}
                      </List.Item>
                    )}
                    />
            </div>
        );
    }
}

export default TreeList;