//Can't use enum as key
import {NodeFC, NodeType} from "./types";

const node_type_mapping: { [type: string]: NodeFC } = {}

export const getNodeFc = (type: NodeType) => {
    return node_type_mapping[type];
}
export const registerNodeFc = (type: NodeType, fc: NodeFC) => {
    node_type_mapping[type] = fc;
}
