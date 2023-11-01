import {
    SmartContract,
    ByteString,
    prop,
    method,
    assert,
    FixedArray,
    fill,
    toByteString,
    hash256,
} from 'scrypt-ts'

export type Task = {
    task: ByteString
    isCompleted: boolean
}
export class TodoList extends SmartContract {
    static readonly MAX_TASKCOUNT = 10
    @prop(true)
    tasks: FixedArray<Task, typeof TodoList.MAX_TASKCOUNT>

    constructor() {
        super(...arguments)
        this.tasks = fill(
            {
                task: toByteString(''),
                isCompleted: false,
            },
            TodoList.MAX_TASKCOUNT
        )
    }

    @method()
    public addTask(task: Task, taskIdx: bigint) {
        task = this.tasks[Number(taskIdx)]
        const output =
            this.buildStateOutput(this.ctx.utxo.value) +
            this.buildChangeOutput()
        assert(hash256(output) == this.ctx.hashOutputs, 'HashOutput Mismatch')
    }

    @method()
    public taskCompleted(taskIdx: bigint) {
        this.tasks[Number(taskIdx)].isCompleted = true

        const output =
            this.buildStateOutput(this.ctx.utxo.value) +
            this.buildChangeOutput()
        assert(hash256(output) == this.ctx.hashOutputs, 'HashOutput Mismatch')
    }
}
