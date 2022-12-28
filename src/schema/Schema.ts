import Table from './Table'

export class Schema {
    name: string
    tables: Table[]=[]

    constructor(name: string, tables: Table[] = []) {
        this.name = name;
        this.tables = tables;
    }
}
