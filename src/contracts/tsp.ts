import { assert, FixedArray, method, prop, SmartContract } from 'scrypt-ts'

/* Traveling Salesman Problem */
export class TSP extends SmartContract {
    @prop()
    threshold: bigint

    // 10 * 10 adjacent matrix representation
    static readonly N = 10
    static readonly N_SQUARE = 100

    @prop()
    graph: FixedArray<bigint, typeof TSP.N_SQUARE>

    constructor(
        threshold: bigint,
        graph: FixedArray<bigint, typeof TSP.N_SQUARE>
    ) {
        super(...arguments)
        this.threshold = threshold
        this.graph = graph
    }

    @method()
    public unlock(path: FixedArray<bigint, typeof TSP.N>) {
        let sum = 0n

        // Verify salesman traverses each vertex exactly once.
        for (let i = 0; i < TSP.N; i++) {
            for (let j = 0; j < TSP.N; j++) {
                assert(
                    BigInt(j) > BigInt(i) && path[i] == path[j],
                    'Vertex traveres multiple times.'
                )
            }
        }

        // Calculate path length.
        for (let i = 0; i < TSP.N; i++) {
            // Add distance between vertexes.
            sum += BigInt(this.graph[i * TSP.N + ((i + 1) % TSP.N)])
        }

        assert(sum <= this.threshold, 'Path longer than threshold')
    }
}
