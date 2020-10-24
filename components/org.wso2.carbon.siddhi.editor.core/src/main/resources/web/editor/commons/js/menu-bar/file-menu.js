/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org)  Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0
 */
define([], function () {
    var FileMenu = {
        id: "file",
        label: "文件",
        items: [
            {
                id: "new",
                label: "新建",
                command: {
                    id: "create-new-tab",
                    shortcuts: {
                        mac: {
                            key: "command+option+n",
                            label: "\u2318\u2325N"
                        },
                        other: {
                            key: "ctrl+alt+n",
                            label: "Ctrl+Alt+N"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "newETLFlow",
                label: "新ETL处理流",
                command: {
                    id: "create-new-etl-flow",
                    shortcuts: {
                        mac: {
                            key: "command+option+t",
                            label: "\u2318\u2325T"
                        },
                        other: {
                            key: "ctrl+alt+t",
                            label: "Ctrl+Alt+T"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "open",
                label: "打开文件",
                command: {
                    id: "open-file-open-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+o",
                            label: "\u2318O"
                        },
                        other: {
                            key: "ctrl+o",
                            label: "Ctrl+O"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "openSample",
                label: "打开样例",
                command: {
                    id: "open-sample-file-open-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+shift+o",
                            label: "\u2318\u21E7O"
                        },
                        other: {
                            key: "ctrl+shift+o",
                            label: "Ctrl+Shift+O"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "save",
                label: "保存",
                command: {
                    id: "save",
                    shortcuts: {
                        mac: {
                            key: "command+s",
                            label: "\u2318S"
                        },
                        other: {
                            key: "ctrl+s",
                            label: "Ctrl+S"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "saveAs",
                label: "另存为",
                command: {
                    id: "open-file-save-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+shift+s",
                            label: "\u2318\u21E7S"
                        },
                        other: {
                            key: "ctrl+shift+s",
                            label: "Ctrl+Shift+S"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "import",
                label: "导入文件",
                command: {
                    id: "import-file-import-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+i",
                            label: "\u2318I"
                        },
                        other: {
                            key: "ctrl+i",
                            label: "Ctrl+I"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "export",
                label: "导出文件",
                command: {
                    id: "export",
                    shortcuts: {
                        mac: {
                            key: "command+e",
                            label: "\u2318E"
                        },
                        other: {
                            key: "ctrl+e",
                            label: "Ctrl+E"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "close",
                label: "关闭文件",
                command: {
                    id: "close",
                    shortcuts: {
                        mac: {
                            key: "command+shift+c",
                            label: "\u2318\u21E7C"
                        },
                        other: {
                            key: "ctrl+shift+c",
                            label: "Ctrl+Shift+C"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "closeAll",
                label: "关闭所有文件",
                command: {
                    id: "close-all",
                    shortcuts: {
                        mac: {
                            key: "command+alt+x",
                            label: "\u2318\u2303X"
                        },
                        other: {
                            key: "ctrl+alt+x",
                            label: "Ctrl+Alt+X"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "delete",
                label: "删除文件",
                command: {
                    id: "delete-file-delete-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+d",
                            label: "\u2318D"
                        },
                        other: {
                            key: "ctrl+d",
                            label: "Ctrl+D"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "settings",
                label: "设置",
                command: {
                    id: "open-settings-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+option+e",
                            label: "\u2318\u2325E"
                        },
                        other: {
                            key: "ctrl+alt+e",
                            label: "Ctrl+Alt+E"
                        }
                    }
                },
                disabled: false
            }

        ]

    };

    return FileMenu;
});
