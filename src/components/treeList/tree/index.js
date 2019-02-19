import createG2 from 'g2-react';
import {Stat, G2} from 'g2';
import G6 from '@antv/g6';
import React, {Component} from 'react'
import style from './index.css';

class Tree extends Component {
    constructor(props) {
        super(props);

        this.state = {
            forceFit: true,
            width: 1200,
            height: 3000,
            plotCfg: {
                margin: [20, 20]
            },
        };

    }

    componentDidMount() {
        this.renderG6Tree();
    }

    renderG6Tree() {

        var data = {
            "name": "Modeling Methods",
            "children": [{
                "name": "Classification",
                "children": [{
                    "name": "Logistic regression"
                }, {
                    "name": "Linear discriminant analysis"
                }, {
                    "name": "Rules"
                }, {
                    "name": "Decision trees"
                }, {
                    "name": "Naive Bayes"
                }, {
                    "name": "K nearest neighbor"
                }, {
                    "name": "Probabilistic neural network"
                }, {
                    "name": "Support vector machine"
                }]
            }, {
                "name": "Consensus",
                "children": [{
                    "name": "Models diversity",
                    "children": [{
                        "name": "Different initializations"
                    }, {
                        "name": "Different parameter choices"
                    }, {
                        "name": "Different architectures"
                    }, {
                        "name": "Different modeling methods"
                    }, {
                        "name": "Different training sets"
                    }, {
                        "name": "Different feature sets"
                    }]
                }, {
                    "name": "Methods",
                    "children": [{
                        "name": "Classifier selection"
                    }, {
                        "name": "Classifier fusion"
                    }]
                }, {
                    "name": "Common",
                    "children": [{
                        "name": "Bagging"
                    }, {
                        "name": "Boosting"
                    }, {
                        "name": "AdaBoost"
                    }]
                }]
            }, {
                "name": "Regression",
                "children": [{
                    "name": "Multiple linear regression"
                }, {
                    "name": "Partial least squares"
                }, {
                    "name": "Multi-layer feedforward neural network"
                }, {
                    "name": "General regression neural network"
                }, {
                    "name": "Support vector regression"
                }]
            }]
        };

        G6.registerNode('treeNode', {
            anchor: [[0, 0.5], [0.5, 1]]
        });
        G6.registerEdge('VH', {
            getPath: function getPath(item) {
                var points = item.getPoints();
                var start = points[0];
                var end = points[points.length - 1];
                return [['M', start.x, start.y], ['L', start.x, end.y], ['L', end.x, end.y]];
            }
        });
        var layout = new G6.Layouts.IndentedTree({
            direction: 'LR', // 方向（LR/RL/H）
            indent: 30, // 缩进量
            getVGap: function getVGap() /* d */ {
                // 竖向间距
                return 4;
            }
        });
        var tree = new G6.Tree({
            id: 'mountNode', // 容器ID
            height: window.innerHeight, // 画布高
            layout: layout,
            fitView: 'autoZoom' // 自动缩放
        });
        tree.node({
            shape: 'treeNode',
            size: 8,
            label: function label(model) {
                if (model.children && model.children.length > 0) {
                    return {
                        text: model.name,
                        textAlign: 'right'
                    };
                }
                return {
                    text: model.name,
                    textAlign: 'left'
                };
            },
            labelOffsetX: function labelOffsetX(model) {
                if (model.children && model.children.length > 0) {
                    return -10;
                }
                return 10;
            }
        });
        tree.edge({
            shape: 'VH'
        });
        tree.read({
            roots: [data]
        });
    }


    renderG2Tree() {
        var G2 = require('g2');

        let Chart = createG2(chart => {
            // 自定义部门的图形
            G2.Shape.registShape('point', 'depart', {
                drawShape: function (cfg, group) {
                    var x = cfg.x;
                    var y = cfg.y;
                    var width = 40;
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
            edgeView.axis(true);
            edgeView.tooltip(true);
            // Stat.link 方法会生成 ..x, ..y的字段类型，数值范围是 0-1
            edgeView.edge()
                .position(Stat.link('source*target', nodes))
                .shape('vhv')
                .color('#ccc');
            // 创建节点视图
            var nodeView = chart.createView();
            nodeView.coord().reflect(); //'polar'
            nodeView.axis(false);
            // 节点的x,y范围是 0，1
            // 因为边的范围也是 0,1所以正好统一起来
            nodeView.source(nodes, {
                x: {min: 0, max: 1},
                y: {min: 0, max: 1},
                value: {min: 0}
            });
            nodeView.point().position('x*y').color('steelblue')
                .shape('depart')
                .label('name', {
                    offset: 0,
                    label: {
                        fontSize: 12, // 文本大小
                    }
                })
                .tooltip('name');

            chart.render();
        });

        return Chart;
    }


    render() {
        let Chart = this.renderG2Tree();

        return (
            <div id='treeWrapper' className={style.treeWrapper}>

                <Chart
                    data={[this.props.data]}
                    width={this.state.width}
                    height={this.state.height}
                    plotCfg={this.state.plotCfg}
                    forceFit={this.state.forceFit}/>

            </div>
        );
    }
}

export default Tree;