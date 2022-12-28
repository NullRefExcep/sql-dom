export enum NodeType {
    Base = "base",
    List = "list",
    Var = "var",

    Query = "query",
    Select = "select",
    CTEs = "ctes",
    CTE = "cte",
    Columns = "columns",
    Column = "column",
    From = "from",
    Where = "where",
    GroupBy = "groupBy",
    Qualify = "qualify",
    OrderBy = "orderBy",
    Limit = "limit",
    Table = "table",
    Alias = "alias",
    Join = "join",
    JoinOn = "joinOn",

    SourceTable = 'sourceTable',
}


export enum JoinType {
    Left = 'left',
    Right = 'right',
    Inner = 'inner',
}

export interface Data {
    key: string,
    type: NodeType
    data: any
    children?: Data[]
}

export enum Operation {
    SetState = "setState",
}

export type Trigger = (op: Operation, keys: string[], args: Data) => void;


export type ColumnInfo = {
    key: string,
    from?: string,
    name: string,
    isPk?: boolean,
};

export type TableInfo = {
    key: string,
    name: string,
    columns: ColumnInfo[],
};

export interface Schema {
    from: TableInfo[]
}

export interface AvailableColumns {
    columns: ColumnInfo[]
}

export interface NodeContext {
    // schema?:
    schema: Schema,
    localSchema: Schema,
    availableColumns: AvailableColumns,
}

export interface NodeProps {
    data: Data
    context: NodeContext
    trigger: Trigger
    onRemove?: () => void
}

export type NodeFC = ({data, trigger}: NodeProps) => JSX.Element;
