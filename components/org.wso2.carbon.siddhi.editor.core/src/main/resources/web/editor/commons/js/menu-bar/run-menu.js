/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([], function () {
    var RunMenu = {
        id: "run",
        label: "运行",
        items: [
            {
                id: "run",
                label: "运行",
                command: {
                    id: "run",
                    shortcuts: {
                        mac: {
                            key: "command+r",
                            label: "\u2318R"
                        },
                        other: {
                            key: "ctrl+r",
                            label: "Ctrl+R"
                        }
                    }
                },
                disabled: true
            },
            {
                id: "debug",
                label: "调试",
                command: {
                    id: "debug",
                    shortcuts: {
                        mac: {
                            key: "command+shift+d",
                            label: "\u2318\u21E7D"
                        },
                        other: {
                            key: "ctrl+shift+d",
                            label: "Ctrl+Shift+D"
                        }
                    }
                },
                disabled: true
            },
            {
                id: "stop",
                label: "停止",
                command: {
                    id: "stop",
                    shortcuts: {
                        mac: {
                            key: "command+p",
                            label: "\u2318P"
                        },
                        other: {
                            key: "ctrl+p",
                            label: "Ctrl+P"
                        }
                    }
                },
                disabled: true
            }

        ]

    };

    return RunMenu;
});