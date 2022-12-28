import {ColumnInfo, Data, JoinType, NodeContext, NodeProps, NodeType, Operation, Trigger} from "./types";
import React from "react";
import {nanoid} from "nanoid";
import {getNodeFc} from "./components_mapping";


const DEBUG = true;

export const createNode = ({data, context, trigger, onRemove}: NodeProps) => {
    const fn = getNodeFc(data.type)

    if (!fn) {
        if (DEBUG) {
            return (<div key={data.key}><span>Can't find node with type: "{data.type}"</span></div>);
        }
        return (<React.Fragment/>);
    }
    return fn({
        data: data,
        context: context,
        trigger: (op: Operation, keys: string[], args: Data) => {
            // debugger;
            trigger(op, [data.key, ...keys], args);
        },
        onRemove: onRemove
    });
}

export const createNodeByType = ({
                                     data,
                                     type,
                                     context,
                                     trigger,
                                     defaultEl
                                 }: { data: Data, type: NodeType, context: NodeContext, trigger: Trigger, defaultEl?: JSX.Element }) => {
    if (!defaultEl) {
        defaultEl = (<React.Fragment/>);
        if (DEBUG) {
            defaultEl = (<div key={nanoid()}><span>Can't find node with type: "{type}"</span></div>);
        }
    }
    if (!data.children) {
        return defaultEl;
    }
    const nodeData = data.children.find(d => d.type === type);
    if (nodeData) {
        return createNode({data: nodeData, context: context, trigger});
    }
    return defaultEl;
}

export const getNodeByType = ({data, type}: { data: Data, type: NodeType }) => {
    return data.children && data.children.find(d => d.type === type);
}


export const getNodesByType = ({data, type}: { data: Data, type: NodeType }) => {
    if (!data.children) {
        return []
    } else {
        return data.children.filter(d => d.type === type);
    }
}


export const addNode = (data: Data, args: Data, trigger: Trigger, prepend: boolean = false) => {
    const children = data.children && Array.isArray(data.children) ? data.children : [];
    const newData = {
        ...data,
        children: prepend ? [args, ...children] : [...children, args],
    }
    trigger(Operation.SetState, [], newData);
}


export const removeNode = (data: Data, key: string, trigger: Trigger) => {
    const children: Data[] = data.children && Array.isArray(data.children) ? data.children : [];
    const newData = {
        ...data,
        children: [...children.filter((d) => d.key !== key)]
    }
    trigger(Operation.SetState, [], newData);
}


export const getAliasFromColumn = (data: Data): string => {
    const alias = getNodeByType({data, type: NodeType.Alias});
    if (alias && alias.data && alias.data.alias) {
        return alias.data.alias;
    }
    return '';
}

export const getAliasFromTable = (data: Data): string => {
    const alias = getNodeByType({data, type: NodeType.Alias});
    if (alias && alias.data && alias.data.alias) {
        return alias.data.alias;
    }
    return '';
}

export const getColumnsFromSelect = (data: Data): ColumnInfo[] => {
    const columnsData = getNodeByType({data, type: NodeType.Columns});

    return columnsData ? getNodesByType({
        data: columnsData,
        type: NodeType.Column
    }).map((c) => {
        return {
            key: c.key,
            name: getAliasFromColumn(c),
        }
    }) : []
}

export const createCteData = (): Data => {
    return {
        key: nanoid(),
        type: NodeType.CTE,
        data: {},
        children: [
            {
                key: nanoid(),
                type: NodeType.Alias,
                data: {},
            },
            createSelectData(),
        ]
    };
}

export const createJoinData = (): Data => {
    return {
        key: nanoid(),
        type: NodeType.Join,
        data: {
            type: JoinType.Left,
            keys: Object.keys(JoinType),
        },
        children: [
            {
                key: nanoid(),
                type: NodeType.Table,
                data: {},
            },
            {
                key: nanoid(),
                type: NodeType.JoinOn,
                data: {},
                children: [
                    {
                        key: nanoid(),
                        type: NodeType.Var,
                        data: {},
                    },
                    {
                        key: nanoid(),
                        type: NodeType.Var,
                        data: {},
                    },
                ]
            },
        ]
    };
}

export const createColumnData = (): Data => {
    return {
        key: nanoid(),
        type: NodeType.Column,
        data: {},
        children: [
            {
                key: nanoid(),
                type: NodeType.Var,
                data: {},
            },
        ]
    }
}

export const createSelectData = (): Data => {
    return {
        key: nanoid(),
        type: NodeType.Select,
        data: {},
        children: [
            {
                key: nanoid(),
                type: NodeType.Columns,
                data: {},
                children: [],
            },
            {
                key: nanoid(),
                type: NodeType.From,
                data: {},
                children: [
                    {
                        key: nanoid(),
                        type: NodeType.Table,
                        data: {},
                    },
                ]
            },
            {
                key: nanoid(),
                type: NodeType.Where,
                data: {},
            }
        ]
    };
}

const emptyDefault = (defaultValue: any, fn: (data: Data) => string) => {
    return (data: Data | undefined): string => {
        if (!data) {
            return defaultValue;
        }
        return fn(data);
    }
}

const getAliasRawSql = emptyDefault('', (data: Data): string => {
    return data.data.alias ?? '';
})

const getVarRawSql = emptyDefault('', (data: Data): string => {
    const isRaw = data.data.isRaw ?? false;
    if (isRaw) {
        return (data.data.rawSql ?? '');
    }
    return (data.data.selectedValue ? `"column_#${data.data.selectedValue}"` : ''); //TODO add schema ref
})

const getTableRawSql = emptyDefault('', (data: Data): string => {
    const table= (data.data.selectedValue ? `"table_#${data.data.selectedValue}"` : ''); //TODO add schema ref
    const alias = getAliasRawSql(getNodeByType({data, type: NodeType.Alias}));
    return table + (alias ? ` as ${alias}` : '');
})


const getColumnRawSql = (data: Data): string => {
    const alias = getAliasRawSql(getNodeByType({data, type: NodeType.Alias}));
    const variable = getVarRawSql(getNodeByType({data, type: NodeType.Var}));

    return variable + ' as ' + alias; //TODO add schema ref
}

const getColumnsRawSql = (data: Data): string => {
    const columns = getNodesByType({data, type: NodeType.Column});

    return columns.length ? columns.map(getColumnRawSql).join(',') : '*';
}

const getFromRawSql = (data: Data): string => {
    const table = getTableRawSql(getNodeByType({data, type: NodeType.Table}));
    const joins: Data[] = [];
    return table + (joins.length ? joins.map(getJoinRawSql).join(', ') : '');
}

const getJoinRawSql = (data: Data): string => {
    //TODO: implement it
    return 'TODO JOINS';
}

const getSelectRawSql = (data: Data): string => {
    const columnsData = getNodeByType({data, type: NodeType.Columns});
    const columns = columnsData ? getColumnsRawSql(columnsData) : '*';
    const fromData = getNodeByType({data, type: NodeType.From});
    const from = fromData ? getFromRawSql(fromData) : '';

    return "SELECT " + columns + " FROM " + from;
}

const getCteRawSql = (data: Data): string => {
    const selectData = getNodeByType({data, type: NodeType.Select});
    const aliasData = getNodeByType({data, type: NodeType.Alias});
    const select = selectData ? getSelectRawSql(selectData) : '';
    const alias = aliasData ? getAliasRawSql(aliasData) : '';
    return alias + '(' + select + ')';
}

const getCtesRawSql = (data: Data): string => {
    const ctes = getNodesByType({data, type: NodeType.CTE});
    return ctes.length ? "WITH " + ctes.map(getCteRawSql).join(',') : '';
}

const getQueryRawSql = (data: Data): string => {
    const ctesData = getNodeByType({data, type: NodeType.CTEs});
    const ctes: string = ctesData ? getCtesRawSql(ctesData) : '';
    const selectData = getNodeByType({data, type: NodeType.Select});
    const select: string = selectData ? getSelectRawSql(selectData) : '';
    return ctes + select;

}

export const getRawSql = (data: Data): string => {
    switch (data.type) {
        case NodeType.Query:
            return getQueryRawSql(data);
        default:
            return `Can't get SQL for node type: ${data.type} key: ${data.key}`;
    }
}