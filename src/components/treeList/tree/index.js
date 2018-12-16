import createG2 from 'g2-react';
import { Stat ,G2} from 'g2';
import TreeModel from '../treeModel/index.js'
import React,{Component} from 'react'

class Tree extends Component{
    constructor(props) {
        super(props);
        this.state = {
            data: [{"name":"总经理","childrens":[{"name":"运营总监","childrens":[{"name":"职能总监","childrens":[{"name":"人事部"},{"name":"行政部"},{"name":"财务部"}]},{"name":"服务总监","childrens":[{"name":"技术部"},{"name":"客服部"},{"name":"售后部"}]},{"name":"市场总监","childrens":[{"name":"企划部"},{"name":"推广部"},{"name":"广告部"},{"name":"公关部"}]}]}]}],
            forceFit: true,
            width: 500,
            height: 450,
            plotCfg: {
                margin: [20, 50]
            },
        };
    }


    render() {
        var G2 = require('g2');

        let Chart = createG2(chart => {
            // 自定义部门的图形
            G2.Shape.registShape('point', 'depart', {
                drawShape: function(cfg, group) {
                    var x = cfg.x;
                    var y = cfg.y;
                    var width = 44;
                    var height = 20;
                    var shape = group.addShape('rect', {
                        attrs: {
                            x: x - width / 2,
                            y: y - height / 2,
                            width: width,
                            height: height,
                            fill: '#fff',
                            stroke: 'black'
                        }
                    });
                    return shape;
                }
            });
            var Layout = G2.Layout;
            var Stat = G2.Stat;
            chart.animate(false);
            // 不显示title
            chart.tooltip({
                title: null
            });
            // 不显示图例
            chart.legend(false);
            var data = chart.get('data');
            data = data.toJSON();
            // 使用layout，用户可以自己编写自己的layout
            // 仅约定输出的节点 存在 id,x，y字段即可
            var layout = new Layout.Tree({
                nodes: data,
                dx: 80 / 1000 // 单位宽度，由于按照宽高 1来计算的，所以需要传入比例值
            });
            var nodes = layout.getNodes();
            var edges = layout.getEdges();
            // 首先绘制 edges，点要在边的上面
            // 创建单独的视图
            var edgeView = chart.createView();
            edgeView.source(edges);
            edgeView.coord().reflect(); //
            edgeView.axis(false);
            edgeView.tooltip(false);
            // Stat.link 方法会生成 ..x, ..y的字段类型，数值范围是 0-1
            edgeView.edge()
                .position(Stat.link('source*target',nodes))
                .shape('vhv')
                .color('#ccc');
            // 创建节点视图
            var nodeView = chart.createView();
            nodeView.coord().reflect(); //'polar'
            nodeView.axis(false);
            // 节点的x,y范围是 0，1
            // 因为边的范围也是 0,1所以正好统一起来
            nodeView.source(nodes, {
                x: {min: 0,max:1},
                y: {min: 0, max:1},
                value: {min: 0}
            });
            nodeView.point().position('x*y').color('steelblue')
                .shape('depart')
                .label('name', {
                    offset: 0
                })
                .tooltip('name');
            chart.render();
        });

        return (
            <div>
                <TreeModel rawData={this.props.result}/>
                <Chart
                    data={this.state.data}
                    width={this.state.width}
                    height={this.state.height}
                    plotCfg={this.state.plotCfg}
                    forceFit={this.state.forceFit} />
            </div>
        );
    }
}

export default Tree;