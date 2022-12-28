import React from "react";
import {
    AvailableColumns,
    ColumnInfo,
    Data,
    JoinType,
    NodeContext,
    NodeProps,
    NodeType,
    Operation,
    Schema,
    TableInfo,
} from "./types";
import {nanoid} from "nanoid";
import {registerNodeFc} from "./components_mapping";
import {
    addNode,
    createColumnData,
    createCteData,
    createJoinData,
    createNode,
    createNodeByType,
    getAliasFromTable,
    getColumnsFromSelect,
    getNodeByType,
    getNodesByType,
    removeNode
} from "./functions";
import {DEFAULT_AVAILABLE_COLUMNS, DEFAULT_SCHEMA} from "./contexts";


export const PrintJson = ({data}: { data: any }) => {
    return (<pre>{JSON.stringify(data, null, 2)}</pre>)
}


const BaseNode = ({data, trigger}: NodeProps) => {
    return (<div><PrintJson data={data}/></div>)
}
registerNodeFc(NodeType.Base, BaseNode);


const ListNode = ({data, context, trigger}: NodeProps): JSX.Element => {
    return (<div key={data.key}>
        {data.children?.map(d => createNode({data: d, context, trigger}))}
    </div>)
}
registerNodeFc(NodeType.List, ListNode);


const VarNode = ({data, context, trigger}: NodeProps) => {


    const handleSwitchType = (_: any) => {
        trigger(Operation.SetState, [], {
            ...data,
            data: {
                ...(data.data ? data : {}),
                isRaw: !isRaw(),
            }
        });

    }
    const isRaw = () => {
        return data.data?.isRaw;
    }
    const renderRaw = () => {
        return (<input className="wr100" type="text" value={data.data?.rawSql} onChange={handleChangeRaw}/>);
    }
    const handleChangeRaw = (e: any) => {
        trigger(Operation.SetState, [], {
            ...data,
            data: {
                ...(data.data ? data.data : {}),
                rawSql: e.target.value,
            }
        });
    }
    const handleColumnChange = (e: any) => {
        trigger(Operation.SetState, [], {
            ...data,
            data: {
                ...(data.data ? data.data : {}),
                selectedValue: e.target.value,
            }
        });
    }
    const renderSelectable = () => {
        return (
            <div>
                <select className="wr100" onChange={handleColumnChange} value={data.data?.selectedValue}>
                    <option key={`${data.key}-empty`} value="">Please, select column</option>
                    {context.availableColumns.columns.map((c) => (
                        <option key={`${data.key}-${c.key}`}
                                value={c.key}>
                            {/*TODO: add pk label*/}
                            {/*{c.isPk ? ` 🔑` : ''}*/}
                            {c.from ? `${c.from}.${c.name}` : c.name}
                        </option>
                    ))}
                </select>
            </div>);
    }


    return (<div key={data.key} className="dl">
        <button onClick={handleSwitchType}>{isRaw() ? 'C' : 'R'}</button>
        <div className="wr80">
            {isRaw() ? renderRaw() : renderSelectable()}
        </div>
    </div>)
}
registerNodeFc(NodeType.Var, VarNode);


const QueryNode = ({data, context, trigger}: NodeProps) => {
    const createLocalSchema = (data: Data, context: NodeContext): Schema => {
        const ctesData = getNodeByType({data, type: NodeType.CTEs});

        let localSchema = DEFAULT_SCHEMA;

        if (ctesData) {
            getNodesByType({data: ctesData, type: NodeType.CTE}).forEach((d) => {
                const aliasData = getNodeByType({data: d, type: NodeType.Alias});
                const selectData = getNodeByType({data: d, type: NodeType.Select});

                if (aliasData && selectData) {
                    const alias = aliasData.data?.alias;
                    if (!alias) {
                        return;
                    }
                    localSchema = {
                        ...localSchema,
                        from: [...localSchema.from, {
                            key: d.key,
                            name: alias,
                            columns: getColumnsFromSelect(selectData).map((c) => ({
                                key: c.key,
                                from: alias,
                                name: c.name,
                            })),
                        }]
                    };
                }
            })
        }

        if (context.schema) {
            //TODO: add source tables
        }

        return localSchema;
    }

    const localContext: NodeContext = {
        ...context,
        localSchema: createLocalSchema(data, context),
    }

    const ctesEl = createNodeByType({data, type: NodeType.CTEs, context: context, trigger});

    return (<div key={data.key}>
        {ctesEl ? ctesEl : <React.Fragment/>}
        {createNodeByType({data, type: NodeType.Select, context: localContext, trigger})}
    </div>)
}
registerNodeFc(NodeType.Query, QueryNode);


const SelectNode = ({data, context, trigger}: NodeProps) => {

    const getAvailableColumnsFromTable = (fromData: Data, context: NodeContext): ColumnInfo[] => {
        const tableData = getNodeByType({data: fromData, type: NodeType.Table});

        if (!tableData) {
            return DEFAULT_AVAILABLE_COLUMNS.columns;
        }
        const table = [...context.localSchema.from, ...context.schema.from].find((t: TableInfo) => t.key === tableData.data?.selectedValue) as TableInfo;
        if (table) {
            const alias = getAliasFromTable(tableData);
            return table.columns.filter((c: ColumnInfo) => c.name).map(c => ({
                ...c,
                from: alias ? alias : c.from,
            }));
        }
        return DEFAULT_AVAILABLE_COLUMNS.columns;
    }
    const getAvailableColumnsFromJoins = (fromData: Data, context: NodeContext): ColumnInfo[] => {
        const joinsData = getNodesByType({data: fromData, type: NodeType.Join});
        return joinsData.map(joinData => getAvailableColumnsFromTable(joinData, context)).flat();
    }

    const createAvailableColumns = (data: Data, context: NodeContext): AvailableColumns => {
        const fromData = getNodeByType({data, type: NodeType.From});
        if (!fromData) {
            return DEFAULT_AVAILABLE_COLUMNS;
        }
        return {
            ...DEFAULT_AVAILABLE_COLUMNS,
            columns: [
                ...(getAvailableColumnsFromTable(fromData, context)),
                ...(getAvailableColumnsFromJoins(fromData, context)),
            ],

        };

    }
    const localContext: NodeContext = {
        ...context,
        availableColumns: createAvailableColumns(data, context),
    }
    return (<section key={data.key}>
        <div className="wr100">select</div>
        {createNodeByType({data, type: NodeType.Columns, context: localContext, trigger})}
        {createNodeByType({data, type: NodeType.From, context: localContext, trigger})}
        {createNodeByType({data, type: NodeType.Where, context: localContext, trigger})}
    </section>)
}
registerNodeFc(NodeType.Select, SelectNode);


const ColumnsNode = ({data, context, trigger}: NodeProps) => {
    let hasColumns = false;
    let columns: Data[] = [];
    if (data.children && data.children.length) {
        columns = data.children.filter((d: Data) => d.type === NodeType.Column);
        hasColumns = true;
    }
    const renderColumns = () => {
        return (<div className={'columns-wrap'}>{columns.map(d => createNode({
            data: d,
            context,
            trigger: trigger,
            onRemove: () => {
                removeNode(data, d.key, trigger);
            }
        }))}</div>)
    }

    const handleAddColumn = () => {
        addNode(data, createColumnData(), trigger);
    }
    const renderAddColumnBtn = () => {
        return (<div>
            <button onClick={handleAddColumn}>Column +</button>
        </div>)
    }
    return (<div key={data.key}>
        {hasColumns ? renderColumns() : <span>*</span>}
        {renderAddColumnBtn()}
    </div>);
}
registerNodeFc(NodeType.Columns, ColumnsNode);


const ColumnNode = ({data, context, trigger, onRemove}: NodeProps) => {
    const handleRemoveColumn = (e: any) => {
        if (onRemove) {
            onRemove();
        }
    }

    const defaultAlias = (<input className="wr100" type="text" disabled={true} value={''} readOnly={true}/>)
    const alias = createNodeByType({data, type: NodeType.Alias, context, trigger, defaultEl: defaultAlias});

    const handleSwitchAlias = (_: any) => {
        const aliasNode = getNodeByType({data, type: NodeType.Alias});
        if (aliasNode) {
            removeNode(data, aliasNode.key, trigger);
        } else {

            addNode(data, {
                key: nanoid(),
                type: NodeType.Alias,
                data: {},
            }, trigger);
        }

    }

    return (<div className="b" key={data.key}>
        <div className="wr50">
            {createNodeByType({data, type: NodeType.Var, context, trigger})}
        </div>
        <div className="wr10">
            <button className="wr100" onClick={handleSwitchAlias}>as</button>
        </div>
        <div className="wr30">
            {alias}
        </div>
        <div className="wr10">
            <button className="wr100" onClick={handleRemoveColumn}>Remove</button>
        </div>
    </div>);
}
registerNodeFc(NodeType.Column, ColumnNode);


const AliasNode = ({data, trigger, onRemove}: NodeProps) => {
    const getValue = () => {
        if (data.data && data.data.alias) {
            return data.data.alias;
        }
        return '';
    }

    const handleAliasChange = (e: any) => {
        trigger(Operation.SetState, [], {
            ...data,
            data: {
                ...data?.data,
                alias: e.target.value,
            }
        });
    }

    return (
        <input key={data.key} className="wr100" type="text" value={getValue()} onChange={handleAliasChange}/>
    )
}
registerNodeFc(NodeType.Alias, AliasNode);


const CtesNode = ({data, context, trigger, onRemove}: NodeProps) => {
    const ctes = getNodesByType({data, type: NodeType.CTE});

    const renderCtes = () => {
        if (ctes.length) {
            return (<div className={'ctes-wrap'}>
                <span>with</span>
                <div className={'ctes-wrap-inner'}>
                    {ctes.map(d => createNode({
                        data: d,
                        context,
                        trigger: trigger, onRemove: () => {
                            removeNode(data, d.key, trigger);
                        }
                    }))}
                </div>
            </div>)
        }
        return (<React.Fragment/>);
    }

    const renderAddCteBtn = () => {
        return (<div>
            <button onClick={handleAddCte}>CTE +</button>
        </div>)
    }
    const handleAddCte = () => {
        addNode(data, createCteData(), trigger);
    }
    return (<div key={data.key}>
        <div>
            {renderCtes()}
        </div>
        {renderAddCteBtn()}
    </div>)
}
registerNodeFc(NodeType.CTEs, CtesNode);


const CteNode = ({data, context, trigger, onRemove}: NodeProps) => {
    const element = createNodeByType({data, type: NodeType.Select, context, trigger});

    const renderRemoveCteBtn = () => {
        return (
            <button onClick={onRemove}>-</button>
        )
    }
    return (<div key={data.key}>
        <div className="wr90">{createNodeByType({data, type: NodeType.Alias, context, trigger})}</div>
        <div className="wr5"/>
        <div className="wr5"> AS (</div>
        <div className="ctes-wrap-inner">
            {element}
        </div>
        <div><span>)</span> {renderRemoveCteBtn()}</div>

    </div>)
}
registerNodeFc(NodeType.CTE, CteNode);


const SourceTableNode = ({data, trigger, onRemove}: NodeProps) => {
    const columns = (data.data?.columns) ? data.data.columns : [];
    return (<div key={data.key}>
        <h4>{data.data?.alias}</h4>
        <ul>
            {columns.map((c: any) => (<li key={`${data.key}-${c?.name}`}>{c?.name}</li>))}
        </ul>
    </div>)
}
registerNodeFc(NodeType.SourceTable, SourceTableNode);


const FromNode = ({data, context, trigger, onRemove}: NodeProps) => {
    const joins = getNodesByType({data, type: NodeType.Join});

    const renderJoins = () => {
        if (joins.length) {
            return (
                <div className={'joins-wrap-inner'}>
                    {joins.map(d => createNode({
                        data: d,
                        context,
                        trigger: trigger, onRemove: () => {
                            removeNode(data, d.key, trigger);
                        }
                    }))}
                </div>)
        }
        return (<React.Fragment/>);
    }

    const handleAddJoin = () => {
        addNode(data, createJoinData(), trigger);
    }

    const renderAddJoinBtn = () => {
        return (<div>
            <button onClick={handleAddJoin}>Join +</button>
        </div>)
    }

    return (<div key={data.key}>
        <div className="mb">
            <div className="wr10 tc">from</div>
            <div className="wr80">
                {createNodeByType({data, type: NodeType.Table, context, trigger})}
            </div>
        </div>
        <div className={'joins-wrap'}>{renderJoins()}</div>
        {renderAddJoinBtn()}
    </div>)
}
registerNodeFc(NodeType.From, FromNode);


const JoinNode = ({data, context, trigger, onRemove}: NodeProps) => {

    const handleChange = (e: any) => {
        const newData = {
            ...data,
            data: {
                ...(data.data ? data.data : {}),
                type: e.target.value,
            }
        }
        trigger(Operation.SetState, [], newData);
    }
    return (<div key={data.key} className="b mb">
        <div className="mb">
            <select className="wr5" onChange={handleChange} value={data.data?.type}>
                {Object.keys(JoinType).map(j => (<option key={`${data.key}-${j}`} value={j}>{j}</option>))}
            </select>
            <div className="wr5 tc">
                join
            </div>
            <div className="wr">
                {createNodeByType({data, type: NodeType.Table, context, trigger})}
            </div>
            <button className="wr10">Remove</button>
        </div>

        <div className="wr100">
            {createNodeByType({data, type: NodeType.JoinOn, context, trigger})}
        </div>
    </div>)
}
registerNodeFc(NodeType.Join, JoinNode);


const JoinOnNode = ({data, context, trigger, onRemove}: NodeProps) => {
    const columns = getNodesByType({data, type: NodeType.Var});
    const renderColumn = (index: number) => {
        if (columns.length > index) {
            return createNode({data: columns[index], context, trigger});
        }
        return <React.Fragment/>
    }
    return (<div key={data.key}>
        <div className="wr5 tc">
            on
        </div>
        <div className="wr">{renderColumn(0)}</div>
        <div className="wr5 tc">=</div>
        <div className="wr">{renderColumn(1)}</div>
    </div>)
}
registerNodeFc(NodeType.JoinOn, JoinOnNode);


const TableNode = ({data, context, trigger, onRemove}: NodeProps) => {

    const handleChange = (e: any) => {
        const newData = {
            ...data,
            data: {
                ...(data.data ? data.data : {}),
                selectedValue: e.target.value,
            }
        }
        trigger(Operation.SetState, [], newData);
    }


    const handleSwitchAlias = (_: any) => {
        const aliasNode = getNodeByType({data, type: NodeType.Alias});
        if (aliasNode) {
            removeNode(data, aliasNode.key, trigger);
        } else {

            addNode(data, {
                key: nanoid(),
                type: NodeType.Alias,
                data: {},
            }, trigger);
        }

    }

    const defaultAlias = (<input className="wr100" type="text" disabled={true} value={''} readOnly={true}/>)
    const alias = createNodeByType({data, type: NodeType.Alias, context, trigger, defaultEl: defaultAlias});

    const from = [...context.localSchema.from, ...context.schema.from];
    return (<div key={data.key}>
        <select className="wr" onChange={handleChange} value={data.data?.selectedValue}>
            <option key={`${data.key}-empty`} value="">Please, select table</option>
            {from.map((t) => (
                <option key={`${data.key}-${t.key}`} value={t.key}>
                    {t.name}
                </option>
            ))}
        </select>
        <div className="wr">
            <button className="wr100" onClick={handleSwitchAlias}>as</button>
        </div>
        <div className="wr">
            {alias}
        </div>
    </div>)
}
registerNodeFc(NodeType.Table, TableNode);


const WhereNode = ({data, context, trigger, onRemove}: NodeProps) => {
    return (<div key={data.key}>
        where
    </div>);
}
registerNodeFc(NodeType.Where, WhereNode);


//Schema and aliases contexts