import { expect, use } from 'chai'
import { TodoList, Task } from '../src/contracts/todoList'
import { getDefaultSigner} from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import { MethodCallOptions, toByteString } from 'scrypt-ts'

use(chaiAsPromised)

describe('Test SmartContract `TodoList', () => {
    let instance: TodoList
    let taskIdx 
    const Todo: Task = {
        task: toByteString('first task', true),
        isCompleted: false,
    }

    before(async () => {
        await TodoList.loadArtifact()

        instance = new TodoList()

        instance.connect(getDefaultSigner())
    })

    it('should pass the public `addTask` sucessfully', async () => {
        await instance.deploy(1)
        const nextInstance = instance.next()
         taskIdx = 0n
         console.log('Task Added : ', Buffer.from(Todo.task, "hex").toString("utf8"))
         console.log('isCompleted : ', Todo.isCompleted)
        const call = async () => {
            await instance.methods.addTask(Todo, taskIdx, {
                next: {
                    instance: nextInstance,
                    balance: instance.balance,
                },
            } as MethodCallOptions<TodoList>)
        }
        return expect(call()).not.be.rejected
    })

    it('should pass the public `completeTask` sucessfully', async () => {
        await instance.deploy(1)
        // Create the next instance from the current.
        const nextInstance = instance.next()
        taskIdx = 0
        nextInstance.tasks[taskIdx].isCompleted = true

        console.log('Task Completed : ', Buffer.from(Todo.task, "hex").toString("utf8"))
         console.log('isCompleted : ', nextInstance.tasks[taskIdx].isCompleted)

        const call = async () => {
            await instance.methods.taskCompleted(BigInt(taskIdx), {
                next: {
                    instance: nextInstance,
                    balance: instance.balance,
                } as MethodCallOptions<TodoList>,
            })
        }
        return expect(call()).not.be.rejected
    })
})
