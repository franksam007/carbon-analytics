/*
* Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
*
*  WSO2 Inc. licenses this file to you under the Apache License,
* Version 2.0 (the "License"); you may not use this file except
* in compliance with the License.
* You may obtain a copy of the License at
*
*       http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied. See the License for the
* specific language governing permissions and limitations
* under the License.
*/

define(['require', 'jquery', 'lodash', 'log'],

function (require, $, _, log) {

        var getGenericDataType = function (data_type) {
            switch (data_type) {
                case 'string':
                    return 'text';
                case 'bool':
                    return 'bool';
                case 'int':
                case 'long':
                case 'float':
                case 'double':
                    return 'number';
            }
        }

        var OperatorMap = {
            is_null: {
                returnTypes: ['bool'],
                leftTypes: ['text'],
                rightTypes: ['bool'],
                hasLeft: true,
                hasRight: false,
                symbol: 'IS NULL',
                description: '空值检查',
                isFirst: false,
                isEnd: true
            },
            not: {
                returnTypes: ['bool'],
                leftTypes: ['bool'],
                rightTypes: ['bool', 'text', 'number'],
                hasLeft: false,
                hasRight: true,
                symbol: 'NOT',
                description: '逻辑非',
                isFirst: true
            },
            multiply: {
                returnTypes: ['number'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '*',
                hasLeft: true,
                hasRight: true,
                description: '乘',
                isFirst: false
            },
            divide: {
                returnTypes: ['number'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '/',
                hasLeft: true,
                hasRight: true,
                description: '除',
                isFirst: false
            },
            modulo: {
                returnTypes: ['number'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '%',
                hasLeft: true,
                hasRight: true,
                description: '取模',
                isFirst: false
            },
            addition: {
                returnTypes: ['number'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '+',
                hasLeft: true,
                hasRight: true,
                description: '加',
                isFirst: false
            },
            subtraction: {
                returnTypes: ['number'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '-',
                hasLeft: true,
                hasRight: true,
                description: '减',
                isFirst: false
            },
            less_than: {
                returnTypes: ['bool'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '<',
                hasLeft: true,
                hasRight: true,
                description: '小于',
                isFirst: false
            },
            less_than_equal: {
                returnTypes: ['bool'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '<=',
                hasLeft: true,
                hasRight: true,
                description: '小于等于',
                isFirst: false
            },
            greater_than: {
                returnTypes: ['bool'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '>',
                hasLeft: true,
                hasRight: true,
                description: '大于',
                isFirst: false
            },
            greater_than_equal: {
                returnTypes: ['bool'],
                leftTypes: ['number'],
                rightTypes: ['number'],
                symbol: '>=',
                hasLeft: true,
                hasRight: true,
                description: '大于等于',
                isFirst: false
            },
            equal: {
                returnTypes: ['bool'],
                leftTypes: ['text', 'number'],
                rightTypes: ['text', 'number'],
                symbol: '==',
                hasLeft: true,
                hasRight: true,
                description: '等于',
                isFirst: false
            },
            not_equal: {
                returnTypes: ['bool'],
                leftTypes: ['text', 'number'],
                rightTypes: ['text', 'number'],
                symbol: '!=',
                hasLeft: true,
                hasRight: true,
                description: '不等于',
                isFirst: false
            },
            and: {
                returnTypes: ['bool'],
                leftTypes: ['text', 'number', 'bool'],
                rightTypes: ['text', 'number', 'bool'],
                symbol: 'AND',
                hasLeft: true,
                hasRight: true,
                description: '逻辑与',
                isFirst: false
            },
            or: {
                returnTypes: ['bool'],
                leftTypes: ['text', 'number', 'bool'],
                rightTypes: ['text', 'number', 'bool'],
                symbol: 'OR',
                hasLeft: true,
                hasRight: true,
                description: '逻辑或',
                isFirst: false
            }
        };

        var generateExpressionHTML = function (node, id, highlightCoordinate) {
            var htmlContent = '';
            switch (node.type) {
                case 'attribute':
                    htmlContent += node.name;
                    break;
                case 'customValue':
                    node.genericReturnTypes.indexOf('text') > -1 ?
                        htmlContent += `"${node.value}"`
                        : htmlContent += node.value
                    break;
                case 'operator':
                    if (node.hasLeft) {
                        node.leftNode ? htmlContent += generateExpressionHTML(node.leftNode, `${id}-l`, highlightCoordinate) : '...'
                    }
                    htmlContent += ` ${node.symbol} `
                    if (node.hasRight) {
                        node.rightNode ? htmlContent += generateExpressionHTML(node.rightNode, `${id}-r`, highlightCoordinate) : '...'
                    }
                    break;
                case 'function':
                    htmlContent += `${id.length > 0 ? `<span class="${id.substr(1)===highlightCoordinate ? 'selected' : ''}" id="item${id}">`: ''}${node.displayName.slice(0, -1)}`;
                    var isFirst = true;
                    node.parameters.forEach(function (param, i) {
                        if (!isFirst) {
                            htmlContent += ', '
                        }
                        htmlContent += `<span class="${param.rootNode ? 'ok-clear': ''} ${`${i}` === highlightCoordinate ? 'selected' : ''}" title="${param.placeholder}" id="item${id}-${i}" >${generateExpressionHTML(param, `${id}-${i}`, highlightCoordinate)}</span>`

                        isFirst = false;
                    })
                    if (node.allowRepetitiveParameters) {
                        htmlContent += `<span title="Add parameter" style="display: none;" class="add-param"><i style="font-size: 1.3rem; padding-left: 1rem;" class="fw fw-import"></i></span>`
                    }
                    htmlContent += `)${id.length > 0 ? `</span>`: ''}`;
                    break;
                case 'scope':
                    var idComponents = id.split('-');
                    if (id.length === 0 || /\d/.test(idComponents[idComponents.length-1])) {
                        htmlContent += `${node.rootNode ? generateExpressionHTML(node.rootNode, '-n', highlightCoordinate) : '...'}`
                    } else {
                        htmlContent += `
                            <span class="${id.substr(1)===highlightCoordinate ? 'selected' : ''}" id="item${id}" >
                                (&nbsp;${node.rootNode? generateExpressionHTML(node.rootNode, `${id}-n`, highlightCoordinate) : '...'}&nbsp;)
                            </span>`;
                    }
                    break;
            }

            return htmlContent.length === 0 ? '...' : htmlContent;
        }

        var validateExpressionTree = function (expression) {
            var errorsFound = 0;
            validateLevel(expression);

            function validateLevel(expression) {
                if (expression.nodeType === 'scope') {

                    if (expression.children.length === 0) {
                        errorsFound++;
                    }

                    if (expression.children.length > 0 &&
                        expression.children[expression.children.length - 1].nodeType === 'operator' &&
                        !(expression.children[expression.children.length - 1].isEnd)) {

                        errorsFound++;
                    }

                    expression.children.forEach(function (childNode) {
                        validateLevel(childNode);
                    });

                } else if (expression.nodeType === 'function') {
                    expression.parameters.forEach(function (parameter) {
                        validateLevel(parameter);
                    })
                }
            }

            return errorsFound === 0;
        }

        return { getGenericDataType, OperatorMap, generateExpressionHTML, validateExpressionTree };
    });
