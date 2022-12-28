import { nanoid } from 'nanoid'

import {ColumnType} from "./ColumnType";
import {Column} from "./types";


class TableColumn implements Column {
    id: string;
    name: string;
    type: ColumnType;
    is_pk: boolean;

    constructor(name: string, type: ColumnType = ColumnType.Varchar, is_pk: boolean = false) {
        this.id = nanoid();
        this.name = name;
        this.type = type;
        this.is_pk = is_pk;
    }
}

export default TableColumn;

