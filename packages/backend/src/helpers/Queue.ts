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
        public readonly maxSize = -1,
    ) {}

    public size() {
        return this.len;
    }

    public add(value: T) {
        if (this.maxSize !== -1 && this.len >= this.maxSize) {
            throw new Error("Queue is full.");
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

    public element() {
        if (this.head === null) {
            throw new Error("Queue is empty.");
        }
        return this.head.value;
    }

    public remove() {
        if (this.head === null) {
            throw new Error("Queue is empty.");
        }
        const { value } = this.head;
        this.head = this.head.next;
        this.len--;
        return value;
    }

    public offer(value: T): boolean {
        if (this.maxSize !== -1 && this.len >= this.maxSize) {
            return false;
        }
        this.add(value);
        return true;
    }

    public peek() : null | T;
    public peek<V>(defaultValue: V) : V | T;
    public peek(defaultValue = null) {
        if (this.head === null) {
            return defaultValue;
        }
        return this.element();
    }

    public poll() : null | T;
    public poll<V>(defaultValue: V) : V | T;
    public poll(defaultValue = null) {
        if (this.head === null) {
            return defaultValue;
        }
        return this.remove();
    }

    public elementLast() {
        if (this.tail === null) {
            throw new Error("Queue is empty.");
        }
        return this.tail.value;
    }

    public peekLast() : null | T;
    public peekLast<V>(defaultValue: V) : V | T;
    public peekLast(defaultValue = null) {
        if (this.tail === null) {
            return defaultValue;
        }
        return this.elementLast();
    }
}
