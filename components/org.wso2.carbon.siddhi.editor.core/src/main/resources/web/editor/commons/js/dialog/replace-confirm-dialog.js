/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define(['jquery', './modal-dialog'], function ($, ModalDialog) {

    var ReplaceConfirmDialog = function (options) {
        this._options = options;
        this._$container = $(_.get(options, 'container', 'body'));
    };

    ReplaceConfirmDialog.prototype = Object.create(ModalDialog.prototype);
    ReplaceConfirmDialog.prototype.constructor = ReplaceConfirmDialog;

    ReplaceConfirmDialog.prototype.askConfirmation = function (options) {
        var self = this;

        this.setSubmitBtnText('替换');
        this.setCloseBtnText('取消');
        this._$modalContainer.addClass("replace-confirm-dialog");
        this.setTitle("替换文件?");

        var path = options.path;
        var body = this.getBody();
        body.empty();
        body.append($("<p><br>File '" + path + "' 已存在，是否替换其内容？</p>"))

        this.getSubmitBtn().unbind('click');

        this.getSubmitBtn().click(function () {
            if (_.has(options, 'handleConfirm')) {
                self.hide();
                options.handleConfirm(true);
            }
        });

        this.show();
    }

    return ReplaceConfirmDialog;
});
