/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([], function () {
    var DeployMenu = {
        id: "deploy",
        label: "部署",
        items: [
            {
                id: "deploy-to-server",
                label: "部署到服务器",
                command: {
                    id: "deploy-to-server",
                    shortcuts: {
                        mac: {
                            key: "command+shift+p",
                            label: "\u2318\u21E7P"
                        },
                        other: {
                            key: "ctrl+shift+p",
                            label: "Ctrl+Shift+P"
                        }
                    }
                },
                disabled: false
            }
        ]
    };
    return DeployMenu;
});
