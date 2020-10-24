/*
 *
 *  * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *  *
 *  * WSO2 Inc. licenses this file to you under the Apache License,
 *  * Version 2.0 (the "License"); you may not use this file except
 *  * in compliance with the License.
 *  * You may obtain a copy of the License at
 *  *
 *  *     http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing,
 *  * software distributed under the License is distributed on an
 *  * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  * KIND, either express or implied. See the License for the
 *  * specific language governing permissions and limitations
 *  * under the License.
 *
 */
define(['require', 'jquery', 'lodash', 'log', 'smart_wizard', 'app/source-editor/completion-engine', 'alerts', 'inputOutputMapper', 'inputOptionConfigurator', 'dataMapper', 'outputConfigurator', 'handlebar', 'etlWizardUtil', 'dataMapperUtil'],

    function (require, $, _, log, smartWizard, CompletionEngine, Alerts, InputOutputMapper, InputOptionConfigurator, DataMapper, OutputConfigurator, Handlebars, etlWizardUtil, DataMapperUtil) {

        /**
         * Constants used by the wizard
         */
        const constants = {
            CLASS_WIZARD_MODAL_HEADER: '.header-content',
            CLASS_WIZARD_MODAL_BODY: '.body-content',
            CLASS_WIZARD_MODAL_FOOTER: '.footer-content',
            ID_ETL_WIZARD_BODY: '#ETLWizardForm',
            SERVER_URL: window.location.protocol + "//" + window.location.host + "/editor/",
            SOURCE_TYPE: 'source',
            SINK_TYPE: 'sink',
            SUPPORTED_DATA_TYPES: ['INT', 'LONG', 'FLOAT', 'DOUBLE', 'STRING', 'BOOL'],
            commands: {
                EXPORT_FOR_DOCKER: 'export-for-docker',
                EXPORT_FOR_KUBERNETES: 'export-for-kubernetes',
                DEPLOY_TO_SERVER: 'deploy-to-server',
                TOGGLE_EVENT_SIMULATOR: 'toggle-event-simulator'
            }
        };

        var templates = {
            finalizeStep: Handlebars.compile($('#etl-wizard-finalize-template').html())
        };

        var loadExtensionData = function(response, status, jqXHR) {
            this.__expressionData = response;
        }

        var handleStreamGenerationResponse = function(streamDef) {
            if (streamDef.tagName != null) {
                this.__propertyMap.output.stream.name = streamDef.tableName;
                this.__propertyMap.output.stream.attributes = streamDef.attributes;
            }else {
                this.__propertyMap.input.stream.attributes = streamDef.attributes;
            }
            this.render();
        };

        var ETLWizard = function (initOpts) {
            var self = this;
            this.__options = initOpts;
            this.__app = initOpts.application;
            this.__tab = initOpts.application.tabController.getActiveTab();
            this.__$parent_el_container = $(initOpts.container);
            this.__expressionData = null;
            this.__previousSchemaDef = undefined;
            this.__resetSchema = false;
            this.__parentDimension = {
                height: 0,
                width: 0
            }

            this.__saved = null;

            //object structure used to store data
            this.__propertyMap = generateUIDataModel(initOpts.dataModel);
            this.__stepIndex = 1;
            this.__substep = 0;

            this.loadExtensionData = loadExtensionData.bind(this);
            this.handleStreamGenerationResponse = handleStreamGenerationResponse.bind(this);
            this.generateUIDataModel = generateUIDataModel.bind(this);
            CompletionEngine.loadMetaData(this.loadExtensionData,
                () => {console.error("Error occurred when trying to load extension data")});

            // Extension data loading does an async request therefore it is required to wait before proceeding with the
            // rendering
            var checkreadyToRender = function () {
                if(self.__expressionData) {
                    self.__propertyMap = self.generateUIDataModel(self.__options.dataModel);
                    if (self.__propertyMap.appName.length === 0) {
                        self.__propertyMap.appName = 'UntitledETLTaskFlow';
                    }
                    self.__parentWizardForm = self.constructWizardHTMLElements($('#ETLWizardForm').clone());
                    self.render();
                } else {
                    setTimeout(checkreadyToRender, 200);
                }
            }

            checkreadyToRender();
        };

        //Constructor for the ETLWizard
        ETLWizard.prototype.constructor = ETLWizard;

        // handle schema changes
        ETLWizard.prototype.handleSchemaChange = function(typeOfSchema, wizardObj, config) {
            var self = this;
            var newSchemaDef = typeOfSchema === constants.SOURCE_TYPE ?
                                self.__propertyMap.input.stream.attributes:
                                self.__propertyMap.output.stream.attributes;

            wizardObj.find('.next-btn').popover({
                html: true,
                content: function () {
                    return '<div>' +
                        'Schema change detected this will reset the subsequent mappings generated using the ' +
                        'schema do you wish to proceed with changes?' +
                        '</div>' +
                        '<div>' +
                        '    <button class="popover-confirm-proceed" >Yes</button>' +
                        '    <button class="popover-confirm-cancel" >No</button>' +
                        '    <button class="popover-btn-reset" >Reset</button>' +
                        '</div>';
                },
                template: '<div class="popover" role="tooltip"><div class="arrow"></div>' +
                    '<div class="popover-content" style="display: flex; flex-direction: column"></div></div>',
                placement: 'top',
            });

            if(self.__previousSchemaDef && self.__previousSchemaDef.length > 0 && !_.isEqual(self.__previousSchemaDef, newSchemaDef)) {

                wizardObj.find('.next-btn').popover('show');
                wizardObj.find(`#${wizardObj.find('.next-btn').attr('aria-describedby')} .popover-confirm-proceed`)
                    .on('click', function (e) {
                        e.stopPropagation();
                        if(typeOfSchema === constants.SOURCE_TYPE) {
                            self.__propertyMap.input.mapping.attributes = {};
                            self.__propertyMap.input.mapping.samplePayload = "";
                            self.__propertyMap.query.mapping = {};
                            self.__propertyMap.query.filter = {};
                        } else {
                            self.__propertyMap.output.mapping.attributes = {};
                            self.__propertyMap.output.mapping.samplePayload = "";
                            self.__propertyMap.output.mapping.payload = "";
                            self.__propertyMap.query.groupby = {
                                attributes: [],
                                havingFilter: {}
                            };
                            self.__propertyMap.query.orderby.attributes = [];
                        }

                        wizardObj.find('.next-btn').popover('hide');
                        self.__previousSchemaDef = undefined;
                        self.incrementStep(wizardObj);
                    });
                wizardObj.find(`#${wizardObj.find('.next-btn').attr('aria-describedby')} .popover-confirm-cancel`)
                    .on('click', function (e) {
                        e.stopPropagation();
                        wizardObj.find('.next-btn').popover('hide');
                    });
                wizardObj.find(`#${wizardObj.find('.next-btn').attr('aria-describedby')} .popover-btn-reset`)
                    .on('click', function (e) {
                        e.stopPropagation();
                        wizardObj.find('.next-btn').popover('hide');
                        self.__resetSchema = true;
                        self.render();
                    });
            } else {
                self.__previousSchemaDef = undefined;
                self.incrementStep(wizardObj);
            }
        }

        //Construct and return wizard skeleton
        ETLWizard.prototype.constructWizardHTMLElements = function (wizardObj) {
            var self = this;
            var wizardHeaderContent = wizardObj.find(constants.CLASS_WIZARD_MODAL_HEADER);
            var wizardFooterContent = wizardObj.find(constants.CLASS_WIZARD_MODAL_FOOTER);
            var stepIndex = self.__stepIndex;

            wizardHeaderContent.find('input.etl-flow-name').val(self.__propertyMap.appName);
            self.__tab.getHeader().setText(self.__propertyMap.appName);

            wizardObj.find(`#step-${stepIndex}`).addClass('selected');

            wizardObj.find('.next-btn').on('click', function (evt) {
                switch (self.__stepIndex) {
                    case 1:
                        switch (self.__substep) {
                            case 0:
                                if (etlWizardUtil.isSourceSinkConfigValid(self.__propertyMap.input.source)) {
                                    self.incrementStep(wizardObj);
                                } else {
                                    Alerts.error('Invalid source configuration please check the all the values ' +
                                        'are defined properly');
                                }
                                break;
                            case 1:
                                if(etlWizardUtil.isStreamDefValid(self.__propertyMap.input.stream)) {
                                    self.handleSchemaChange(constants.SOURCE_TYPE, wizardObj, self.__propertyMap);
                                } else {
                                    Alerts.error('Invalid source configuration please check the all the properties ' +
                                        'are defined properly');
                                }
                                break;
                            case 2:
                                if(etlWizardUtil.isInputMappingValid(self.__propertyMap.input)) {
                                    self.incrementStep(wizardObj);
                                } else {
                                    Alerts.error('Invalid source mapping configuration please check the ' +
                                        'mapping configuration');
                                }
                                break;
                        }
                        break;
                    case 2:
                        if(etlWizardUtil.areInputOptionsValid(self.__propertyMap.query)) {
                            self.incrementStep(wizardObj);
                        } else {
                            Alerts.error('Invalid input option configuration please check the mapping configuration');
                        }
                        break;
                    case 3:
                        switch (self.__substep) {
                            case 0:
                                if (etlWizardUtil.isSourceSinkConfigValid(self.__propertyMap.output.sink)) {
                                    self.incrementStep(wizardObj);
                                } else {
                                    Alerts.error('Invalid sink configuration please check the all the values are ' +
                                        'defined properly');
                                }
                                break;
                            case 1:
                                if(etlWizardUtil.isStreamDefValid(self.__propertyMap.output.stream)) {
                                    self.handleSchemaChange(constants.SOURCE_TYPE, wizardObj, self.__propertyMap);
                                } else {
                                    Alerts.error('Invalid stream definition please check the all the properties are' +
                                        ' defined properly');
                                }
                                break;
                            case 2:
                                if(etlWizardUtil.isOutputMappingValid(self.__propertyMap.output)) {
                                    self.incrementStep(wizardObj);
                                } else {
                                    Alerts.error('Invalid sink mapping configuration please check the mapping' +
                                        ' configuration');
                                }
                                break;
                        }

                        if(self.__substep === 2 && self.__propertyMap.output.isStore) {
                            self.incrementStep(wizardObj);
                        }
                        break;
                    case 4:
                        if(etlWizardUtil.validateGroupBy(self.__propertyMap.query.groupby)
                            && etlWizardUtil.validateAdvancedOutputOptions(self.__propertyMap.query.advanced)) {
                            self.incrementStep(wizardObj);
                        } else {
                            Alerts.error('Please recheck the output options before submitting');
                        }
                        break;
                    case 5:
                        if(etlWizardUtil.validateDataMapping(self.__propertyMap)) {
                            self.incrementStep(wizardObj);
                        } else {
                            Alerts.error('Please perform the attribute mapping for all the output attributes');
                        }
                        break;
                }
            });

            wizardObj.find('.back-btn').on('click', function () {
                switch (stepIndex) {
                    case 1:
                        self.decrementStep(wizardObj);
                        break;
                    case 2:
                        self.decrementStep(wizardObj);
                        break;
                    case 3:
                        self.decrementStep(wizardObj);
                        break;
                    case 4:
                        self.decrementStep(wizardObj);
                        break;
                    case 5:
                        self.decrementStep(wizardObj);
                        break;
                }
            });

            wizardObj.find('.save-btn').on('click', function () {
                var dataModel = generateSourceGenDataModel(self.__propertyMap);
                var result  = self.__saved = saveSiddhiApp(dataModel);

                if (result.status) {
                    self.__options.application.commandManager.dispatch("open-folder", "workspace");
                    self.__options.application.workspaceManager.updateMenuItems();
                    self.__options.application.commandManager.dispatch('remove-unwanted-streams-single-simulation', self.__propertyMap.appName);
                }

                wizardObj.find(`#step-${self.__stepIndex++}`).removeClass('selected');
                wizardObj.find(`#step-${self.__stepIndex}`).addClass('selected');
                self.render(result);
            });

            wizardFooterContent.find('.close-btn').on('click', (evt) => {
                self.__options.application.tabController
                    .removeTab(self.__options.application.tabController.getActiveTab());
            });

            wizardHeaderContent.find('.etl-flow-name')
                .on('keyup', _.debounce(function (evt) {
                    self.__propertyMap.appName = $(evt.currentTarget).val();
                    self.__tab.getHeader().setText(self.__propertyMap.appName);
                }, 100, {}))
                .on('focusout', function (evt) {
                    var appName = $(evt.currentTarget).val();
                    if (!(appName.length > 0 && self.__propertyMap.appName.length > 0)) {
                        self.__propertyMap.appName = 'UntitledETLTaskFlow';
                        self.__tab.getHeader().setText(self.__propertyMap.appName);
                        $(evt.currentTarget).val(self.__propertyMap.appName);
                    }
                });

            return wizardObj;
        };

        ETLWizard.prototype.incrementStep = function (wizardObj) {
            var self = this;
            if (self.__stepIndex < 6) {
                if ((self.__stepIndex === 1 || self.__stepIndex===3) && self.__substep < 2) {
                    self.__substep++;
                } else {
                    wizardObj.find(`#step-${self.__stepIndex++}`).removeClass('selected');
                    wizardObj.find(`#step-${self.__stepIndex}`).addClass('selected');
                    self.__substep = 0;
                }

                self.render();
            }
        }

        ETLWizard.prototype.decrementStep = function (wizardObj) {
            var self = this;
            if (self.__stepIndex > 0) {
                if ((self.__stepIndex == 1 || self.__stepIndex == 3) && self.__substep > 0) {
                    self.__substep--;
                } else {
                    wizardObj.find(`#step-${self.__stepIndex--}`).removeClass('selected');
                    wizardObj.find(`#step-${self.__stepIndex}`).addClass('selected');
                    self.__substep = 0;
                }

                self.render();
            }
        }

        ETLWizard.prototype.render = function (viewData) {
            var self = this;
            var etlWizardContainer = this.__$parent_el_container.find(_.get(this.__options, 'etl_wizard.container'));
            var canvasContainer = this.__$parent_el_container.find(_.get(this.__options, 'canvas.container'));
            var sourceContainer = this.__$parent_el_container.find(_.get(this.__options, 'source.container'));
            var designContainer = this.__$parent_el_container.find(_.get(this.__options, 'design_view.container'));
            var previewContainer = this.__$parent_el_container.find(_.get(this.__options, 'preview.container'));
            var toggleControlsContainer = this.__$parent_el_container.find('.toggle-controls-container');
            var wizardBodyContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_BODY);
            var wizardHeaderContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_HEADER);

            this.__parentWizardForm.find('.next-btn').popover('destroy');
            var wizardFooterContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_FOOTER);
            etlWizardContainer.append(this.__parentWizardForm);

            canvasContainer.addClass('hide-div');
            previewContainer.addClass('hide-div');
            designContainer.addClass('hide-div');
            sourceContainer.addClass('hide-div');
            toggleControlsContainer.addClass('hide');
            etlWizardContainer.addClass('etl-wizard-view-enabled');

            if (!self.__expressionData) {
                CompletionEngine.loadMetaData(this.loadExtensionData,
                    () => {console.error('Error occurred when trying to connect to the server')});
            }

            if(self.__resetSchema) {
                if(this.__stepIndex === 1) {
                    this.__propertyMap.input.stream.attributes = _.cloneDeep(self.__previousSchemaDef);
                } else if(this.__stepIndex === 2) {
                    this.__propertyMap.output.stream.attributes = _.cloneDeep(self.__previousSchemaDef);
                }
                self.__resetSchema = false;
            }

            if(!this.__previousSchemaDef && this.__stepIndex === 1) {
                this.__previousSchemaDef = _.cloneDeep(this.__propertyMap.input.stream.attributes);
            }

            if(!this.__previousSchemaDef && this.__stepIndex === 2) {
                this.__previousSchemaDef = _.cloneDeep(this.__propertyMap.output.stream.attributes);
            }

            wizardBodyContent.empty();

            switch (this.__stepIndex) {
                case 1:
                    this.renderSourceSinkConfigurator(constants.SOURCE_TYPE);
                    this.renderSchemaConfigurator(constants.SOURCE_TYPE);
                    this.renderInputOutputMapper(constants.SOURCE_TYPE);
                    break;
                case 2:
                    var inputOptionConfigurator = new InputOptionConfigurator(wizardBodyContent, self.__propertyMap);
                    inputOptionConfigurator.render();
                    break;
                case 3:
                    this.renderSourceSinkConfigurator(constants.SINK_TYPE);
                    this.renderSchemaConfigurator(constants.SINK_TYPE);
                    this.renderInputOutputMapper(constants.SINK_TYPE);
                    break;
                case 4:
                    var outputConfigurator = new OutputConfigurator(wizardBodyContent, self.__propertyMap);
                    outputConfigurator.render();
                    break;
                case 5:
                    this.__saved = null;
                    var dataMapperContainer = self.__$parent_el_container.find('.etl-task-wizard-container').clone();
                    wizardBodyContent.append(dataMapperContainer);
                    new DataMapper(dataMapperContainer, self.__propertyMap);
                    break;
                case 6:
                    wizardBodyContent.empty();
                    this.renderFinalize(viewData);
                    break;
            }

            if(this.__stepIndex === 1 || this.__stepIndex === 3) {
                var containers = wizardBodyContent.find('.content-section');
                for (let i = 0; i < containers.length; i++) {
                    if(i!==this.__substep) {
                        var offsetLeft = wizardBodyContent.find('.content-section')[i].offsetLeft;
                        var offsetTop = wizardBodyContent.find('.content-section')[i].offsetTop;
                        var minWidth = $(wizardBodyContent.find('.content-section')[i]).width();
                        var minHeight = $(wizardBodyContent.find('.content-section')[i]).height();

                        wizardBodyContent.append(`
                            <div style="position: absolute; top: ${offsetTop-15}; left: ${offsetLeft-15}; 
                            width: ${minWidth+30}; height: ${minHeight+30}; background-color: rgba(0,0,0,0.5)">
                            
                            </div>`);
                    }
                }
            }

            updateButtonBar(wizardFooterContent, this.__stepIndex, this.__substep);
            updateHeaderTextField(wizardHeaderContent, this.__stepIndex);

            // handle parent container resizing
            var observer = new ResizeObserver(_.debounce((e) => {
                if(_.isEqual(self.__app.tabController.getActiveTab(), self.__tab)) {
                    if (self.__parentDimension.height === 0 && self.__parentDimension.width === 0) {
                        self.__parentDimension.height = e[0].contentRect.height;
                        self.__parentDimension.width = e[0].contentRect.width
                        self.render(self.__saved);
                    }

                    if(e[0].contentRect.height !== self.__parentDimension.height
                        || e[0].contentRect.width !== self.__parentDimension.width) {
                        self.__parentDimension.height = e[0].contentRect.height;
                        self.__parentDimension.width = e[0].contentRect.width
                        self.render(self.__saved);
                    }
                }
            }, 300, {}));
            observer.observe(self.__$parent_el_container[0]);
        };

        ETLWizard.prototype.renderSourceSinkConfigurator = function (type) {
            var self = this;
            var isStore = this.__propertyMap.output.isStore;
            var config = type === constants.SOURCE_TYPE ?
                this.__propertyMap.input.source : this.__propertyMap.output.sink;
            var wizardBodyContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_BODY);
            var extensionData = constants.SOURCE_TYPE === type ?
                this.__expressionData.extensions.source.sources :
                isStore?
                    this.__expressionData.extensions.store.stores
                    : this.__expressionData.extensions.sink.sinks;
            var selectedExtension = null;

            var logIndex = extensionData
                            .map(function(extension) {
                                return extension.name;
                            }).indexOf('log');

            if(logIndex > -1) {
                extensionData.splice(logIndex, 1);
            }

            wizardBodyContent.append(`
                <div style="max-height: ${wizardBodyContent[0].offsetHeight}; overflow: auto" class="content-section">
                    <div style="font-size: 1.8rem">
                        传输属性<br/>
                        <small style="font-size: 1.3rem">
                            配置${type === constants.SOURCE_TYPE ? '数据源' : isStore ? '数据存储' : '数据汇'}
                        </small>
                    </div>
                    ${
                        type !== constants.SOURCE_TYPE ?
                            `<div style="display: flex; padding-top:15px">
                                <div class="extension-option" style="display: flex">
                                    <div style="">
                                        <input class="extension-type" type="radio" id="enableSink" name="extensionOption" 
                                            value="sinkOption">
                                        <label for="enableSink">使用数据汇</label><br>
                                    </div>
                                    <div style="margin-left: 15px">
                                        <input class="extension-type" type="radio" id="enableStore" name="extensionOption" 
                                            value="storeOption" >
                                        <label for="enableStore">使用数据存储库</label><br>
                                    </div>
                                </div>
                            </div>` : ''
                    }
                    ${
                        type !== constants.SOURCE_TYPE && !isStore ?
                            `<div style="display: flex; padding-top:15px">
                                <div style="padding-top: 5px">
                                    存储映射错误
                                </div>
                                <div style="margin-left: 15px">
                                    <div id="btn-group-enable-on-error" class="btn-group btn-group-toggle" 
                                        data-toggle="buttons">
                                        <label class="btn" 
                                                style="${
                                                    config.addOnError ?
                                                        "background-color: rgb(91,203,92); color: white;"
                                                        : "background-color: rgb(100,109,118); color: white;"}" 
                                         >
                                            <input type="radio" name="options" id="enable" autocomplete="off"> 
                                            <i class="fw fw-check"></i>
                                        </label>
                                        <label class="btn" 
                                                style="${
                                                    !config.addOnError ?
                                                        "background-color: red; color: white;"
                                                        : "background-color: rgb(100,109,118); color: white;"}" 
                                        >
                                            <input type="radio" name="options" id="disable" autocomplete="off"> 
                                            <i class="fw fw-cancel"></i>
                                        </label>
                                    </div>
                                </div>
                            </div>` : ''
                    }
                    <div style="padding-top: 10px">
                        <div>
                            <label for="extension-type">
                                ${type === constants.SOURCE_TYPE ? '数据源' : isStore ? '数据存储' : '数据汇'}类型
                            </label>
                            <select name="extension-type" id="extension-type">
                                <option disabled selected value> -- 选择一个选项 -- </option>
                            </select>
                        </div>

                        ${
                            config.type.length > 0 ?
                                `
                                    <div style="padding-top: 15px" class="extension-properties">
                                        <div>
                                          ${type === constants.SOURCE_TYPE ? '数据源' 
                                                                            : isStore ? '数据存储' : '数据汇'}属性:
                                            <button style="background-color: #ee6719" 
                                                class="btn btn-default btn-circle" id="btn-add-transport-property" 
                                                type="button" data-toggle="dropdown"
                                            >
                                                <i class="fw fw-add"></i>
                                            </button>
                                            <div id="extension-options-dropdown" class="dropdown-menu-style hidden" 
                                                aria-labelledby="">
                                            </div>
                                        </div>
                                        <div style="" class="options">
                                        </div>
                                    </div>
                                ` : ''
                        }
                    </div>
                </div>
            `);

            wizardBodyContent.find('#btn-group-enable-on-error .btn').on('click', function(evt) {
                config.addOnError = !config.addOnError;
                self.render();
            });

            if (self.__propertyMap.output.isStore) {
                wizardBodyContent.find('.extension-option #enableStore').attr('checked', true);
            } else {
                wizardBodyContent.find('.extension-option #enableSink').attr('checked', true);
            }

            wizardBodyContent.find('.extension-option input').on('click', evt => {
                if(evt.currentTarget.id === 'enableStore') {
                    self.__propertyMap.output.isStore = true;
                }

                if (evt.currentTarget.id === 'enableSink') {
                    self.__propertyMap.output.isStore = false;
                }

                self.__propertyMap.output.sink = {
                    type: '',
                    properties: {},
                    possibleOptions: {},
                    addOnError: false
                }
                self.render();
            });

            extensionData.sort(function(a, b) {
                return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0);
            });

            extensionData.forEach(function (extension) {
                wizardBodyContent.find('#extension-type').append(`
                    <option value="${extension.name}">${extension.name}</option>
                `);
            });

            if (config.type.length > 0) {
                selectedExtension = extensionData.find(function (el) {
                    return el.name === config.type;
                });

                selectedExtension.parameters.forEach(function (param) {
                    if (!config.properties[param.name]) {
                        wizardBodyContent.find('#extension-options-dropdown').append(`
                            <a title="" class="dropdown-item" href="#">
                                <div>
                                    <div class="option-title">${param.name}</div><br/>
                                    <small style="opacity: 0.8">
                                        ${param.description.replaceAll('<', '&lt;')
                                            .replaceAll('>', '&gt;').replaceAll('`', '')}
                                    </small><br/>
                                    <small style="opacity: 0.8">
                                        <b>Default Value</b>: ${param.defaultValue.replaceAll(/\`/g, '')}
                                    </small>
                                </div>
                            </a>
                        `)
                    }
                })

                wizardBodyContent.find('#btn-add-transport-property')
                    .on('mouseover', function (evt) {
                        var leftOffset = evt.currentTarget.offsetLeft;
                        var elementObj = wizardBodyContent.find('#extension-options-dropdown');
                        elementObj.css({"left": `${leftOffset}px`})
                        elementObj
                            .removeClass('hidden')
                            .on('mouseleave', function () {
                                elementObj.addClass('hidden');
                            });
                    })
                    .on('mouseleave', function () {
                        setTimeout(function () {
                            var elementObj = wizardBodyContent.find('#extension-options-dropdown');
                            if (!(wizardBodyContent.find('#extension-options-dropdown:hover').length > 0)) {
                                elementObj.addClass('hidden');
                            }
                        }, 300);
                    });
                wizardBodyContent.find('#extension-type').val(config.type);
                wizardBodyContent.find('.extension-properties>.options').empty();
                Object.keys(config.properties).forEach(function (key) {
                    var optionData = config.properties[key];
                    var name = key.replaceAll(/\./g, '-');
                    var selectedOption = selectedExtension.parameters.find(function(element) {
                        return element.name === key;
                    });
                    wizardBodyContent.find('.extension-properties>.options').append(`
                        <div style="display: flex; margin-bottom: 15px" class="property-option">
                            <div style="width: 100%" class="input-section">
                                <label style="margin-bottom: 0" 
                                    class="${optionData.value.length > 0 ? '' : 'not-visible'}" 
                                    id="label-extension-op-${name}" for="extension-op-${name}">${key}</label>
                                <input id="extension-op-${name}" style="width: 100%; border: none; 
                                    background-color: transparent; border-bottom: 1px solid #333" placeholder="${key}" 
                                    type="text" value="${optionData.value}">
                            </div>
                            <div style="display: flex;padding-top: 20px; padding-left: 5px;" class="delete-section">
                                <a style="margin-right: 5px; color: #333" 
                                    title="${selectedOption.description.replaceAll('<', '&lt;')
                                                .replaceAll('>', '&gt;').replaceAll('`', '')}">
                                    <i class="fw fw-info"></i>
                                </a>
                                ${
                                    config.type === 'rdbms' || selectedOption.optional ?
                                        `<a style="color: #333">
                                            <i id="extension-op-del-${name}" class="fw fw-delete"></i>
                                         </a>` : ''
                                }
                            </div>
                        </div>
                    `);
                });

                wizardBodyContent.find('#extension-options-dropdown>a').on('click', function (evt) {
                    var optionName = $(evt.currentTarget).find('.option-title').text();
                    var selectedOption = selectedExtension.parameters.find(function(element) {
                        return element.name === optionName;
                    });

                    config.properties[optionName] = {};
                    config.properties[optionName].value = selectedOption.defaultValue.replaceAll(/`/g, '');
                    config.properties[optionName].type = selectedOption.type;
                    self.render();
                });
            }

            wizardBodyContent.find('#extension-type').on('change', function (evt) {
                config.type = $(evt.currentTarget).val();
                var sourceData = extensionData.find(function (el) {
                    return el.name === config.type;
                });

                config.properties = {};
                sourceData.parameters
                    .filter(function (el) {
                        return !el.optional;
                    })
                    .forEach(function (param) {
                        var paramData = {}
                        paramData['value'] = param.defaultValue.replaceAll('`', '');
                        paramData.type = param.type;
                        config.properties[param.name] = paramData;
                    });

                if(config.type === 'rdbms') {
                    config.properties = {};
                }

                self.render();
            });

            wizardBodyContent.find('.property-option>.input-section>input')
                .on('focus', function (evt) {
                    var inputId = $(evt.currentTarget).attr('id');
                    wizardBodyContent.find(`#label-${inputId}`).removeClass('not-visible');
                    $(evt.currentTarget).attr('placeholder', '在此输入');
                })
                .on('focusout', function (evt) {
                    if ($(evt.currentTarget).val().length === 0) {
                        var inputId = $(evt.currentTarget).attr('id');
                        wizardBodyContent.find(`#label-${inputId}`).addClass('not-visible');
                        $(evt.currentTarget).attr('placeholder', wizardBodyContent.find(`#label-${inputId}`).text());
                    }
                })
                .on('keyup', _.debounce(function (evt) {
                    var optionName = evt.currentTarget.id.match('extension-op-([a-zA-Z0-9-]+)')[1]
                        .replaceAll(/-/g, '.');
                    config.properties[optionName].value = $(evt.currentTarget).val();
                }, 100, {}));

            wizardBodyContent.find('.property-option>.delete-section>a>.fw-delete').on('click', function (evt) {
                var optionName = evt.currentTarget.id.match('extension-op-del-([a-zA-Z0-9-]+)')[1]
                    .replaceAll(/-/g, '.');
                delete config.properties[optionName];
                self.render();
            });
        }

        ETLWizard.prototype.renderSchemaConfigurator = function (type) {
            var self = this;
            var config = type === constants.SOURCE_TYPE ?
                self.__propertyMap.input.stream : self.__propertyMap.output.stream;
            var wizardBodyContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_BODY);
            config.name = config.name.length > 0 ?
                config.name : (type === constants.SOURCE_TYPE ? 'input_stream' : 'output_stream');

            wizardBodyContent.append(`
                <div style="max-height: ${wizardBodyContent[0].offsetHeight}; overflow: auto" class="content-section">
                    <div style="font-size: 1.8rem">
                        配置模式<br/>
                        <small style="font-size: 1.3rem">
                            配置${type === constants.SOURCE_TYPE ? '输入' : '输出'}流
                        </small>
                    </div>
                    ${
                        self.__propertyMap.output.isStore && self.__propertyMap.output.sink.type === 'rdbms' 
                                                        ||(self.__stepIndex === 1 && self.__propertyMap.input.source.type === 'file') ?
                            `<div>
                                <button style="background-color: #ee6719" class="btn btn-default btn-generate-stream">
                                    生成数据流
                                </button>
                            </div>` : ''
                    }
                    ${
                        !(type === constants.SINK_TYPE && self.__propertyMap.output.isStore) ?
                            `
                                <div style="display: flex; padding-top:15px">
                                    <div style="padding-top: 5px">
                                        增加测试用Log数据汇
                                    </div>
                                    <div style="margin-left: 15px">
                                        <div id="btn-group-enable-log-sink" class="btn-group btn-group-toggle" data-toggle="buttons">
                                            <label class="btn" 
                                                    style="${
                                            config.addLog ?
                                                "background-color: rgb(91,203,92); color: white;"
                                                : "background-color: rgb(100,109,118); color: white;"}" 
                                             >
                                                <input type="radio" name="options" id="enable" autocomplete="off"> 
                                                <i class="fw fw-check"></i>
                                            </label>
                                            <label class="btn" 
                                                    style="${
                                            !config.addLog ?
                                                "background-color: red; color: white;"
                                                : "background-color: rgb(100,109,118); color: white;"}" 
                                            >
                                                <input type="radio" name="options" id="disable" autocomplete="off"> 
                                                <i class="fw fw-cancel"></i>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            `: ''
                    }
                    <div style="padding-top: 10px">
                        <div>
                            <label for="stream-name-txt">
                                ${type === constants.SOURCE_TYPE ? '输入' : '输出'}流名称
                            </label>
                            <input id="stream-name-txt" type="text" style="width: 100%; border: none; 
                            background-color: transparent; border-bottom: 1px solid #333" value="${config.name}">
                        </div>
                        <div style="padding-top: 10px">
                            <div style="padding-top: 15px" class="attribute-list">
                                <div>
                                  ${type === constants.SOURCE_TYPE ? '输入' : '输出'}流特性:
                                  <button style="background-color: #ee6719" class="btn btn-default btn-circle" 
                                    id="btn-add-stream-attrib" type="button" data-toggle="dropdown">
                                    <i class="fw fw-add"></i>
                                  </button>
                                  <div id="stream-attribute-type-dropdown" style="left: 150px" 
                                    class="dropdown-menu-style hidden" aria-labelledby="">
                                  </div>
                                </div>
                                <div style="" class="attributes">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);

            wizardBodyContent.find('#btn-group-enable-log-sink .btn').on('click', (evt) => {
                config.addLog = !config.addLog;
                self.render();
            });

            wizardBodyContent.find('.btn-generate-stream').on('click', function (evt) {
                self.__app.commandManager.dispatch("generate-stream", self, self.handleStreamGenerationResponse, {});
            });

            var attributeTypeDiv = wizardBodyContent.find('#stream-attribute-type-dropdown');

            constants.SUPPORTED_DATA_TYPES.forEach(function (dataType) {
                attributeTypeDiv.append(`
                    <a id="attrib-option-${dataType.toLowerCase()}" 
                        title="Attribute of type ${dataType}" class="dropdown-item" href="#">${dataType}</a>
                `);
            });

            config.attributes.forEach(function (attribute, i) {
                wizardBodyContent.find('.attribute-list>.attributes').append(`
                    <div style="display: flex;">
                        <div class="stream-attrib-sort-div" style="display: flex;flex-direction: column;padding: 5px;">
                            <a id="move-attrib-up-${i}" title="Move attribute up the schema" style="color: #333">
                                <i class="fw fw-up"></i>
                            </a>
                            <a id="move-attrib-down-${i}" title="Move attribute down the schema" style="color: #333">
                                <i class="fw fw-down"></i>
                            </a>
                        </div>
                        <div style="width: 100%; padding-bottom: 15px" class="attribute-input-section">
                            <label style="margin-bottom: 0; font-size: 1.2rem;" for="attribute-input-${i}">
                                ${attribute.type.toUpperCase()}
                            </label>
                            <input id="attribute-name-input-${i}" style="width: 100%; border: none; 
                                background-color: transparent; border-bottom: 1px solid #333" 
                                placeholder="在此输入特性名称" type="text" value="${attribute.name}">
                        </div>
                        <div style="padding: 20px 5px;">
                            <a title="Delete attribute from schema" style="color: #333">
                                <i id="delete-attribute-${i}" class="fw fw-delete attrib-del"></i>
                            </a>
                        </div>
                    </div>
                `);
            });

            wizardBodyContent.find('#btn-add-stream-attrib').on('mouseover', function (evt) {
                var attributeTypeDiv = wizardBodyContent.find('#stream-attribute-type-dropdown');
                var leftOffset = evt.currentTarget.offsetLeft;
                attributeTypeDiv.css({"left": `${leftOffset}px`})
                attributeTypeDiv.removeClass('hidden');

                attributeTypeDiv.on('mouseleave', function () {
                    attributeTypeDiv.addClass('hidden');
                })
            }).on('mouseleave', function (evt) {
                setTimeout(function () {
                    var attributeTypeDiv = wizardBodyContent.find('#stream-attribute-type-dropdown');
                    if (!(wizardBodyContent.find('#stream-attribute-type-dropdown:hover').length > 0)) {
                        attributeTypeDiv.addClass('hidden');
                    }
                }, 300)
            });

            wizardBodyContent.find("#stream-attribute-type-dropdown>a").on('click', function (evt) {
                var attributeType = evt.currentTarget.id.match('attrib-option-([a-zA-Z0-9-]+)')[1];
                config.attributes.push({name: '', type: attributeType});
                self.render();
            });

            wizardBodyContent.find('.attrib-del').on('click', function (evt) {
                var index = evt.currentTarget.id.match('delete-attribute-([0-9]+)')[1];
                config.attributes.splice(index, 1);
                self.render();
            });

            wizardBodyContent.find('.stream-attrib-sort-div>a').on('click', function (evt) {
                var arrowIndex = evt.currentTarget.id.match('move-attrib-([a-zA-Z0-9-]+)')[1].split('-');
                var index = Number(arrowIndex[1]);
                var temp = _.cloneDeep(config.attributes[index]);

                if (arrowIndex[0] === 'up' && index !== 0) {
                    config.attributes[index] = config.attributes[index - 1];
                    config.attributes[index - 1] = temp;
                } else if (index !== (config.attributes.length - 1)) {
                    config.attributes[index] = config.attributes[index + 1];
                    config.attributes[index + 1] = temp;
                }
                self.render();
            });

            wizardBodyContent.find('.attribute-input-section>input').on('keyup', _.debounce(function (evt) {
                var attributeIndex = Number(evt.currentTarget.id.match('attribute-name-input-([0-9]+)')[1]);

                config.attributes[attributeIndex].name = $(evt.currentTarget).val();
            }, 100, {}));

            wizardBodyContent.find('#stream-name-txt').on('keyup', _.debounce(function (evt) {
                config.name = $(evt.currentTarget).val();
            }, 100, {}));
        }

        ETLWizard.prototype.renderInputOutputMapper = function (type) {
            var self = this;
            var config = type === constants.SOURCE_TYPE ?
                this.__propertyMap.input.mapping : this.__propertyMap.output.mapping;
            var extensionConfig = type === constants.SOURCE_TYPE ?
                this.__propertyMap.input : this.__propertyMap.output;
            var wizardBodyContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_BODY);
            var mapperData = constants.SOURCE_TYPE === type ?
                this.__expressionData.extensions.sourceMapper.sourceMaps :
                this.__expressionData.extensions.sinkMapper.sinkMaps;

            wizardBodyContent.append(`
                <div style="max-height: ${wizardBodyContent[0].offsetHeight}; overflow: auto" class="content-section">
                    <div style="font-size: 1.8rem">
                        配置${type === constants.SOURCE_TYPE ? '输入' : '输出'}映射<br/>
                        <small style="font-size: 1.3rem">
                            配置${type === constants.SOURCE_TYPE ? '数据源' : '数据汇'}映射
                        </small>
                    </div>
                    <div style="padding-top: 10px">
                        <div>
                            <label for="mapper-type">
                                ${type === constants.SOURCE_TYPE ? '数据源' : '数据汇'}映射类型
                            </label>
                            <select name="mapper-type" id="mapper-type">
                                <option disabled selected value> -- 选择一个选项 -- </option>
                            </select>
                        </div>
                    </div>
                    <div id="mapper-container">
                    </div>
                </div>
            `);

            var mapperContainer = wizardBodyContent.find('#mapper-container');
            mapperContainer.empty();

            mapperData.forEach(function (map) {
                wizardBodyContent.find('#mapper-type').append(`
                    <option value="${map.name}">${map.name}</option>
                `);
            });

            wizardBodyContent.find('#mapper-type').on('change', function (evt) {
                var mapper = mapperData.find(function (map) {
                    return map.name === $(evt.currentTarget).val();
                });

                config.type = $(evt.currentTarget).val();
                config.properties = {};
                config.attributes = {};
                config.payload = '';
                config.customEnabled = false;
                config.samplePayload = '';

                if(mapper.parameters) {
                    mapper.parameters
                    .filter(function (el) {
                        return !el.optional;
                    })
                    .forEach(function (el) {
                        var mapperData = {};
                        mapperData.value = el.defaultValue;
                        mapperData.type = el.type;
                        config.properties[el.name] = mapperData;
                    });
                }

                var inputOutputMapper = new InputOutputMapper(type, mapperContainer, extensionConfig, mapper);
                inputOutputMapper.render();
            });

            if (config.type.length > 0) {
                var mapper = mapperData.find(function (map) {
                    return map.name === config.type;
                });
                wizardBodyContent.find('#mapper-type').val(config.type);
                var inputOutputMapper = new InputOutputMapper(type, mapperContainer, extensionConfig, mapper);
                inputOutputMapper.render();
            }
        };

        ETLWizard.prototype.renderFinalize = function(obj) {
            var self = this;
            var wizardBodyContent = this.__parentWizardForm.find(constants.CLASS_WIZARD_MODAL_BODY);
            wizardBodyContent.empty();
            wizardBodyContent.html(templates.finalizeStep(obj));

            wizardBodyContent.find('#btn-test').on('click', function() {
                var siddhiAppName = self.__propertyMap.appName;
                var inputStreamName = self.__propertyMap.input.stream.name;
                self.__app.commandManager
                    .dispatch(constants.commands.TOGGLE_EVENT_SIMULATOR, siddhiAppName, inputStreamName);
            });

            wizardBodyContent.find('#btn-export-docker').on('click', function() {
                var selectedFiles = [`${self.__propertyMap.appName}.siddhi`];
                self.__app.commandManager.dispatch(constants.commands.EXPORT_FOR_DOCKER, selectedFiles);
            });

            wizardBodyContent.find('#btn-export-k8s').on('click', function() {
                var selectedFiles = [`${self.__propertyMap.appName}.siddhi`];
                self.__app.commandManager.dispatch(constants.commands.EXPORT_FOR_KUBERNETES, selectedFiles);
            });

            wizardBodyContent.find('#btn-deploy').on('click', function() {
                var selectedFiles = [`${self.__propertyMap.appName}.siddhi`];
                self.__app.commandManager.dispatch(constants.commands.DEPLOY_TO_SERVER, selectedFiles);
            });
        };

        var generateUIDataModel = function(o) {
            var self = this;
            var hasStore =  o ? o.siddhiAppConfig.tableList.length > 0 : false;
            var model = {
                appName: '',
                input: {
                    source: {
                        type: '',
                        properties: {},
                        possibleOptions: {},
                    },
                    stream: {
                        name: "",
                        attributes: [],
                        addLog: false
                    },
                    mapping: {
                        type: '',
                        properties: {},
                        possibleProperties: {},
                        attributes: {},
                        payload: '',
                        customEnabled: false,
                        samplePayload: ''
                    }
                },
                output: {
                    sink: {
                        type: '',
                        properties: {},
                        possibleOptions: {},
                        addOnError: false
                    },
                    stream: {
                        name: "",
                        attributes: [],
                        addLog: false
                    },
                    mapping: {
                        type: '',
                        properties: {},
                        possibleProperties: {},
                        attributes: {},
                        payload: '',
                        customEnabled: false,
                        samplePayload: ''
                    },
                    isStore: hasStore
                },
                query: {
                    window: {},
                    filter: {
                    },
                    function: {
                    },
                    mapping: {
                    },
                    groupby: {
                        attributes: [],
                        havingFilter : {}
                    },
                    orderby: {
                        attributes: []
                    },
                    advanced: {
                        offset: {},
                        limit: {},
                        ratelimit: {}
                    }
                }
            };

            if (!o) {
                return model;
            }

            if (!self.__expressionData) {
                return model;
            }

            if (!self.__extensionDataMap) {
                self.__extensionDataMap = {
                    sources: {},
                    sinks: {},
                    sourceMappers: {},
                    sinkMappers: {},
                    windowProcessors: {},
                    streamProcessors: {},
                    stores: {}
                }

                self.__expressionData.extensions.source.sources.forEach((s) => {
                    var parameters = {};
                    s.parameters.forEach((p) => parameters[p.name] = { type: p.type });
                    self.__extensionDataMap.sources[s.name] = { parameters };
                });

                self.__expressionData.extensions.sink.sinks.forEach((s) => {
                    var parameters = {};
                    s.parameters.forEach((p) => parameters[p.name] = { type: p.type });
                    self.__extensionDataMap.sinks[s.name] = { parameters };
                });

                self.__expressionData.extensions.store.stores.forEach((s) => {
                    var parameters = {};
                    s.parameters.forEach((p) => parameters[p.name] = { type: p.type });
                    self.__extensionDataMap.stores[s.name] = { parameters };
                });

                self.__expressionData.extensions.sourceMapper.sourceMaps.forEach((s) => {
                    var parameters = {};
                    (s.parameters || []).forEach((p) => parameters[p.name] = { type: p.type });
                    self.__extensionDataMap.sourceMappers[s.name] = { parameters };
                });

                self.__expressionData.extensions.sinkMapper.sinkMaps.forEach((s) => {
                    var parameters = {};
                    (s.parameters || []).forEach((p) => parameters[p.name] = { type: p.type });
                    self.__extensionDataMap.sinkMappers[s.name] = { parameters };
                });

                self.__expressionData.inBuilt.windowProcessors.forEach((w) => {
                    self.__extensionDataMap.windowProcessors[w.name] = { parameters: w.parameters || [] };
                });

                self.__expressionData.inBuilt.streamProcessors.forEach((s) => {
                    self.__extensionDataMap.streamProcessors[s.name] = { parameters: s.parameters || [] };
                });

                Object.entries(self.__expressionData.extensions).forEach(ext => {
                    ext[1].streamProcessors.forEach(sp => {
                        var fqn = `${sp.namespace}:${sp.name}`;
                        self.__extensionDataMap.streamProcessors[fqn] = { parameters: sp.parameters || [] };
                    })
                });
            }

            m = o.siddhiAppConfig;
            model.appName = m.siddhiAppName;
            model.appDescription = m.siddhiAppDescription;

            m.streamList.forEach(stream => {
                if (m.sourceList[0].connectedElementName === stream.name) {
                    model.input.stream = {
                        name: stream.name,
                        attributes: stream.attributeList.map(a => {
                            return {
                                name: a.name,
                                type: a.type
                            };
                        }),
                        addLog: false
                    };
                } else {
                    model.output.stream = {
                        name: stream.name,
                        attributes: stream.attributeList.map(a => {
                            return {
                                name: a.name,
                                type: a.type
                            };
                        }),
                        addLog: false
                    }
                }
            });

            // set Stream if it has store
            if (hasStore) {
                model.output.stream = {
                    name: m.tableList[0].name,
                    attributes: m.tableList[0].attributeList,
                    addLog: false
                }
            }

            model.input.stream.addLog = !!m.sinkList
                .find(s => s.type.toLowerCase() === 'log' && s.connectedElementName === model.input.stream.name);

            model.output.stream.addLog = !!m.sinkList
                .find(s => s.type.toLowerCase() === 'log' && s.connectedElementName === model.output.stream.name);

            var sinkIndex = 0;
            if (m.sinkList.length > 1) {
                for (var i = 0; i < m.sinkList.length; i++) {
                    if (m.sinkList[i].type.toLowerCase() !== 'log') {
                        sinkIndex = i;
                        break;
                    }
                }
            }

            model.input.source.type = m.sourceList[0].type;
            m.sourceList[0].options.forEach((option) => {
                var { key, value } = splitKeyValueByEqual(option);
                var type = self.__extensionDataMap.sources[m.sourceList[0].type].parameters[key].type;
                model.input.source.properties[key] = { value, type };
            });

            if(hasStore) {
                model.output.sink.type = m.tableList[0].store.type;
                m.tableList[0].store.options.forEach((option) => {
                    var { key, value } = splitKeyValueByEqual(option);
                    var type = self.__extensionDataMap.stores[m.tableList[0].store.type].parameters[key].type;
                    model.output.sink.properties[key] = { value, type };
                });
            } else {
                model.output.sink.type = m.sinkList[sinkIndex].type;
                m.sinkList[sinkIndex].options.forEach((option) => {
                    var { key, value } = splitKeyValueByEqual(option);
                    var type = self.__extensionDataMap.sinks[m.sinkList[sinkIndex].type].parameters[key].type;
                    model.output.sink.properties[key] = { value, type };
                });
            }

            if (m.sourceList[0].map) {
                model.input.mapping.type = m.sourceList[0].map.type;
                m.sourceList[0].map.options.forEach((option) => {
                    var { key, value } = splitKeyValueByEqual(option);
                    var type = self.__extensionDataMap.sourceMappers[m.sourceList[0].map.type].parameters[key].type;
                    model.input.mapping.properties[key] = { value, type };
                });
            }

            if (m.sourceList[0].map.payloadOrAttribute) {
                switch(m.sourceList[0].map.payloadOrAttribute.annotationType) {
                    case 'ATTRIBUTES':
                        model.input.mapping.customEnabled = true;
                        Object.entries(m.sourceList[0].map.payloadOrAttribute.value).forEach(a => {
                            model.input.mapping.attributes[a[0]] = a[1];
                        });
                        break;
                    case 'PAYLOAD':
                        model.input.mapping.customEnabled = true;
                        model.input.mapping.payload = m.sourceList[0].map.payloadOrAttribute.value[0];
                        break;
                }
            }

            if (!hasStore && m.sinkList[sinkIndex].map) {
                model.output.mapping.type = m.sinkList[sinkIndex].map.type;
                m.sinkList[sinkIndex].map.options.forEach((option) => {
                    var { key, value } = splitKeyValueByEqual(option);
                    if (key.toLowerCase() === 'on.error' && value.toLowerCase() === 'store') {
                        model.output.sink.addOnError = true;
                    } else {
                        var type = self.__extensionDataMap
                            .sinkMappers[m.sinkList[sinkIndex].map.type].parameters[key].type;
                        model.output.mapping.properties[key] = { value, type };
                    }
                });
            }

            if (!hasStore && m.sinkList[sinkIndex].map.payloadOrAttribute) {
                switch(m.sinkList[sinkIndex].map.payloadOrAttribute.annotationType) {
                    case 'ATTRIBUTES':
                        model.output.mapping.customEnabled = true;
                        Object.entries(m.sinkList[sinkIndex].map.payloadOrAttribute.value).forEach(a => {
                            model.output.mapping.attributes[a[0]] = a[1];
                        });
                        break;
                    case 'PAYLOAD':
                        model.output.mapping.customEnabled = true;
                        model.output.mapping.payload = m.sinkList[sinkIndex].map.payloadOrAttribute.value[0];
                        break;
                }
            }

            m.queryLists.WINDOW_FILTER_PROJECTION[0].queryInput.streamHandlerList.forEach((h) => {
                switch(h.type) {
                    case 'FILTER':
                        model.query.filter = {
                            enable: true,
                            expression: h.value
                        };
                        break;
                    case 'WINDOW':
                        model.query.window = {
                            enable: true,
                            type: h.value.function,
                            parameters: {}
                        };
                        for (var i = 0; i < h.value.parameters.length; i++) {
                            var { name, type } = self.__extensionDataMap.windowProcessors[h.value.function]
                                .parameters[i];
                            var value = h.value.parameters[i];
                            model.query.window.parameters[name] = { value, type }
                        }
                        break;
                    case 'FUNCTION':
                        model.query.function = {
                            enable: true,
                            name: h.value.function,
                            parameters: {}
                        };
                        for (var i = 0; i < h.value.parameters.length; i++) {
                            var { name, type } = self.__extensionDataMap.streamProcessors[h.value.function]
                                .parameters[i];
                            var value = h.value.parameters[i];
                            model.query.function.parameters[name] = { value, type }
                        }
                        break;
                }
            });

            if (m.queryLists.WINDOW_FILTER_PROJECTION[0].select.type === 'USER_DEFINED') {
                m.queryLists.WINDOW_FILTER_PROJECTION[0].select.value.forEach((s) => {
                    model.query.mapping[s.as.length > 0 ? s.as : s.expression] = s.expression;
                });
            }

            m.queryLists.WINDOW_FILTER_PROJECTION[0].groupBy.forEach((attr) => {
                model.query.groupby.attributes.push({
                    name: attr,
                    type: model.input.stream.attributes.find(a => a.name === attr).type.toLowerCase()
                });
            });

            if (m.queryLists.WINDOW_FILTER_PROJECTION[0].having.length > 0) {
                model.query.groupby.havingFilter = {
                    enabled: true,
                    expression: m.queryLists.WINDOW_FILTER_PROJECTION[0].having
                };
            }

            m.queryLists.WINDOW_FILTER_PROJECTION[0].orderBy.forEach((c) => {
                model.query.orderby.attributes.push({
                    attribute: {
                        name: c.value,
                        type: model.output.stream.attributes.find(a => a.name === c.value).type.toLowerCase()
                    },
                    sort: c.order.toLowerCase()
                });
            });

            if (m.queryLists.WINDOW_FILTER_PROJECTION[0].offset > 0) {
                model.query.advanced.offset = { value: m.queryLists.WINDOW_FILTER_PROJECTION[0].offset };
            }

            if (m.queryLists.WINDOW_FILTER_PROJECTION[0].limit > 0) {
                model.query.advanced.limit = { value: m.queryLists.WINDOW_FILTER_PROJECTION[0].limit };
            }

            if (m.queryLists.WINDOW_FILTER_PROJECTION[0].outputRateLimit.length > 0) {
                var arr = m.queryLists.WINDOW_FILTER_PROJECTION[0].outputRateLimit.split(' ');
                model.query.advanced.ratelimit = {
                    enabled: true,
                    type: arr[0] === 'snapshot' ?
                        'snapshot' : (arr[arr.length - 1] === 'events' ? 'no-of-events' : 'time-based'),
                    value: arr[arr.length - 2],
                    granularity: arr[arr.length - 1],
                    'event-selection': arr[0] === 'snapshot' ? '' : arr[0]
                };
            }
            return model;
        }

        var splitKeyValueByEqual = function(str) {
            var pos = str.indexOf('='),
                trimmedValue = str.substr(pos + 1).trim();
            return {
                key: str.substr(0, pos).trim(),
                value: trimmedValue.substr(1, trimmedValue.length - 2)
            }
        }

        var generateSourceGenDataModel = function(o) {
            var config = {
                siddhiAppName: o.appName,
                siddhiAppDescription: o.appDescription || '',
                appAnnotationList: [],
                appAnnotationListObjects: [],
                streamList: (() => {
                    let list = [];

                    list.push({
                        id: 'inputStream',
                        name: o.input.stream.name,
                        annotationListObjects: [],
                        attributeList: o.input.stream.attributes.map(v => {
                            return { name: v.name, type: v.type }
                        }),
                        annotationList: []
                    });

                    if (!o.output.isStore) {
                        list.push({
                            id: 'outputStream',
                            name: o.output.stream.name,
                            annotationListObjects: [],
                            attributeList: o.output.stream.attributes.map(v => {
                                return { name: v.name, type: v.type }
                            }),
                            annotationList: []
                        });
                    }

                    return list
                })(),
                sourceList: [
                    {
                        id: "source",
                        connectedElementName: o.input.stream.name,
                        annotationType: "SOURCE",
                        type: o.input.source.type,
                        options: Object.entries(o.input.source.properties).map(v => {
                            return `${v[0]} = "${v[1].value}"`;
                        }),
                        map: {
                            type: o.input.mapping.type,
                            options: Object.entries(o.input.mapping.properties).map(v => {
                                return `${v[0]} = "${v[1].value}"`
                            }),

                        }
                    }
                ],
                sinkList:  !o.output.isStore ? (() => {
                    var list = [
                        {
                            id: 'sink',
                            connectedElementName: o.output.stream.name,
                            annotationType: 'SINK',
                            type: o.output.sink.type,
                            options: (() => {
                                var options = Object.entries(o.output.sink.properties).map(v => {
                                    return `${v[0]} = "${v[1].value}"`;
                                });
                                if (o.output.sink.addOnError) {
                                    options.push('on.error = "STORE"');
                                }
                                return options;
                            })(),
                            map: {
                                type: o.output.mapping.type,
                                options: Object.entries(o.output.mapping.properties).map(v => {
                                    return `${v[0]} = "${v[1].value}"`
                                }),
                            }
                        }
                    ];

                    if (o.input.stream.addLog) {
                        list.push({
                            id: 'inputLogSink',
                            connectedElementName: o.input.stream.name,
                            annotationType: 'SINK',
                            type: 'log',
                            options: []
                        })
                    }

                    if (o.output.stream.addLog) {
                        list.push({
                            id: 'outputLogSink',
                            connectedElementName: o.output.stream.name,
                            annotationType: 'SINK',
                            type: 'log',
                            options: []
                        })
                    }
                    return list;
                })() : [],
                tableList: o.output.isStore ? (() => {
                    var list = [
                        {
                            name: o.output.stream.name,
                            attributeList: o.output.stream.attributes,
                            store: {
                                type: o.output.sink.type,
                                options : (() => {
                                    var options = Object.entries(o.output.sink.properties).map(v => {
                                        return `${v[0]} = "${v[1].value}"`;
                                    });
                                    return options;
                                })()
                            },
                            annotationList: [],
                            annotationListObjects: [],
                            id: 'outputStream',
                        }
                    ];
                    return list;
                })() : [],
                windowList: [],
                triggerList: [],
                aggregationList: [],
                functionList: [],
                partitionList: [],
                queryLists: {
                    WINDOW_FILTER_PROJECTION: [
                        {
                            queryName: "query1",
                            id: "query1",
                            queryInput: {
                                type: 'PROJECTION', // TODO:
                                from: o.input.stream.name,
                                streamHandlerList: (() => {
                                    var list = [];
                                    if (o.query.window.enable) {
                                        list.push({
                                            type: 'WINDOW',
                                            value: {
                                                function: o.query.window.type,
                                                parameters: Object.entries(o.query.window.parameters).map(p => {
                                                    return p[1].value;
                                                })
                                            }
                                        });
                                    }
                                    if (o.query.filter.enable) {
                                        var expression = '';
                                        if (typeof o.query.filter.expression === 'string') {
                                            expression = o.query.filter.expression;
                                        } else {
                                            expression = $('<div>'+
                                                DataMapperUtil.generateExpressionHTML(
                                                    o.query.filter.expression,'', null)
                                                +'</div>').text()
                                        }
                                        list.push({
                                            type: 'FILTER',
                                            value: expression
                                        })
                                    }
                                    if (o.query.function.enable) {
                                        list.push({
                                            type: 'FUNCTION',
                                            value: {
                                                function: o.query.function.name,
                                                parameters: Object.entries(o.query.function.parameters).map(p => {
                                                    return p[1].value;
                                                })
                                            }
                                        });
                                    }
                                    return list;
                                })()
                            },
                            select: {
                                type: "USER_DEFINED",
                                value: o.output.stream.attributes.map(attr => {

                                    return {
                                        expression: typeof o.query.mapping[attr.name] === 'string' ?
                                        o.query.mapping[attr.name]
                                        : $('<div>'
                                        + DataMapperUtil.generateExpressionHTML(
                                            o.query.mapping[attr.name],'', null)
                                        + '</div>').text(),
                                        as: attr.name
                                    }
                                })
                            },
                            queryOutput: {
                                type: "INSERT",
                                output: { "eventType": "CURRENT_EVENTS" },
                                target: o.output.stream.name
                            },
                            groupBy: o.query.groupby.attributes.map(v => {
                                return v.name;
                            }),
                            limit: o.query.advanced.limit.value || 0,
                            offset: o.query.advanced.offset.value || 0,
                            having: (() => {
                                if (!o.query.groupby.havingFilter.enabled) {
                                    return '';
                                }
                                if (typeof o.query.groupby.havingFilter.expression === 'string') {
                                    return o.query.groupby.havingFilter.expression
                                }
                                return $('<div>'
                                    + DataMapperUtil.generateExpressionHTML(
                                        o.query.groupby.havingFilter.expression, '', null)
                                    +'</div>').text()
                            })(),
                            outputRateLimit: (() => {
                                if (!o.query.advanced.ratelimit.enabled) {
                                    return '';
                                }
                                var { value, granularity } = o.query.advanced.ratelimit,
                                    eventSelection = o.query.advanced.ratelimit['event-selection'];
                                if (o.query.advanced.ratelimit.type === 'snapshot') {
                                    return `snapshot every ${value} ${granularity}`;
                                }
                                return `${eventSelection} every ${value} ${granularity}`.trim();
                            })(),
                            orderBy: (o.query.orderby || { attributes: []}).attributes.map(v => {
                                return {
                                    value: v.attribute.name,
                                    order: v.sort
                                };
                            }),
                            annotationList: [],
                            annotationListObjects: []
                        }
                    ],
                    PATTERN: [],
                    SEQUENCE: [],
                    JOIN: []
                },
                finalElementCount: 5,
            };

            if (o.output.mapping.customEnabled) {
                config.sinkList[0].map.payloadOrAttribute = (() => {
                    if (o.output.mapping.payload && o.output.mapping.payload.length > 0) {
                        return {
                            annotationType: 'PAYLOAD',
                            type: 'LIST',
                            value: [o.output.mapping.payload]
                        };
                    }
                    var attrList = {};
                    Object.entries(o.output.mapping.attributes).forEach(a => attrList[a[0]] = a[1]);
                    return {
                        annotationType: 'ATTRIBUTES',
                        type: 'MAP',
                        value: attrList
                    };
                })()
            }

            if (o.input.mapping.customEnabled) {
                config.sourceList[0].map.payloadOrAttribute = (() => {
                    if (o.input.mapping.payload && o.input.mapping.payload.length > 0) {
                        return {
                            annotationType: 'PAYLOAD',
                            type: 'LIST',
                            value: [o.input.mapping.payload]
                        };
                    }
                    var attrList = {};
                    Object.entries(o.input.mapping.attributes).forEach(a => attrList[a[0]] = a[1]);
                    return {
                        annotationType: 'ATTRIBUTES',
                        type: 'MAP',
                        value: attrList
                    };
                })()
            }

            return {
                siddhiAppConfig: config,
                edgeList: []
            };
        }

        var saveSiddhiApp = function(data) {
            let result = {},
                fileName = `${data.siddhiAppConfig.siddhiAppName}.siddhi`;
            $.ajax({
                type: 'POST',
                url: `${window.location.protocol}//${window.location.host}/editor/etl-wizard/save`,
                data: {
                    configName: window.btoa(fileName),
                    config: window.btoa(JSON.stringify(data)),
                    overwrite: true
                },
                async: false,
                success: function (response) {
                    result = {
                        status: true,
                        fileName
                    };
                },
                error: function (error) {
                    result = {
                        status: false,
                        errorMessage: error.responseText || 'Error Occurred while saving the file.'
                    };
                }
            });
            return result;
        };

        var updateButtonBar = function(wizardFooterContent, stepIndex, substepIndex) {
            wizardFooterContent.find('.btn').show();
            if(stepIndex === 1 && substepIndex === 0) {
                wizardFooterContent.find('.back-btn').hide();
            }

            if (stepIndex === 6) {
                wizardFooterContent.find('.next-btn').hide();
                wizardFooterContent.find('.save-btn').hide();
            } else if (stepIndex === 5) {
                wizardFooterContent.find('.next-btn').hide();
                wizardFooterContent.find('.close-btn').hide();
            } else {
                wizardFooterContent.find('.save-btn').hide();
                wizardFooterContent.find('.close-btn').hide();
            }
        };

        var updateHeaderTextField = function (wizardHeaderContent, stepIndex) {
            if (stepIndex === 6) {
                wizardHeaderContent.find('.etl-flow-name').attr('disabled', true);
            } else {
                wizardHeaderContent.find('.etl-flow-name').attr('disabled', false);
            }
        }

        return ETLWizard;
    });
