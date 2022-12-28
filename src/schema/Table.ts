import TableColumn from './TableColumn'
import {nanoid} from "nanoid";

class Table {
    id: string
    name: string;
    columns: TableColumn[] = []
    parent?: Table

    constructor(name: string, columns: TableColumn[]) {
        this.id = nanoid();
        this.name = name;
        this.columns = columns;
    }
}

export default Table;
