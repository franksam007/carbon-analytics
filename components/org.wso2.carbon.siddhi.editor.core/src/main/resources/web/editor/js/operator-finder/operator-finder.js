/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['jquery', 'lodash', 'log', 'remarkable', 'handlebar', 'designViewUtils', 'constants', 'app/source-editor/completion-engine', 'alerts'],
    function ($, _, log, Remarkable, Handlebars, DesignViewUtils, Constants, CompletionEngine, alerts) {
        /**
         * Load operators from the Completion engine.
         *
         * @param callback Callback function
         */
        var constants = {
            STORE: 'store',
            SINK: 'sink',
            SOURCE : 'source',
            MAP: 'map',
            SINK_MAPPER: 'sinkmapper',
            SOURCE_MAPPER: 'sourcemapper'
        };

        var loadOperators = function(callback) {
            var data = CompletionEngine.getRawMetadata();
            // Flatten operator metadata into an array.
            var operators = flattenOperators(data);

            // Remove unnecessary operators
            delete data.extensions.distributionStrategy;
            delete data.extensions.incrementalAggregator;

            // Get all extension namespaces.
                var namespaces = [];
            for (var extension in data.extensions) {
                if (data.extensions.hasOwnProperty(extension)) {
                    namespaces.push(extension);
                }
            }
            namespaces.sort();
            callback(namespaces, operators);
        };

        /**
         * Checks if the content contains the token. If so returns the highlighted HTML text.
         *
         * @param content Content to be searched
         * @param tokens Array of tokens
         * @returns {*} Status with modified content
         */
        var hasToken = function (content, tokens) {
            var regex = new RegExp('(' + tokens.join('|') + ')', 'gi');
            var text = _.clone(content);
            if (regex.test(text)) {
                return {
                    status: true,
                    text: text.replace(regex, '<mark>$1</mark>')
                };
            }
            return {
                status: false,
                text: text
            };
        };

        /**
         * Flashes copied to clipboard message.
         *
         * @param messageBox Message box element.
         */
        var alertCopyToClipboardMessage = function (messageBox) {
            messageBox.show();
            setTimeout(function () {
                messageBox.fadeOut();
            }, 2000);
        };

        /**
         * replacing the pipeline and newline character for md conversation.
         * @param data string variable
         * @returns {""} retrun string data
         */
        var sanitiseString = function (data) {
            return data.replace(/[|]/g, '&#124;').replace(/[\n]/g, '<br/>');
        };

        /**
         *Format the backticks according to the remarkable js.
         * @param data
         * @returns {string|*}
         */
        var preProcessCodeBlocks = function (data) {
            var dataSplitArray = data.split("```");
            var output = "";
            if (dataSplitArray.length > 2 && dataSplitArray.length % 2 === 1) {
                output = dataSplitArray[0];
                for (var index = 1; index < dataSplitArray.length; index++) {
                    if ((index % 2) === 1) {
                        output += "\n```\n" + dataSplitArray[index].trim() + "\n```\n";
                    } else {
                        output += "\n" + dataSplitArray[index].trim() + "\n";
                    }
                }
                return output;
            }
            return data;
        };

        /**
         * mdconvertion which converst md data into html.
         * @param operator extension object
         * @returns return extension object which contains converted md
         */
        var createMDFile = function (operator) {
            //Add remarkable instance to convert md type data into html
            var markDownConvertor = new Remarkable({
                html: true, // Enable HTML tags in source
                xhtmlOut: false, // Use '/' to close single tags (<br />)
                breaks: false, // Convert '\n' in paragraphs into <br>
                linkify: true, // Autoconvert URL-like text to links
                // Enable some language-neutral replacement + quotes beautification
                typographer: false,
                // Double + single quotes replacement pairs, when typographer enabled,
                // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
                quotes: '“”‘’',
                highlight: function (/*str, lang*/) {
                    return '';
                }
            });
            if (operator.description) {
                operator.extensionDescription = markDownConvertor.render(operator.description);
            }
            if (operator.examples) {
                operator.combinedExamples = "";
                operator.examples.forEach(function (e, i) {
                    //change the "|" as "," and "\n" as "<br/> in returnAttributes description to avoid md
                    // conversation bug.
                    e.syntax = sanitiseString(e.syntax);
                    //To provide suitable backtick data for remarkable js md conversion.
                    e.description = preProcessCodeBlocks(e.description);
                    operator.combinedExamples += "<h5>Example " + (++i) + "</h5>" +
                        "<pre>" + e.syntax + "</pre>" +
                        "<p>" + e.description + "</p>";
                });
                operator.combinedExamples = markDownConvertor.render(operator.combinedExamples);
            }
            if (operator.parameters) {
                operator.parameterTable = "| 名称 | 可用数据类型 | 描述 | " +
                    "默认值 | 可选 | 动态 | " + "\n" +
                    "| ------| ------| -----------|" +
                    " ------| ------| ------|\n";
                operator.parameters.forEach(function (m) {
                    //change the "|" as "," and "\n" as "<br/> in returnAttributes description to avoid md
                    // conversation bug.
                    m.description = sanitiseString(m.description);
                    operator.parameterTable += " | " + m.name + " | "
                        + m.type.join('<br/>') + " | " +
                        m.description + " | "
                        + m.defaultValue + " | "
                        + m.optional + " | "
                        + m.isDynamic + " | " + "\n";
                });
                operator.parameterTable = markDownConvertor.render(operator.parameterTable);
            }
            if (operator.returnAttributes) {

                operator.returnAttributes.forEach(function (m) {
                    if(operator.type === "streamProcessors"){
                        operator.returnTable = "| 名称 | 数据类型 | 描述 |\n " +
                            "| ------| ------| -----------|\n";
                        m.description = sanitiseString(m.description);
                        operator.returnTable += " | " + m.name + " | "
                            + m.type.join('<br/>') + " | "
                            + m.description + " | \n";
                    }
                    else{
                        operator.returnTable = "| DataTypes | Description |\n " +
                            "| ------| -----------|\n";
                        m.description = sanitiseString(m.description);
                        operator.returnTable +=  " | " + m.type.join('<br/>') +
                            " | " + m.description + " | \n";
                    }
                });
                operator.returnTable = markDownConvertor.render(operator.returnTable);
            }
            return operator;
        }
        /**
         * Flattens the metadata structure into an array it reduce the search complexity.
         *
         * @param meta Operator metadata
         * @returns {*[]} Array of operators
         */
        var flattenOperators = function (meta) {
            // Flatten in-built operators.
            var operators = [];
            var type;
            for (type in meta.inBuilt) {
                if (meta.inBuilt.hasOwnProperty(type)) {
                    meta.inBuilt[type].forEach(function (operator) {
                        var cloneOperator = _.clone(operator);
                        cloneOperator.fqn = cloneOperator.name;
                        cloneOperator.type = type;
                        operators.push(createMDFile(cloneOperator));
                    });
                }
            }
            operators.sort(function (a, b) {
                return a.fqn < b.fqn ? -1 : a.fqn > b.fqn ? 1 : 0;
            });

            // Flatten extensions.
            var extensions = [];
            for (var extension in meta.extensions) {
                if (meta.extensions.hasOwnProperty(extension)) {
                    for (type in meta.extensions[extension]) {
                        if (meta.extensions[extension].hasOwnProperty(type)) {
                            meta.extensions[extension][type].forEach(function (operator) {
                                var cloneOperator = _.clone(operator);
                                cloneOperator.fqn = cloneOperator.namespace + ':' + cloneOperator.name;
                                cloneOperator.type = type;
                                extensions.push(createMDFile(cloneOperator));
                            });
                        }
                    }
                }
            }
            extensions.sort(function (a, b) {
                return a.fqn < b.fqn ? -1 : a.fqn > b.fqn ? 1 : 0;
            });
            return operators.concat(extensions);
        };

        /**
         * Checks if the source view is active.
         *
         * @returns {jQuery} Status
         */
        var isSourceView = function () {
            return $('.source-container').is(':visible');
        };

        /**
         * Toggles add to source button in the result pane.
         *
         * @param disable Is disabled
         */
        var toggleAddToSource = function (disable) {
            var elements = $('#operator-finder').find('.result-content a.add-to-source');
            if (disable) {
                elements.addClass('disabled');
            } else {
                elements.removeClass('disabled');
            }
        };

        var self;
        /**
         * Initializes the module.
         *
         * @param options Options
         * @constructor
         */
        var OperatorFinder = function (options) {
            self = this;
            this._options = options;
            this._application = options.application;
            this._activateBtn = $(options.activateBtn);
            this._container = $(options.container);
            this._containerToAdjust = $(this._options.containerToAdjust);
            this._verticalSeparator = $(this._options.separator);
            // Register event handler to toggle operator finder.
            this._application.commandManager.registerCommand(options.command.id, { shortcuts: options.command.shortcuts });
            this._application.commandManager.registerHandler(options.command.id, this.toggleOperatorFinder, this);
            // Compile Handlebar templates.
            this._templates = {
                container: Handlebars.compile($('#operators-side-panel-template').html()),
                searchResults: Handlebars.compile($('#operators-search-results-template').html()),
                moreDetails: Handlebars.compile($('#operator-details-template').html())
            };
            // Load installation statuses of all the extensions.
            this.loadExtensionInstallationStatuses();
            this._notInstalledExtensionArray = getNotInstalledExtensionDetails();
            this._installedExtensionArray = getInstalledExtensionDetails();
            this._partiallyInstalledExtensionArray = getPartiallyInstalledExtensionDetails();
            // Restart is required for extensions only after an installation/un-installation. Hence, the array is empty.
            this._restartRequiredExtensionArray = [];
            // Register listener for changes in extension installation statuses.
            this._application.utils.extensionStatusListener = this;
        };

        /**
         * Checks if the welcome page is active.
         *
         * @returns {boolean} Status
         */
        OperatorFinder.prototype.isWelcomePageSelected = function () {
            if (!this._activeTab) {
                this._activeTab = this._application.tabController.getActiveTab();
            }
            return !this._activeTab || this._activeTab.getTitle() === 'welcome-page';
        };

        /**
         * Toggles operator finder side panel.
         */
        OperatorFinder.prototype.toggleOperatorFinder = function () {
            if (this._activateBtn.parent('li').hasClass('active')) {
                this._container.parent().width('0px');
                this._containerToAdjust.css('padding-left', this._options.leftOffset);
                this._verticalSeparator.css('left', this._options.leftOffset - this._options.separatorOffset);
                this._activateBtn.parent('li').removeClass("active");
            } else {
                this._activateBtn.tab('show');
                this._container.parent().width(this._options.defaultWidth);
                this._containerToAdjust.css('padding-left', this._options.defaultWidth);
                this._verticalSeparator.css('left', this._options.defaultWidth - this._options.separatorOffset);
            }
        };

        /**
         * Loads extension installation statuses.
         */
        OperatorFinder.prototype.loadExtensionInstallationStatuses = function () {
            var self = this;
            var serviceUrl = self._application.config.services.extensionsInstallation.endpoint;
            var getAllExtensionStatusesUrl = serviceUrl + "/status";
            $.ajax({
                type: "GET",
                contentType: "json",
                url: getAllExtensionStatusesUrl,
                async: false,
                success: function (data) {
                    self._application.utils.extensionData = new Map(Object.entries(data));
                },
                error: function (e) {
                    alerts.error("Unable to read extension statuses." +
                        "Please see the editor console for further information.")
                    throw "Unable to read extension statuses";
                }
            });
        };

        /**
         * Marks the given extension's status as restart required.
         *
         * @param extension     Extension object.
         */
        OperatorFinder.prototype.markAsRestartRequired = function (extension) {
            this._application.utils.extensionData.set(extension.extensionInfo.name, extension);
            var currentArray = this.getCurrentArray(extension);
            self.moveInstallationUpdatedExtension(extension, currentArray, this._restartRequiredExtensionArray);
            extension.extensionStatus = Constants.RESTART_REQUIRED;
            // Re-render only if the operator-finder is open.
            if (this._operators) {
                self.renderSearchResults($('#operator-search-input-field').get(0).value);
            }
        };

        /**
         * Returns the array in which, the given extension exists.
         *
         * @param extension Extension object.
         * @returns {Array} The array in which, the given extension exists.
         */
        OperatorFinder.prototype.getCurrentArray = function (extension) {
            var filteredExtensions;
            filteredExtensions = _.filter(
                this._installedExtensionArray,
                function (ext) {
                    return ext.extensionInfo.name === extension.extensionInfo.name
                });
            if (filteredExtensions.length > 0) {
                return this._installedExtensionArray;
            }
            filteredExtensions = _.filter(
                this._partiallyInstalledExtensionArray,
                function (ext) {
                    return ext.extensionInfo.name === extension.extensionInfo.name
                });
            if (filteredExtensions.length > 0) {
                return this._partiallyInstalledExtensionArray;
            }
            return this._notInstalledExtensionArray;
        };

        /**
         * Moves the given extension from the given current array to the given target array.
         *
         * @param extension     Extension object to be moved.
         * @param currentArray  Current array of the extension object.
         * @param targetArray   Destination array for the extension object.
         */
        OperatorFinder.prototype.moveInstallationUpdatedExtension = function (extension, currentArray, targetArray) {
            var index = currentArray.indexOf(extension);
            if (index > -1) {
                currentArray.splice(index, 1);
                targetArray.push(extension);
            }
        };

        /**
         * functions to get the not installed extension array details.
         */
        var getNotInstalledExtensionDetails = function () {
            var notInstalledExtension = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus.trim().toUpperCase() === Constants.EXTENSION_NOT_INSTALLED) {
                    notInstalledExtension.push(extension);
                }
            });
            return notInstalledExtension;
        };
        /**
         *get the partial install extension details.
         * @returns {[array]}
         */
        var getPartiallyInstalledExtensionDetails = function () {
            var partiallyInstalledExtension = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus.trim().toUpperCase() === Constants.EXTENSION_PARTIALLY_INSTALLED) {
                    partiallyInstalledExtension.push(extension);
                }
            });
            return partiallyInstalledExtension;
        };
        /**
         *get the Installed extension details
         * @returns {*}
         */
        var getInstalledExtensionDetails = function () {
            var installedExtension = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus.trim().toUpperCase() === Constants.EXTENSION_INSTALLED) {
                    installedExtension.push(extension);
                }
            });
            return installedExtension;
        };

        /**
         * Get restart required extension details.
         *
         * @returns {Array}
         */
        var getRestartRequiredExtensionDetails = function () {
            var restartRequiredExtensions = [];
            self._application.utils.extensionData.forEach(function (extension) {
                if (extension.extensionStatus.trim().toUpperCase() === Constants.RESTART_REQUIRED) {
                    restartRequiredExtensions.push(extension);
                }
            });
            return restartRequiredExtensions;
        };


        /**
         * get the partial intall extension object.
         * @param operatorExtension
         * @returns {Array}
         */
        var getPartiallyInstalledExtensionObject = function (operatorExtension) {
            for (var extension of self._partiallyInstalledExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };
        /**
         * get the installed extension object
         * @param operatorExtension
         */
        var getInstalledExtensionObject = function (operatorExtension) {
            for (var extension of self._installedExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };
        /**
         * get the not-installed extension object based on extension name.
         * @param operatorExtensionName
         * @returns {extension Object}
         */
        var getNotInstalledExtensionObject = function (operatorExtension) {
            for (var extension of self._notInstalledExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };

        /**
         * Get restart required extension objects based on extension name
         * @param operatorExtension
         * @returns {*}
         */
        var getRestartRequiredExtensionObject = function (operatorExtension) {
            for (var extension of self._restartRequiredExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return extension;}
            }
        };


        /**
         * check the whether operator extension is installed or not.
         * @param operatorExtensionName
         * return true/false.
         */
        var isNotInstalledExtension = function (operatorExtension) {
            for (var extension of self._notInstalledExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };

        /**
         * check the whether operator extension is partially installed or not.
         * @param operatorExtension
         * @returns {boolean}
         */
        var isPartialInstalledExtension = function (operatorExtension) {
            for (var extension of self._partiallyInstalledExtensionArray) {
                if ( ( (operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };
        /**
         * check the whether operator extension  installed or not.
         * @param operatorExtension
         * @returns {boolean}
         */
        var isInstalledExtension = function (operatorExtension) {
            var installedExtensionArray = getInstalledExtensionDetails();
            for (var extension of installedExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };

        /**
         * check the whether operator extension  installed or not.
         * @param operatorExtension
         * @returns {boolean}
         */
        var isRestartRequiredExtension = function (operatorExtension) {
            var restartRequiredExtensionArray = getRestartRequiredExtensionDetails();
            for (var extension of restartRequiredExtensionArray) {
                if (((operatorExtension.name.trim().toLowerCase()).indexOf(extension.extensionInfo.name.trim().toLowerCase())) > -1) {return true;}
            }
        };


        /**
         * Searches operators using the given query.
         * @param query String query
         * @returns {{results: Array, hasResults: boolean, hasQuery: boolean, namespaces: *}} Search results
         */
        OperatorFinder.prototype.searchOperators = function (query) {
            var tokens = [];
            if (query) {
                query.split(' ').forEach(function (token) {
                    if (token.length >= 2) {
                        tokens.push(token);
                    }
                });
            }
            var keyResult = [], descriptionResult = [], combineResults;
            this._operators.forEach(function (operatorExtension, i) {
                var result = {
                    fqn: hasToken(operatorExtension.fqn, tokens),
                    description: hasToken(operatorExtension.description, tokens)
                };
                if (result.fqn.status) {
                    if (isNotInstalledExtension(operatorExtension)) {
                        keyResult.push({
                            extension: getNotInstalledExtensionObject(operatorExtension),
                            notInstall: Constants.EXTENSION_NOT_INSTALLED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else if (isPartialInstalledExtension(operatorExtension)) {
                        keyResult.push({
                            extension: getPartiallyInstalledExtensionObject(operatorExtension),
                            partialInstall: Constants.EXTENSION_PARTIALLY_INSTALLED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else if (isInstalledExtension(operatorExtension)) {
                        keyResult.push({
                            extension: getInstalledExtensionObject(operatorExtension),
                            install: Constants.EXTENSION_INSTALLED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else if (isRestartRequiredExtension(operatorExtension)) {
                        keyResult.push({
                            extension: getRestartRequiredExtensionObject(operatorExtension),
                            restartRequired: Constants.RESTART_REQUIRED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else {
                        keyResult.push({
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    }
                } else if (result.description.status) {
                    if (isNotInstalledExtension(operatorExtension)) {
                        descriptionResult.push({
                            extension: getNotInstalledExtensionObject(operatorExtension),
                            notInstall: Constants.EXTENSION_NOT_INSTALLED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else if (isPartialInstalledExtension(operatorExtension)) {
                        descriptionResult.push({
                            extension: getPartiallyInstalledExtensionObject(operatorExtension),
                            partialInstall: Constants.EXTENSION_PARTIALLY_INSTALLED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else if (isInstalledExtension(operatorExtension)) {
                        descriptionResult.push({
                            extension: getInstalledExtensionObject(operatorExtension),
                            install: Constants.EXTENSION_INSTALLED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else if (isRestartRequiredExtension(operatorExtension)) {
                        descriptionResult.push({
                            extension: getRestartRequiredExtensionObject(operatorExtension),
                            restartRequired: Constants.RESTART_REQUIRED,
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    } else {
                        descriptionResult.push({
                            fqn: operatorExtension.fqn,
                            htmlFqn: result.fqn.text,
                            type: operatorExtension.type,
                            description: result.description.text,
                            index: i
                        });
                    }
                }
            });
            combineResults = keyResult.concat(descriptionResult);
            return {
                results: combineResults,
                hasResults: combineResults.length > 0,
                hasQuery: tokens.length > 0,
                namespaces: this._namespaces
            };
        };

        /**
         * Renders search results in the side pane.
         *
         * @param query Search query
         */
        OperatorFinder.prototype.renderSearchResults = function (query) {
            var content = $('#operator-finder').find('.result-content');
            var results = this.searchOperators(query);
            content.html(this._templates.searchResults(results));

            // If there is search query and results, initialize the interface.
            if (results.hasQuery && results.hasResults) {
                content.find('h4, .icon-bar a').tooltip();
                if (this.isWelcomePageSelected()) {
                    content.find('a.add-to-source').addClass('disabled');
                }
            }
            $('.nano').nanoScroller();
        };

        /**
         * Adds syntax to the cursor point in the source view.
         *
         * @param index Operator index
         */
        OperatorFinder.prototype.addToSource = function (index) {
            if (this._operators[index]) {
                var syntax = this._operators[index].syntax[0].clipboardSyntax;
                var aceEditor = this._activeTab.getSiddhiFileEditor().getSourceView().getEditor();
                aceEditor.session.insert(aceEditor.getCursorPosition(), syntax);
            }
        };

        /**
         * copy the each clipboard syntax of extension.
         *
         * @param index Operator index
         * @param exIndex clipboard syntax
         * @param container container Current container to find the context
         */
        OperatorFinder.prototype.copyToClipboard = function (index, exIndex, container) {
            if (this._operators[index]) {
                var syntax = this._operators[index].syntax[exIndex].clipboardSyntax;
                container.find('.copyable-text').val(syntax).select();
                document.execCommand('copy');
            }
        };

        /**
         * Updates the given button as 'loading', during an extension's installation.
         *
         * @param button    Install/Un-install button.
         */
        OperatorFinder.prototype.handleExtensionInstallationInProgress = function (button) {
            button.empty();
            button.addClass('fw-loader5');
            button.addClass('fw-spin');
        };

        /**
         * Renders the interface.
         */
        OperatorFinder.prototype.render = function () {
            var self = this;

            // Initialize sidebar panel.
            this._container.append(this._templates.container());
            var resultContent = $('#operator-finder').find('.result-content');
            var detailsModal = $('#modalOperatorDetails').clone();
            var modalContent = detailsModal.find('.modal-content');

            // Event handler for the sidebar (activate) button.
            this._activateBtn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!$(this).hasClass('disabled')) {
                    self._application.commandManager.dispatch(self._options.command.id);
                }

                // If the operators are not available, get them from the completion engine.
                if (!self._operators) {
                    loadOperators(function(namespaces, operator) {
                        self._namespaces = namespaces;
                        self._operators = operator;
                        self.renderSearchResults();
                    });
                }
            });

            // Event handler to modal shown event.
            detailsModal.on('shown.bs.modal', function () {
                $('.nano').nanoScroller();
            });

            // Event handler for modal's extension syntax copy to clipboard event.
            modalContent.on('click', '.copy-to-clipboard', function () {
                var index = detailsModal.find('#operator-name').data('index');
                var exIndex = $(this).data('clip-index');
                self.copyToClipboard(index, exIndex, modalContent);
                alertCopyToClipboardMessage(modalContent.find('.copy-status-msg'));
            });

            // Event handler for modal's add to source event.
            modalContent.on('click', '#btn-add-to-source', function () {
                var index = detailsModal.find('#operator-name').data('index');
                self.addToSource(index);
            });

            // Event handler for search query textbox's key-up event.
            $('#operator-search-input-field').on('keyup', function () {
                self.renderSearchResults($(this).val());
            });

            // Event handler for namespaces list click event.
            resultContent.on('click', 'a.namespace-entry', function (e) {
                e.preventDefault();
                var query = $(this).text() + ':';
                $('#operator-search-input-field').val(query);
                self.renderSearchResults(query);
            });

            // Event handler for extension installation.
            resultContent.on('click', 'a.extension-install-btn', function (e) {
                var innerSelf = this;
                e.preventDefault();
                var handleCallback = function (extension) {
                    self.markAsRestartRequired(extension);
                };
                var extensionObject = getNotInstalledExtensionObject({name: $(this).data('extension-name')});
                self._application.utils.installOrUnInstallExtension(
                    extensionObject,
                    self._application,
                    self.handleExtensionInstallationInProgress,
                    handleCallback,
                    $(this),
                    Constants.INSTALL,
                    innerSelf);
            });

            // Event handler for extension un-installation.
            resultContent.on('click', 'a.extension-un-install-btn', function (e) {
                var innerSelf = this;
                e.preventDefault();
                var handleCallback = function (extension) {
                    self.markAsRestartRequired(extension);
                };
                var extensionObject = getInstalledExtensionObject({name: $(this).data('extension-name')});
                self._application.utils.installOrUnInstallExtension(
                    extensionObject,
                    self._application,
                    self.handleExtensionInstallationInProgress,
                    handleCallback,
                    $(this),
                    Constants.UNINSTALL,
                    innerSelf);
            });

            // Event handler for partially installed extension.
            resultContent.on('click', 'a.partial-extension-install-btn', function (e) {
                e.preventDefault();
                var extensionName = {name: $(this).data('extension-names')};
                var extension = getPartiallyInstalledExtensionObject(extensionName);
                self._partialModel = $(
                    '<div class="modal fade" id="' + extension.extensionInfo.name + '">' +
                    '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                    '<div class="modal-header">' +
                    "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>" +
                    "<i class=\"fw fw-cancel  about-dialog-close\"></i>" +
                    "</button>" +
                    '<h2 class="modal-title file-dialog-title" id="partialExtenName">'
                    + extension.extensionInfo.name +
                    '</h2>' +
                    '<hr class="style1">' +
                    '</div>' +
                    '<div id="modalBodyId" class="modal-body">' +
                    '</div>' +
                    '<div class="modal-footer">' +
                    '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>');

                var modalBody = self._partialModel.find("div").filter("#modalBodyId");

                if (extension.manuallyInstall) {
                    modalBody.append($('<div style="text-align:justify">' +
                        'The following dependencies should be manually installed.</div>'));
                    extension.manuallyInstall.forEach(function (dependency) {
                        var instructions = dependency.download.instructions ?
                            (`<h4>Instructions</h4><div id="partialExtenDescription" style = "text-align:justify">` +
                                `${dependency.download.instructions}</div>`) :
                            ('<div id="partialExtenDescription" style="text-align:justify">' +
                                'No instructions found.</div>');
                        var usages = (`<h4>Installation Locations</h4>` +
                            `<div id="partialExtenDescription" style = "text-align:justify">` +
                            `<ol>${dependency.usages.map(usage => 
                                    `<li>${usage.type.toLowerCase()} in ${usage.usedBy.toLowerCase()}</li>`
                                )}</ol></div>`);

                        modalBody.append($(`<h3>${dependency.name}</h3>` +
                            `<div style="padding-left:10px">${instructions}<br/>${usages}</div>`));
                    });
                }
                self._partialModel.modal('show');

                }
            );

            resultContent.on('click', 'a.more-info', function (e) {
                e.preventDefault();
                var index = $(this).closest('.result').data('index');
                var data = _.clone(self._operators[index]);

                data.hasSyntax = (data.syntax || []).length > 0;
                data.hasExamples = (data.examples || []).length > 0;
                data.hasParameters = (data.parameters || []).length > 0;
                data.hasReturnAttributes = (data.returnAttributes || []).length > 0;
                data.index = index;
                data.enableAddToSource = !self.isWelcomePageSelected() && isSourceView();
                modalContent.html(self._templates.moreDetails(data));
                detailsModal.modal('show');
            });

            // Event handler to expand description.
            resultContent.on('click', 'a.expand-description', function (e) {
                e.preventDefault();
                var container = $(this).closest('.result');
                if (container.hasClass('less')) {
                    $(this).text('Less...');
                    container.removeClass('less');
                } else {
                    $(this).text('More...');
                    container.addClass('less');
                }
            });

            // Event handler for add to source button.
            resultContent.on('click', 'a.add-to-source', function (e) {
                e.preventDefault();
                if (self.isWelcomePageSelected()) {
                    return;
                }
                var index = $(this).closest('.result').data('index');
                self.addToSource(index);
            });

            // Event handler for copy syntax to clipboard.
            resultContent.on('click', 'a.copy-to-clipboard', function (e) {
                e.preventDefault();
                var resultElement = $(this).closest('.result');
                self.copyToClipboard(resultElement.data('index'), 0, $('#operator-finder'));
                alertCopyToClipboardMessage(resultElement.find('.copy-status-msg'));
            });

            // Event handler for active tab change event.
            self._application.tabController.on('active-tab-changed', function (e) {
                self._activeTab = e.newActiveTab;
                toggleAddToSource(self.isWelcomePageSelected() || !isSourceView());
            }, this);

            var shortcutPath = 'command.shortcuts.' + (this._application.isRunningOnMacOS() ? 'mac' : 'other') + '.label';
            this._activateBtn
                .attr('title', '组件查找器 (' + _.get(self._options, shortcutPath) + ')')
                .tooltip();
        };
        return {
            OperatorFinder: OperatorFinder,
            toggleAddToSource: toggleAddToSource
        };
    });
