export class QueueError extends Error {}

class Node<T> {
    public constructor(
        public readonly value: T,
        public next: null | Node<T> = null,
    ) {}
}

export class Queue<T> {
    private head: null | Node<T> = null;
    private tail: null | Node<T> = null;
    private len = 0;

    constructor(
        /**
         * Maximum capacity of this queue. Defaults to unlimited.
         */
        public readonly maxSize = Infinity,
    ) {}

    /**
     * Returns the number of elements in this Queue.
     */
    public size(): number {
        return this.len;
    }

    /**
     * Inserts the specified element into this queue if it is possible to do so immediately without
     * violating capacity restrictions, throwing a `QueueError` if no space is currently available.
     */
    public add(value: T): void {
        if (this.len >= this.maxSize) {
            throw new QueueError("Queue is full.");
        }

        const node = new Node(value);

        if (this.head === null || this.tail === null) {
            this.head = node;
            this.tail = node;
        }
        else {
            this.tail.next = node;
            this.tail = node;
        }

        this.len++;
    }

    /**
     * Retrieves, but does not remove, the head of this queue. Throws a `QueueError` if there are no
     * elements in this queue.
     */
    public element(): T {
        if (this.head === null) {
            throw new QueueError("Queue is empty.");
        }
        return this.head.value;
    }

    /**
     * Retrieves and removes the head of this queue. Throws a `QueueError` if there are no elements
     * in this queue.
     */
    public remove(): T {
        if (this.head === null) {
            throw new QueueError("Queue is empty.");
        }
        const { value } = this.head;
        this.head = this.head.next;
        this.len--;
        return value;
    }

    /**
     * Inserts the specified element into this queue if it is possible to do so immediately without
     * violating capacity restrictions, returning `true` upon success and `false` if no space is
     * currently available.
     */
    public offer(value: T): boolean {
        if (this.len >= this.maxSize) {
            return false;
        }
        this.add(value);
        return true;
    }

    /**
     * Retrieves, but does not remove, the head of this queue, If this queue is empty, returns
     * `defaultValue` if provided, otherwise `null`.
     */
    public peek<V = null>(defaultValue: V = null as V): T | V {
        if (this.head === null) {
            return defaultValue;
        }
        return this.element();
    }

    /**
     * Retrieves and removes the head of this queue. If this queue is empty, returns `defaultValue`
     * if provided, otherwise `null`.
     */
    public poll<V = null>(defaultValue: V = null as V): T | V {
        if (this.head === null) {
            return defaultValue;
        }
        return this.remove();
    }

    /**
     * Retrieves, but does not remove, the tail of this queue. Throws a `QueueError` if there are no
     * elements in this queue.
     */
    public elementLast(): T {
        if (this.tail === null) {
            throw new QueueError("Queue is empty.");
        }
        return this.tail.value;
    }

    /**
     * Retrieves, but does not remove, the tail of this queue, If this queue is empty, returns
     * `defaultValue` if provided, otherwise `null`.
     */
    public peekLast<V = null>(defaultValue: V = null as V): T | V {
        if (this.tail === null) {
            return defaultValue;
        }
        return this.elementLast();
    }
}
