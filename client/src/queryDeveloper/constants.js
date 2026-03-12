export const SQL_PROVIDERS = ["MsSql", "Oracle", "MySql", "MariaDb", "PostgreSql", "Machbase", "OleDb", "Influx", "SQLite"];

export const TREE_NODE_DEPTH_INDENT_PX = 10;

export const CONTEXT_ALLOWED_CHILDREN = Object.freeze({
  root: ["system"],
  system: ["module"],
  module: ["function"],
  function: ["sqlGroup"],
  sqlGroup: [],
});

export const TREE_ACTION_ENDPOINTS = [
  "/api/qsf/query-developer/tree-action",
  "/api/qsf/tree-action",
  "/api/qsf/query-developer/treeAction",
  "/api/qsf/treeAction",
  "/api/qsf/query-developer/tree/action",
];
