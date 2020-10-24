/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
/*
 * Utility functions to be used by the siddhi editor and the siddhi web worker
 */
define(["./constants"], function (constants) {

    "use strict";   // JS strict mode

    var self = {};

    /**
     * Word wrap the the string with a maxWidth for each line
     *
     * @param {string} str The string to be word wrapped
     * @param {int} maxWidth The maximum width for the lines
     * @return {string} The word wrapped string
     */
    self.wordWrap = function (str, maxWidth) {
        result = '';
        if (str !== undefined) {
            maxWidth = maxWidth || 120;
            var brk = '<br />';
            var lines = str.split('\n');
            var result = '';
            for (var i = 0; i < lines.length; i++) {
                var words = lines[i].split(/\s/g);
                var length = 0;
                for (var j = 0; j < words.length; j++) {
                    if (length + words[j].length > maxWidth) {
                        result += brk;
                        length = 0;
                    }
                    result += words[j] + ' ';
                    length += words[j].length;
                }
                if (i < lines.length - 1) {
                    result += brk;
                }
            }
        }
        return result;
    };

    /**
     * Generate description html string from meta data for processor
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {Object} metaData Meta data object containing parameters, return and description
     * @param {string} processorName Processor Name with overload params
     * @param {Object} paramOverloads Param overload array
     * @return {string} html string of the description generated from the meta data provided
     */
    self.generateDescriptionForProcessor = function (metaData, processorTypeName, processorName, paramOverloads) {
        var description = "";

        if (processorName === undefined) {
            description = "<div>" + (metaData.name ? "<strong>" + metaData.name + "</strong><br>" : "");
        } else {
            description = "<div>" + (metaData.name ? "<strong>" + processorName + "</strong><br>" : "");
        }

        if (metaData.description) {
            description +=
                metaData.description ? "<p>" + metaData.description + "</p>" : "<br>";
        }
        if (metaData.parameters) {
            if(paramOverloads === undefined) {
                description += "参数 - " + generateAttributeListDescription(metaData.parameters);
            } else {
                description += "参数 - " + generateAttributeListDescriptionForParamOverloads(metaData.parameters,
                    paramOverloads);
            }
        }

        if (metaData.returnAttributes) {
            description += "返回特性 - " + generateAttributeListDescription(metaData.returnAttributes);
        }

        if (metaData.returnEvent) {
            description += (metaData.returnEvent.length > 0 ? "Additional Attributes in " : "") +
                "返回事件" +
                (metaData.returnEvent.length > 0 ? generateAttributeListDescription(metaData.returnEvent) : "");
        }

        if (processorTypeName !== undefined) {
            var processorTypeDisplayText = constants.typeToDisplayNameMap[processorTypeName];
            if (processorTypeDisplayText !== undefined) {
                description += "类型 - " + processorTypeDisplayText;
            }
        }

        if (metaData.example) {
            description += "样例 - <br><br>" +
                "<span style='margin-left: 1em'>" + self.wordWrap(metaData.example) + "</span>";
        }
        description += "</div>";
        return description;
    };

    /**
     * Generate description html string from meta data for eval script
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {string} evalScriptName Name of the eval script for which the description is generated
     * @param {Object} metaData Meta data object containing parameters, return and description
     * @return {string} html string of the description generated from the meta data provided
     */
    self.generateDescriptionForEvalScript = function (evalScriptName, metaData) {
        return "<div><strong>执行脚本 </strong> - " + evalScriptName + "<br><ul>" +
            "<li>语言 - " + metaData.language + "</li>" +
            "<li>返回类型 - " + metaData.returnType.toUpperCase() + "</li>" +
            "<li>函数体 -" + "<br><br>" + metaData.functionBody + "</li>" +
            "</ul></div>";
    };

    /**
     * Generate description html string from stream/table meta data
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {string} type Type of the source. Should be one of ["Stream", "Event Table"]
     * @param {string} sourceName Name of the stream/table for which the description is generated
     * @param {Object} attributes attributes of the stream/table
     * @return {string} html string of the description generated from the meta data provided
     */
    self.generateDescriptionForStreamOrTable = function (type, sourceName, attributes) {
        var description = "<div><strong>" + type + "</strong> - " + sourceName + "<br>";
        if (attributes && Object.keys(attributes).length > 0) {
            description += "<ul>";
            for (var attribute in attributes) {
                if (attributes.hasOwnProperty(attribute)) {
                    description += "<li>" +
                        attribute + (
                            attributes[attribute] &&
                            attributes[attribute] != constants.dataPopulation.UNDEFINED_DATA_TYPE ?
                                " - " + attributes[attribute].toUpperCase() : ""
                        ) +
                        "</li>";
                }
            }
            description += "</ul>";
        }
        description += "</div>";
        return description;
    };

    /**
     * Generate description html string from aggregation meta data
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {string} aggregationName Name of the aggregation for which the description is generated
     * @param {Object} attributes attributes of the aggregation
     * @return {string} html string of the description generated from the meta data provided
     */
    self.generateDescriptionForAggregation = function (aggregationName, attributes) {
        var description = "<div><strong>Aggregation</strong> - " + aggregationName + "<br>";
        if (attributes && Object.keys(attributes).length > 0) {
            description += "<ul>";
            for (var attribute in attributes) {
                if (attributes.hasOwnProperty(attribute)) {
                    description += "<li>" +
                        attribute + (
                            attributes[attribute] &&
                            attributes[attribute] != constants.dataPopulation.UNDEFINED_DATA_TYPE ?
                                " - " + attributes[attribute].toUpperCase() : ""
                        ) +
                        "</li>";
                }
            }
            description += "</ul>";
        }
        description += "</div>";
        return description;
    };

    /**
     * Generate description html string from trigger meta data
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {string} triggerName Name of the trigger for which the description is generated
     * @param {string} metaData metaData of the trigger
     * @return {string} html string of the description generated from the meta data provided
     */
    self.generateDescriptionForTrigger = function (triggerName, metaData) {
        return "<div><strong>触发器</strong> - " + triggerName + "<br><br>" +
            metaData.type + " - " + metaData.time + "</div>";
    };

    /**
     * Generate description html string from window meta data
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {string} windowName Name of the window for which the description is generated
     * @param {object} metaData metaData of the window
     * @param {object} functionOperationSnippets Completion engine's function operation snippets object
     * @return {string} html string of the description generated from the meta data provided
     */
    self.generateDescriptionForWindow = function (windowName, metaData, functionOperationSnippets) {
        var description = "<div><strong>窗口</strong> - " + windowName + "<br><br>";
        if (metaData.attributes && Object.keys(metaData.attributes).length > 0) {
            description += "特性 -<ul>";
            for (var attribute in metaData.attributes) {
                if (metaData.attributes.hasOwnProperty(attribute)) {
                    description += "<li>" +
                        attribute + (metaData.attributes[attribute] ? " - " +
                            metaData.attributes[attribute].toUpperCase() : "") +
                        "</li>";
                }
            }
            description += "</ul>";
        }
        if (metaData.functionOperation) {
            description += "窗口 - " + metaData.functionOperation + "<br><br>";
        }
        if (metaData.output) {
            description += "输出 - " + metaData.output + "<br><br>";
        }
        if (metaData.functionOperation && functionOperationSnippets &&
            functionOperationSnippets.inBuilt.windowProcessors) {
            var window =
                functionOperationSnippets.inBuilt.windowProcessors[windowName];
            if (window) {
                description += "Description of the window used - <br><br>" +
                    "<div style='margin-left: 25px;'>" + window.description + "</div>";
            }
        }
        description += "</div>";
        return description;
    };

    /**
     * Generate a description html string from an attribute list
     * Descriptions are intended to be shown in the tooltips for completions
     *
     * @param {object[]} attributeList The list of attributes from which the description string is generated
     * @return {string} html string of the description generated from the attribute list provided
     */
    function generateAttributeListDescription(attributeList) {
        var description = "";
        if (attributeList.length > 0) {
            description += "<ul>";
            for (var j = 0; j < attributeList.length; j++) {
                description += "<li><b>" +
                    (attributeList[j].name ? attributeList[j].name : "特性 " + (j + 1)) + "</b>" +
                    (attributeList[j].optional ? " (可选)" : "") +
                    (attributeList[j].type.length > 0 ? " - " + attributeList[j].type.join(" | ").toUpperCase() : "") +
                    (attributeList[j].description ? " - " + attributeList[j].description : "") + "</li>";
            }
            description += "</ul><br>";
        } else {
            description += "无<br><br>";
        }

        return description;
    }

    function generateAttributeListDescriptionForParamOverloads(attributeList, paramOverloads) {
        var description = "";
        if (attributeList.length > 0 && paramOverloads.length > 0) {
            description += "<ul>";
            for (var j = 0; j < attributeList.length; j++) {
                var attributeName = attributeList[j].name;
                if(paramOverloads.includes(attributeName)) {
                    description += "<li><b>" + attributeName + "</b>" +
                        (attributeList[j].optional ? " (可选)" : "") +
                        (attributeList[j].type.length > 0 ? " - " + attributeList[j].type.join(" | ").
                        toUpperCase() : "") +
                        (attributeList[j].description ? " - " + attributeList[j].description : "") + "</li>";
                }
            }
            description += "</ul><br>";
        } else {
            description += "无<br><br>";
        }

        return description;
    }

    return self;
});