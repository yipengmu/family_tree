import React,{Component} from 'react'
import './index.css';
import { List } from 'antd';
import 'whatwg-fetch'

class InfoList extends Component {
    render() {

        let result = this.props.data;

        return (
            <div >

                <List
                    itemLayout="horizontal"
                    locale='加载中'
                    dataSource={result}
                    bordered={true}
                    split={true}
                    renderItem={item => (
                      <List.Item className='tree-list' >
                        <span className='list-item-small' style={{width: '50px'}} >{'id：'+ item.id}</span >
                        <span className='list-item-small' >{'第：'+ item.g_rank +'代'}</span >
                        <span className='list-item-normal' >{'姓名：'+ item.name}</span >
                        <span className='list-item-small' >{'父id：'+ item.g_father_id}</span >
                        <span className='list-item-small' >{'家中排行：'+ item.rank_index}</span >
                        <span className='list-item' >{'过继关系：'+ item.adoption}</span >
                        <span className='list-item' style={{width: '140px'}}>{'功名：'+ item.official_position}</span >
                        <span className='list-item' >{'简介：'+ item.summary}</span >


                      </List.Item>
                    )}
                    />
            </div>
        );
    }
}

export default InfoList;