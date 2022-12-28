import React, {useState} from "react";
import {Schema as DbSchema} from "./schema/Schema";
import {createDbSchema} from "./v4/contexts";
import {createTheme, ThemeProvider} from "@mui/material/styles";
import {nanoid} from "nanoid";
import {format} from 'sql-formatter';

import {createNode, createSelectData, getRawSql} from "./v4/functions";
import {Data, NodeContext, NodeType, Operation} from "./v4/types";
import "./v4/components";
import {DEFAULT_NODE_CONTEXT} from "./v4/contexts";

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});


const setState = (data: Data, keys: string[], args: Data): Data => {
    if (keys.length === 1) {
        return {
            ...args,
        }
    }
    if (!data.children) {
        return data;
    }
    const key = keys[1];
    const newKeys = keys.slice(1);
    const index = data.children.findIndex((d) => d.key === key);

    const nodeData = data.children[index]

    const newNodeData = setState(nodeData, newKeys, args);

    data.children[index] = newNodeData;

    return {
        ...data,
        children: [...data.children],
    };
}

const createHandler = (data: Data, setData: (d: Data) => void) => {
    return (op: Operation, keys: string[], args: Data) => {
        let newData = data;
        if (op === Operation.SetState) {
            newData = setState(data, keys, args);
        }

        setData(newData);
    }
}


function newQueryData(): Data {
    return {
        key: nanoid(),
        type: NodeType.Query,
        data: {},
        children: [
            {
                key: nanoid(),
                type: NodeType.CTEs,
                data: {},
                children: []
            },
            createSelectData(),
        ],
    }

}

const DEFAULT_DATA: Data = newQueryData()

const createSourceData = (schema: DbSchema): Data => {
    return {
        key: nanoid(),
        type: NodeType.List,
        data: {},
        children: schema.tables.map((t) => {
            return {
                key: nanoid(),
                type: NodeType.SourceTable,
                data: {
                    alias: t.name,
                    columns: t.columns,
                }
            }
        })
    }
}

function App() {
    const [data, setData] = useState<Data>(DEFAULT_DATA);

    const [schema, setSchema] = useState<DbSchema>(createDbSchema());

    const dataHandler = createHandler(data, setData);

    const [queryContext, setQueryContext] = useState<NodeContext>({
        ...DEFAULT_NODE_CONTEXT,
        schema: {
            from: schema.tables.map(t => ({
                key: t.id,
                name: t.name,
                columns: t.columns.map(c => ({
                    key: c.id,
                    from: t.name,
                    name: c.name,
                    isPk: c.is_pk,
                }))
            })),
        },
    });


    const [sourceData, setSourceData] = useState<Data>(createSourceData(schema));
    const sourceDataHandler = createHandler(sourceData, setSourceData);

    let rawSql = '';
    try {
        // rawSql = format(getRawSql(data), {language: 'snowflake'})
        //TODO: add replacement for tables and columns from schema
        rawSql = getRawSql(data);
    } catch (e) {
        rawSql = JSON.stringify(e);
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <div className="app QueryBuilder wr60">
                <h2>Query Builder</h2>
                {createNode({data, context: queryContext, trigger: dataHandler})}
                <pre>
                        {/*{JSON.stringify(data, null, 2)}*/}
                    {/*{JSON.stringify(schema, null, 2)}*/}
                    </pre>
            </div>
            {/*<div className="app RawSql wr20">*/}
            {/*    <h2>Raw SQL</h2>*/}
            {/*    <pre>*/}
            {/*        {rawSql}*/}
            {/*        /!*TODO: add Ace Editor*!/*/}
            {/*    </pre>*/}
            {/*</div>*/}
            <div className="app SourceExplorer wr20">
                <h2>Sources</h2>
                {createNode({data: sourceData, context: DEFAULT_NODE_CONTEXT, trigger: sourceDataHandler})}
            </div>
        </ThemeProvider>
    );
}

export default App;