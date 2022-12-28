import React from "react";
import {Schema as DbSchema} from "../schema/Schema";
import Table from "../schema/Table";
import TableColumn from "../schema/TableColumn";
import ColumnType from "../schema/ColumnType";
import {AvailableColumns, Schema, NodeContext} from "./types";


export const SchemaContext = React.createContext(new DbSchema('empty-schema', []));

export const createDbSchema = () => {
    return new DbSchema('db-schema', [
        new Table('customers', [
            new TableColumn('customer_id', ColumnType.Integer, true),
            new TableColumn('name', ColumnType.Varchar),
            new TableColumn('username', ColumnType.Varchar),
        ]),
        new Table('order', [
            new TableColumn('order_id', ColumnType.Integer, true),
            new TableColumn('customer_id', ColumnType.Integer),
            new TableColumn('created_at', ColumnType.Datetime),
            new TableColumn('total', ColumnType.Integer),
        ]),
        new Table('order_item', [
            new TableColumn('order_id', ColumnType.Integer, true),
            new TableColumn('product_id', ColumnType.Integer),
            new TableColumn('price', ColumnType.Integer),
            new TableColumn('qty', ColumnType.Integer),
        ]),
        new Table('product', [
            new TableColumn('product_id', ColumnType.Integer, true),
            new TableColumn('price', ColumnType.Integer),
            new TableColumn('type', ColumnType.Varchar),
            new TableColumn('is_special', ColumnType.Boolean),
        ]),
    ])
}

export const DEFAULT_SCHEMA: Schema = {
    from: [],
}

export const DEFAULT_AVAILABLE_COLUMNS: AvailableColumns = {
    columns: [],
}

export const DEFAULT_NODE_CONTEXT: NodeContext = {
    schema: DEFAULT_SCHEMA,
    localSchema: DEFAULT_SCHEMA,
    availableColumns: DEFAULT_AVAILABLE_COLUMNS,
}