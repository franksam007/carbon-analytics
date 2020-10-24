/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([], function () {
    var ExportMenu = {
        id: "export",
        label: "导出",
        items: [
            {
                id: "export-for-docker",
                label: "导出Docker",
                command: {
                    id: "export-for-docker",
                    shortcuts: {
                        mac: {
                            key: "option+d",
                            label: "\u2325D"
                        },
                        other: {
                            key: "alt+d",
                            label: "Alt+D"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "export-for-kubernetes",
                label: "导出Kubernetes",
                command: {
                    id: "export-for-kubernetes",
                    shortcuts: {
                        mac: {
                            key: "option+k",
                            label: "\u2325K"
                        },
                        other: {
                            key: "alt+k",
                            label: "Alt+K"
                        }
                    }
                },
                disabled: false
            }
        ]
    };
    return ExportMenu;
});
