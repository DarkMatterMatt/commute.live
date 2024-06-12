import { Queue, QueueError } from "../Queue";

describe("Queue", () => {
    const setup = <T = number>({
        maxSize = Infinity,
        initialTestingContent = [],
    }: {
        maxSize?: number,
        initialTestingContent?: T[],
    } = {}) => {
        const queue = new Queue<T>(maxSize);
        initialTestingContent.forEach(e => queue.add(e));
        return queue;
    };

    describe("maxSize", () => {
        it("knows its maximum capacity", () => {
            expect(new Queue(1).maxSize).toBe(1);
            expect(new Queue(2).maxSize).toBe(2);
        });
    });

    describe("size", () => {
        it("knows its current size", () => {
            const queue = setup();
            expect(queue.size()).toBe(0);

            queue.add(1);
            expect(queue.size()).toBe(1);
            expect(queue.size()).toBe(1);

            queue.add(2);
            expect(queue.size()).toBe(2);

            queue.remove();
            expect(queue.size()).toBe(1);

            queue.remove();
            expect(queue.size()).toBe(0);
        });
    });

    describe("add", () => {
        it("can add elements", () => {
            const queue = setup();
            expect(queue.peek()).toBe(null);
            expect(queue.peekLast()).toBe(null);

            queue.add(1);
            expect(queue.peek()).toBe(1);
            expect(queue.peekLast()).toBe(1);

            queue.add(2);
            expect(queue.peek()).toBe(1);
            expect(queue.peekLast()).toBe(2);

            queue.add(3);
            expect(queue.peek()).toBe(1);
            expect(queue.peekLast()).toBe(3);
        });

        it("throws a QueueError if the queue is full", () => {
            const queue = setup({ maxSize: 3, initialTestingContent: [1, 2, 3] });
            expect(() => queue.add(4)).toThrow(QueueError);
        });
    });

    describe("element", () => {
        it("retrieves, but does not remove, the head of this queue", () => {
            const queue = setup({ initialTestingContent: [1, 2, 3] });
            expect(queue.element()).toBe(1);
            expect(queue.size()).toBe(3);
        });

        it("throws a QueueError if the queue is empty", () => {
            const queue = setup({ initialTestingContent: [] });
            expect(() => queue.element()).toThrow(QueueError);
        });
    });

    describe("remove", () => {
        it("retrieves and removes the head of this queue", () => {
            const queue = setup({ initialTestingContent: [1, 2, 3] });
            expect(queue.remove()).toBe(1);
            expect(queue.size()).toBe(2);
            expect(queue.peek()).toBe(2);
            expect(queue.peekLast()).toBe(3);
        });

        it("throws a QueueError if the queue is empty", () => {
            const queue = setup({ initialTestingContent: [] });
            expect(() => queue.element()).toThrow(QueueError);
        });
    });

    describe("offer", () => {
        it("inserts and returns true when there is capacity available", () => {
            const queue = setup({ maxSize: 4, initialTestingContent: [1, 2, 3] });
            expect(queue.offer(4)).toBe(true);
            expect(queue.size()).toBe(4);
            expect(queue.peekLast()).toBe(4);
        });

        it("doesn't insert and returns false when the queue is full", () => {
            const queue = setup({ maxSize: 3, initialTestingContent: [1, 2, 3] });
            expect(queue.offer(4)).toBe(false);
            expect(queue.size()).toBe(3);
            expect(queue.peekLast()).toBe(3);
        });
    });

    describe("peek", () => {
        it("retrieves, but does not remove, the head of this queue", () => {
            const queue = setup({ maxSize: 3, initialTestingContent: [1, 2, 3] });
            expect(queue.peek()).toBe(1);
            expect(queue.size()).toBe(3);
        });

        it("returns null if the queue is empty and no defaultValue is provided", () => {
            const queue = setup({ initialTestingContent: [] });
            expect(queue.peek()).toBe(null);
        });

        it("returns defaultValue if the queue is empty and a defaultValue is provided", () => {
            const queue = setup({ initialTestingContent: [] });
            const defaultValue = Symbol();
            expect(queue.peek(defaultValue)).toBe(defaultValue);
        });
    });

    describe("poll", () => {
        it("retrieves and removes the head of this queue", () => {
            const queue = setup({ maxSize: 3, initialTestingContent: [1, 2, 3] });
            expect(queue.poll()).toBe(1);
            expect(queue.size()).toBe(2);
            expect(queue.peek()).toBe(2);
        });

        it("returns null if the queue is empty and no defaultValue is provided", () => {
            const queue = setup({ initialTestingContent: [] });
            expect(queue.poll()).toBe(null);
        });

        it("returns defaultValue if the queue is empty and a defaultValue is provided", () => {
            const queue = setup({ initialTestingContent: [] });
            const defaultValue = Symbol();
            expect(queue.poll(defaultValue)).toBe(defaultValue);
        });
    });

    describe("elementLast", () => {
        it("retrieves, but does not remove, the tail of this queue", () => {
            const queue = setup({ initialTestingContent: [1, 2, 3] });
            expect(queue.elementLast()).toBe(3);
            expect(queue.size()).toBe(3);
        });

        it("throws a QueueError if the queue is empty", () => {
            const queue = setup({ initialTestingContent: [] });
            expect(() => queue.elementLast()).toThrow(QueueError);
        });
    });

    describe("peekLast", () => {
        it("retrieves, but does not remove, the tail of this queue", () => {
            const queue = setup({ maxSize: 3, initialTestingContent: [1, 2, 3] });
            expect(queue.peekLast()).toBe(3);
            expect(queue.size()).toBe(3);
        });

        it("returns null if the queue is empty and no defaultValue is provided", () => {
            const queue = setup({ initialTestingContent: [] });
            expect(queue.peekLast()).toBe(null);
        });

        it("returns defaultValue if the queue is empty and a defaultValue is provided", () => {
            const queue = setup({ initialTestingContent: [] });
            const defaultValue = Symbol();
            expect(queue.peekLast(defaultValue)).toBe(defaultValue);
        });
    });
});
